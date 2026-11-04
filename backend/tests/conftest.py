import os
import sys
import tempfile
from pathlib import Path
from typing import Generator
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, event
from sqlalchemy.engine import Engine
from sqlalchemy.orm import sessionmaker, Session

# Ensure backend root is on sys.path
backend_dir = Path(__file__).resolve().parent.parent
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

from app.database import Base, get_db
from app.models import (
    Asset,
    Inspection,
    User,
    AssetMedia,
    EvidenceSource,
    AssetFinding,
    serialize_flagged_reasons,
)
from app.security import hash_password, create_access_token
from app.seed_data import (
    SAMPLE_ASSETS,
    SAMPLE_MEDIA,
    SAMPLE_SOURCES,
    SAMPLE_FINDINGS,
)
from app.seed import SAMPLE_INSPECTIONS
from app.main import app


@pytest.fixture(scope="session")
def test_db_path() -> Generator[str, None, None]:
    """Creates a temporary SQLite file for isolated test execution."""
    fd, path = tempfile.mkstemp(prefix="aayam_test_", suffix=".db")
    os.close(fd)
    yield path
    if os.path.exists(path):
        try:
            os.remove(path)
        except OSError:
            pass


@pytest.fixture(scope="session")
def test_engine(test_db_path: str):
    """Creates an isolated SQLAlchemy engine for the temporary test database."""
    test_pg_url = os.environ.get("TEST_DATABASE_URL")
    if test_pg_url:
        connect_args = {}
        if ":6543" in test_pg_url or "pooler.supabase" in test_pg_url:
            connect_args["prepare_threshold"] = None
        engine = create_engine(test_pg_url, pool_pre_ping=True, connect_args=connect_args)
    else:
        engine = create_engine(
            f"sqlite:///{test_db_path}",
            connect_args={"check_same_thread": False},
        )
    Base.metadata.create_all(bind=engine)
    return engine


@pytest.fixture(scope="session")
def TestingSessionLocal(test_engine):
    """Session factory for the isolated test database."""
    return sessionmaker(autocommit=False, autoflush=False, bind=test_engine)


@pytest.fixture(scope="function", autouse=True)
def isolated_db(test_engine, TestingSessionLocal) -> Generator[Session, None, None]:
    """
    Function-scoped fixture:
    Resets tables and seeds the canonical sample assets, inspections, and test users
    in the isolated test database before each test.
    Overrides FastAPI's get_db dependency so all API requests use this clean dataset.
    """
    # Clean tables
    Base.metadata.drop_all(bind=test_engine)
    Base.metadata.create_all(bind=test_engine)

    db: Session = TestingSessionLocal()
    try:
        # Seed canonical assets
        for item in SAMPLE_ASSETS:
            asset_dict = dict(item)
            if "flagged_reasons" in asset_dict:
                asset_dict["flagged_reasons"] = serialize_flagged_reasons(asset_dict["flagged_reasons"])
            asset = Asset(**asset_dict)
            db.add(asset)

        # Seed canonical inspections
        for insp_dict in SAMPLE_INSPECTIONS:
            insp = Inspection(**insp_dict)
            db.add(insp)

        # Seed canonical admin and common_user accounts
        canonical_admin = User(
            id="USER-ADM-CANONICAL",
            username="admin",
            email="admin@aayam.infra.gov.in",
            full_name="System Administrator",
            password_hash=hash_password("AdminSecure2026!"),
            role="admin",
            is_active=True,
        )
        db.add(canonical_admin)

        canonical_user = User(
            id="USER-COM-CANONICAL",
            username="common_user",
            email="user@aayam.infra.gov.in",
            full_name="Civilian Inspector",
            password_hash=hash_password("UserSecure2026!"),
            role="common_user",
            is_active=True,
        )
        db.add(canonical_user)

        # Seed media
        for m_dict in SAMPLE_MEDIA:
            db.add(AssetMedia(**m_dict))

        # Seed sources
        for s_dict in SAMPLE_SOURCES:
            db.add(EvidenceSource(**s_dict))

        # Seed findings
        for f_dict in SAMPLE_FINDINGS:
            db.add(AssetFinding(**f_dict))

        db.commit()
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()

    def override_get_db() -> Generator[Session, None, None]:
        session = TestingSessionLocal()
        try:
            yield session
        finally:
            session.close()

    app.dependency_overrides[get_db] = override_get_db

    session = TestingSessionLocal()
    try:
        yield session
    finally:
        session.close()
        app.dependency_overrides.pop(get_db, None)


@pytest.fixture(scope="function")
def admin_token() -> str:
    """Returns a valid signed JWT access token for the canonical administrator."""
    return create_access_token({
        "sub": "admin",
        "username": "admin",
        "role": "admin",
        "user_id": "USER-ADM-CANONICAL",
    })


@pytest.fixture(scope="function")
def common_user_token() -> str:
    """Returns a valid signed JWT access token for the canonical common user."""
    return create_access_token({
        "sub": "common_user",
        "username": "common_user",
        "role": "common_user",
        "user_id": "USER-COM-CANONICAL",
    })


@pytest.fixture(scope="function")
def client(isolated_db, admin_token) -> Generator[TestClient, None, None]:
    """Test client bound to isolated DB with default admin token for business logic suites."""
    with TestClient(app, headers={"Authorization": f"Bearer {admin_token}"}) as c:
        yield c


@pytest.fixture(scope="function")
def unauth_client(isolated_db) -> Generator[TestClient, None, None]:
    """Unauthenticated test client with no Authorization headers."""
    with TestClient(app) as c:
        yield c

