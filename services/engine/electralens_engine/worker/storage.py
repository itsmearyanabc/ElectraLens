"""Supabase Storage through its REST API, with the secret key (service role)."""

import re
from urllib.parse import quote

import httpx

MAX_BYTES = 50 * 1024 * 1024  # the free plan's file limit
_SAFE_PATH = re.compile(r"^[A-Za-z0-9][A-Za-z0-9._/-]{0,300}$")


def _check(path: str) -> str:
    if not _SAFE_PATH.fullmatch(path) or ".." in path.split("/"):
        raise ValueError("unsafe storage path")
    return quote(path)


class Storage:
    def __init__(self, base_url: str, secret_key: str, client: httpx.Client | None = None) -> None:
        self._base = f"{base_url.rstrip('/')}/storage/v1/object"
        self._headers = {"authorization": f"Bearer {secret_key}", "apikey": secret_key}
        self._client = client or httpx.Client(timeout=120)

    def download(self, bucket: str, path: str) -> bytes:
        response = self._client.get(f"{self._base}/{bucket}/{_check(path)}", headers=self._headers)
        response.raise_for_status()
        if len(response.content) > MAX_BYTES:
            raise ValueError("file larger than 50 MB")
        return response.content

    def upload(self, bucket: str, path: str, data: bytes, content_type: str) -> None:
        response = self._client.post(
            f"{self._base}/{bucket}/{_check(path)}",
            headers={**self._headers, "content-type": content_type, "x-upsert": "true"},
            content=data,
        )
        response.raise_for_status()

    def exists(self, bucket: str, path: str) -> bool:
        response = self._client.head(f"{self._base}/{bucket}/{_check(path)}", headers=self._headers)
        return response.status_code == 200
