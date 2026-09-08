"""Testes de contrato com embeddings controlados; não medem acurácia facial."""
import io
import os
import pickle
from contextlib import contextmanager
import shutil
import unittest
import uuid
import subprocess
import sys
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import patch

import numpy as np
from PIL import Image
from fastapi.testclient import TestClient

from app import config
from app.face_service import FaceIndex, FaceService, InvalidImage, NoFace, load_image, normalize
from app.main import app
import index_photos
import download_photos
import build_render


@contextmanager
def scratch():
    # Herda as permissões da pasta do projeto, inclusive em Windows restrito.
    root = Path(__file__).resolve().parent / ".scratch"
    path = root / uuid.uuid4().hex
    path.mkdir(parents=True)
    try:
        yield str(path)
    finally:
        if path.resolve().parent != root.resolve():
            raise RuntimeError("Caminho de limpeza fora da pasta de testes.")
        shutil.rmtree(path)


def jpeg():
    output = io.BytesIO()
    Image.new("RGB", (120, 80), "white").save(output, format="JPEG")
    return output.getvalue()


def vector(score=1.0):
    result = np.zeros(512, dtype=np.float32)
    result[0] = score
    result[1] = np.sqrt(1 - score ** 2)
    return result


class TestSearch(unittest.TestCase):
    def setUp(self):
        self.index = FaceIndex(np.stack([vector(.8), vector(.9), vector(.7), vector(.3)]),
                               ["album/a.JPG", "album/a.JPG", "álbum/b 2.jpeg", "album/c.jpg"])
        self.service = SimpleNamespace(selfie_embedding=lambda image: vector())
        self.index_patch = patch("app.main.FaceIndex.load", return_value=self.index)
        self.service_patch = patch("app.main.FaceService", return_value=self.service)
        self.index_patch.start()
        self.service_patch.start()
        self.client_context = TestClient(app)
        self.client = self.client_context.__enter__()

    def tearDown(self):
        self.client_context.__exit__(None, None, None)
        self.service_patch.stop()
        self.index_patch.stop()

    def test_search_multipart_deduplicated_sorted(self):
        # Falha se o endpoint recorrer ao armazenamento temporário de UploadFile.
        with patch("tempfile.SpooledTemporaryFile", side_effect=AssertionError("selfie no disco")):
            response = self.client.post("/api/search", files={"file": ("selfie.jpg", jpeg(), "image/jpeg")})
        self.assertEqual(response.status_code, 200, response.text)
        result = response.json()
        self.assertEqual(result["count"], 2)
        self.assertEqual(result["matches"][0]["photo"], "/photos/album/a.JPG")
        self.assertAlmostEqual(result["matches"][0]["similarity"], .9, places=5)
        self.assertEqual(result["matches"][1]["photo"], "/photos/%C3%A1lbum/b%202.jpeg")
        self.assertEqual(response.headers["cache-control"], "no-store")

    def test_invalid_image_and_no_face(self):
        response = self.client.post("/api/search", files={"file": ("fake.jpg", b"not an image")})
        self.assertEqual(response.status_code, 422)
        def no_face(image):
            raise NoFace("Não detectamos um rosto.")
        self.service.selfie_embedding = no_face
        response = self.client.post("/api/search", files={"file": ("selfie.jpg", jpeg())})
        self.assertEqual(response.status_code, 422)
        self.assertIn("rosto", response.json()["detail"])

    def test_missing_duplicate_and_truncated_multipart(self):
        self.assertEqual(self.client.post("/api/search", content=b"x").status_code, 400)
        self.assertEqual(self.client.post("/api/search", files={"other": ("a.jpg", jpeg())}).status_code, 400)
        self.assertEqual(self.client.post("/api/search", files=[("file", ("a.jpg", jpeg())), ("file", ("b.jpg", jpeg()))]).status_code, 400)
        body = b'--abc\r\nContent-Disposition: form-data; name="file"; filename="a.jpg"\r\n\r\n' + jpeg()
        self.assertEqual(self.client.post("/api/search", content=body, headers={"Content-Type": "multipart/form-data; boundary=abc"}).status_code, 400)

    def test_upload_limit(self):
        with patch("app.main.MAX_UPLOAD_BYTES", 10):
            self.assertEqual(self.client.post("/api/search", files={"file": ("a.jpg", jpeg())}).status_code, 413)

    def test_routes_and_traversal(self):
        for route in ["/", "/static/style.css", "/static/app.js", "/api/health"]:
            self.assertEqual(self.client.get(route).status_code, 200, route)
        for route in ["/photos/%2e%2e/app/config.py", "/photos/..%5capp%5cconfig.py", "/photos/missing.jpg"]:
            self.assertEqual(self.client.get(route).status_code, 404, route)
        photo = config.PHOTOS_DIR / ("test-route-" + uuid.uuid4().hex + ".JPG")
        try:
            photo.write_bytes(jpeg())
            response = self.client.get("/photos/" + photo.name)
            self.assertEqual(response.status_code, 200)
            self.assertTrue(response.headers["content-type"].startswith("image/jpeg"))
        finally:
            photo.unlink(missing_ok=True)

    def test_empty_matches(self):
        self.service.selfie_embedding = lambda image: -vector()
        response = self.client.post("/api/search", files={"file": ("a.jpg", jpeg())})
        self.assertEqual(response.json(), {"count": 0, "matches": []})


class TestPreparation(unittest.TestCase):
    def test_parallel_download_respects_total_disk_budget(self):
        with scratch() as directory:
            root = Path(directory)
            entries = [SimpleNamespace(id=str(i), path=f"{i}.JPG", local_path=str(root / f"{i}.JPG"))
                       for i in range(8)]
            content = jpeg()
            def download(**kwargs):
                Path(kwargs["output"]).write_bytes(content)
                return kwargs["output"]
            with patch.multiple(download_photos, PHOTOS_DIR=root, MAX_PHOTOS_BYTES=len(content) * 2), \
                    patch.object(download_photos, "photo_files", side_effect=lambda: list(root.glob("*.JPG"))), \
                    patch("gdown.download_folder", return_value=entries), \
                    patch("gdown.download", side_effect=download):
                self.assertEqual(download_photos.main(), 1)
            self.assertEqual(len(list(root.glob("*.JPG"))), 2)
            self.assertEqual(list(root.glob("*.part")), [])

    def test_mpo_jpeg_primary_frame(self):
        output = io.BytesIO()
        Image.new("RGB", (120, 80), "white").save(
            output, format="MPO", save_all=True,
            append_images=[Image.new("RGB", (120, 80), "black")])
        with Image.open(io.BytesIO(output.getvalue())) as image:
            self.assertEqual(image.format, "MPO")
        decoded = load_image(output.getvalue())
        self.assertEqual(decoded.shape, (80, 120, 3))
        self.assertGreater(decoded.mean(), 250)

    def test_build_stops_on_download_error(self):
        with patch("build_render.subprocess.run", return_value=SimpleNamespace(returncode=1)) as run:
            self.assertEqual(build_render.main(), 1)
            self.assertEqual(run.call_count, 1)

    def test_production_requires_ready_index(self):
        with patch("app.main.REQUIRE_READY", True), \
                patch("app.main.FaceIndex.load", side_effect=FileNotFoundError("missing")):
            with self.assertRaises(RuntimeError):
                with TestClient(app):
                    pass

    def test_memory_guardrails(self):
        with patch("app.face_service.MAX_INDEX_FACES", 0):
            with self.assertRaises(ValueError):
                FaceIndex([vector()], ["a.jpg"])
        payload = io.BytesIO()
        Image.new("RGB", (10, 10)).save(payload, "PNG")
        with patch("app.face_service.MAX_NON_JPEG_PIXELS", 50):
            with self.assertRaises(InvalidImage):
                load_image(payload.getvalue())

    def test_persistent_storage_setting(self):
        with scratch() as directory:
            environment = dict(os.environ, MVP_STORAGE_DIR=directory)
            result = subprocess.run(
                [sys.executable, "-c", "from app.config import ensure_directories, PHOTOS_DIR, DATA_DIR; "
                 "ensure_directories(); print(PHOTOS_DIR); print(DATA_DIR)"],
                cwd=config.BASE_DIR, env=environment, capture_output=True, text=True,
            )
            self.assertEqual(result.returncode, 0, result.stderr)
            self.assertTrue((Path(directory) / "photos").is_dir())
            self.assertTrue((Path(directory) / "data").is_dir())
            self.assertIn(str(Path(directory) / "photos"), result.stdout)

    def test_exif_and_invalid_embedding(self):
        image = Image.new("RGB", (80, 40), "red")
        exif = image.getexif()
        exif[274] = 6
        output = io.BytesIO()
        image.save(output, "JPEG", exif=exif)
        self.assertEqual(load_image(output.getvalue()).shape, (80, 40, 3))
        with self.assertRaises(ValueError):
            normalize(np.zeros(512))
        with self.assertRaises(InvalidImage):
            load_image(b"bad")

    def test_largest_face(self):
        service = FaceService.__new__(FaceService)
        service.faces = lambda image: [SimpleNamespace(bbox=[0, 0, 10, 10], embedding=vector(.5)),
                                      SimpleNamespace(bbox=[0, 0, 40, 40], embedding=vector(.9))]
        self.assertAlmostEqual(service.selfie_embedding(None)[0], .9, places=5)

    def test_index_roundtrip_and_reject_paths(self):
        with scratch() as directory:
            path = Path(directory) / "faces.pkl"
            with path.open("wb") as handle:
                pickle.dump({"version": 1, "model": config.MODEL_NAME,
                             "embeddings": [vector()], "paths": ["a.jpg"]}, handle)
            self.assertEqual(len(FaceIndex.load(path).search(vector(), .45)), 1)
        for path in ["../a.jpg", "/a.jpg", "C:/a.jpg", "..\\a.jpg"]:
            with self.assertRaises(ValueError):
                FaceIndex([vector()], [path])

    def test_indexing_continues_after_bad_image(self):
        with scratch() as directory:
            root = Path(directory)
            photos = root / "photos"
            photos.mkdir()
            good, bad = photos / "good.JPG", photos / "bad.jpeg"
            good.write_bytes(jpeg())
            bad.write_bytes(b"broken")
            destination = root / "faces.pkl"
            service = SimpleNamespace(faces=lambda image: [SimpleNamespace(embedding=vector())])
            with patch.multiple(index_photos, PHOTOS_DIR=photos, INDEX_PATH=destination), \
                    patch.object(index_photos, "photo_files", return_value=[bad, good]), \
                    patch.object(index_photos, "FaceService", return_value=service):
                self.assertEqual(index_photos.main(), 1)
                self.assertEqual(FaceIndex.load(destination).paths, ["good.JPG"])

    def test_missing_index_keeps_page_available(self):
        with patch("app.main.FaceIndex.load", side_effect=FileNotFoundError("missing")):
            with TestClient(app) as client:
                self.assertEqual(client.get("/").status_code, 200)
                self.assertFalse(client.get("/api/health").json()["ready"])
                self.assertEqual(client.post("/api/search").status_code, 503)

    def test_download_error_is_actionable(self):
        with patch("gdown.download_folder", side_effect=ConnectionError("offline")):
            self.assertEqual(download_photos.main(), 1)


if __name__ == "__main__":
    unittest.main()
