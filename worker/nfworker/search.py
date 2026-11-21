"""Busca por selfie dentro de um acervo: comparação exata, como no MVP (maior similaridade por foto)."""
import threading
from collections import OrderedDict

import numpy as np

from . import config


class CollectionIndex:
    """Rostos de um acervo, agrupados pelo modelo que gerou cada vetor."""

    def __init__(self, signature, photo_ids: list[str], matrix: np.ndarray, versions: list[str] | None = None, small: list[bool] | None = None):
        self.signature = signature
        n = len(photo_ids)
        versions = versions if versions is not None else [config.MODEL_VERSION] * n
        small = small if small is not None else [False] * n
        self.photos, photo_idx = np.unique(np.asarray(photo_ids, dtype=str), return_inverse=True) if n else (np.asarray([], dtype=str), np.asarray([], dtype=int))
        self.groups: dict[str, tuple[np.ndarray, np.ndarray, np.ndarray]] = {}
        version_arr = np.asarray(versions, dtype=str)
        small_arr = np.asarray(small, dtype=bool)
        for version in sorted(set(versions)):
            rows = np.flatnonzero(version_arr == version)
            self.groups[version] = (np.ascontiguousarray(matrix[rows]), photo_idx[rows], small_arr[rows])

    @property
    def versions(self) -> set[str]:
        return set(self.groups)

    def search(self, queries: dict[str, list[np.ndarray]], level: str):
        """queries: para cada modelo, os vetores das selfies (1 a 3). Devolve o melhor rosto por foto.

        Com várias selfies, cada rosto é comparado com o vetor médio delas (limiar normal) e com a
        selfie mais parecida (limiar + margem). A foto entra se algum rosto dela passar.
        """
        best_margin = np.full(len(self.photos), -np.inf, dtype=np.float32)
        best_sim = np.zeros(len(self.photos), dtype=np.float32)
        for version, (matrix, photo_idx, small) in self.groups.items():
            vectors = queries.get(version)
            if not vectors or matrix.shape[0] == 0:
                continue
            q = np.stack([np.asarray(v, dtype=np.float32) for v in vectors])
            template = q.mean(axis=0)
            template /= max(float(np.linalg.norm(template)), 1e-8)
            sims = np.clip(matrix @ template, -1.0, 1.0)
            if len(q) > 1:
                single = np.clip(matrix @ q.T, -1.0, 1.0).max(axis=1) - config.SINGLE_SELFIE_MARGIN
                sims = np.maximum(sims, single)
            thresholds = config.threshold_for(version, level) + small * config.SMALL_FACE_PENALTY
            margins = (sims - thresholds).astype(np.float32)
            for i in np.flatnonzero(margins >= 0):
                p = photo_idx[i]
                if margins[i] > best_margin[p]:
                    best_margin[p] = margins[i]
                    best_sim[p] = sims[i]
        selected = np.flatnonzero(best_margin >= 0)
        selected = selected[np.argsort(-best_margin[selected], kind="stable")]
        return [{"photo_id": str(self.photos[i]), "similarity": float(best_sim[i])} for i in selected]


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
        select f.photo_id, f.embedding, f.model_version, f.bbox
        from faces f
        join collection_photos cp on cp.photo_id = f.photo_id
        join photos p on p.id = f.photo_id
        where cp.collection_id = %s and cp.organization_id = %s and f.organization_id = %s and p.status = 'indexed'
        """,
        (collection_id, organization_id, organization_id),
    ).fetchall()
    known = set(config.THRESHOLDS)
    good = [(pid, bytes(emb), ver, bbox) for pid, emb, ver, bbox in rows if len(emb) == config.EMBEDDING_BYTES and ver in known]
    matrix = np.frombuffer(b"".join(g[1] for g in good), dtype="<f4").reshape(len(good), config.EMBEDDING_DIM) if good else np.zeros((0, config.EMBEDDING_DIM), dtype=np.float32)
    index = CollectionIndex(
        signature,
        [g[0] for g in good],
        np.ascontiguousarray(matrix, dtype=np.float32),
        [g[2] for g in good],
        [_is_small(g[3]) for g in good],
    )
    with _lock:
        _cache[key] = index
        _cache.move_to_end(key)
        while len(_cache) > config.SEARCH_CACHE_COLLECTIONS:
            _cache.popitem(last=False)
    return index


def _is_small(bbox) -> bool:
    try:
        x1, y1, x2, y2 = (float(v) for v in bbox[:4])
    except (TypeError, ValueError, IndexError):
        return False
    return min(x2 - x1, y2 - y1) < config.SMALL_FACE_PX
