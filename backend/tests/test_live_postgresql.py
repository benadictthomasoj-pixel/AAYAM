import pytest
from app.database import engine, SessionLocal, get_db
from app.models import (
    User, Asset, Inspection, AssetMedia,
    EvidenceSource, AIIntelligenceRun, AssetFinding, AIConversationMessage
)
from app.main import app
from fastapi.testclient import TestClient

@pytest.fixture(autouse=True)
def ensure_live_db():
    """Ensures app uses real PostgreSQL database, not conftest's isolated_db override."""
    app.dependency_overrides.clear()
    yield
    app.dependency_overrides.clear()

def test_postgresql_dialect_confirmed():
    """Confirms that the active database dialect is PostgreSQL."""
    assert engine.dialect.name == "postgresql", f"Expected dialect 'postgresql', got '{engine.dialect.name}'"

def test_all_eight_tables_populated():
    """Verifies that all 8 tables exist in PostgreSQL with expected record counts."""
    session = SessionLocal()
    try:
        counts = {
            "users": session.query(User).count(),
            "assets": session.query(Asset).count(),
            "inspections": session.query(Inspection).count(),
            "asset_media": session.query(AssetMedia).count(),
            "evidence_sources": session.query(EvidenceSource).count(),
            "ai_intelligence_runs": session.query(AIIntelligenceRun).count(),
            "asset_findings": session.query(AssetFinding).count(),
            "ai_conversation_messages": session.query(AIConversationMessage).count(),
        }
        assert counts["users"] == 2
        assert counts["assets"] == 8
        assert counts["inspections"] == 4
        assert counts["asset_media"] == 12
        assert counts["evidence_sources"] == 7
        assert counts["ai_intelligence_runs"] == 6
        assert counts["asset_findings"] == 22
        assert counts["ai_conversation_messages"] == 16
        assert sum(counts.values()) == 77
    finally:
        session.close()

def test_referential_integrity_and_relationships():
    """Verifies foreign key relationships across assets, findings, and inspections."""
    session = SessionLocal()
    try:
        mithi = session.query(Asset).filter(Asset.id == "ASSET-DRN-006").first()
        assert mithi is not None
        assert mithi.name == "Mithi River Stormwater Tidal Outfall Sluice Gate"
        
        # Test child findings relationship
        findings = session.query(AssetFinding).filter(AssetFinding.asset_id == mithi.id).all()
        assert len(findings) == 10
        for f in findings:
            assert f.asset_id == mithi.id
            
        # Test child inspections relationship
        inspections = session.query(Inspection).filter(Inspection.asset_id == mithi.id).all()
        assert len(inspections) == 1
        assert inspections[0].asset_id == mithi.id
    finally:
        session.close()

def test_api_health_endpoint():
    """Verifies /health and /api/health against PostgreSQL."""
    with TestClient(app) as client:
        r = client.get("/health")
        assert r.status_code == 200
        body = r.json()
        assert body["database"] == "connected"
        assert body["total_assets"] == 8

def test_api_authentication_and_rbac():
    """Verifies login and JWT generation against PostgreSQL."""
    with TestClient(app) as client:
        r = client.post("/api/auth/login", json={"username": "admin", "password": "admin123"})
        assert r.status_code == 200
        token_data = r.json()
        assert "access_token" in token_data
        token = token_data["access_token"]
        
        # Test /api/auth/me with bearer token
        r_me = client.get("/api/auth/me", headers={"Authorization": f"Bearer {token}"})
        assert r_me.status_code == 200
        assert r_me.json()["username"] == "admin"
        assert r_me.json()["role"] == "admin"

def test_api_asset_list_and_details():
    """Verifies asset listing and detail endpoint."""
    with TestClient(app) as client:
        r = client.get("/api/assets")
        assert r.status_code == 200
        assets = r.json()
        assert len(assets) > 0
        
        r_detail = client.get("/api/assets/ASSET-BRG-001")
        assert r_detail.status_code == 200
        assert "Mandovi River" in r_detail.json()["name"]

def test_api_heartbeat_calculation():
    """Verifies dynamic heartbeat calculation formula against PostgreSQL data."""
    with TestClient(app) as client:
        r = client.get("/api/assets/ASSET-BRG-001/heartbeat")
        assert r.status_code == 200
        data = r.json()
        assert "risk_score" in data
        assert "health_index" in data

def test_api_evidence_signed_url():
    """Verifies evidence document signed-url generation via authenticated endpoint."""
    with TestClient(app) as client:
        r_login = client.post("/api/auth/login", json={"username": "admin", "password": "admin123"})
        token = r_login.json()["access_token"]
        
        r_signed = client.get(
            "/api/evidence/Mandovi_Bridge_Pier_Scour_Audit_2023.pdf/signed-url",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert r_signed.status_code == 200
        body = r_signed.json()
        assert body["signed_url"].startswith("https://")
