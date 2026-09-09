import asyncio
from contextlib import asynccontextmanager
import logging

from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from python_multipart import MultipartParser
from python_multipart.multipart import parse_options_header
from starlette.concurrency import run_in_threadpool

from app.config import BASE_DIR, MATCH_THRESHOLD, MAX_UPLOAD_BYTES, PHOTOS_DIR, REQUIRE_READY, ensure_directories
from app.face_service import FaceIndex, FaceService, InvalidImage, NoFace, load_image

logger = logging.getLogger("uvicorn.error")


@asynccontextmanager
async def lifespan(app):
    ensure_directories()
    app.state.service = app.state.index = None
    app.state.search_lock = asyncio.Lock()
    try:
        app.state.index = FaceIndex.load()
        if len(app.state.index.paths):
            app.state.service = await run_in_threadpool(FaceService)
        else:
            logger.warning("Índice sem rostos. Adicione fotos e execute index_photos.py.")
    except Exception as exc:
        logger.error("Busca indisponível: %s. Execute index_photos.py e reinicie.", exc)
    if REQUIRE_READY and app.state.service is None:
        raise RuntimeError("Deploy sem índice/modelo utilizável: execute build_render.py no build.")
    yield
    app.state.service = app.state.index = None


ensure_directories()
app = FastAPI(title="Encontre suas fotos", lifespan=lifespan)
app.mount("/static", StaticFiles(directory=BASE_DIR / "static"), name="static")
app.mount("/photos", StaticFiles(directory=PHOTOS_DIR, follow_symlink=False), name="photos")


@app.middleware("http")
async def response_headers(request, call_next):
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    if request.url.path.startswith("/api/"):
        response.headers["Cache-Control"] = "no-store"
    return response


@app.get("/")
async def home():
    return FileResponse(BASE_DIR / "static" / "index.html")


@app.get("/api/health")
async def health():
    ready = app.state.service is not None and app.state.index is not None
    return {"ready": ready, "faces": len(app.state.index.paths) if app.state.index else 0}


async def read_selfie(request):
    """Multipart inteiramente em RAM: UploadFile padrão pode gravar temporários."""
    content_type, options = parse_options_header(request.headers.get("content-type", ""))
    boundary = options.get(b"boundary")
    if content_type != b"multipart/form-data" or not boundary or len(boundary) > 200:
        raise HTTPException(400, "Envie a selfie no campo file, como multipart/form-data.")
    data = bytearray()
    headers = {}
    header_field, header_value = bytearray(), bytearray()
    state = {"is_file": False, "files": 0, "ended": False, "parts": 0, "header_bytes": 0}

    def part_begin():
        state["parts"] += 1
        if state["parts"] > 4:
            raise HTTPException(400, "Envie somente uma selfie.")
        headers.clear()
        state["is_file"] = False

    def on_header_field(chunk, start, end):
        header_field.extend(chunk[start:end])
        check_headers(end - start)

    def on_header_value(chunk, start, end):
        header_value.extend(chunk[start:end])
        check_headers(end - start)

    def check_headers(length):
        state["header_bytes"] += length
        if state["header_bytes"] > 16_384:
            raise HTTPException(400, "Cabeçalhos do envio muito grandes.")

    def on_header_end():
        headers[bytes(header_field).lower()] = bytes(header_value)
        header_field.clear()
        header_value.clear()

    def on_headers_finished():
        _, disposition = parse_options_header(headers.get(b"content-disposition", b""))
        state["is_file"] = disposition.get(b"name") == b"file"
        if state["is_file"]:
            state["files"] += 1
            if state["files"] != 1:
                raise HTTPException(400, "Envie somente uma selfie.")

    def on_part_data(chunk, start, end):
        if state["is_file"]:
            if len(data) + end - start > MAX_UPLOAD_BYTES:
                raise HTTPException(413, "A selfie deve ter até 8 MB.")
            data.extend(chunk[start:end])

    def on_end():
        state["ended"] = True

    parser = MultipartParser(boundary, {
        "on_part_begin": part_begin, "on_header_field": on_header_field,
        "on_header_value": on_header_value, "on_header_end": on_header_end,
        "on_headers_finished": on_headers_finished, "on_part_data": on_part_data,
        "on_end": on_end,
    })
    received = 0
    try:
        async for chunk in request.stream():
            received += len(chunk)
            if received > MAX_UPLOAD_BYTES + 65_536:
                raise HTTPException(413, "A selfie deve ter até 8 MB.")
            parser.write(chunk)
        parser.finalize()
        if not state["ended"] or state["files"] != 1 or not data:
            raise HTTPException(400, "Envie uma imagem no campo file.")
        return data
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(400, "Envio incompleto ou inválido. Tente novamente.") from exc
    finally:
        parser.close()


def search_image(data, service, index):
    try:
        image = load_image(data)
        data.clear()
        embedding = service.selfie_embedding(image)
        matches = index.search(embedding, MATCH_THRESHOLD)
        return {"count": len(matches), "matches": matches}
    finally:
        data.clear()


@app.post("/api/search")
async def search(request: Request):
    if app.state.service is None or app.state.index is None:
        raise HTTPException(503, "As fotos ainda não estão prontas para busca. Tente novamente mais tarde.")
    if app.state.search_lock.locked():
        raise HTTPException(429, "Há uma busca em andamento. Aguarde alguns segundos e tente novamente.")
    async with app.state.search_lock:
        data = await read_selfie(request)
        try:
            return await run_in_threadpool(search_image, data, app.state.service, app.state.index)
        except (InvalidImage, NoFace) as exc:
            raise HTTPException(422, str(exc)) from exc
        except Exception:
            logger.error("Falha na inferência da selfie; nenhum conteúdo do envio foi registrado.")
            raise HTTPException(500, "Não foi possível concluir a busca. Tente novamente.")
        finally:
            data.clear()
