"""Fila de indexação: a própria tabela photos, com status queued → processing → indexed | error."""
import json
import logging

import numpy as np

from . import config
from .engine import Engine, InvalidImage
from .storage import Storage

log = logging.getLogger("nfworker.indexer")


def embedding_bytes(vector: np.ndarray) -> bytes:
    data = np.asarray(vector, dtype="<f4").tobytes()
    if len(data) != config.EMBEDDING_BYTES:
        raise ValueError("Embedding com tamanho inesperado.")
    return data


def requeue_stuck(conn) -> int:
    """Fotos que ficaram em processing depois de uma queda voltam para a fila."""
    cur = conn.execute(
        """
        update photos set status = 'queued'
        where status = 'processing'
          and processing_started_at < now() - make_interval(mins => %s)
        """,
        (config.STUCK_MINUTES,),
    )
    conn.commit()
    return cur.rowcount


def claim(conn, limit: int = config.BATCH_SIZE):
    """Reserva um lote. SKIP LOCKED deixa várias máquinas trabalharem sem pegar a mesma foto."""
    rows = conn.execute(
        """
        update photos set status = 'processing', attempts = attempts + 1, processing_started_at = now()
        where id in (
            select id from photos
            where status = 'queued' and storage_key is not null
            order by created_at
            limit %s
            for update skip locked
        )
        returning id, organization_id, storage_key, attempts
        """,
        (limit,),
    ).fetchall()
    conn.commit()
    return rows


def _fail(conn, photo_id: str, attempts: int, message: str, permanent: bool):
    final = permanent or attempts >= config.MAX_ATTEMPTS
    conn.execute(
        "update photos set status = %s, error_message = %s, processing_started_at = null where id = %s and status = 'processing'",
        ("error" if final else "queued", message[:500], photo_id),
    )
    conn.commit()


def index_photo(conn, engine: Engine, storage: Storage, photo) -> str:
    """Indexa uma foto reservada. Devolve o status final."""
    photo_id, organization_id, storage_key, attempts = photo
    try:
        data = storage.get(storage_key)
        detected = engine.index_faces(data)
    except InvalidImage as exc:
        _fail(conn, photo_id, attempts, str(exc), permanent=True)
        return "error"
    except Exception as exc:  # rede, armazenamento, motor: tenta de novo até o limite
        log.exception("falha ao indexar %s", photo_id)
        conn.rollback()
        _fail(conn, photo_id, attempts, "Não foi possível processar a foto. Tente enviar de novo.", permanent=False)
        return "error" if attempts >= config.MAX_ATTEMPTS else "queued"

    with conn.transaction():
        # Só grava se a foto ainda existe e ainda é nossa (pode ter sido excluída no meio do caminho).
        still = conn.execute("select 1 from photos where id = %s and status = 'processing' for update", (photo_id,)).fetchone()
        if not still:
            return "gone"
        conn.execute("delete from faces where photo_id = %s", (photo_id,))
        for face in detected:
            conn.execute(
                "insert into faces (organization_id, photo_id, embedding, bbox, detection_score, model_version) values (%s, %s, %s, %s, %s, %s)",
                (organization_id, photo_id, embedding_bytes(face.embedding), json.dumps(face.bbox), face.score, config.MODEL_VERSION),
            )
        conn.execute(
            """
            update photos set status = 'indexed', indexed_at = now(), face_count = %s, model_version = %s,
                              error_message = null, processing_started_at = null
            where id = %s
            """,
            (len(detected), config.MODEL_VERSION, photo_id),
        )
    return "indexed"


def run_once(conn, engine: Engine, storage: Storage) -> int:
    """Processa um lote. Devolve quantas fotos foram reservadas (0 = fila vazia)."""
    photos = claim(conn)
    for photo in photos:
        index_photo(conn, engine, storage, photo)
    return len(photos)
