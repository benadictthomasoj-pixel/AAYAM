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
        """Returns the public CDN URL for a file in a Supabase public bucket."""
        if not self.is_configured():
            return f"/api/media/{file_name}"
        return f"{self.url}/storage/v1/object/public/{bucket}/{file_name}"

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
                        f"Supabase Storage upload returned {res.status_code} for {file_name}: {res.text}"
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


# Global singleton storage service
storage_service = SupabaseStorageService()
