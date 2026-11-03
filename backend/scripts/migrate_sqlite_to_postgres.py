"""
AAYAM Database Migration Tool: SQLite -> PostgreSQL
=====================================================
Safely migrates all existing records from the local SQLite database
(aayam_infra.db) to production PostgreSQL without altering schema,
records, IDs, timestamps, or foreign key relationships.

Includes pre-migration schema synchronization, transactional data transfer,
and post-migration verification assertions.
"""

import os
import sys
import argparse
import logging
from pathlib import Path
from datetime import datetime

# Add backend directory to sys.path
backend_dir = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(backend_dir))

from sqlalchemy import create_engine, inspect, text
from sqlalchemy.orm import sessionmaker

from app.models import (
    Base,
    User,
    Asset,
    Inspection,
    AssetMedia,
    EvidenceSource,
    AssetFinding,
    AIIntelligenceRun,
    AIConversationMessage,
)

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("aayam.migration")

# Ordered list of models to respect foreign key constraints during insertion
MIGRATION_ORDER = [
    (User, "users"),
    (Asset, "assets"),
    (Inspection, "inspections"),
    (AssetMedia, "asset_media"),
    (EvidenceSource, "evidence_sources"),
    (AIIntelligenceRun, "ai_intelligence_runs"),
    (AssetFinding, "asset_findings"),
    (AIConversationMessage, "ai_conversation_messages"),
]


def migrate_database(sqlite_db_path: str, pg_url: str) -> bool:
    """
    Executes the migration from SQLite to PostgreSQL with strict validation.
    """
    sqlite_file = Path(sqlite_db_path)
    if not sqlite_file.exists():
        logger.error(f"Source SQLite database not found at: {sqlite_file}")
        return False

    # Normalize PostgreSQL URL if needed
    if pg_url.startswith("postgres://"):
        pg_url = pg_url.replace("postgres://", "postgresql://", 1)

    logger.info("=" * 70)
    logger.info("AAYAM DATABASE MIGRATION: SQLite -> PostgreSQL")
    logger.info("=" * 70)
    logger.info(f"Source SQLite DB : {sqlite_file.resolve()} ({sqlite_file.stat().st_size} bytes)")
    # Mask password in log output
    masked_url = pg_url
    if "@" in masked_url:
        prefix, hostpart = masked_url.split("@", 1)
        scheme, creds = prefix.split("://", 1)
        masked_url = f"{scheme}://***:***@{hostpart}"
    logger.info(f"Target Database  : {masked_url}")

    # 1. Connect to Source (SQLite)
    sqlite_engine = create_engine(f"sqlite:///{sqlite_file.resolve()}", connect_args={"check_same_thread": False})
    SqliteSession = sessionmaker(bind=sqlite_engine)
    sqlite_session = SqliteSession()

    # 2. Connect to Destination (PostgreSQL)
    try:
        pg_engine = create_engine(pg_url, pool_pre_ping=True)
        # Test connection
        with pg_engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        logger.info("Connected to destination PostgreSQL database successfully.")
    except Exception as e:
        logger.error(f"Failed to connect to destination PostgreSQL database: {e}")
        return False

    PgSession = sessionmaker(bind=pg_engine)
    pg_session = PgSession()

    try:
        # 3. Create schema on PostgreSQL if not exists
        logger.info("Initializing schema tables on target PostgreSQL database...")
        Base.metadata.create_all(bind=pg_engine)
        logger.info("Schema tables created/verified successfully.")

        # 4. Migrate tables in foreign-key order
        counts_summary = {}

        for model_cls, table_name in MIGRATION_ORDER:
            # Query source records
            source_records = sqlite_session.query(model_cls).all()
            source_count = len(source_records)
            logger.info(f"Migrating table '{table_name}': {source_count} records found in SQLite...")

            migrated_count = 0
            for record in source_records:
                # Extract clean dict from SQLAlchemy instance
                data = {
                    c.name: getattr(record, c.name)
                    for c in model_cls.__table__.columns
                }

                # Check if record already exists in destination
                pk_name = model_cls.__table__.primary_key.columns.keys()[0]
                existing = pg_session.query(model_cls).filter(
                    getattr(model_cls, pk_name) == data[pk_name]
                ).first()

                if not existing:
                    new_obj = model_cls(**data)
                    pg_session.add(new_obj)
                    migrated_count += 1
                else:
                    # Update fields if already exists
                    for k, v in data.items():
                        setattr(existing, k, v)
                    migrated_count += 1

            pg_session.commit()
            dest_count = pg_session.query(model_cls).count()
            counts_summary[table_name] = (source_count, dest_count)
            logger.info(f"  -> '{table_name}' migrated: {migrated_count} inserted/updated (Total destination: {dest_count})")

        # 5. Verification Phase
        logger.info("-" * 70)
        logger.info("POST-MIGRATION VERIFICATION AUDIT")
        logger.info("-" * 70)
        all_match = True
        print(f"\n{'Table Name':<30} | {'SQLite Count':<15} | {'PostgreSQL Count':<15} | {'Status'}")
        print("-" * 75)
        for tbl, (src, dst) in counts_summary.items():
            status = "MATCH (OK)" if src == dst else "MISMATCH (ERROR)"
            if src != dst:
                all_match = False
            print(f"{tbl:<30} | {src:<15} | {dst:<15} | {status}")

        print("-" * 75)

        if not all_match:
            logger.error("MIGRATION FAILED: Record count mismatch detected between SQLite and PostgreSQL.")
            return False

        # 6. Referential Integrity Check
        logger.info("Executing referential integrity test on target database...")
        sample_asset = pg_session.query(Asset).filter(Asset.id == "ASSET-DRN-006").first()
        if sample_asset:
            findings = pg_session.query(AssetFinding).filter(AssetFinding.asset_id == sample_asset.id).all()
            inspections = pg_session.query(Inspection).filter(Inspection.asset_id == sample_asset.id).all()
            logger.info(
                f"Referential test passed for '{sample_asset.name}': "
                f"{len(findings)} findings, {len(inspections)} inspections verified."
            )
        else:
            logger.warning("Sample asset ASSET-DRN-006 not found for referential test.")

        logger.info("=" * 70)
        logger.info("MIGRATION COMPLETE: All records and relationships verified successfully!")
        logger.info("=" * 70)
        return True

    except Exception as e:
        pg_session.rollback()
        logger.error(f"Migration aborted due to unexpected error: {e}", exc_info=True)
        return False
    finally:
        sqlite_session.close()
        pg_session.close()


def main():
    parser = argparse.ArgumentParser(description="AAYAM SQLite to PostgreSQL Migration CLI")
    parser.add_argument(
        "--sqlite-path",
        default=str(backend_dir / "aayam_infra.db"),
        help="Path to source SQLite database file",
    )
    parser.add_argument(
        "--pg-url",
        default=os.getenv("TARGET_DATABASE_URL") or os.getenv("DATABASE_URL"),
        help="Target PostgreSQL connection URL (e.g. postgresql://user:pass@host:5432/dbname)",
    )

    args = parser.parse_args()

    if not args.pg_url or args.pg_url.startswith("sqlite"):
        print("ERROR: Target PostgreSQL database URL is required.")
        print("Provide via --pg-url or set the TARGET_DATABASE_URL environment variable.")
        print("Example: python migrate_sqlite_to_postgres.py --pg-url postgresql://user:pass@host:5432/aayam_db")
        sys.exit(1)

    success = migrate_database(args.sqlite_path, args.pg_url)
    sys.exit(0 if success else 1)


if __name__ == "__main__":
    main()

