import io
import pickle
import threading
import warnings
from pathlib import PurePosixPath
from urllib.parse import quote

import cv2
import numpy as np
from PIL import Image, ImageOps, UnidentifiedImageError

from app.config import (DETECTION_SIZE, INDEX_PATH, MAX_IMAGE_PIXELS,
                        MAX_IMAGE_SIDE, MAX_NON_JPEG_PIXELS, MAX_INDEX_FACES,
                        MODEL_NAME, MODEL_ROOT, PHOTOS_DIR)


class InvalidImage(ValueError):
    pass


class NoFace(ValueError):
    pass


def load_image(source):
    """Corrige EXIF, limita resolução e devolve BGR sem modificar o original."""
    try:
        with warnings.catch_warnings():
            warnings.simplefilter("error", Image.DecompressionBombWarning)
            with Image.open(io.BytesIO(source) if isinstance(source, (bytes, bytearray)) else source) as image:
                if image.format not in {"JPEG", "MPO", "PNG", "WEBP"}:
                    raise InvalidImage("Envie uma imagem JPG, PNG ou WebP. Para HEIC, converta para JPG.")
                if image.width * image.height > MAX_IMAGE_PIXELS:
                    raise InvalidImage("Imagem muito grande. Envie uma foto de até 50 megapixels.")
                if image.format not in {"JPEG", "MPO"} and image.width * image.height > MAX_NON_JPEG_PIXELS:
                    raise InvalidImage("Para PNG/WebP, envie uma imagem de até 8 megapixels ou converta para JPG.")
                # Reduz JPEG no decoder antes de EXIF/convert: evita materializar 50 MP em RAM.
                image.draft("RGB", (MAX_IMAGE_SIDE, MAX_IMAGE_SIDE))
                image = ImageOps.exif_transpose(image)
                image.thumbnail((MAX_IMAGE_SIDE, MAX_IMAGE_SIDE), Image.Resampling.LANCZOS)
                rgb = np.asarray(image.convert("RGB"))
                return cv2.cvtColor(rgb, cv2.COLOR_RGB2BGR)
    except InvalidImage:
        raise
    except (UnidentifiedImageError, OSError, ValueError, Image.DecompressionBombError,
            Image.DecompressionBombWarning) as exc:
        raise InvalidImage("Não foi possível ler a imagem. Envie outra foto JPG, PNG ou WebP.") from exc


def normalize(embedding):
    vector = np.asarray(embedding, dtype=np.float32)
    if vector.ndim != 1 or not np.isfinite(vector).all():
        raise ValueError("Embedding inválido.")
    norm = np.linalg.norm(vector)
    if norm < 1e-8:
        raise ValueError("Embedding vazio.")
    return vector / norm


class FaceService:
    def __init__(self, detection_size=DETECTION_SIZE):
        import onnxruntime as ort
        from insightface.model_zoo import SCRFD, ArcFaceONNX
        from insightface.utils.storage import ensure_available
        MODEL_ROOT.mkdir(parents=True, exist_ok=True)
        model_dir = ensure_available("models", MODEL_NAME, root=str(MODEL_ROOT))
        from pathlib import Path
        model_dir = Path(model_dir)
        options = ort.SessionOptions()
        options.intra_op_num_threads = 1
        options.inter_op_num_threads = 1
        options.execution_mode = ort.ExecutionMode.ORT_SEQUENTIAL
        options.enable_cpu_mem_arena = False
        options.enable_mem_pattern = False
        options.graph_optimization_level = ort.GraphOptimizationLevel.ORT_ENABLE_BASIC
        # FaceAnalysis 1.0.1 não repassa sess_options ao roteador. Instanciamos
        # apenas os dois modelos InsightFace para aplicar de fato o limite de RAM.
        def session(name):
            return ort.InferenceSession(str(model_dir / name), sess_options=options,
                                        providers=["CPUExecutionProvider"])
        self.detector = SCRFD(session=session("det_500m.onnx"))
        self.detector.prepare(ctx_id=0, input_size=detection_size, det_thresh=0.5)
        self.recognizer = ArcFaceONNX(model_file=str(model_dir / "w600k_mbf.onnx"),
                                      session=session("w600k_mbf.onnx"))
        self.lock = threading.Lock()

    def faces(self, image):
        # InsightFace usa estado interno do detector: serializa inferências em CPU.
        with self.lock:
            from insightface.app.common import Face
            boxes, landmarks = self.detector.detect(image)
            faces = []
            for i, box in enumerate(boxes):
                face = Face(bbox=box[:4], det_score=box[4], kps=landmarks[i])
                self.recognizer.get(image, face)
                faces.append(face)
            return faces

    def selfie_embedding(self, image):
        faces = self.faces(image)
        if not faces:
            raise NoFace("Não detectamos um rosto. Tente outra selfie com o rosto bem iluminado.")
        face = max(faces, key=lambda f: max(0, f.bbox[2] - f.bbox[0]) * max(0, f.bbox[3] - f.bbox[1]))
        return normalize(face.embedding)


class FaceIndex:
    def __init__(self, embeddings, paths):
        matrix = np.asarray(embeddings, dtype=np.float32)
        if matrix.ndim != 2 or matrix.shape[0] != len(paths) or matrix.shape[1] != 512:
            raise ValueError("Dimensões do índice inválidas. Execute index_photos.py.")
        if len(paths) > MAX_INDEX_FACES:
            raise ValueError(f"Índice excede {MAX_INDEX_FACES} rostos suportados nesta configuração de memória.")
        if not np.isfinite(matrix).all():
            raise ValueError("Índice contém valores inválidos.")
        for path in paths:
            pure = PurePosixPath(path)
            if (not isinstance(path, str) or pure.is_absolute() or ".." in pure.parts
                    or "\\" in path or ":" in path
                    or not (PHOTOS_DIR / path).resolve().is_relative_to(PHOTOS_DIR.resolve())):
                raise ValueError("Caminho inseguro no índice.")
        norms = np.linalg.norm(matrix, axis=1, keepdims=True)
        if np.any(norms < 1e-8):
            raise ValueError("Índice contém embeddings vazios.")
        matrix /= norms
        self.embeddings = np.ascontiguousarray(matrix)
        self.paths = list(paths)
        self.photos, self.photo_ids = np.unique(np.asarray(paths, dtype=str), return_inverse=True)

    @classmethod
    def load(cls, path=INDEX_PATH):
        # Pickle executa código: carregar SOMENTE o arquivo gerado localmente.
        with open(path, "rb") as handle:
            payload = pickle.load(handle)
        if payload.get("version") != 1 or payload.get("model") != MODEL_NAME:
            raise ValueError("Índice incompatível. Execute index_photos.py novamente.")
        return cls(payload["embeddings"], payload["paths"])

    def search(self, embedding, threshold):
        query = normalize(embedding)
        similarities = np.clip(self.embeddings @ query, -1.0, 1.0)
        # Máximo por foto elimina duplicatas inteiramente em NumPy.
        scores = np.full(len(self.photos), -np.inf, dtype=np.float32)
        np.maximum.at(scores, self.photo_ids, similarities)
        selected = np.flatnonzero(scores >= threshold)
        selected = selected[np.argsort(-scores[selected], kind="stable")]
        return [{"photo": "/photos/" + quote(str(self.photos[i]), safe="/"),
                 "similarity": float(scores[i])} for i in selected]
