import os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
# Na hospedagem, aponte para um disco persistente. Localmente mantém a estrutura.
STORAGE_DIR = Path(os.environ.get("MVP_STORAGE_DIR", str(BASE_DIR))).expanduser().resolve()
PHOTOS_DIR = STORAGE_DIR / "photos"
DATA_DIR = STORAGE_DIR / "data"
INDEX_PATH = DATA_DIR / "faces.pkl"
MODEL_ROOT = DATA_DIR / "insightface"
# buffalo_sc: detector SCRFD pequeno + MobileFaceNet, adequado ao teste em 512 MB.
MODEL_NAME = "buffalo_sc"
# Calibre com pares positivos E negativos do evento. Não é uma probabilidade.
# Teste 0.35, 0.40, 0.45, 0.50, 0.55: maior valor exige maior similaridade.
MATCH_THRESHOLD = 0.45
# Duas escalas: 640 para retratos próximos; 1024 para rostos menores em grupos.
# InsightFace 1.0.1 reúne as detecções e remove sobreposições antes do embedding.
DETECTION_SIZE = (640, 640)
INDEX_DETECTION_SIZE = [(640, 640), (1024, 1024)]
MAX_IMAGE_SIDE = 1280
MAX_IMAGE_PIXELS = 50_000_000
MAX_NON_JPEG_PIXELS = 8_000_000
MAX_UPLOAD_BYTES = 8 * 1024 * 1024
MAX_INDEX_FACES = 20_000
MAX_PHOTOS_BYTES = 10 * 1024 ** 3  # Deixa margem no limite de 16 GB do build Render.
REQUIRE_READY = os.environ.get("MVP_REQUIRE_READY", "0") == "1"
JPEG_EXTENSIONS = {".jpg", ".jpeg"}
GOOGLE_DRIVE_FOLDER_URL = "https://drive.google.com/drive/folders/1ENMCFrad7A-oQKQQEKNylCsG6jU1H-6-"


def ensure_directories():
    PHOTOS_DIR.mkdir(parents=True, exist_ok=True)
    DATA_DIR.mkdir(parents=True, exist_ok=True)


def photo_files():
    return sorted(p for p in PHOTOS_DIR.rglob("*")
                  if p.is_file() and p.suffix.lower() in JPEG_EXTENSIONS
                  and p.resolve().is_relative_to(PHOTOS_DIR.resolve()))
