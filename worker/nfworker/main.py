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

from . import config, drive, indexer, search
from .engine import Engine, InvalidImage, NoFace
from .storage import Storage

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(name)s %(levelname)s %(message)s")
log = logging.getLogger("nfworker")


def connect():
    # prepare_threshold=None: compatível com o pooler do Neon.
    # Keepalive e tcp_user_timeout: sem eles, uma conexão que o Neon derruba enquanto
    # está ociosa deixa a próxima consulta esperando para sempre, e o ciclo do Drive
    # (ou o da indexação) para sem nenhum erro no log.
    return psycopg.connect(
        config.DATABASE_URL,
        prepare_threshold=None,
        connect_timeout=15,
        keepalives=1,
        keepalives_idle=30,
        keepalives_interval=10,
        keepalives_count=3,
        tcp_user_timeout=60000,
    )


class State:
    engine: Engine | None = None
    # Motor do modelo anterior: carregado só se um acervo ainda tiver rostos antigos.
    legacy_engine: Engine | None = None
    legacy_lock = threading.Lock()
    storage: Storage | None = None
    stop = threading.Event()
    wake = threading.Event()
    drive_wake = threading.Event()
    last_error: str | None = None
    indexed = 0
    reindexed = 0
    index_beat: float | None = None
    drive_beat: float | None = None
    drive_error: str | None = None


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
            state.index_beat = time.time()
            state.indexed += done
            state.last_error = None
            if done == 0 and config.REINDEX:
                # Fila vazia: aproveita para trocar rostos do modelo antigo pelos do atual.
                done = indexer.reindex_once(conn, state.engine, state.storage)
                state.reindexed += done
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


def drive_loop():
    """Confere as pastas do Google Drive ligadas aos acervos, uma por vez."""
    client = drive.DriveClient(config.GOOGLE_API_KEY)
    conn = None
    started = False
    last_requeue = 0.0
    while not state.stop.is_set():
        try:
            if conn is None or conn.closed:
                conn = connect()
            if not started:
                drive.reset_on_start(conn)
                started = True
            if time.monotonic() - last_requeue > 300:
                drive.requeue_stuck(conn)
                last_requeue = time.monotonic()
            queued = drive.run_once(conn, client, state.storage)
            state.drive_beat = time.time()
            state.drive_error = None
            if queued > 0:
                state.wake.set()
            if queued < 0:
                state.drive_wake.wait(60)
                state.drive_wake.clear()
        except Exception as exc:
            log.exception("erro no ciclo do Google Drive")
            state.drive_error = type(exc).__name__
            try:
                if conn is not None:
                    conn.close()
            except Exception:
                pass
            conn = None
            state.stop.wait(30)


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
            from .engine import current_engine
            from .storage import R2Storage

            state.engine = current_engine()
            state.storage = R2Storage()
            threading.Thread(target=preload_legacy, name="legacy", daemon=True).start()
    if config.RUN_INDEXER:
        threading.Thread(target=index_loop, name="indexer", daemon=True).start()
        if config.GOOGLE_API_KEY:
            threading.Thread(target=drive_loop, name="drive", daemon=True).start()
        else:
            log.warning("GOOGLE_API_KEY ausente: pastas do Google Drive não serão conferidas.")
    yield
    state.stop.set()
    state.wake.set()
    state.drive_wake.set()


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
        reindex_pending = indexer.reindex_pending(conn, config.MODEL_VERSION)
    now = time.time()
    ago = lambda t: None if t is None else round(now - t)  # noqa: E731
    return {
        "model": config.MODEL_VERSION,
        "indexed_since_start": state.indexed,
        "reindexed_since_start": state.reindexed,
        "reindex_pending": reindex_pending,
        "legacy_engine_loaded": state.legacy_engine is not None,
        "last_error": state.last_error,
        "photos": {s: n for s, n in rows},
        "index_loop_seconds_ago": ago(state.index_beat),
        "drive_enabled": bool(config.GOOGLE_API_KEY),
        "drive_loop_seconds_ago": ago(state.drive_beat),
        "drive_error": state.drive_error,
    }


@app.post("/wake")
def wake(authorization: str | None = Header(default=None)):
    """O Next chama depois de um envio, para a indexação começar sem esperar o próximo ciclo."""
    authorize(authorization)
    state.wake.set()
    state.drive_wake.set()
    return {"ok": True}


def preload_legacy():
    """Se ainda há rostos do modelo anterior, carrega o motor dele já na subida: a primeira busca não paga isso."""
    try:
        with connect() as conn:
            row = conn.execute("select 1 from faces where model_version = %s limit 1", (config.LEGACY_MODEL_VERSION,)).fetchone()
        if row:
            _legacy_engine()
    except Exception:
        log.exception("não foi possível pré-carregar o motor anterior")


def _legacy_engine() -> Engine:
    with state.legacy_lock:
        if state.legacy_engine is None:
            from .engine import legacy_engine

            log.info("carregando o motor anterior para rostos ainda não reindexados")
            state.legacy_engine = legacy_engine()
        return state.legacy_engine


def _embed(engine: Engine, selfies: list[bytes]):
    """Vetores das selfies num motor. Selfie sem rosto é ignorada se outra servir."""
    vectors, first_error = [], None
    for data in selfies:
        try:
            vectors.append(engine.selfie_embedding(data))
        except (InvalidImage, NoFace) as exc:
            first_error = first_error or exc
    if not vectors:
        raise first_error
    return vectors


@app.post("/search")
async def search_selfie(
    selfie: list[UploadFile] = File(...),
    organization_id: str = Form(...),
    collection_id: str = Form(...),
    threshold: float = Form(config.DEFAULT_THRESHOLD),
    authorization: str | None = Header(default=None),
):
    """Uma a três selfies da mesma pessoa (ex.: com e sem óculos). Nada delas é gravado."""
    authorize(authorization)
    if len(selfie) > config.MAX_SELFIES:
        raise HTTPException(status_code=422, detail={"code": "invalid_image", "message": f"Envie no máximo {config.MAX_SELFIES} selfies."})
    selfies: list[bytes] = []
    for upload in selfie:
        data = await upload.read(config.MAX_SELFIE_BYTES + 1)
        if len(data) > config.MAX_SELFIE_BYTES:
            raise HTTPException(status_code=413, detail="A selfie passa de 10 MB.")
        selfies.append(data)
    level = config.level_for(threshold)
    started = time.monotonic()
    try:
        engine = state.engine
        queries = {getattr(engine, "version", config.MODEL_VERSION): _embed(engine, selfies)}
        with connect() as conn:
            index = search.load_index(conn, organization_id, collection_id)
        if config.LEGACY_MODEL_VERSION in index.versions and config.LEGACY_MODEL_VERSION not in queries:
            try:
                queries[config.LEGACY_MODEL_VERSION] = _embed(_legacy_engine(), selfies)
            except (InvalidImage, NoFace):
                pass  # o modelo antigo não achou o rosto: compara só com os rostos novos
    except InvalidImage as exc:
        raise HTTPException(status_code=422, detail={"code": "invalid_image", "message": str(exc)})
    except NoFace as exc:
        raise HTTPException(status_code=422, detail={"code": "no_face", "message": str(exc)})
    finally:
        del selfies
    matches = index.search(queries, level)
    # Só tempos e contagens: nada da selfie nem do acervo vai para o log.
    log.info("busca: %d selfie(s), %d resultado(s), modelos=%s, %.1fs", len(queries[next(iter(queries))]), len(matches), "+".join(sorted(queries)), time.monotonic() - started)
    return {"matches": matches}
