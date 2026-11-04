import os
import sqlite3
from sqlalchemy import create_engine, event, inspect, text
from sqlalchemy.engine import Engine
from sqlalchemy.orm import declarative_base, sessionmaker
from app.config import DATABASE_URL

is_sqlite = DATABASE_URL.startswith("sqlite")

# For SQLite, check_same_thread=False is needed for multi-threaded FastAPI handlers
connect_args = {"check_same_thread": False} if is_sqlite else {}

# For Supabase / PgBouncer transaction mode pooler (port 6543), disable server-side prepared statements
if not is_sqlite and (":6543" in DATABASE_URL or "pooler.supabase" in DATABASE_URL):
    connect_args.setdefault("prepare_threshold", None)


@event.listens_for(Engine, "connect")
def enable_sqlite_foreign_keys(dbapi_connection, connection_record):
    """
    Enforces SQLite foreign key constraints for all SQLite connections.
    SQLite has foreign-key constraints disabled by default unless PRAGMA foreign_keys=ON is executed per connection.
    """
    if isinstance(dbapi_connection, sqlite3.Connection):
        cursor = dbapi_connection.cursor()
        cursor.execute("PRAGMA foreign_keys=ON")
        cursor.close()


engine_kwargs = {"connect_args": connect_args, "echo": False}
if not is_sqlite:
    # Production PostgreSQL connection pool configuration
    # Set conservative defaults matching Supabase Free connection limits
    engine_kwargs.update({
        "pool_size": int(os.getenv("DB_POOL_SIZE", "5")),
        "max_overflow": int(os.getenv("DB_MAX_OVERFLOW", "5")),
        "pool_pre_ping": True,
        "pool_recycle": int(os.getenv("DB_POOL_RECYCLE", "1800")),
    })

engine = create_engine(
    DATABASE_URL,
    **engine_kwargs
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


def ensure_schema_compatibility(target_engine=None):
    """
    Ensures existing databases (both SQLite and PostgreSQL) have all required tables
    and columns without resetting data. Dialect-agnostic using SQLAlchemy inspector.
    """
    eng = target_engine or engine
    try:
        # Non-destructively creates any newly defined tables
        Base.metadata.create_all(bind=eng)
        insp = inspect(eng)
        tables = insp.get_table_names()

        with eng.connect() as conn:
            if "assets" in tables:
                asset_cols = [c["name"] for c in insp.get_columns("assets")]
                if "ownership_authority" not in asset_cols:
                    conn.execute(text("ALTER TABLE assets ADD COLUMN ownership_authority VARCHAR(200) DEFAULT 'State Public Works Department (PWD)'"))
                    conn.commit()
            if "inspections" in tables:
                cols = [c["name"] for c in insp.get_columns("inspections")]
                if "verification_outcome" not in cols:
                    conn.execute(text("ALTER TABLE inspections ADD COLUMN verification_outcome VARCHAR(50)"))
                    conn.commit()
            if "asset_findings" in tables:
                finding_cols = [c["name"] for c in insp.get_columns("asset_findings")]
                bool_default = "BOOLEAN DEFAULT FALSE" if eng.dialect.name == "postgresql" else "BOOLEAN DEFAULT 0"
                col_defs = [
                    ("intelligence_category", "VARCHAR(50) DEFAULT 'Structural'"),
                    ("evidence_classification", "VARCHAR(50) DEFAULT 'Documented'"),
                    ("confidence_level", "VARCHAR(20) DEFAULT 'High'"),
                    ("source_document", "VARCHAR(255)"),
                    ("page_number", "INTEGER"),
                    ("image_reference", "VARCHAR(255)"),
                    ("reviewed_by", "VARCHAR(100)"),
                    ("reviewed_at", "VARCHAR(50)"),
                    ("review_decision_notes", "TEXT"),
                    ("ai_generated", bool_default),
                    ("run_id", "VARCHAR(64)"),
                    ("exact_location", "VARCHAR(200)"),
                    ("severity_level", "INTEGER DEFAULT 3"),
                    ("potential_consequences", "TEXT"),
                    ("immediate_action", "TEXT"),
                    ("further_investigation", "TEXT"),
                    ("responsible_discipline", "VARCHAR(150)"),
                    ("action_stage", "VARCHAR(30) DEFAULT 'Stage A'"),
                    ("timeframe", "VARCHAR(50)"),
                    ("approval_required", "VARCHAR(150)"),
                    ("risk_contribution_pts", "FLOAT DEFAULT 0.0"),
                ]
                for col_name, col_type in col_defs:
                    if col_name not in finding_cols:
                        conn.execute(text(f"ALTER TABLE asset_findings ADD COLUMN {col_name} {col_type}"))
                conn.commit()
            if "ai_intelligence_runs" in tables:
                run_cols = [c["name"] for c in insp.get_columns("ai_intelligence_runs")]
                if "predictive_data_warning" not in run_cols:
                    conn.execute(text("ALTER TABLE ai_intelligence_runs ADD COLUMN predictive_data_warning TEXT"))
                    conn.commit()
    except Exception as e:
        # Pass gracefully during test fixture teardown or in-memory setups
        pass



def get_db():
    """FastAPI dependency for yielding database session."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
