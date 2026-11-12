"""Importação de pastas públicas do Google Drive ("qualquer pessoa com o link").

O serviço lista a pasta com a chave de API do NossaFoto, copia as fotos novas para o
nosso armazenamento e as coloca na fila de indexação. Subpastas viram álbuns. Nenhuma
credencial do cliente é usada nem guardada. A pasta é conferida de novo periodicamente.
"""
import hashlib
import json
import os
import logging
import urllib.error
import urllib.parse
import urllib.request
from dataclasses import dataclass

from . import config
from .storage import Storage

log = logging.getLogger("nfworker.drive")

FOLDER = "application/vnd.google-apps.folder"
# Trocável só para testes locais com um Drive falso.
API = os.environ.get("GOOGLE_DRIVE_API_URL", "https://www.googleapis.com/drive/v3/files")


class DriveError(Exception):
    """Erro com mensagem para mostrar ao cliente no Admin."""


@dataclass
class DriveFile:
    id: str
    name: str
    mime_type: str
    size: int
    sha256: str | None
    album: str | None  # caminho da subpasta; None = raiz da pasta ligada
    resource_key: str | None = None


class DriveClient:
    """Cliente mínimo da API do Drive v3, só leitura e só com chave de API."""

    def __init__(self, api_key: str):
        self.api_key = api_key

    def _get(self, url: str, keys: dict[str, str], timeout: float = 30):
        req = urllib.request.Request(url)
        if keys:
            req.add_header("X-Goog-Drive-Resource-Keys", ",".join(f"{k}/{v}" for k, v in keys.items()))
        try:
            return urllib.request.urlopen(req, timeout=timeout)
        except urllib.error.HTTPError as exc:
            if exc.code in (403, 404):
                raise DriveError("Não conseguimos abrir a pasta. Confira se ela continua compartilhada como “Qualquer pessoa com o link”.") from exc
            raise

    def list_children(self, folder_id: str, resource_key: str | None):
        keys = {folder_id: resource_key} if resource_key else {}
        token = None
        while True:
            params = {
                "q": f"'{folder_id}' in parents and trashed = false",
                "fields": "nextPageToken, files(id, name, mimeType, size, sha256Checksum, resourceKey)",
                "pageSize": "1000",
                "supportsAllDrives": "true",
                "includeItemsFromAllDrives": "true",
                "key": self.api_key,
            }
            if token:
                params["pageToken"] = token
            with self._get(f"{API}?{urllib.parse.urlencode(params)}", keys) as res:
                body = json.loads(res.read())
            yield from body.get("files", [])
            token = body.get("nextPageToken")
            if not token:
                return

    def download(self, file_id: str, resource_key: str | None) -> bytes:
        params = urllib.parse.urlencode({"alt": "media", "supportsAllDrives": "true", "key": self.api_key})
        keys = {file_id: resource_key} if resource_key else {}
        with self._get(f"{API}/{urllib.parse.quote(file_id)}?{params}", keys, timeout=120) as res:
            data = res.read(config.MAX_PHOTO_BYTES + 1)
        if len(data) > config.MAX_PHOTO_BYTES:
            raise ValueError("Arquivo maior que o limite de 30 MB.")
        return data


def walk(client, folder_id: str, resource_key: str | None) -> list[DriveFile]:
    """Todas as imagens da pasta e das subpastas (até DRIVE_MAX_DEPTH níveis)."""
    found: list[DriveFile] = []
    stack: list[tuple[str, str | None, str | None, int]] = [(folder_id, resource_key, None, 0)]
    seen_folders = {folder_id}
    while stack:
        fid, rkey, album, depth = stack.pop()
        for f in client.list_children(fid, rkey):
            mime = f.get("mimeType", "")
            if mime == FOLDER:
                if depth < config.DRIVE_MAX_DEPTH and f["id"] not in seen_folders:
                    seen_folders.add(f["id"])
                    name = (f.get("name") or "Pasta").strip()[:80]
                    stack.append((f["id"], f.get("resourceKey"), f"{album} / {name}" if album else name, depth + 1))
                continue
            if mime not in config.ACCEPTED_TYPES:
                continue
            size = int(f.get("size") or 0)
            if size <= 0 or size > config.MAX_PHOTO_BYTES:
                continue
            sha = (f.get("sha256Checksum") or "").lower() or None
            found.append(DriveFile(f["id"], (f.get("name") or "foto")[:255], mime, size, sha, album, f.get("resourceKey")))
            if len(found) >= config.DRIVE_MAX_FILES:
                return found
    return found


# ── Banco ──


def reset_on_start(conn) -> None:
    """Uma queda no meio da conferência deixa a pasta em syncing; ao subir, ela volta para a fila."""
    conn.execute("update drive_sources set status = 'pending', sync_requested_at = now() where status = 'syncing'")
    conn.commit()


def requeue_stuck(conn) -> None:
    conn.execute(
        "update drive_sources set status = 'pending' where status = 'syncing' "
        "and coalesce(last_synced_at, created_at) < now() - make_interval(mins => %s)",
        (config.DRIVE_SYNC_MINUTES + config.DRIVE_STUCK_MINUTES,),
    )
    conn.commit()


def claim(conn):
    """Reserva uma pasta que pediu conferência ou cuja última conferência já venceu."""
    row = conn.execute(
        """
        update drive_sources set status = 'syncing', sync_requested_at = null
        where id = (
          select id from drive_sources
          where status <> 'syncing'
            and (sync_requested_at is not null
                 or last_synced_at is null
                 or last_synced_at < now() - make_interval(mins => %s))
          order by sync_requested_at asc nulls last, last_synced_at asc nulls first
          limit 1
          for update skip locked
        )
        returning id, organization_id, collection_id, folder_id, resource_key, created_by
        """,
        (config.DRIVE_SYNC_MINUTES,),
    ).fetchone()
    conn.commit()
    if not row:
        return None
    keys = ("id", "organization_id", "collection_id", "folder_id", "resource_key", "created_by")
    return dict(zip(keys, row))


def photo_limit(conn, org_id: str) -> int | None:
    row = conn.execute(
        "select coalesce(s.photo_limit, p.photo_limit) from subscriptions s join plans p on p.id = s.plan_id where s.organization_id = %s",
        (org_id,),
    ).fetchone()
    if row:
        return row[0]
    trial = conn.execute("select photo_limit from plans where id = 'trial'").fetchone()
    return trial[0] if trial else 1000


def album_id(conn, cache: dict, org_id: str, collection_id: str, name: str | None) -> str | None:
    if not name:
        return None
    if name in cache:
        return cache[name]
    row = conn.execute(
        "select id from albums where organization_id = %s and collection_id = %s and name = %s order by created_at limit 1",
        (org_id, collection_id, name),
    ).fetchone()
    if not row:
        row = conn.execute(
            "insert into albums (organization_id, collection_id, name) values (%s, %s, %s) returning id", (org_id, collection_id, name)
        ).fetchone()
    cache[name] = row[0]
    return row[0]


def link(conn, org_id: str, collection_id: str, photo_id: str, album: str | None) -> bool:
    """Põe a foto no acervo. Devolve True se ela ainda não estava lá."""
    cur = conn.execute(
        "insert into collection_photos (organization_id, collection_id, photo_id, album_id) values (%s, %s, %s, %s) on conflict do nothing",
        (org_id, collection_id, photo_id, album),
    )
    return cur.rowcount == 1


def existing_photo(conn, org_id: str, file: DriveFile, sha: str | None) -> str | None:
    row = conn.execute(
        "select id from photos where organization_id = %s and origin = 'google_drive' and external_ref = %s and status <> 'error' limit 1",
        (org_id, file.id),
    ).fetchone()
    if row:
        return row[0]
    if sha:
        row = conn.execute("select id from photos where organization_id = %s and content_hash = %s", (org_id, sha)).fetchone()
        if row:
            return row[0]
    return None


def sync_source(conn, client, storage: Storage, source: dict) -> int:
    """Confere uma pasta e copia o que falta. Devolve quantas fotos novas entraram na fila."""
    org, col = source["organization_id"], source["collection_id"]
    try:
        files = walk(client, source["folder_id"], source["resource_key"])
    except DriveError as exc:
        conn.execute(
            "update drive_sources set status = 'error', last_error = %s, last_synced_at = now() where id = %s", (str(exc), source["id"])
        )
        conn.commit()
        return 0

    albums: dict = {}
    queued = 0
    imported = 0
    full = False
    for file in files:
        try:
            album = album_id(conn, albums, org, col, file.album)
            photo = existing_photo(conn, org, file, file.sha256)
            if photo:
                if link(conn, org, col, photo, album):
                    imported += 1
                conn.commit()
                continue
            if full:
                continue
            data = client.download(file.id, file.resource_key)
            sha = hashlib.sha256(data).hexdigest()
            # Lock por organização: a mesma regra de franquia do envio direto.
            conn.execute("select pg_advisory_xact_lock(hashtext(%s))", (org,))
            photo = existing_photo(conn, org, file, sha)
            if not photo:
                limit = photo_limit(conn, org)
                used = conn.execute("select count(*) from photos where organization_id = %s and status <> 'error'", (org,)).fetchone()[0]
                if limit is not None and used >= limit:
                    full = True
                    conn.rollback()
                    continue
                key = f"org/{org}/{sha}"
                storage.put(key, data, file.mime_type)
                photo = conn.execute(
                    """
                    insert into photos (organization_id, content_hash, origin, external_ref, storage_key, original_name, mime_type, size_bytes, status, created_by)
                    values (%s, %s, 'google_drive', %s, %s, %s, %s, %s, 'queued', %s)
                    on conflict (organization_id, content_hash) do update set content_hash = excluded.content_hash
                    returning id
                    """,
                    (org, sha, file.id, key, file.name, file.mime_type, len(data), source["created_by"]),
                ).fetchone()[0]
                queued += 1
            if link(conn, org, col, photo, album):
                imported += 1
            conn.commit()
        except DriveError:
            conn.rollback()
            raise
        except Exception:
            conn.rollback()
            log.exception("drive: falha ao copiar %s", file.id)

    error = "A franquia do plano acabou: parte das fotos da pasta não foi copiada." if full else None
    conn.execute(
        """
        update drive_sources set
          status = case when %s::text is null then 'ok' else 'error' end,
          last_error = %s, last_synced_at = now(), files_seen = %s, files_imported = files_imported + %s
        where id = %s
        """,
        (error, error, len(files), imported, source["id"]),
    )
    conn.commit()
    log.info("drive: pasta %s conferida, %s arquivos, %s novas na fila", source["id"], len(files), queued)
    return queued


def run_once(conn, client, storage: Storage) -> int:
    source = claim(conn)
    if not source:
        return -1
    try:
        return sync_source(conn, client, storage, source)
    except Exception as exc:
        conn.rollback()
        log.exception("drive: falha na pasta %s", source["id"])
        msg = str(exc) if isinstance(exc, DriveError) else "Não foi possível ler a pasta agora. Vamos tentar de novo mais tarde."
        conn.execute("update drive_sources set status = 'error', last_error = %s, last_synced_at = now() where id = %s", (msg, source["id"]))
        conn.commit()
        return 0
