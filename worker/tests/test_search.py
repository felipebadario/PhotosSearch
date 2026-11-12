import io
import uuid

import pytest
from fastapi.testclient import TestClient

from nfworker import main, search
from tests.conftest import add_photo, unit
from tests.test_indexer import drain

AUTH = {"authorization": "Bearer segredo-de-teste"}


@pytest.fixture
def client(engine, storage):
    main.state.engine = engine
    main.state.storage = storage
    with TestClient(main.app) as c:
        yield c


def post(client, org, selfie: str, collection=None, headers=AUTH, **extra):
    return client.post(
        "/search",
        headers=headers,
        data={"organization_id": org["id"], "collection_id": collection or org["collection"], **extra},
        files={"selfie": ("selfie.jpg", io.BytesIO(selfie.encode()), "image/jpeg")},
    )


def test_encontra_so_as_fotos_da_pessoa(conn, engine, storage, org, client):
    com_ana = add_photo(conn, storage, org, "faces:1,2")
    so_ana = add_photo(conn, storage, org, "faces:1")
    add_photo(conn, storage, org, "faces:2,3")
    add_photo(conn, storage, org, "faces:")
    drain(conn, engine, storage, org)
    res = post(client, org, "selfie:1")
    assert res.status_code == 200
    matches = res.json()["matches"]
    assert {m["photo_id"] for m in matches} == {com_ana, so_ana}
    assert all(m["similarity"] > 0.99 for m in matches)
    assert post(client, org, "selfie:9").json()["matches"] == []


def test_foto_com_dois_rostos_aparece_uma_vez(conn, engine, storage, org, client):
    photo = add_photo(conn, storage, org, "faces:1,1")
    drain(conn, engine, storage, org)
    assert [m["photo_id"] for m in post(client, org, "selfie:1").json()["matches"]] == [photo]


def test_busca_nao_sai_do_acervo_nem_da_organizacao(conn, engine, storage, org, client):
    outro = conn.execute(
        "insert into collections (organization_id, kind, name, slug) values (%s, 'permanent', 'Outro', %s) returning id", (org["id"], f"outro-{org['run']}")
    ).fetchone()[0]
    conn.commit()
    aqui = add_photo(conn, storage, org, "faces:1")
    add_photo(conn, storage, org, "faces:1", collection=outro)
    drain(conn, engine, storage, org)
    assert [m["photo_id"] for m in post(client, org, "selfie:1").json()["matches"]] == [aqui]
    # acervo certo, organização errada: nada
    res = client.post(
        "/search",
        headers=AUTH,
        data={"organization_id": "outra-org", "collection_id": org["collection"]},
        files={"selfie": ("s.jpg", io.BytesIO(b"selfie:1"), "image/jpeg")},
    )
    assert res.json()["matches"] == []


def test_indice_acompanha_fotos_novas_e_excluidas(conn, engine, storage, org, client):
    primeira = add_photo(conn, storage, org, "faces:1")
    drain(conn, engine, storage, org)
    assert len(post(client, org, "selfie:1").json()["matches"]) == 1
    add_photo(conn, storage, org, "faces:1")
    drain(conn, engine, storage, org)
    assert len(post(client, org, "selfie:1").json()["matches"]) == 2
    conn.execute("delete from photos where id = %s", (primeira,))
    conn.commit()
    assert len(post(client, org, "selfie:1").json()["matches"]) == 1


def test_foto_ainda_na_fila_nao_aparece(conn, engine, storage, org, client):
    add_photo(conn, storage, org, "faces:1")
    assert post(client, org, "selfie:1").json()["matches"] == []


def test_erros_da_selfie(org, client):
    assert post(client, org, "sem-rosto").json()["detail"]["code"] == "no_face"
    assert post(client, org, "lixo").json()["detail"]["code"] == "invalid_image"


def test_exige_o_segredo(org, client):
    assert post(client, org, "selfie:1", headers={}).status_code == 401
    assert post(client, org, "selfie:1", headers={"authorization": "Bearer errado"}).status_code == 401
    assert client.get("/status").status_code == 401
    assert client.post("/wake", headers=AUTH).status_code == 200
    assert client.get("/health").json() == {"ok": True}


def test_limiar_separa_parecidos(conn, org):
    a = unit(1)
    index = search.CollectionIndex(None, ["p1", "p2"], __import__("numpy").stack([a, unit(2)]))
    assert [m["photo_id"] for m in index.search(a, 0.45)] == ["p1"]
    assert search.CollectionIndex(None, [], __import__("numpy").zeros((0, 512), dtype="float32")).search(a, 0.45) == []
    assert uuid  # mantém o import usado em fixtures
