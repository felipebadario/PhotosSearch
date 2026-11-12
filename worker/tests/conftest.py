import os
import uuid

import numpy as np
import psycopg
import pytest

os.environ.setdefault("DATABASE_URL", "postgres://postgres@localhost:5433/nossafoto")
os.environ.setdefault("WORKER_SECRET", "segredo-de-teste")
os.environ["NFWORKER_RUN_INDEXER"] = "0"

from nfworker import config  # noqa: E402
from nfworker.engine import DetectedFace, InvalidImage, NoFace  # noqa: E402


def unit(seed: int) -> np.ndarray:
    v = np.random.default_rng(seed).normal(size=config.EMBEDDING_DIM).astype(np.float32)
    return v / np.linalg.norm(v)


class FakeEngine:
    """O "arquivo" é um texto: 'faces:1,2' vira rostos das pessoas 1 e 2; 'selfie:1' é a pessoa 1."""

    def index_faces(self, data: bytes):
        text = data.decode()
        if text == "corrompida":
            raise InvalidImage("Não foi possível ler a imagem.")
        if text == "instavel":
            raise RuntimeError("falha temporária")
        people = [int(p) for p in text.removeprefix("faces:").split(",") if p]
        return [DetectedFace(unit(p), [0.0, 0.0, 10.0, 10.0], 0.9) for p in people]

    def selfie_embedding(self, data: bytes):
        text = data.decode()
        if text == "sem-rosto":
            raise NoFace("Não detectamos um rosto.")
        if not text.startswith("selfie:"):
            raise InvalidImage("Não foi possível ler a imagem.")
        return unit(int(text.removeprefix("selfie:")))


class FakeStorage:
    def __init__(self):
        self.objects: dict[str, bytes] = {}

    def get(self, key: str) -> bytes:
        return self.objects[key]


@pytest.fixture
def conn():
    with psycopg.connect(config.DATABASE_URL, prepare_threshold=None) as c:
        yield c


@pytest.fixture
def org(conn):
    """Organização descartável com um acervo; apagada (em cascata) ao final."""
    run = uuid.uuid4().hex[:10]
    org_id = f"wk-{run}"
    conn.execute("insert into organization (id, name, slug, created_at) values (%s, %s, %s, now())", (org_id, "Org worker", org_id))
    col = conn.execute(
        "insert into collections (organization_id, kind, name, slug) values (%s, 'permanent', 'Acervo', %s) returning id", (org_id, f"acervo-{run}")
    ).fetchone()[0]
    conn.commit()
    yield {"id": org_id, "collection": col, "run": run}
    conn.rollback()
    conn.execute("delete from organization where id = %s", (org_id,))
    conn.commit()


@pytest.fixture
def storage():
    return FakeStorage()


@pytest.fixture
def engine():
    return FakeEngine()


def add_photo(conn, storage, org, content: str, collection=None, status="queued"):
    key = f"org/{org['id']}/{uuid.uuid4().hex}"
    storage.objects[key] = content.encode()
    photo_id = conn.execute(
        "insert into photos (organization_id, content_hash, storage_key, status) values (%s, %s, %s, %s) returning id",
        (org["id"], uuid.uuid4().hex + uuid.uuid4().hex, key, status),
    ).fetchone()[0]
    conn.execute(
        "insert into collection_photos (organization_id, collection_id, photo_id) values (%s, %s, %s)",
        (org["id"], collection or org["collection"], photo_id),
    )
    conn.commit()
    return photo_id
