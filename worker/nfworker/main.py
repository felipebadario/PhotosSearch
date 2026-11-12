"""Serviço de rostos do NossaFoto: indexa as fotos da fila e responde buscas por selfie.

Só o Next.js fala com este serviço (segredo compartilhado). A selfie é processada
em memória e descartada: nada dela é gravado nem registrado.
"""
import hmac
import logging
import threading
import time
from contextlib import asynccontextmanager

import psycopg
from fastapi import FastAPI, File, Form, Header, HTTPException, UploadFile

from . import config, indexer, search
from .engine import Engine, InvalidImage, NoFace
from .storage import Storage

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(name)s %(levelname)s %(message)s")
log = logging.getLogger("nfworker")


def connect():
    # prepare_threshold=None: compatível com o pooler do Neon.
    return psycopg.connect(config.DATABASE_URL, prepare_threshold=None)


class State:
    engine: Engine | None = None
    storage: Storage | None = None
    stop = threading.Event()
    wake = threading.Event()
    last_error: str | None = None
    indexed = 0


state = State()


def index_loop():
    conn = None
    last_requeue = 0.0
    while not state.stop.is_set():
        try:
            if conn is None or conn.closed:
                conn = connect()
            if time.monotonic() - last_requeue > 60:
                indexer.requeue_stuck(conn)
                last_requeue = time.monotonic()
            done = indexer.run_once(conn, state.engine, state.storage)
            state.indexed += done
            state.last_error = None
            if done == 0:
                state.wake.wait(config.POLL_SECONDS)
                state.wake.clear()
        except Exception as exc:
            log.exception("erro no ciclo de indexação")
            state.last_error = type(exc).__name__
            try:
                if conn is not None:
                    conn.close()
            except Exception:
                pass
            conn = None
            state.stop.wait(10)


@asynccontextmanager
async def lifespan(_: FastAPI):
    if state.engine is None:
        import os

        if os.environ.get("NFWORKER_ENGINE") == "dev":
            from .dev_engine import DevColorEngine
            from .storage import LocalStorage

            log.warning("MOTOR DE DESENVOLVIMENTO: não reconhece rostos de verdade.")
            state.engine = DevColorEngine()
            state.storage = LocalStorage()
        else:
            from .engine import InsightFaceEngine
            from .storage import R2Storage

            state.engine = InsightFaceEngine()
            state.storage = R2Storage()
    if config.RUN_INDEXER:
        threading.Thread(target=index_loop, name="indexer", daemon=True).start()
    yield
    state.stop.set()
    state.wake.set()


app = FastAPI(lifespan=lifespan, docs_url=None, redoc_url=None, openapi_url=None)


def authorize(authorization: str | None):
    expected = f"Bearer {config.WORKER_SECRET}"
    if not config.WORKER_SECRET or not authorization or not hmac.compare_digest(authorization.encode(), expected.encode()):
        raise HTTPException(status_code=401, detail="Não autorizado.")


@app.get("/health")
def health():
    return {"ok": True}


@app.get("/status")
def status(authorization: str | None = Header(default=None)):
    authorize(authorization)
    with connect() as conn:
        rows = conn.execute("select status::text, count(*) from photos group by status").fetchall()
    return {"model": config.MODEL_VERSION, "indexed_since_start": state.indexed, "last_error": state.last_error, "photos": {s: n for s, n in rows}}


@app.post("/wake")
def wake(authorization: str | None = Header(default=None)):
    """O Next chama depois de um envio, para a indexação começar sem esperar o próximo ciclo."""
    authorize(authorization)
    state.wake.set()
    return {"ok": True}


@app.post("/search")
async def search_selfie(
    selfie: UploadFile = File(...),
    organization_id: str = Form(...),
    collection_id: str = Form(...),
    threshold: float = Form(config.DEFAULT_THRESHOLD),
    authorization: str | None = Header(default=None),
):
    authorize(authorization)
    data = await selfie.read(config.MAX_SELFIE_BYTES + 1)
    if len(data) > config.MAX_SELFIE_BYTES:
        raise HTTPException(status_code=413, detail="A selfie passa de 10 MB.")
    threshold = min(max(threshold, 0.2), 0.9)
    try:
        embedding = state.engine.selfie_embedding(data)
    except InvalidImage as exc:
        raise HTTPException(status_code=422, detail={"code": "invalid_image", "message": str(exc)})
    except NoFace as exc:
        raise HTTPException(status_code=422, detail={"code": "no_face", "message": str(exc)})
    finally:
        del data
    with connect() as conn:
        matches = search.search_collection(conn, organization_id, collection_id, embedding, threshold)
    return {"matches": matches}
