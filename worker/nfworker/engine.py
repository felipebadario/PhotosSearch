"""Motor facial do worker: detector SCRFD + reconhecedor ArcFace (InsightFace), em CPU.

Modelo atual (MODEL_VERSION): det_10g + w600k_r50, do pacote buffalo_l.
- O det_10g acha bem mais rostos de perfil, inclinados e pequenos que o det_500m do MVP.
- O w600k_r50 (ResNet-50) separa muito melhor a mesma pessoa com e sem óculos, de lado,
  com outra luz ou idade. No benchmark do InsightFace, o buffalo_l acerta 91,25% no MR-ALL
  contra 71,87% do pacote pequeno.

Modelo antigo (LEGACY_MODEL_VERSION): det_500m + w600k_mbf (buffalo_sc). Ele só é carregado
enquanto existirem rostos antigos ainda não reindexados, para a busca não falhar no meio da troca.
"""
import io
import threading
import warnings
from dataclasses import dataclass
from pathlib import Path
from typing import Protocol

import numpy as np

from . import config


class InvalidImage(ValueError):
    pass


class NoFace(ValueError):
    pass


@dataclass
class DetectedFace:
    embedding: np.ndarray  # 512 float32, normalizado
    bbox: list[float]
    score: float


class Engine(Protocol):
    version: str

    def index_faces(self, data: bytes) -> list[DetectedFace]: ...
    def selfie_embedding(self, data: bytes) -> np.ndarray: ...


def normalize(embedding) -> np.ndarray:
    vector = np.asarray(embedding, dtype=np.float32)
    if vector.ndim != 1 or not np.isfinite(vector).all():
        raise ValueError("Embedding inválido.")
    norm = np.linalg.norm(vector)
    if norm < 1e-8:
        raise ValueError("Embedding vazio.")
    return vector / norm


MAX_IMAGE_PIXELS = 50_000_000
MAX_NON_JPEG_PIXELS = 8_000_000


def load_image(data: bytes, max_side: int):
    """Corrige o EXIF, limita a resolução e devolve BGR. Igual ao MVP, com o lado máximo configurável."""
    import cv2
    from PIL import Image, ImageOps, UnidentifiedImageError

    try:
        with warnings.catch_warnings():
            warnings.simplefilter("error", Image.DecompressionBombWarning)
            with Image.open(io.BytesIO(data)) as image:
                if image.format not in {"JPEG", "MPO", "PNG", "WEBP"}:
                    raise InvalidImage("Envie uma imagem JPG, PNG ou WebP. Para HEIC, converta para JPG.")
                if image.width * image.height > MAX_IMAGE_PIXELS:
                    raise InvalidImage("Imagem muito grande. Envie uma foto de até 50 megapixels.")
                if image.format not in {"JPEG", "MPO"} and image.width * image.height > MAX_NON_JPEG_PIXELS:
                    raise InvalidImage("Para PNG/WebP, envie uma imagem de até 8 megapixels ou converta para JPG.")
                # Reduz o JPEG no próprio decoder: não materializa 50 MP na memória.
                image.draft("RGB", (max_side, max_side))
                image = ImageOps.exif_transpose(image)
                image.thumbnail((max_side, max_side), Image.Resampling.LANCZOS)
                rgb = np.asarray(image.convert("RGB"))
                return cv2.cvtColor(rgb, cv2.COLOR_RGB2BGR)
    except InvalidImage:
        raise
    except (UnidentifiedImageError, OSError, ValueError, Image.DecompressionBombError, Image.DecompressionBombWarning) as exc:
        raise InvalidImage("Não foi possível ler a imagem. Envie outra foto JPG, PNG ou WebP.") from exc


class InsightFaceEngine:
    """Um detector e um reconhecedor, compartilhados pela indexação e pela busca (uma cópia só na RAM)."""

    def __init__(self, model_dir: str | Path, detector_file: str, recognizer_file: str, version: str,
                 index_sizes, selfie_size, index_max_side: int, flip_selfie: bool):
        import onnxruntime as ort
        from insightface.model_zoo import SCRFD, ArcFaceONNX

        model_dir = Path(model_dir)
        options = ort.SessionOptions()
        options.intra_op_num_threads = config.ONNX_THREADS
        options.inter_op_num_threads = 1
        options.execution_mode = ort.ExecutionMode.ORT_SEQUENTIAL
        # Sem a arena e o "memory pattern", o onnxruntime devolve a memória entre fotos
        # de tamanhos diferentes: o pico fica estável dentro de 1 GB.
        options.enable_cpu_mem_arena = False
        options.enable_mem_pattern = False
        options.graph_optimization_level = ort.GraphOptimizationLevel.ORT_ENABLE_BASIC

        def session(name):
            return ort.InferenceSession(str(model_dir / name), sess_options=options, providers=["CPUExecutionProvider"])

        self.version = version
        # Dois detectores (17 MB cada): a busca não espera a indexação de uma foto de grupo terminar.
        # O reconhecedor é um só; o onnxruntime aceita chamadas simultâneas na mesma sessão.
        self.detector = SCRFD(session=session(detector_file))
        self.detector.prepare(ctx_id=0, input_size=selfie_size, det_thresh=config.DETECTION_THRESHOLD)
        self.selfie_detector = SCRFD(session=session(detector_file))
        self.selfie_detector.prepare(ctx_id=0, input_size=selfie_size, det_thresh=config.DETECTION_THRESHOLD)
        self.recognizer = ArcFaceONNX(model_file=str(model_dir / recognizer_file), session=session(recognizer_file))
        self.index_sizes = index_sizes
        self.selfie_size = selfie_size
        self.index_max_side = index_max_side
        self.flip_selfie = flip_selfie
        # O detector guarda estado interno: uma inferência por vez em cada um.
        self.index_lock = threading.Lock()
        self.selfie_lock = threading.Lock()
        # Prioridade da busca: com uma busca em andamento, a indexação pausa entre um rosto e outro
        # e devolve a CPU (a máquina tem 1 núcleo). Quem está esperando a selfie não espera a fila.
        self._searching = 0
        self._idle = threading.Condition()

    def _yield_to_search(self):
        with self._idle:
            self._idle.wait_for(lambda: self._searching == 0, timeout=config.SEARCH_PRIORITY_MAX_WAIT)

    def _crop(self, image, kps):
        from insightface.utils import face_align

        return face_align.norm_crop(image, landmark=kps, image_size=self.recognizer.input_size[0])

    def index_faces(self, data: bytes) -> list[DetectedFace]:
        self._yield_to_search()
        image = load_image(data, self.index_max_side)
        with self.index_lock:
            boxes, landmarks = self.detector.detect(image, input_size=self.index_sizes)
        out = []
        for box, kps in zip(boxes, landmarks):
            x1, y1, x2, y2 = (float(v) for v in box[:4])
            score = float(box[4])
            # Rosto minúsculo ou detecção duvidosa gera um vetor ruidoso, que cria falso positivo.
            # O filtro vem antes do reconhecedor: não gasta CPU com rostos que não serão gravados.
            if min(x2 - x1, y2 - y1) < config.MIN_INDEX_FACE_PX or score < config.MIN_INDEX_DET_SCORE:
                continue
            self._yield_to_search()
            try:
                embedding = normalize(self.recognizer.get_feat(self._crop(image, kps))[0])
            except ValueError:
                continue
            out.append(DetectedFace(embedding, [x1, y1, x2, y2], score))
        return out

    def selfie_embedding(self, data: bytes) -> np.ndarray:
        with self._idle:
            self._searching += 1
        try:
            image = load_image(data, config.SELFIE_MAX_SIDE)
            with self.selfie_lock:
                boxes, landmarks = self.selfie_detector.detect(image, input_size=[self.selfie_size])
            if len(boxes) == 0:
                raise NoFace("Não detectamos um rosto. Tente outra selfie com o rosto bem iluminado.")
            i = int(np.argmax([(b[2] - b[0]) * (b[3] - b[1]) for b in boxes]))
            x1, y1, x2, y2 = boxes[i][:4]
            if min(x2 - x1, y2 - y1) < config.MIN_SELFIE_FACE_PX:
                raise NoFace("Seu rosto ficou pequeno na foto. Tire a selfie mais de perto.")
            crop = self._crop(image, landmarks[i])
            if self.flip_selfie:
                # Média do rosto com o espelho dele: menos sensível a pose e luz de um lado só.
                feats = self.recognizer.get_feat([crop, np.ascontiguousarray(crop[:, ::-1, :])])
                return normalize(feats.sum(axis=0))
            return normalize(self.recognizer.get_feat(crop)[0])
        finally:
            with self._idle:
                self._searching -= 1
                self._idle.notify_all()


def current_engine() -> InsightFaceEngine:
    return InsightFaceEngine(
        config.MODEL_DIR, "det_10g.onnx", "w600k_r50.onnx", config.MODEL_VERSION,
        index_sizes=[(640, 640), (1024, 1024)], selfie_size=(640, 640),
        index_max_side=config.INDEX_MAX_SIDE, flip_selfie=True,
    )


def legacy_engine() -> InsightFaceEngine:
    """O motor do MVP, só para comparar a selfie com rostos ainda não reindexados."""
    return InsightFaceEngine(
        config.LEGACY_MODEL_DIR, "det_500m.onnx", "w600k_mbf.onnx", config.LEGACY_MODEL_VERSION,
        index_sizes=[(640, 640), (1024, 1024)], selfie_size=(640, 640),
        index_max_side=1280, flip_selfie=False,
    )
