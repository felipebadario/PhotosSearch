from typing import Protocol

from . import config


class Storage(Protocol):
    def get(self, key: str) -> bytes: ...

    def put(self, key: str, data: bytes, content_type: str) -> None: ...


class R2Storage:
    def __init__(self):
        import boto3

        self._client = boto3.client(
            "s3",
            endpoint_url=f"https://{config.R2_ACCOUNT_ID}.r2.cloudflarestorage.com",
            aws_access_key_id=config.R2_ACCESS_KEY_ID,
            aws_secret_access_key=config.R2_SECRET_ACCESS_KEY,
            region_name="auto",
        )

    def get(self, key: str) -> bytes:
        obj = self._client.get_object(Bucket=config.R2_BUCKET, Key=key)
        if obj["ContentLength"] > config.MAX_PHOTO_BYTES:
            raise ValueError("Arquivo maior que o limite de 30 MB.")
        return obj["Body"].read()

    def put(self, key: str, data: bytes, content_type: str) -> None:
        self._client.put_object(Bucket=config.R2_BUCKET, Key=key, Body=data, ContentType=content_type)


class LocalStorage:
    """Só para desenvolvimento: lê os originais da pasta do armazenamento local do web."""

    def __init__(self):
        import os
        from pathlib import Path

        self.root = Path(os.environ.get("LOCAL_STORAGE_DIR", ".storage")).resolve()

    def get(self, key: str) -> bytes:
        path = (self.root / key).resolve()
        if not path.is_relative_to(self.root):
            raise ValueError("Chave inválida.")
        return path.read_bytes()

    def put(self, key: str, data: bytes, content_type: str) -> None:
        path = (self.root / key).resolve()
        if not path.is_relative_to(self.root):
            raise ValueError("Chave inválida.")
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_bytes(data)
