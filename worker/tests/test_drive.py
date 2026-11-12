import hashlib

import pytest

from nfworker import drive


class FakeDrive:
    """Árvore em memória: pasta → lista de itens. Conteúdo do arquivo = bytes do texto."""

    def __init__(self, tree, contents, private=()):
        self.tree = tree
        self.contents = contents
        self.private = set(private)
        self.downloads = []

    def list_children(self, folder_id, resource_key):
        if folder_id in self.private:
            raise drive.DriveError("Não conseguimos abrir a pasta.")
        yield from self.tree.get(folder_id, [])

    def download(self, file_id, resource_key):
        self.downloads.append(file_id)
        return self.contents[file_id]


def img(fid, name="foto.jpg", sha=False, contents=None, mime="image/jpeg"):
    data = (contents or {}).get(fid, b"")
    item = {"id": fid, "name": name, "mimeType": mime, "size": str(len(data) or 10)}
    if sha:
        item["sha256Checksum"] = hashlib.sha256(data).hexdigest()
    return item


def add_source(conn, org, folder="raiz"):
    sid = conn.execute(
        "insert into drive_sources (organization_id, collection_id, folder_id, folder_name) values (%s, %s, %s, 'Pasta') returning id",
        (org["id"], org["collection"], folder),
    ).fetchone()[0]
    conn.commit()
    return sid


def source_row(conn, sid):
    return conn.execute("select status, last_error, files_seen, files_imported, sync_requested_at from drive_sources where id = %s", (sid,)).fetchone()


@pytest.fixture
def tree():
    contents = {"a": b"faces:1", "b": b"faces:2", "c": b"faces:1,2", "doc": b"pdf"}
    t = {
        "raiz": [
            img("a", "a.jpg", contents=contents),
            {"id": "sub", "name": "Culto de domingo", "mimeType": "application/vnd.google-apps.folder"},
            img("doc", "x.pdf", contents=contents, mime="application/pdf"),
        ],
        "sub": [img("b", "b.jpg", contents=contents), img("c", "c.png", contents=contents, mime="image/png")],
    }
    return FakeDrive(t, contents)


def test_copia_fotos_e_cria_album_por_subpasta(conn, org, storage, tree):
    sid = add_source(conn, org)
    assert drive.run_once(conn, tree, storage) == 3
    status, error, seen, imported, requested = source_row(conn, sid)
    assert (status, error, seen, imported, requested) == ("ok", None, 3, 3, None)
    rows = conn.execute(
        """select p.original_name, p.status::text, p.origin, a.name from photos p
           join collection_photos cp on cp.photo_id = p.id left join albums a on a.id = cp.album_id
           where p.organization_id = %s order by p.original_name""",
        (org["id"],),
    ).fetchall()
    assert rows == [
        ("a.jpg", "queued", "google_drive", None),
        ("b.jpg", "queued", "google_drive", "Culto de domingo"),
        ("c.png", "queued", "google_drive", "Culto de domingo"),
    ]
    assert len(storage.objects) == 3


def test_segunda_conferencia_nao_baixa_de_novo(conn, org, storage, tree):
    add_source(conn, org)
    drive.run_once(conn, tree, storage)
    assert drive.run_once(conn, tree, storage) == -1  # nada vencido
    conn.execute("update drive_sources set sync_requested_at = now() where organization_id = %s", (org["id"],))
    conn.commit()
    tree.downloads.clear()
    assert drive.run_once(conn, tree, storage) == 0
    assert tree.downloads == []


def test_foto_nova_na_pasta_entra_na_proxima_conferencia(conn, org, storage, tree):
    sid = add_source(conn, org)
    drive.run_once(conn, tree, storage)
    tree.contents["d"] = b"faces:3"
    tree.tree["raiz"].append(img("d", "d.jpg", contents=tree.contents))
    conn.execute("update drive_sources set last_synced_at = now() - interval '2 hours' where id = %s", (sid,))
    conn.commit()
    tree.downloads.clear()
    assert drive.run_once(conn, tree, storage) == 1
    assert tree.downloads == ["d"]
    assert source_row(conn, sid)[3] == 4


def test_checksum_do_drive_evita_baixar_foto_repetida(conn, org, storage, tree):
    add_source(conn, org)
    drive.run_once(conn, tree, storage)
    # A mesma foto "a", com outro id (copiada no Drive) e checksum informado.
    tree.tree["outra"] = [{**img("a2", "copia.jpg"), "sha256Checksum": hashlib.sha256(b"faces:1").hexdigest()}]
    add_source(conn, org, folder="outra")
    tree.downloads.clear()
    assert drive.run_once(conn, tree, storage) == 0
    assert tree.downloads == []


def test_pasta_privada_vira_erro_com_mensagem(conn, org, storage, tree):
    tree.private.add("raiz")
    sid = add_source(conn, org)
    assert drive.run_once(conn, tree, storage) == 0
    status, error, *_ = source_row(conn, sid)
    assert status == "error"
    assert "abrir a pasta" in error


def test_respeita_a_franquia(conn, org, storage, tree):
    conn.execute(
        "insert into plans (id, kind, name, photo_limit) values (%s, 'business', 'Teste', 2) on conflict (id) do nothing", (f"t-{org['run']}",)
    )
    conn.execute("insert into subscriptions (organization_id, plan_id) values (%s, %s)", (org["id"], f"t-{org['run']}"))
    conn.commit()
    sid = add_source(conn, org)
    assert drive.run_once(conn, tree, storage) == 2
    status, error, *_ = source_row(conn, sid)
    assert status == "error" and "franquia" in error
    conn.execute("delete from subscriptions where organization_id = %s", (org["id"],))
    conn.execute("delete from plans where id = %s", (f"t-{org['run']}",))
    conn.commit()


def test_fotos_da_pasta_sao_indexadas(conn, org, storage, tree, engine):
    from nfworker import indexer

    add_source(conn, org)
    drive.run_once(conn, tree, storage)
    assert indexer.run_once(conn, engine, storage) == 3
