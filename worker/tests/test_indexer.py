import psycopg

from nfworker import config, indexer
from tests.conftest import add_photo


def status(conn, photo_id):
    return conn.execute("select status::text, face_count, attempts, error_message from photos where id = %s", (photo_id,)).fetchone()


def drain(conn, engine, storage, org):
    """Processa só as fotos desta organização (o banco de teste é compartilhado)."""
    while True:
        rows = conn.execute(
            """
            update photos set status = 'processing', attempts = attempts + 1, processing_started_at = now()
            where id in (select id from photos where status = 'queued' and organization_id = %s limit 10 for update skip locked)
            returning id, organization_id, storage_key, attempts
            """,
            (org["id"],),
        ).fetchall()
        conn.commit()
        if not rows:
            return
        for row in rows:
            indexer.index_photo(conn, engine, storage, row)


def test_indexa_rostos_e_marca_a_foto(conn, engine, storage, org):
    photo = add_photo(conn, storage, org, "faces:1,2")
    drain(conn, engine, storage, org)
    assert status(conn, photo)[:2] == ("indexed", 2)
    faces = conn.execute("select length(embedding), model_version, organization_id from faces where photo_id = %s", (photo,)).fetchall()
    assert faces == [(config.EMBEDDING_BYTES, config.MODEL_VERSION, org["id"])] * 2


def test_foto_sem_rosto_fica_indexada_com_zero(conn, engine, storage, org):
    photo = add_photo(conn, storage, org, "faces:")
    drain(conn, engine, storage, org)
    assert status(conn, photo)[:2] == ("indexed", 0)


def test_rodar_de_novo_nao_reprocessa(conn, engine, storage, org):
    photo = add_photo(conn, storage, org, "faces:1")
    drain(conn, engine, storage, org)
    drain(conn, engine, storage, org)
    assert status(conn, photo)[2] == 1
    assert conn.execute("select count(*) from faces where photo_id = %s", (photo,)).fetchone()[0] == 1


def test_imagem_invalida_vira_erro_com_motivo(conn, engine, storage, org):
    photo = add_photo(conn, storage, org, "corrompida")
    drain(conn, engine, storage, org)
    s = status(conn, photo)
    assert s[0] == "error" and "ler a imagem" in s[3]


def test_falha_temporaria_tenta_ate_o_limite(conn, engine, storage, org):
    photo = add_photo(conn, storage, org, "instavel")
    drain(conn, engine, storage, org)
    s = status(conn, photo)
    assert s[0] == "error" and s[2] == config.MAX_ATTEMPTS


def test_foto_excluida_durante_o_processamento_nao_deixa_rostos(conn, engine, storage, org):
    photo = add_photo(conn, storage, org, "faces:1")
    row = conn.execute(
        "update photos set status = 'processing', attempts = 1, processing_started_at = now() where id = %s returning id, organization_id, storage_key, attempts",
        (photo,),
    ).fetchone()
    conn.execute("delete from photos where id = %s", (photo,))
    conn.commit()
    assert indexer.index_photo(conn, engine, storage, row) == "gone"
    assert conn.execute("select count(*) from faces where photo_id = %s", (photo,)).fetchone()[0] == 0


def test_foto_presa_volta_para_a_fila(conn, engine, storage, org):
    photo = add_photo(conn, storage, org, "faces:1", status="processing")
    conn.execute("update photos set processing_started_at = now() - interval '11 minutes' where id = %s", (photo,))
    recente = add_photo(conn, storage, org, "faces:1", status="processing")
    conn.execute("update photos set processing_started_at = now() where id = %s", (recente,))
    conn.commit()
    indexer.requeue_stuck(conn)
    assert status(conn, photo)[0] == "queued"
    assert status(conn, recente)[0] == "processing"


def test_duas_maquinas_nao_pegam_a_mesma_foto(conn, engine, storage, org):
    for _ in range(6):
        add_photo(conn, storage, org, "faces:1")
    sql = """
        update photos set status = 'processing'
        where id in (select id from photos where status = 'queued' and organization_id = %s limit 3 for update skip locked)
        returning id
    """
    with psycopg.connect(config.DATABASE_URL) as other:
        a = {r[0] for r in conn.execute(sql, (org["id"],)).fetchall()}  # transação de A aberta
        b = {r[0] for r in other.execute(sql, (org["id"],)).fetchall()}
        conn.commit()
        other.commit()
    assert len(a) == 3 and len(b) == 3 and not (a & b)
