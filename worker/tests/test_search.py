import io
import uuid

import pytest
from fastapi.testclient import TestClient

import numpy as np

from nfworker import config, main, search
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


def test_limiar_separa_parecidos():
    a = unit(1)
    index = search.CollectionIndex(None, ["p1", "p2"], np.stack([a, unit(2)]))
    assert [m["photo_id"] for m in index.search({config.MODEL_VERSION: [a]}, "balanced")] == ["p1"]
    vazio = search.CollectionIndex(None, [], np.zeros((0, 512), dtype="float32"))
    assert vazio.search({config.MODEL_VERSION: [a]}, "balanced") == []
    assert uuid  # mantém o import usado em fixtures


def mix(a, b, w):
    """Vetor com semelhança controlada: cos(mix, a) cresce com w."""
    v = w * a + (1 - w) * b
    return v / np.linalg.norm(v)


def test_niveis_de_precisao_usam_o_limiar_do_modelo():
    a, b = unit(1), unit(2)
    t = config.THRESHOLDS[config.MODEL_VERSION]
    w = next(w for w in np.arange(0.1, 0.9, 0.002) if float(mix(a, b, w) @ a) > (t["balanced"] + t["strict"]) / 2)
    face = mix(a, b, w)  # semelhança com a fica entre os limiares
    sim = float(face @ a)
    t = config.THRESHOLDS[config.MODEL_VERSION]
    assert t["loose"] < sim < t["strict"], sim
    index = search.CollectionIndex(None, ["p"], face[None, :])
    assert index.search({config.MODEL_VERSION: [a]}, "loose") != []
    assert index.search({config.MODEL_VERSION: [a]}, "strict") == []
    # o valor gravado no acervo vira nível
    assert config.level_for(0.38) == "loose" and config.level_for(0.45) == "balanced" and config.level_for(0.52) == "strict"


def test_rosto_pequeno_exige_mais_semelhanca():
    a, b = unit(1), unit(2)
    t = config.THRESHOLDS[config.MODEL_VERSION]["balanced"]
    w = next(w for w in np.arange(0.2, 0.9, 0.002) if t + 0.005 < float(mix(a, b, w) @ a) < t + config.SMALL_FACE_PENALTY - 0.005)
    face = mix(a, b, w)
    grande = search.CollectionIndex(None, ["p"], face[None, :], small=[False])
    pequeno = search.CollectionIndex(None, ["p"], face[None, :], small=[True])
    assert grande.search({config.MODEL_VERSION: [a]}, "balanced") != []
    assert pequeno.search({config.MODEL_VERSION: [a]}, "balanced") == []


def test_varias_selfies_acham_o_rosto_com_e_sem_oculos():
    """Selfie com óculos (a) e sem óculos (c): cada foto parece com uma delas."""
    a, c, outro = unit(1), unit(5), unit(9)
    foto_com_oculos, foto_sem_oculos = mix(a, outro, 0.6), mix(c, outro, 0.6)
    index = search.CollectionIndex(None, ["com", "sem", "estranho"], np.stack([foto_com_oculos, foto_sem_oculos, outro]))
    so_uma = {m["photo_id"] for m in index.search({config.MODEL_VERSION: [a]}, "balanced")}
    duas = {m["photo_id"] for m in index.search({config.MODEL_VERSION: [a, c]}, "balanced")}
    assert so_uma == {"com"}
    assert duas == {"com", "sem"}


def test_mais_selfies_nao_baixam_o_rigor():
    """O melhor vetor isolado precisa de margem extra: um rosto no limite de uma só selfie não passa."""
    a, b, c = unit(1), unit(2), unit(5)
    t = config.THRESHOLDS[config.MODEL_VERSION]["balanced"]
    w = next(w for w in np.arange(0.2, 0.9, 0.002) if t + 0.003 < float(mix(a, b, w) @ a) < t + config.SINGLE_SELFIE_MARGIN - 0.003)
    index = search.CollectionIndex(None, ["p"], mix(a, b, w)[None, :])
    assert index.search({config.MODEL_VERSION: [a]}, "balanced") != []
    assert index.search({config.MODEL_VERSION: [a, c]}, "balanced") == []


class LegacyFake:
    version = config.LEGACY_MODEL_VERSION

    def selfie_embedding(self, data: bytes):
        return unit(1000 + int(data.decode().removeprefix("selfie:")))


def test_rostos_do_modelo_antigo_continuam_achados(conn, engine, storage, org, client):
    nova = add_photo(conn, storage, org, "faces:1")
    drain(conn, engine, storage, org)
    antiga = add_photo(conn, storage, org, "faces:", status="indexed")
    conn.execute(
        "insert into faces (organization_id, photo_id, embedding, bbox, detection_score, model_version) values (%s, %s, %s, '[0,0,100,100]', 0.9, %s)",
        (org["id"], antiga, unit(1001).astype("<f4").tobytes(), config.LEGACY_MODEL_VERSION),
    )
    conn.execute("update photos set model_version = %s where id = %s", (config.LEGACY_MODEL_VERSION, antiga))
    conn.commit()
    main.state.legacy_engine = LegacyFake()
    try:
        assert {m["photo_id"] for m in post(client, org, "selfie:1").json()["matches"]} == {nova, antiga}
        assert post(client, org, "selfie:2").json()["matches"] == []
    finally:
        main.state.legacy_engine = None


def post_many(client, org, selfies):
    return client.post(
        "/search",
        headers=AUTH,
        data={"organization_id": org["id"], "collection_id": org["collection"]},
        files=[("selfie", (f"s{i}.jpg", io.BytesIO(s.encode()), "image/jpeg")) for i, s in enumerate(selfies)],
    )


def test_api_aceita_ate_tres_selfies(conn, engine, storage, org, client):
    p1 = add_photo(conn, storage, org, "faces:1")
    p2 = add_photo(conn, storage, org, "faces:2")
    drain(conn, engine, storage, org)
    # Selfies de pessoas diferentes: o vetor médio não casa com ninguém, e cada uma sozinha
    # passa com folga (semelhança 1.0), então as duas fotos aparecem. A margem só pesa no limite.
    assert {m["photo_id"] for m in post_many(client, org, ["selfie:1", "selfie:2"]).json()["matches"]} == {p1, p2}
    # Uma selfie sem rosto é ignorada se outra servir
    assert {m["photo_id"] for m in post_many(client, org, ["sem-rosto", "selfie:1"]).json()["matches"]} == {p1}
    assert post_many(client, org, ["sem-rosto", "sem-rosto"]).json()["detail"]["code"] == "no_face"
    assert post_many(client, org, ["selfie:1"] * 4).status_code == 422
