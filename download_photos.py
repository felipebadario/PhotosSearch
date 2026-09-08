"""Baixa JPG/JPEG recursivamente, sem OAuth. Arquivos existentes são preservados."""
import os
from pathlib import Path
import sys
import threading
from concurrent.futures import ThreadPoolExecutor

from app.config import (GOOGLE_DRIVE_FOLDER_URL, PHOTOS_DIR, JPEG_EXTENSIONS,
                        MAX_PHOTOS_BYTES, ensure_directories, photo_files)


def main():
    ensure_directories()
    # Mantém o cache do gdown dentro do projeto, inclusive no Windows.
    os.environ.setdefault("XDG_CACHE_HOME", str(PHOTOS_DIR.parent / "data" / "cache"))
    import gdown
    downloaded = skipped = errors = 0
    total_bytes = sum(p.stat().st_size for p in photo_files())
    accounting = threading.Lock()
    stop = threading.Event()
    try:
        entries = gdown.download_folder(
            url=GOOGLE_DRIVE_FOLDER_URL, output=str(PHOTOS_DIR),
            skip_download=True, quiet=True, use_cookies=False,
        )
        if not entries:
            raise RuntimeError("A pasta não retornou arquivos; confira o link e as permissões.")
        images = [e for e in entries if Path(e.path).suffix.lower() in JPEG_EXTENSIONS]
        print(f"JPG/JPEG encontrados no Drive: {len(images)}", flush=True)
        if not images:
            raise RuntimeError("Nenhum JPG/JPEG encontrado na pasta e subpastas.")
        def download_one(item):
            nonlocal downloaded, skipped, errors, total_bytes
            i, entry = item
            if stop.is_set():
                return
            destination = Path(entry.local_path).resolve()
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
                result = gdown.download(id=entry.id, output=str(temporary), quiet=True, use_cookies=False)
                if not result:
                    raise RuntimeError("O Google Drive não entregou o arquivo.")
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
            except Exception as exc:
                temporary.unlink(missing_ok=True)
                print(f"Falha em {entry.path}: {exc}", flush=True)
                with accounting:
                    errors += 1
                    if errors >= 3 and downloaded == 0:
                        stop.set()
        # Apenas no preparo do acervo: quatro streams de 512 KiB em disco.
        # O servidor continua com um único worker e uma inferência por vez.
        with ThreadPoolExecutor(max_workers=4) as pool:
            for _ in pool.map(download_one, enumerate(images, 1)):
                pass
    except Exception as exc:
        errors += 1
        print(f"Não foi possível concluir o download: {exc}", flush=True)
    print(f"Baixados nesta execução: {downloaded} | Já existentes: {skipped} | Erros: {errors}")
    print(f"JPG/JPEG disponíveis em photos: {len(photo_files())}")
    if errors:
        print(f"Alternativa: baixe os álbuns manualmente e extraia os JPG/JPEG em {PHOTOS_DIR}.")
        print("O Drive pode limitar listagens ou downloads. Nenhum OAuth é necessário.")
    return 1 if errors else 0


if __name__ == "__main__":
    sys.exit(main())
