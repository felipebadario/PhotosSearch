import os

# Versão do modelo gravada em cada rosto: trocar o modelo exige reindexar.
MODEL_VERSION = "buffalo_sc-v1"
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
# Desligado nos testes, que processam a fila à mão.
RUN_INDEXER = os.environ.get("NFWORKER_RUN_INDEXER", "1") == "1"
