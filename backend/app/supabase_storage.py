"""
Supabase Storage Adapter for AAYAM
==================================
Provides cloud object storage on Supabase Storage Free Tier, seamlessly
interfacing with FastAPI file uploads, media serving, and evidence ingestion.

Transparent dual-layer architecture:
1. Local disk acts as a fast high-speed cache and development fallback.
2. Supabase Storage provides persistent cloud backup across Render's ephemeral restarts.
"""

import os
import io
import logging
from pathlib import Path
from typing import Optional, Dict, Any
import httpx

from app.config import (
    SUPABASE_URL,
    SUPABASE_KEY,
    SUPABASE_STORAGE_BUCKET_MEDIA,
    SUPABASE_STORAGE_BUCKET_EVIDENCE,
    MEDIA_DIR,
    EVIDENCE_DIR,
)

logger = logging.getLogger("aayam.storage")


class SupabaseStorageService:
    def __init__(self):
        self.url = SUPABASE_URL
        self.key = SUPABASE_KEY
        self.media_bucket = SUPABASE_STORAGE_BUCKET_MEDIA
        self.evidence_bucket = SUPABASE_STORAGE_BUCKET_EVIDENCE

    def is_configured(self) -> bool:
        """Returns True if Supabase credentials are provided."""
        return bool(self.url and self.key and not self.key.startswith("your_"))

    def _headers(self, content_type: Optional[str] = None) -> Dict[str, str]:
        headers = {
            "apikey": self.key,
            "Authorization": f"Bearer {self.key}",
        }
        if content_type:
            headers["Content-Type"] = content_type
        return headers

    def get_public_url(self, bucket: str, file_name: str) -> str:
        """Returns the public CDN URL for a file in a Supabase public bucket.
        Enforces that sensitive engineering evidence buckets cannot be retrieved via public URLs.
        """
        if bucket == self.evidence_bucket:
            raise ValueError("Engineering evidence is stored in a private bucket and cannot have a public URL.")
        if not self.is_configured():
            return f"/api/media/{file_name}"
        return f"{self.url}/storage/v1/object/public/{bucket}/{file_name}"

    async def create_signed_url(
        self,
        bucket: str,
        file_name: str,
        expires_in: int = 300,
    ) -> Optional[str]:
        """
        Generates a short-lived signed URL for private bucket objects (e.g. sensitive engineering evidence).
        Default expiry: 300 seconds (5 minutes). Requires authenticated session.
        """
        if not self.is_configured():
            return None

        endpoint = f"{self.url}/storage/v1/object/sign/{bucket}/{file_name}"
        headers = self._headers("application/json")
        body = {"expiresIn": expires_in}

        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                res = await client.post(endpoint, json=body, headers=headers)
                if res.status_code == 200:
                    data = res.json()
                    signed_path = data.get("signedURL")
                    if signed_path:
                        if signed_path.startswith("http"):
                            return signed_path
                        if not signed_path.startswith("/storage/v1"):
                            return f"{self.url}/storage/v1{signed_path if signed_path.startswith('/') else '/' + signed_path}"
                        return f"{self.url}{signed_path}"
                logger.warning(
                    f"Failed to generate signed URL for {file_name} in {bucket}: HTTP {res.status_code}"
                )
                return None
        except Exception as e:
            logger.error(f"Error creating signed URL for {file_name}: {e}")
            return None

    async def upload_bytes(
        self,
        bucket: str,
        file_name: str,
        content: bytes,
        content_type: Optional[str] = None,
    ) -> bool:
        """Uploads file bytes to Supabase Storage with upsert enabled."""
        if not self.is_configured():
            logger.debug(f"Supabase Storage not configured; skipped cloud upload for {file_name}.")
            return False

        endpoint = f"{self.url}/storage/v1/object/{bucket}/{file_name}"
        headers = self._headers(content_type or "application/octet-stream")
        headers["x-upsert"] = "true"

        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                res = await client.post(endpoint, content=content, headers=headers)
                if res.status_code in (200, 201):
                    logger.info(f"Successfully uploaded {file_name} to Supabase bucket '{bucket}'.")
                    return True
                else:
                    logger.warning(
                        f"Supabase Storage upload returned HTTP {res.status_code} for {file_name}."
                    )
                    return False
        except Exception as e:
            logger.error(f"Error uploading {file_name} to Supabase Storage: {e}")
            return False

    async def download_bytes(self, bucket: str, file_name: str) -> Optional[bytes]:
        """Downloads file bytes from Supabase Storage."""
        if not self.is_configured():
            return None

        endpoint = f"{self.url}/storage/v1/object/{bucket}/{file_name}"
        headers = self._headers()

        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                res = await client.get(endpoint, headers=headers)
                if res.status_code == 200:
                    return res.content
                logger.debug(f"File {file_name} not found in Supabase bucket '{bucket}' ({res.status_code}).")
                return None
        except Exception as e:
            logger.error(f"Error downloading {file_name} from Supabase Storage: {e}")
            return None

    async def save_media_file(
        self,
        file_name: str,
        content: bytes,
        content_type: Optional[str] = None,
    ) -> Path:
        """
        Saves media file to local MEDIA_DIR cache and synchronizes to Supabase Storage.
        """
        local_path = MEDIA_DIR / file_name
        local_path.write_bytes(content)

        if self.is_configured():
            await self.upload_bytes(
                bucket=self.media_bucket,
                file_name=file_name,
                content=content,
                content_type=content_type,
            )

        return local_path

    async def get_or_fetch_media(self, file_name: str) -> Optional[Path]:
        """
        Retrieves media from local disk. If missing (e.g. Render restarted),
        attempts to download from Supabase Storage and cache locally.
        """
        local_path = (MEDIA_DIR / file_name).resolve()
        # Path traversal guard
        if not str(local_path).startswith(str(MEDIA_DIR.resolve())):
            return None

        if local_path.exists() and local_path.is_file():
            return local_path

        # Attempt to pull from Supabase Storage
        if self.is_configured():
            logger.info(f"Local file {file_name} missing; checking Supabase Storage...")
            cloud_bytes = await self.download_bytes(self.media_bucket, file_name)
            if cloud_bytes:
                local_path.parent.mkdir(parents=True, exist_ok=True)
                local_path.write_bytes(cloud_bytes)
                logger.info(f"Re-hydrated {file_name} from Supabase Storage into local cache.")
                return local_path

        return None

    async def save_evidence_file(
        self,
        file_name: str,
        content: bytes,
        content_type: Optional[str] = None,
    ) -> Path:
        """
        Saves evidence document to local EVIDENCE_DIR cache and syncs to Supabase.
        """
        local_path = EVIDENCE_DIR / file_name
        local_path.write_bytes(content)

        if self.is_configured():
            await self.upload_bytes(
                bucket=self.evidence_bucket,
                file_name=file_name,
                content=content,
                content_type=content_type,
            )

        return local_path

    async def get_or_fetch_evidence(self, file_name: str) -> Optional[Path]:
        """
        Retrieves evidence document from local disk, downloading from Supabase if needed.
        """
        local_path = (EVIDENCE_DIR / file_name).resolve()
        if not str(local_path).startswith(str(EVIDENCE_DIR.resolve())):
            return None

        if local_path.exists() and local_path.is_file():
            return local_path

        if self.is_configured():
            cloud_bytes = await self.download_bytes(self.evidence_bucket, file_name)
            if cloud_bytes:
                local_path.parent.mkdir(parents=True, exist_ok=True)
                local_path.write_bytes(cloud_bytes)
                return local_path

        return None

    async def sync_evidence_from_cloud(self) -> int:
        """
        Lists all evidence files in Supabase Storage private bucket and re-hydrates
        any missing documents into local EVIDENCE_DIR so DocumentStore can index them.
        """
        if not self.is_configured():
            return 0
        try:
            endpoint = f"{self.url}/storage/v1/object/list/{self.evidence_bucket}"
            headers = self._headers("application/json")
            async with httpx.AsyncClient(timeout=15.0) as client:
                res = await client.post(endpoint, json={"prefix": ""}, headers=headers)
                if res.status_code == 200:
                    objects = res.json()
                    synced = 0
                    EVIDENCE_DIR.mkdir(parents=True, exist_ok=True)
                    for obj in objects:
                        name = obj.get("name")
                        if not name or name.startswith("."):
                            continue
                        target = EVIDENCE_DIR / name
                        if not target.exists():
                            data = await self.download_bytes(self.evidence_bucket, name)
                            if data:
                                target.write_bytes(data)
                                synced += 1
                                logger.info(f"Re-hydrated evidence document '{name}' from Supabase Storage.")
                    return synced
        except Exception as e:
            logger.error(f"Error syncing evidence from Supabase Storage: {e}")
        return 0


# Global singleton storage service
storage_service = SupabaseStorageService()

