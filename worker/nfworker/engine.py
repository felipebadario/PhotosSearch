"""Ponte para o motor facial do MVP (face-search-service/app/face_service.py)."""
from dataclasses import dataclass
from typing import Protocol

import numpy as np


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
    def index_faces(self, data: bytes) -> list[DetectedFace]: ...
    def selfie_embedding(self, data: bytes) -> np.ndarray: ...


class InsightFaceEngine:
    """Usa as mesmas classes e os mesmos parâmetros do MVP: duas escalas na indexação, uma na selfie."""

    def __init__(self):
        from app import face_service as mvp  # face-search-service no PYTHONPATH
        from app.config import DETECTION_SIZE, INDEX_DETECTION_SIZE

        self._mvp = mvp
        self._index = mvp.FaceService(detection_size=INDEX_DETECTION_SIZE)
        self._selfie = mvp.FaceService(detection_size=DETECTION_SIZE)

    def _load(self, data: bytes):
        try:
            return self._mvp.load_image(data)
        except self._mvp.InvalidImage as exc:
            raise InvalidImage(str(exc)) from exc

    def index_faces(self, data: bytes) -> list[DetectedFace]:
        image = self._load(data)
        out = []
        for face in self._index.faces(image):
            try:
                embedding = self._mvp.normalize(face.embedding)
            except ValueError:
                continue
            out.append(DetectedFace(embedding, [float(v) for v in face.bbox], float(face.det_score)))
        return out

    def selfie_embedding(self, data: bytes) -> np.ndarray:
        image = self._load(data)
        try:
            return self._selfie.selfie_embedding(image)
        except self._mvp.NoFace as exc:
            raise NoFace(str(exc)) from exc
