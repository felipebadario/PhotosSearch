# Contexto de build: a raiz do repositório (o motor facial vem de face-search-service/app).
FROM python:3.12-slim

ENV PYTHONUNBUFFERED=1 PIP_NO_CACHE_DIR=1 \
    MVP_STORAGE_DIR=/srv/engine-data \
    PYTHONPATH=/srv/worker:/srv/engine

RUN apt-get update && apt-get install -y --no-install-recommends build-essential libgomp1 libglib2.0-0 libxcb1 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /srv/worker
COPY worker/requirements.txt .
# O insightface puxa o opencv-python (com interface gráfica) por dependência, e ele
# sobrescreve o cv2 do headless. Reinstala só o headless para não exigir libs de X11.
RUN pip install -r requirements.txt \
    && pip uninstall -y opencv-python opencv-contrib-python \
    && pip install --force-reinstall --no-deps "opencv-python-headless>=4.10,<6" \
    && python -c "import cv2; print('cv2', cv2.__version__)"

COPY face-search-service/app /srv/engine/app
COPY worker/nfworker /srv/worker/nfworker

# Baixa o modelo buffalo_sc na imagem: o serviço sobe sem depender de download.
RUN python -c "from app.config import MODEL_ROOT, MODEL_NAME; from insightface.utils.storage import ensure_available; MODEL_ROOT.mkdir(parents=True, exist_ok=True); ensure_available('models', MODEL_NAME, root=str(MODEL_ROOT))"

EXPOSE 8080
CMD ["uvicorn", "nfworker.main:app", "--host", "0.0.0.0", "--port", "8080", "--workers", "1"]
