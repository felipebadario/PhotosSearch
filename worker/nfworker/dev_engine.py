"""Motor de DESENVOLVIMENTO: não reconhece rostos. Gera um "rosto" por cor dominante da imagem,
só para exercitar o caminho completo (envio, fila, busca, página pública) sem baixar o modelo.
Só é usado com NFWORKER_ENGINE=dev e nunca na imagem publicada."""
import io

import numpy as np
from PIL import Image, UnidentifiedImageError

from .config import EMBEDDING_DIM
from .engine import DetectedFace, InvalidImage


def _embedding(data: bytes) -> np.ndarray:
    try:
        with Image.open(io.BytesIO(data)) as im:
            rgb = np.asarray(im.convert("RGB").resize((8, 8)), dtype=np.float32).reshape(-1, 3).mean(axis=0)
    except (UnidentifiedImageError, OSError) as exc:
        raise InvalidImage("Não foi possível ler a imagem.") from exc
    # Baldes grossos: a selfie é reencodada no navegador e a cor muda um pouco.
    r, g, b = (int(c) // 32 for c in rgb)
    seed = r * 64 + g * 8 + b
    v = np.random.default_rng(seed).normal(size=EMBEDDING_DIM).astype(np.float32)
    return v / np.linalg.norm(v)


class DevColorEngine:
    def index_faces(self, data: bytes):
        return [DetectedFace(_embedding(data), [0.0, 0.0, 1.0, 1.0], 0.99)]

    def selfie_embedding(self, data: bytes):
        return _embedding(data)
