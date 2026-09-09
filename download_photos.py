"""Baixa JPG/JPEG recursivamente via API do Google Drive (Service Account).

Autenticado: cada arquivo é lido pelo ID, sem depender do link público
anônimo nem do limite de "excesso de acessos" que ele impõe. A pasta do
Drive precisa estar compartilhada com o e-mail da service account (leitora).
Arquivos já baixados são preservados entre execuções.
"""
import json
import os
from collections import deque
from pathlib import Path
import sys
import threading
import time
from concurrent.futures import ThreadPoolExecutor
from types import SimpleNamespace

from app.config import (GOOGLE_DRIVE_FOLDER_ID, GOOGLE_SERVICE_ACCOUNT_JSON_ENV,
                        PHOTOS_DIR, JPEG_EXTENSIONS, MAX_PHOTOS_BYTES,
                        ensure_directories, photo_files)

DRIVE_FOLDER_MIME = "application/vnd.google-apps.folder"


def build_service():
    from google.oauth2 import service_account
    from googleapiclient.discovery import build
    raw = os.environ.get(GOOGLE_SERVICE_ACCOUNT_JSON_ENV)
    if not raw:
        raise RuntimeError(f"Defina a variável {GOOGLE_SERVICE_ACCOUNT_JSON_ENV} com a "
                           "credencial JSON da service account.")
    info = json.loads(raw)
    credentials = service_account.Credentials.from_service_account_info(
        info, scopes=["https://www.googleapis.com/auth/drive.readonly"])
    return build("drive", "v3", credentials=credentials, cache_discovery=False)


_thread_local = threading.local()


def thread_service():
    """Um cliente Drive por thread: o transporte HTTP da googleapiclient
    (httplib2) não é thread-safe, e compartilhar uma única instância entre
    downloads concorrentes corrompe a memória do processo (visto em
    produção como "free(): corrupted unsorted chunks", que mata o build
    inteiro sem nem passar por uma exceção Python)."""
    if not hasattr(_thread_local, "service"):
        _thread_local.service = build_service()
    return _thread_local.service


def list_images(service, folder_id, prefix="", stats=None):
    """Percorre a pasta e subpastas recursivamente; devolve [(id, caminho)].

    `stats`, se passado, recebe contagens de diagnóstico (subpastas visitadas
    e JPG/JPEG encontrados) sem alterar o retorno usado pelo download real.
    """
    if stats is not None:
        stats["folders"] = stats.get("folders", 0) + 1
    images = []
    page_token = None
    while True:
        response = service.files().list(
            q=f"'{folder_id}' in parents and trashed = false",
            fields="nextPageToken, files(id, name, mimeType)",
            pageSize=1000, pageToken=page_token,
            supportsAllDrives=True, includeItemsFromAllDrives=True,
        ).execute()
        for item in response.get("files", []):
            relative = f"{prefix}{item['name']}"
            if item["mimeType"] == DRIVE_FOLDER_MIME:
                images.extend(list_images(service, item["id"], prefix=relative + "/", stats=stats))
            elif Path(item["name"]).suffix.lower() in JPEG_EXTENSIONS:
                images.append(SimpleNamespace(id=item["id"], path=relative))
                if stats is not None:
                    stats["jpegs"] = stats.get("jpegs", 0) + 1
        page_token = response.get("nextPageToken")
        if not page_token:
            return images


def download_file(service, file_id, destination):
    from googleapiclient.http import MediaIoBaseDownload
    request = service.files().get_media(fileId=file_id, supportsAllDrives=True)
    with open(destination, "wb") as handle:
        downloader = MediaIoBaseDownload(handle, request)
        done = False
        while not done:
            _, done = downloader.next_chunk()


def main():
    ensure_directories()
    downloaded = skipped = errors = 0
    total_bytes = sum(p.stat().st_size for p in photo_files())
    accounting = threading.Lock()
    stop = threading.Event()
    try:
        service = build_service()
        images = list_images(service, GOOGLE_DRIVE_FOLDER_ID)
        print(f"JPG/JPEG encontrados no Drive: {len(images)}", flush=True)
        if not images:
            raise RuntimeError("Nenhum JPG/JPEG encontrado na pasta e subpastas.")
        retry_queue = []
        # Falhas recentes em sequência sugerem um problema sistêmico (rede,
        # credencial ou cota), não um arquivo isolado; insistir arquivo a
        # arquivo só desperdiçaria o orçamento de minutos do build gratuito.
        recent = deque(maxlen=15)
        def download_one(item, is_retry=False):
            nonlocal downloaded, skipped, errors, total_bytes
            i, entry = item
            if stop.is_set():
                return
            destination = (PHOTOS_DIR / entry.path).resolve()
            if not destination.is_relative_to(PHOTOS_DIR.resolve()):
                with accounting:
                    errors += 1
                print("Caminho inválido ignorado.", flush=True)
                return
            if destination.is_file() and destination.stat().st_size > 0:
                with accounting:
                    skipped += 1
                return
            destination.parent.mkdir(parents=True, exist_ok=True)
            temporary = destination.with_suffix(destination.suffix + ".part")
            print(f"Baixando {i}/{len(images)}: {entry.path}", flush=True)
            try:
                last_exc = None
                for attempt in range(3):
                    try:
                        download_file(thread_service(), entry.id, temporary)
                        last_exc = None
                        break
                    except Exception as exc:
                        last_exc = exc
                    temporary.unlink(missing_ok=True)
                    if stop.is_set():
                        break
                    if attempt < 2:
                        time.sleep(3 * (attempt + 1))
                if last_exc:
                    raise last_exc
                from PIL import Image
                with Image.open(temporary) as image:
                    if image.format not in {"JPEG", "MPO"}:
                        raise ValueError(f"Conteúdo recebido não é JPEG: {image.format}.")
                    if downloaded == 0:
                        print(f"Formato detectado: {image.format}; tamanho: {image.size}", flush=True)
                    image.verify()
                with accounting:
                    if total_bytes + temporary.stat().st_size > MAX_PHOTOS_BYTES:
                        stop.set()
                        raise RuntimeError("O acervo excede 10 GiB, limite definido para o build gratuito.")
                    temporary.replace(destination)
                    total_bytes += destination.stat().st_size
                    downloaded += 1
                    recent.append(True)
            except Exception as exc:
                temporary.unlink(missing_ok=True)
                print(f"Falha em {entry.path}: {exc}", flush=True)
                with accounting:
                    recent.append(False)
                    if len(recent) == recent.maxlen and not any(recent):
                        print("Últimas tentativas todas negadas: parece um problema sistêmico "
                              "(rede, credencial ou cota). Parando em vez de insistir.", flush=True)
                        stop.set()
                    if not is_retry and not stop.is_set():
                        # Falha isolada, sem parada definitiva (limite de disco ou
                        # problema sistêmico): adia para uma rodada final, depois
                        # que o resto do acervo já tiver dado tempo de uma falha
                        # pontual (rede, timeout) se resolver sozinha.
                        retry_queue.append(item)
                    else:
                        errors += 1
                        if errors >= 3 and downloaded == 0:
                            stop.set()
        # Autenticado pela API: sem o limite de acessos do download anônimo por
        # link público. O servidor continua com um único worker e uma
        # inferência por vez.
        with ThreadPoolExecutor(max_workers=4) as pool:
            for _ in pool.map(download_one, enumerate(images, 1)):
                pass
        if retry_queue and not stop.is_set():
            print(f"Tentando novamente {len(retry_queue)} arquivo(s) que falharam...", flush=True)
            time.sleep(20)
            with ThreadPoolExecutor(max_workers=4) as pool:
                for _ in pool.map(lambda item: download_one(item, is_retry=True), retry_queue):
                    pass
    except Exception as exc:
        errors += 1
        print(f"Não foi possível concluir o download: {exc}", flush=True)
    print(f"Baixados nesta execução: {downloaded} | Já existentes: {skipped} | Erros: {errors}")
    print(f"JPG/JPEG disponíveis em photos: {len(photo_files())}")
    if errors:
        print(f"Alternativa: baixe os álbuns manualmente e extraia os JPG/JPEG em {PHOTOS_DIR}.")
        print("Confira se a pasta do Drive está compartilhada com o e-mail da service account.")
    return 1 if errors else 0


if __name__ == "__main__":
    sys.exit(main())
