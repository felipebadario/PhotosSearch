import os

# Versão do modelo gravada em cada rosto: trocar o modelo exige reindexar.
# Os rostos do modelo antigo são reprocessados em segundo plano (veja indexer.reindex_once);
# enquanto isso a busca compara cada rosto com a selfie no modelo em que ele foi gravado.
MODEL_VERSION = "buffalo_l-r50-v1"
LEGACY_MODEL_VERSION = "buffalo_sc-v1"
MODEL_DIR = os.environ.get("NFWORKER_MODEL_DIR", "/srv/models/buffalo_l")
LEGACY_MODEL_DIR = os.environ.get("NFWORKER_LEGACY_MODEL_DIR", "/srv/models/buffalo_sc")
ONNX_THREADS = int(os.environ.get("NFWORKER_ONNX_THREADS", "1"))
EMBEDDING_DIM = 512
EMBEDDING_BYTES = EMBEDDING_DIM * 4

DATABASE_URL = os.environ.get("DATABASE_URL", "")
WORKER_SECRET = os.environ.get("WORKER_SECRET", "")

R2_ACCOUNT_ID = os.environ.get("R2_ACCOUNT_ID", "")
R2_ACCESS_KEY_ID = os.environ.get("R2_ACCESS_KEY_ID", "")
R2_SECRET_ACCESS_KEY = os.environ.get("R2_SECRET_ACCESS_KEY", "")
R2_BUCKET = os.environ.get("R2_BUCKET", "")

BATCH_SIZE = int(os.environ.get("INDEX_BATCH_SIZE", "4"))
POLL_SECONDS = float(os.environ.get("INDEX_POLL_SECONDS", "5"))
MAX_ATTEMPTS = 3
# Foto presa em "processing" por mais que isso (queda do serviço) volta para a fila.
STUCK_MINUTES = 10
MAX_PHOTO_BYTES = 30 * 1024 * 1024
MAX_SELFIE_BYTES = 10 * 1024 * 1024
# Acervos mantidos em memória para a busca (cada rosto ocupa 2 KB).
SEARCH_CACHE_COLLECTIONS = int(os.environ.get("SEARCH_CACHE_COLLECTIONS", "8"))
DEFAULT_THRESHOLD = 0.45

# Detecção. O lado maior da foto sobe de 1280 para 1920 na indexação: o detector roda em
# 640 e 1024, mas o recorte do rosto que vai para o reconhecedor sai da imagem nesta resolução,
# então rostos pequenos de fotos de grupo chegam com mais detalhe.
DETECTION_THRESHOLD = 0.5
INDEX_MAX_SIDE = int(os.environ.get("INDEX_MAX_SIDE", "1920"))
SELFIE_MAX_SIDE = 1280
# Rostos menores que isso (em pixels, na imagem reduzida) ou com detecção fraca não são gravados:
# o vetor deles é ruído e é a principal fonte de falso positivo.
MIN_INDEX_FACE_PX = int(os.environ.get("MIN_INDEX_FACE_PX", "24"))
MIN_INDEX_DET_SCORE = float(os.environ.get("MIN_INDEX_DET_SCORE", "0.5"))
# Rosto pequeno nessas faixas ainda é gravado, mas a busca exige um pouco mais de semelhança.
SMALL_FACE_PX = 48
SMALL_FACE_PENALTY = float(os.environ.get("SMALL_FACE_PENALTY", "0.04"))
MIN_SELFIE_FACE_PX = 64
MAX_SELFIES = 3

# Limiares por modelo. Cada modelo tem a sua escala de semelhança, então o acervo guarda só o
# nível escolhido (o valor antigo 0.38 / 0.45 / 0.52 do Admin) e o worker traduz para o modelo.
# O r50 separa melhor as pessoas: com 0.34 o risco de um estranho passar é da ordem de 1 em 1 milhão
# de comparações, e a mesma pessoa de lado ou com óculos costuma ficar acima de 0.35.
LEVELS = ("loose", "balanced", "strict")
LEVEL_BY_STORED = {0.38: "loose", 0.45: "balanced", 0.52: "strict"}


def _thresholds(env: str, default: str) -> dict[str, float]:
    values = [float(v) for v in os.environ.get(env, default).split(",")]
    return dict(zip(LEVELS, values))


THRESHOLDS = {
    MODEL_VERSION: _thresholds("THRESHOLDS_R50", "0.30,0.34,0.40"),
    LEGACY_MODEL_VERSION: _thresholds("THRESHOLDS_LEGACY", "0.38,0.45,0.52"),
}
# Com mais de uma selfie, o vetor médio (mais estável) vale com o limiar normal; o melhor vetor
# isolado também vale, mas precisa passar uma margem extra, para mais selfies não virarem mais sorte.
SINGLE_SELFIE_MARGIN = 0.03


def level_for(stored: float) -> str:
    """O acervo guarda 0.38 / 0.45 / 0.52; devolve o nível mais próximo."""
    nearest = min(LEVEL_BY_STORED, key=lambda v: abs(v - stored))
    return LEVEL_BY_STORED[nearest]


def threshold_for(model_version: str, level: str) -> float:
    return THRESHOLDS.get(model_version, THRESHOLDS[LEGACY_MODEL_VERSION])[level]
# Desligado nos testes, que processam a fila à mão.
RUN_INDEXER = os.environ.get("NFWORKER_RUN_INDEXER", "1") == "1"
# Reprocessa em segundo plano as fotos indexadas com um modelo anterior.
REINDEX = os.environ.get("NFWORKER_REINDEX", "1") == "1"

# Pastas do Google Drive compartilhadas por link (só leitura, com a chave de API do NossaFoto).
GOOGLE_API_KEY = os.environ.get("GOOGLE_API_KEY", "")
DRIVE_SYNC_MINUTES = int(os.environ.get("DRIVE_SYNC_MINUTES", "30"))
DRIVE_STUCK_MINUTES = 60
DRIVE_MAX_FILES = int(os.environ.get("DRIVE_MAX_FILES", "20000"))
DRIVE_MAX_DEPTH = 4
ACCEPTED_TYPES = ("image/jpeg", "image/png", "image/webp")
