import pickle
import sys

import numpy as np

from app.config import (INDEX_PATH, MODEL_NAME, PHOTOS_DIR, INDEX_DETECTION_SIZE,
                        MAX_INDEX_FACES, ensure_directories, photo_files)
from app.face_service import FaceService, load_image, normalize


def main():
    ensure_directories()
    photos = photo_files()
    print(f"Fotos encontradas: {len(photos)}", flush=True)
    if not photos:
        print("Adicione JPG/JPEG em photos e execute novamente. O índice anterior foi preservado.")
        return 1
    try:
        service = FaceService(detection_size=INDEX_DETECTION_SIZE)
    except Exception as exc:
        print(f"Falha ao carregar InsightFace/modelo: {exc}")
        return 1
    vectors, paths = [], []
    processed = no_faces = errors = 0
    for number, path in enumerate(photos, 1):
        print(f"Processando {number}/{len(photos)}: {path.relative_to(PHOTOS_DIR)}", flush=True)
        try:
            faces = service.faces(load_image(path))
            photo_vectors = [normalize(face.embedding) for face in faces]
            if len(vectors) + len(photo_vectors) > MAX_INDEX_FACES:
                print(f"Limite de {MAX_INDEX_FACES} rostos excedido. Índice anterior preservado.")
                return 1
            vectors.extend(photo_vectors)
            paths.extend([path.relative_to(PHOTOS_DIR).as_posix()] * len(photo_vectors))
            processed += 1
            no_faces += not faces
        except Exception as exc:
            errors += 1
            print(f"Erro na imagem: {exc}", flush=True)
    if processed:
        matrix = np.stack(vectors).astype(np.float32) if vectors else np.empty((0, 512), dtype=np.float32)
        payload = {"version": 1, "model": MODEL_NAME, "embeddings": matrix, "paths": paths}
        temporary = INDEX_PATH.with_suffix(".pkl.tmp")
        with temporary.open("wb") as handle:
            pickle.dump(payload, handle, protocol=pickle.HIGHEST_PROTOCOL)
        temporary.replace(INDEX_PATH)
        print(f"Índice salvo em: {INDEX_PATH}")
    else:
        print("Nenhuma foto processada; índice anterior preservado.")
    print(f"Fotos processadas: {processed}\nRostos encontrados: {len(vectors)}\nFotos sem rosto: {no_faces}\nErros: {errors}")
    print("Reinicie o servidor após atualizar o índice.")
    return 1 if errors else 0


if __name__ == "__main__":
    sys.exit(main())
