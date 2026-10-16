"""Preparação do acervo no build; o runtime nunca baixa/reindexa fotos."""
import os
import subprocess
import sys

# Defina antes de importar NumPy/ONNX. O mesmo limite existe no render.yaml.
for variable in ("OMP_NUM_THREADS", "OPENBLAS_NUM_THREADS", "MKL_NUM_THREADS"):
    os.environ[variable] = "1"


def main():
    from app.config import BASE_DIR, INDEX_PATH, MODEL_NAME, ensure_directories
    ensure_directories()
    # Não iniciar a aplicação com um acervo parcial/ausente disfarçado de pronto.
    for script in ("download_photos.py", "index_photos.py"):
        result = subprocess.run([sys.executable, script], cwd=BASE_DIR)
        if result.returncode:
            print(f"Build interrompido: {script} falhou. Confira os logs e a pasta pública do Drive.", flush=True)
            return 1
    from app.face_service import FaceIndex
    index = FaceIndex.load(INDEX_PATH)
    if not len(index.paths):
        print("Build interrompido: nenhum rosto indexado.", flush=True)
        return 1
    print(f"Acervo pronto: {len(index.photos)} fotos com rostos, {len(index.paths)} rostos, modelo {MODEL_NAME}.", flush=True)
    return 0


if __name__ == "__main__":
    sys.exit(main())
