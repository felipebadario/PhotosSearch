# Contexto de build: a raiz do repositório.
FROM python:3.12-slim

ENV PYTHONUNBUFFERED=1 PIP_NO_CACHE_DIR=1 \
    PYTHONPATH=/srv/worker

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

# Modelos dentro da imagem: o serviço sobe sem depender de download.
# buffalo_l: só o detector det_10g e o reconhecedor w600k_r50 (os outros três não são usados).
# buffalo_sc: o modelo anterior, usado só enquanto houver rostos antigos para reindexar.
RUN python -c "from insightface.utils.storage import ensure_available as e; e('models', 'buffalo_l', root='/srv'); e('models', 'buffalo_sc', root='/srv')" \
    && rm -f /srv/models/*.zip /srv/models/buffalo_l/1k3d68.onnx /srv/models/buffalo_l/2d106det.onnx /srv/models/buffalo_l/genderage.onnx \
    && ls -la /srv/models/buffalo_l /srv/models/buffalo_sc

COPY worker/nfworker /srv/worker/nfworker

EXPOSE 8080
CMD ["uvicorn", "nfworker.main:app", "--host", "0.0.0.0", "--port", "8080", "--workers", "1"]
