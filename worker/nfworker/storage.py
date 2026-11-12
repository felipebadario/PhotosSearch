from typing import Protocol

from . import config


class Storage(Protocol):
    def get(self, key: str) -> bytes: ...


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
