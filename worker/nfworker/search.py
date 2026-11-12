"""Busca por selfie dentro de um acervo: comparação exata, como no MVP (maior similaridade por foto)."""
import threading
from collections import OrderedDict

import numpy as np

from . import config


class CollectionIndex:
    def __init__(self, signature, photo_ids: list[str], matrix: np.ndarray):
        self.signature = signature
        self.photos, self.photo_idx = np.unique(np.asarray(photo_ids, dtype=str), return_inverse=True) if photo_ids else (np.asarray([], dtype=str), np.asarray([], dtype=int))
        self.matrix = matrix

    def search(self, query: np.ndarray, threshold: float):
        if self.matrix.shape[0] == 0:
            return []
        similarities = np.clip(self.matrix @ query, -1.0, 1.0)
        scores = np.full(len(self.photos), -np.inf, dtype=np.float32)
        np.maximum.at(scores, self.photo_idx, similarities)
        selected = np.flatnonzero(scores >= threshold)
        selected = selected[np.argsort(-scores[selected], kind="stable")]
        return [{"photo_id": str(self.photos[i]), "similarity": float(scores[i])} for i in selected]


_cache: "OrderedDict[tuple[str, str], CollectionIndex]" = OrderedDict()
_lock = threading.Lock()


def _signature(conn, organization_id: str, collection_id: str):
    """Muda quando entram ou saem rostos do acervo; evita recarregar a cada busca."""
    return conn.execute(
        """
        select count(*), coalesce(max(f.created_at)::text, ''), coalesce(sum(hashtext(f.id)::bigint), 0)
        from faces f
        join collection_photos cp on cp.photo_id = f.photo_id
        where cp.collection_id = %s and cp.organization_id = %s and f.organization_id = %s
        """,
        (collection_id, organization_id, organization_id),
    ).fetchone()


def load_index(conn, organization_id: str, collection_id: str) -> CollectionIndex:
    key = (organization_id, collection_id)
    signature = _signature(conn, organization_id, collection_id)
    with _lock:
        cached = _cache.get(key)
        if cached and cached.signature == signature:
            _cache.move_to_end(key)
            return cached
    rows = conn.execute(
        """
        select f.photo_id, f.embedding
        from faces f
        join collection_photos cp on cp.photo_id = f.photo_id
        join photos p on p.id = f.photo_id
        where cp.collection_id = %s and cp.organization_id = %s and f.organization_id = %s and p.status = 'indexed'
        """,
        (collection_id, organization_id, organization_id),
    ).fetchall()
    good = [(pid, bytes(emb)) for pid, emb in rows if len(emb) == config.EMBEDDING_BYTES]
    matrix = np.frombuffer(b"".join(e for _, e in good), dtype="<f4").reshape(len(good), config.EMBEDDING_DIM) if good else np.zeros((0, config.EMBEDDING_DIM), dtype=np.float32)
    index = CollectionIndex(signature, [pid for pid, _ in good], np.ascontiguousarray(matrix, dtype=np.float32))
    with _lock:
        _cache[key] = index
        _cache.move_to_end(key)
        while len(_cache) > config.SEARCH_CACHE_COLLECTIONS:
            _cache.popitem(last=False)
    return index


def search_collection(conn, organization_id: str, collection_id: str, query: np.ndarray, threshold: float):
    query = np.asarray(query, dtype=np.float32)
    return load_index(conn, organization_id, collection_id).search(query, threshold)
