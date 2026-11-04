"""
AAYAM Storage Synchronization Tool: Local -> Supabase Storage Free
===================================================================
Uploads all existing local infrastructure photographs, thumbnails,
and evidence documents from the repository to Supabase Storage.
"""

import os
import sys
import asyncio
import logging
from pathlib import Path

# Add backend directory to path
backend_dir = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(backend_dir))

from app.config import (
    SUPABASE_URL,
    SUPABASE_KEY,
    SUPABASE_STORAGE_BUCKET_MEDIA,
    SUPABASE_STORAGE_BUCKET_EVIDENCE,
    MEDIA_DIR,
    EVIDENCE_DIR,
)
from app.supabase_storage import storage_service

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("aayam.storage_sync")


async def sync_directory(directory: Path, bucket_name: str, label: str):
    if not directory.exists():
        logger.warning(f"{label} directory {directory} does not exist.")
        return 0, 0

    files = [f for f in directory.iterdir() if f.is_file() and not f.name.startswith(".")]
    logger.info(f"Scanning {label}: {len(files)} files found in {directory.resolve()}")

    content_types = {
        ".svg": "image/svg+xml",
        ".png": "image/png",
        ".jpg": "image/jpeg",
        ".jpeg": "image/jpeg",
        ".webp": "image/webp",
        ".pdf": "application/pdf",
        ".txt": "text/plain",
        ".md": "text/markdown",
    }

    uploaded = 0
    failed = 0

    for f in files:
        content = f.read_bytes()
        c_type = content_types.get(f.suffix.lower(), "application/octet-stream")
        ok = await storage_service.upload_bytes(bucket_name, f.name, content, c_type)
        if ok:
            uploaded += 1
        else:
            failed += 1

    return uploaded, failed


async def main():
    logger.info("=" * 70)
    logger.info("AAYAM STORAGE SYNC: Local -> Supabase Storage Free Tier")
    logger.info("=" * 70)

    if not storage_service.is_configured():
        logger.error("Supabase Storage is not configured!")
        logger.error("Set SUPABASE_URL and SUPABASE_KEY in your environment before running.")
        logger.error("Example:")
        logger.error("  export SUPABASE_URL=https://[YOUR-PROJECT].supabase.co")
        logger.error("  export SUPABASE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...")
        sys.exit(1)

    logger.info(f"Supabase Endpoint: {SUPABASE_URL}")
    logger.info(f"Media Bucket (Public)   : {SUPABASE_STORAGE_BUCKET_MEDIA}")
    logger.info(f"Evidence Bucket (Private): {SUPABASE_STORAGE_BUCKET_EVIDENCE}")
    logger.info("Note: 'aayam-media' is public for photography/thumbnails; 'aayam-evidence' is private for sensitive structural calculations.")

    # 1. Sync media files
    m_up, m_fail = await sync_directory(MEDIA_DIR, SUPABASE_STORAGE_BUCKET_MEDIA, "Media Files")

    # 2. Sync evidence documents
    e_up, e_fail = await sync_directory(EVIDENCE_DIR, SUPABASE_STORAGE_BUCKET_EVIDENCE, "Evidence Docs")

    logger.info("-" * 70)
    logger.info("STORAGE SYNC RESULTS:")
    logger.info(f"  Media Files    : {m_up} uploaded successfully, {m_fail} failed")
    logger.info(f"  Evidence Docs  : {e_up} uploaded successfully, {e_fail} failed")
    logger.info("=" * 70)


if __name__ == "__main__":
    asyncio.run(main())

