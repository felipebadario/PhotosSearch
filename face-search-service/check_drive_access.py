"""Diagnóstico de acesso ao Drive via Service Account: autentica, confere o
folder ID e lista o acervo recursivamente. Não baixa nenhuma foto e não
indexa nada — só isso já responde se o acesso funciona antes de qualquer
download em massa.
"""
import sys

from app.config import GOOGLE_DRIVE_FOLDER_ID
from download_photos import build_service, list_images


def main():
    print("1) Autenticando a Service Account...", flush=True)
    try:
        service = build_service()
    except Exception as exc:
        print(f"FALHOU ao autenticar: {type(exc).__name__}: {exc}", flush=True)
        return 1
    print("   OK.", flush=True)

    print(f"2) GOOGLE_DRIVE_FOLDER_ID = {GOOGLE_DRIVE_FOLDER_ID}", flush=True)

    print("3) Testando files.get no folder ID...", flush=True)
    try:
        folder = service.files().get(
            fileId=GOOGLE_DRIVE_FOLDER_ID,
            fields="id, name, mimeType, driveId",
            supportsAllDrives=True,
        ).execute()
    except Exception as exc:
        print(f"FALHOU em files.get: {type(exc).__name__}: {exc}", flush=True)
        return 1
    print(f"   OK: {folder}", flush=True)

    print("4) Listando os filhos diretos da pasta...", flush=True)
    try:
        response = service.files().list(
            q=f"'{GOOGLE_DRIVE_FOLDER_ID}' in parents and trashed = false",
            fields="nextPageToken, files(id, name, mimeType)",
            pageSize=1000, supportsAllDrives=True, includeItemsFromAllDrives=True,
        ).execute()
    except Exception as exc:
        print(f"FALHOU ao listar filhos: {type(exc).__name__}: {exc}", flush=True)
        return 1
    children = response.get("files", [])
    print(f"   OK: {len(children)} item(ns) direto(s) encontrados.", flush=True)
    for item in children[:20]:
        print(f"     - {item['name']} ({item['mimeType']})", flush=True)
    if len(children) > 20:
        print(f"     ... e mais {len(children) - 20}.", flush=True)

    print("5) Listando recursivamente (sem baixar nada)...", flush=True)
    stats = {}
    try:
        images = list_images(service, GOOGLE_DRIVE_FOLDER_ID, stats=stats)
    except Exception as exc:
        print(f"FALHOU na listagem recursiva: {type(exc).__name__}: {exc}", flush=True)
        return 1

    print("6) Resultado:", flush=True)
    print(f"   Subpastas visitadas (incluindo a raiz): {stats.get('folders', 0)}", flush=True)
    print(f"   JPG/JPEG encontrados: {len(images)}", flush=True)
    print("OK: a Service Account enxerga o acervo. Nenhuma foto foi baixada.", flush=True)
    return 0


if __name__ == "__main__":
    sys.exit(main())
