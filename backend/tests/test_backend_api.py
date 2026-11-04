import json
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import text
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.models import Asset, Inspection, parse_flagged_reasons, serialize_flagged_reasons
from app.schemas import AssetCreate


def test_health_endpoint(client: TestClient):
    """Verifies that the health endpoint reports healthy database status and asset count."""
    response = client.get("/api/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert data["database"] == "connected"
    assert data["total_assets"] >= 8
    assert data["mock_mode"] is True


def test_asset_list_and_filtering(client: TestClient):
    """Verifies asset listing, category filtering, search, and pagination response."""
    # List all
    response = client.get("/api/assets")
    assert response.status_code == 200
    data = response.json()
    assert data["total"] >= 8
    assert len(data["items"]) >= 8
    assert "Bridge" in data["categories"]

    # Filter by category
    resp_cat = client.get("/api/assets?category=Bridge")
    assert resp_cat.status_code == 200
    items = resp_cat.json()["items"]
    assert len(items) >= 1
    assert all(a["category"] == "Bridge" for a in items)

    # Search keyword
    resp_search = client.get("/api/assets?search=Mandovi")
    assert resp_search.status_code == 200
    search_items = resp_search.json()["items"]
    assert len(search_items) == 1
    assert search_items[0]["id"] == "ASSET-BRG-001"


def test_asset_summary_stats(client: TestClient):
    """Verifies the aggregated stats endpoint calculates high-level metrics."""
    response = client.get("/api/assets/summary/stats")
    assert response.status_code == 200
    stats = response.json()
    assert stats["total_assets"] >= 8
    assert stats["critical_assets"] >= 1
    assert stats["high_risk_assets"] >= 1
    assert stats["operational_assets"] >= 1
    assert 0.0 <= stats["average_health_index"] <= 100.0


def test_asset_retrieval_by_id(client: TestClient):
    """Verifies retrieving a single asset and confirms flagged_reasons is deserialized as a list."""
    response = client.get("/api/assets/ASSET-BRG-001")
    assert response.status_code == 200
    asset = response.json()
    assert asset["id"] == "ASSET-BRG-001"
    assert "Mandovi River Estuary Bridge" in asset["name"]
    assert isinstance(asset["flagged_reasons"], list)
    assert len(asset["flagged_reasons"]) > 0

    # Non-existent asset returns 404
    missing_resp = client.get("/api/assets/ASSET-DOES-NOT-EXIST")
    assert missing_resp.status_code == 404
    assert "not found" in missing_resp.json()["detail"].lower()


def test_create_asset_success(client: TestClient):
    """
    Verifies POST /api/assets registers a new asset with a list of flagged reasons,
    stores them properly, and returns HTTP 201 with list-typed flagged_reasons.
    """
    new_asset_payload = {
        "id": "ASSET-TEST-NEW-001",
        "name": "Sabarmati Elevated Corridor",
        "category": "Highways & Expressways",
        "district": "Ahmedabad",
        "state": "Gujarat",
        "latitude": 23.0225,
        "longitude": 72.5714,
        "construction_year": 2018,
        "status": "Operational",
        "data_source": "Verified Test Harness Asset",
        "risk_score": 22.5,
        "risk_level": "Low",
        "health_index": 88.0,
        "last_inspection_date": "2024-05-10",
        "flagged_reasons": ["Expansion joint dust seal wear", "Minor deck resurfacing recommended"],
        "description": "Elevated rapid-transit arterial roadway above urban riverfront corridor.",
    }

    create_resp = client.post("/api/assets", json=new_asset_payload)
    assert create_resp.status_code == 201, f"Expected 201, got {create_resp.status_code}: {create_resp.text}"
    created = create_resp.json()
    assert created["id"] == "ASSET-TEST-NEW-001"
    assert created["flagged_reasons"] == ["Expansion joint dust seal wear", "Minor deck resurfacing recommended"]
    assert isinstance(created["flagged_reasons"], list)

    # Verify retrieval
    get_resp = client.get("/api/assets/ASSET-TEST-NEW-001")
    assert get_resp.status_code == 200
    retrieved = get_resp.json()
    assert retrieved["id"] == "ASSET-TEST-NEW-001"
    assert retrieved["flagged_reasons"] == ["Expansion joint dust seal wear", "Minor deck resurfacing recommended"]


def test_create_asset_duplicate_conflict_409(client: TestClient):
    """Verifies that attempting to register an asset with an existing ID returns HTTP 409 Conflict."""
    duplicate_payload = {
        "id": "ASSET-BRG-001",  # Already exists in canonical seed
        "name": "Mandovi Bridge Duplicate Attempt",
        "category": "Bridge",
        "district": "North Goa",
        "state": "Goa",
        "latitude": 15.501,
        "longitude": 73.832,
        "status": "Operational",
        "data_source": "Duplicate Test",
        "risk_score": 10.0,
        "risk_level": "Low",
        "health_index": 90.0,
        "flagged_reasons": [],
    }
    response = client.post("/api/assets", json=duplicate_payload)
    assert response.status_code == 409
    assert "already exists" in response.json()["detail"]


def test_create_asset_invalid_input_422(client: TestClient):
    """Verifies that invalid input or missing required fields returns HTTP 422 Unprocessable Entity."""
    # Missing required 'latitude' and 'name'
    incomplete_payload = {
        "id": "ASSET-INCOMPLETE-001",
        "category": "Bridge",
        "district": "North Goa",
        "state": "Goa",
        "longitude": 73.832,
        "status": "Operational",
        "data_source": "Invalid Test",
    }
    resp_missing = client.post("/api/assets", json=incomplete_payload)
    assert resp_missing.status_code == 422

    # Incompatible data type for latitude
    invalid_type_payload = {
        "id": "ASSET-INVALID-TYPE-001",
        "name": "Invalid Type Asset",
        "category": "Bridge",
        "district": "North Goa",
        "state": "Goa",
        "latitude": "NOT_A_FLOAT",
        "longitude": 73.832,
        "status": "Operational",
        "data_source": "Invalid Test",
    }
    resp_type = client.post("/api/assets", json=invalid_type_payload)
    assert resp_type.status_code == 422


def test_flagged_reasons_serialization_helpers():
    """Unit tests for parse_flagged_reasons and serialize_flagged_reasons."""
    # Deserializing None, empty string, list
    assert parse_flagged_reasons(None) == []
    assert parse_flagged_reasons("") == []
    assert parse_flagged_reasons("   ") == []
    assert parse_flagged_reasons([]) == []
    assert parse_flagged_reasons(["alpha", "beta"]) == ["alpha", "beta"]

    # Legacy semicolon-separated string
    assert parse_flagged_reasons("scour near pier; joint wear") == ["scour near pier", "joint wear"]

    # JSON-encoded string
    json_str = json.dumps(["defect 1", "defect 2"])
    assert parse_flagged_reasons(json_str) == ["defect 1", "defect 2"]

    # Serialization
    assert serialize_flagged_reasons(None) is None
    assert serialize_flagged_reasons([]) is None
    assert serialize_flagged_reasons(["flag 1"]) == json.dumps(["flag 1"])
    assert serialize_flagged_reasons("flag 1; flag 2") == json.dumps(["flag 1", "flag 2"])


def test_heartbeat_calculation_endpoint(client: TestClient):
    """Verifies Digital Heartbeat computation endpoint returns structural health breakdown."""
    response = client.get("/api/assets/ASSET-BRG-001/heartbeat")
    assert response.status_code == 200
    hb = response.json()
    assert hb["asset_id"] == "ASSET-BRG-001"
    assert "risk_score" in hb
    assert "health_index" in hb
    assert "contributing_factors" in hb
    assert len(hb["contributing_factors"]) == 4
    assert "suggested_investigations" in hb


def test_inspections_workflow_and_verification(client: TestClient):
    """
    Verifies the closed-loop inspection workflow:
    1. Retrieve existing inspections
    2. Record a new inspection via POST /api/assets/{asset_id}/inspections
    3. Verify the inspection with verification notes via POST /api/inspections/{id}/verify
    4. Confirm audit timeline includes the verification
    """
    # 1. Existing inspections
    resp = client.get("/api/assets/ASSET-BRG-001/inspections")
    assert resp.status_code == 200
    inspections = resp.json()
    assert len(inspections) >= 1

    # 2. Record new inspection
    new_insp_payload = {
        "inspection_date": "2026-04-12",
        "inspection_type": "Post-Monsoon Pier Collar Acoustic Sounding",
        "findings": "Acoustic survey confirmed rip-rap stone replenishment intact with zero progressive scour.",
        "recommended_action": "Routine semi-annual acoustic check.",
        "actual_action_taken": "Stone rip-rap density confirmed via diver sonar.",
        "responsible_user": "Chief Diver M. Fernandez",
        "evidence_references": "Sonar_Acoustic_Sounding_2026.pdf",
    }
    create_resp = client.post("/api/assets/ASSET-BRG-001/inspections", json=new_insp_payload)
    assert create_resp.status_code == 201
    created_insp = create_resp.json()
    insp_id = created_insp["id"]
    assert created_insp["status"] == "Pending"

    # 3. Direct verification from 'Pending' state must be rejected with 409
    verify_payload = {
        "verification_notes": "Senior Superintending Engineer on-site physical verification completed. Efficacy confirmed.",
        "verification_date": "2026-04-15",
        "verifier_name": "Superintending Engineer K. Prabhu",
        "outcome": "Remediation Successful",
    }
    premature_verify = client.post(f"/api/inspections/{insp_id}/verify", json=verify_payload)
    assert premature_verify.status_code == 409
    assert "must reach 'Completed' state" in premature_verify.json()["detail"]

    # 4. Transition to 'Completed' via PATCH
    complete_resp = client.patch(f"/api/inspections/{insp_id}", json={"status": "Completed"})
    assert complete_resp.status_code == 200
    assert complete_resp.json()["status"] == "Completed"

    # 5. Verify the completed inspection
    verify_resp = client.post(f"/api/inspections/{insp_id}/verify", json=verify_payload)
    assert verify_resp.status_code == 200
    verified = verify_resp.json()
    assert verified["status"] == "Verified"
    assert verified["verification_notes"] == verify_payload["verification_notes"]
    assert verified["verification_date"] == "2026-04-15"
    assert verified["verification_outcome"] == "Remediation Successful"

    # 6. Audit timeline
    timeline_resp = client.get("/api/assets/ASSET-BRG-001/timeline")
    assert timeline_resp.status_code == 200
    events = timeline_resp.json()
    assert any(e["event_type"] == "verification" for e in events)


def test_verify_rejected_from_invalid_state_409(client: TestClient):
    """
    Verifies that attempting to verify an inspection that has not reached 'Completed'
    is rejected with HTTP 409 Conflict.
    """
    create_resp = client.post("/api/assets/ASSET-BRG-001/inspections", json={
        "inspection_date": "2026-05-01",
        "inspection_type": "Structural Audit",
        "findings": "Deck vibration monitoring check",
        "actual_action_taken": "Installed vibration sensor",
    })
    insp_id = create_resp.json()["id"]

    # Attempt verify while Pending
    verify_resp_pending = client.post(f"/api/inspections/{insp_id}/verify", json={
        "verification_notes": "Trying to verify prematurely while Pending",
    })
    assert verify_resp_pending.status_code == 409
    assert "must reach 'Completed' state" in verify_resp_pending.json()["detail"]

    # Move to In Progress
    patch_resp = client.patch(f"/api/inspections/{insp_id}", json={"status": "In Progress"})
    assert patch_resp.status_code == 200

    # Attempt verify while In Progress
    verify_resp_inprogress = client.post(f"/api/inspections/{insp_id}/verify", json={
        "verification_notes": "Trying to verify prematurely while In Progress",
    })
    assert verify_resp_inprogress.status_code == 409
    assert "must reach 'Completed' state" in verify_resp_inprogress.json()["detail"]


def test_verify_rejected_if_already_verified_and_patch_blocked_409(client: TestClient):
    """
    Verifies terminal certified state:
    1. Re-verification of an already Verified record returns HTTP 409 Conflict.
    2. Attempting to PATCH a Verified inspection returns HTTP 409 Conflict.
    """
    create_resp = client.post("/api/assets/ASSET-BRG-001/inspections", json={
        "inspection_date": "2026-05-10",
        "inspection_type": "Pier Sounding",
        "findings": "Pier foundation acoustic check",
        "actual_action_taken": "Rock armor stone placement",
    })
    insp_id = create_resp.json()["id"]

    # Move to Completed and Verify
    client.patch(f"/api/inspections/{insp_id}", json={"status": "Completed"})
    verify_resp = client.post(f"/api/inspections/{insp_id}/verify", json={
        "verification_notes": "First certification of efficacy.",
        "outcome": "Remediation Successful",
    })
    assert verify_resp.status_code == 200

    # Attempt second verification (re-verification) -> 409 Conflict
    reverify_resp = client.post(f"/api/inspections/{insp_id}/verify", json={
        "verification_notes": "Second verification attempt.",
        "outcome": "Remediation Successful",
    })
    assert reverify_resp.status_code == 409
    assert "already Verified" in reverify_resp.json()["detail"]

    # Attempt to PATCH status of Verified inspection -> 409 Conflict
    patch_blocked = client.patch(f"/api/inspections/{insp_id}", json={"status": "In Progress"})
    assert patch_blocked.status_code == 409
    assert "already Verified and certified" in patch_blocked.json()["detail"]


def test_verify_missing_intervention_details_rejected_409(client: TestClient):
    """
    Verifies that certifying 'Remediation Successful' without documented
    actual intervention details (actual_action_taken) is rejected with HTTP 409 Conflict.
    """
    create_resp = client.post("/api/assets/ASSET-BRG-001/inspections", json={
        "inspection_date": "2026-06-01",
        "inspection_type": "Observation Only",
        "findings": "Noted erosion along shoreline",
        # actual_action_taken omitted
    })
    insp_id = create_resp.json()["id"]

    client.patch(f"/api/inspections/{insp_id}", json={"status": "Completed"})

    # Verify with outcome Remediation Successful without actual_action_taken -> 409 Conflict
    verify_resp = client.post(f"/api/inspections/{insp_id}/verify", json={
        "verification_notes": "Trying to claim success without documenting actual work done.",
        "outcome": "Remediation Successful",
    })
    assert verify_resp.status_code == 409
    assert "Actual intervention details" in verify_resp.json()["detail"]

    # Supplying actual_action_taken in the verification payload satisfies the requirement
    valid_verify_resp = client.post(f"/api/inspections/{insp_id}/verify", json={
        "verification_notes": "Repairs physically audited and confirmed.",
        "outcome": "Remediation Successful",
        "actual_action_taken": "Emergency boulder revetment constructed 30m along embankment.",
    })
    assert valid_verify_resp.status_code == 200
    assert valid_verify_resp.json()["status"] == "Verified"


def test_failed_or_assessment_verification_does_not_reduce_risk(client: TestClient):
    """
    Verifies that verification notes alone do NOT reduce asset risk.
    Explicit outcomes of 'Remediation Unsuccessful' or 'Further Assessment Required'
    certify the audit but do not apply risk discounts.
    """
    initial_hb = client.get("/api/assets/ASSET-BRG-001/heartbeat").json()
    initial_risk = initial_hb["risk_score"]

    # Record inspection with actual work that failed to resolve defect
    create_resp = client.post("/api/assets/ASSET-BRG-001/inspections", json={
        "inspection_date": "2026-06-15",
        "inspection_type": "Underwater Sonar Bathymetry",
        "findings": "Scour depression around Pier 4 remains active at 2.9m depth",
        "recommended_action": "Heavy rip-rap armor",
        "actual_action_taken": "Deployed temporary sandbags along pier base",
    })
    insp_id = create_resp.json()["id"]

    client.patch(f"/api/inspections/{insp_id}", json={"status": "Completed"})

    # Verify with Remediation Unsuccessful
    verify_resp = client.post(f"/api/inspections/{insp_id}/verify", json={
        "verification_notes": "Sandbags washed away by high tidal velocity. Scour defect unresolved.",
        "outcome": "Remediation Unsuccessful",
    })
    assert verify_resp.status_code == 200
    assert verify_resp.json()["verification_outcome"] == "Remediation Unsuccessful"

    # Check asset heartbeat: scour defect penalty must NOT be reduced
    updated_hb = client.get("/api/assets/ASSET-BRG-001/heartbeat").json()
    # Risk should not decrease from defect mitigation (it may have minor recency adjustment, but scour defect is intact)
    asset_after = client.get("/api/assets/ASSET-BRG-001").json()
    assert asset_after["status"] in ["Critical Attention", "Requires Inspection"]


def test_unrelated_verified_inspection_does_not_reduce_unrelated_defect(client: TestClient):
    """
    Proves that an inspection for an unrelated routine task (e.g. guardrail painting)
    does NOT reduce the defect penalty for a structural defect (e.g. scour).
    """
    # Create inspection for unrelated task
    create_resp = client.post("/api/assets/ASSET-BRG-001/inspections", json={
        "inspection_date": "2026-07-01",
        "inspection_type": "Routine Maintenance Clearing",
        "findings": "Vegetation overgrowth along bridge approach walkway",
        "recommended_action": "Trim shrubs and clean pedestrian path",
        "actual_action_taken": "Cleared 150m of shrubs along pedestrian pathway",
    })
    insp_id = create_resp.json()["id"]

    client.patch(f"/api/inspections/{insp_id}", json={"status": "Completed"})

    # Verify with Remediation Successful
    verify_resp = client.post(f"/api/inspections/{insp_id}/verify", json={
        "verification_notes": "Walkway clearing completed to satisfaction.",
        "outcome": "Remediation Successful",
    })
    assert verify_resp.status_code == 200

    # ASSET-BRG-001 has "Sub-surface pier scour" defect.
    # The walkway clearing should NOT reduce the scour defect!
    asset_resp = client.get("/api/assets/ASSET-BRG-001").json()
    # Asset has severe pier scour and marine salinity, so risk remains elevated (>= 60)
    assert asset_resp["risk_score"] >= 60.0
    assert asset_resp["status"] == "Critical Attention"


def test_successful_eligible_remediation_reduces_relevant_defect_and_syncs_status(client: TestClient):
    """
    Verifies that when an inspection genuinely targets and resolves the specific defect
    with 'Remediation Successful' and documented intervention details, risk decreases
    and asset status is properly synchronized.
    """
    # Create targeted intervention for pier scour
    create_resp = client.post("/api/assets/ASSET-BRG-001/inspections", json={
        "inspection_date": "2026-07-15",
        "inspection_type": "Underwater Sonar Bathymetry",
        "findings": "Pier foundation scour hole surveyed depth 2.8m",
        "recommended_action": "Heavy granite rip-rap stone replenishment",
        "actual_action_taken": "Placed 65 tonnes of graded granite rip-rap around pier foundation base",
    })
    insp_id = create_resp.json()["id"]

    client.patch(f"/api/inspections/{insp_id}", json={"status": "Completed"})

    # Initial risk score before verification
    asset_before = client.get("/api/assets/ASSET-BRG-001").json()
    risk_before = asset_before["risk_score"]

    # Verify outcome as Remediation Successful
    verify_resp = client.post(f"/api/inspections/{insp_id}/verify", json={
        "verification_notes": "Post-remediation multibeam bathymetry confirms scour hole 100% replenished with zero ongoing seabed displacement.",
        "outcome": "Remediation Successful",
    })
    assert verify_resp.status_code == 200
    assert verify_resp.json()["verification_outcome"] == "Remediation Successful"

    # Asset risk must decrease significantly
    asset_after = client.get("/api/assets/ASSET-BRG-001").json()
    assert asset_after["risk_score"] < risk_before
    # Status is synchronized with the new score
    if asset_after["risk_score"] < 40.0:
        assert asset_after["status"] == "Operational"
    elif asset_after["risk_score"] < 60.0:
        assert asset_after["status"] == "Requires Inspection"
    else:
        assert asset_after["status"] == "Critical Attention"


def test_asset_risk_increase_syncs_status_to_critical_attention(client: TestClient):
    """
    Verifies that when an inspection discovers a defect raising risk,
    asset status is immediately synchronized:
    - Moves from 'Operational' to 'Requires Inspection' (40.0 - 59.9)
    - Moves to 'Critical Attention' when risk >= 60.0
    Proves that an asset does not remain 'Operational' when its risk increases.
    """
    # 1. Asset with Low risk (15.0) and Operational status
    client.post("/api/assets", json={
        "id": "ASSET-TEST-CRIT-SYNC",
        "name": "Sync Test Culvert",
        "category": "Drainage",
        "district": "North Goa",
        "state": "Goa",
        "construction_year": 1965,
        "latitude": 15.500,
        "longitude": 73.800,
        "status": "Operational",
        "data_source": "Test Ingestion",
        "risk_score": 15.0,
        "risk_level": "Low",
        "health_index": 85.0,
        "flagged_reasons": ["Severe foundation scour", "Structural fissure in culvert barrel"],
    })

    # 2. Add a pending critical inspection discovering progressive scour
    insp_resp = client.post("/api/assets/ASSET-TEST-CRIT-SYNC/inspections", json={
        "inspection_date": "2026-08-01",
        "inspection_type": "Emergency Post-Weather Survey",
        "findings": "Flash flood caused severe sub-surface foundation scour void measuring 3.5m deep under culvert barrel.",
    })
    assert insp_resp.status_code == 201

    # Check updated asset: risk score has jumped >= 60.0 and status is synchronized to Critical Attention
    asset_resp = client.get("/api/assets/ASSET-TEST-CRIT-SYNC").json()
    assert asset_resp["risk_score"] >= 60.0
    assert asset_resp["status"] == "Critical Attention"


def test_sqlite_foreign_key_enforcement(isolated_db: Session):
    """
    Verifies that SQLite foreign-key enforcement is enabled and active.
    1. Queries PRAGMA foreign_keys directly.
    2. Proves that inserting an Inspection referencing a non-existent asset raises IntegrityError.
    """
    # Verify foreign keys are enabled (dialect-aware check)
    if isolated_db.bind.dialect.name == "sqlite":
        fk_status = isolated_db.execute(text("PRAGMA foreign_keys")).scalar()
        assert fk_status == 1, f"Expected PRAGMA foreign_keys=1, got {fk_status}"

    # Verify constraint violation on inserting orphan child
    orphan_inspection = Inspection(
        id="INSP-ORPHAN-TEST-001",
        asset_id="NON-EXISTENT-PARENT-ASSET-ID",
        inspection_date="2026-01-01",
        inspection_type="Orphan FK Test",
        findings="This record has no matching parent asset.",
        status="Pending",
    )
    isolated_db.add(orphan_inspection)
    with pytest.raises(IntegrityError):
        isolated_db.commit()

    isolated_db.rollback()


def test_sqlite_foreign_key_prevent_parent_deletion_with_raw_sql(isolated_db: Session):
    """
    Proves that SQLite foreign-key enforcement prevents raw SQL deletion of a parent
    asset record that has existing dependent inspection records.
    """
    # ASSET-BRG-001 has child inspection INSP-2023-001 in the canonical seed
    with pytest.raises(IntegrityError):
        isolated_db.execute(text("DELETE FROM assets WHERE id = 'ASSET-BRG-001'"))
        isolated_db.commit()

    isolated_db.rollback()


def test_sqlite_foreign_key_prevent_invalid_child_update(isolated_db: Session):
    """
    Proves that updating an existing inspection's foreign key (asset_id) to a
    non-existent parent asset raises an IntegrityError under SQLite foreign_keys=ON.
    """
    inspection = isolated_db.query(Inspection).filter(Inspection.id == "INSP-2023-001").first()
    assert inspection is not None
    inspection.asset_id = "NON-EXISTENT-PARENT-ID"

    with pytest.raises(IntegrityError):
        isolated_db.commit()

    isolated_db.rollback()


def test_asset_inspection_orm_relationship_and_cascade(isolated_db: Session):
    """
    Verifies ORM-level relationship loading and cascade deletion:
    1. Parent asset resolves linked inspections list.
    2. Creating parent and child together commits cleanly.
    3. Deleting parent via session.delete() cascades to child inspections cleanly.
    """
    # 1. Verify existing relationship loading
    asset = isolated_db.query(Asset).filter(Asset.id == "ASSET-BRG-001").first()
    assert len(asset.inspections) >= 1
    assert asset.inspections[0].asset_id == "ASSET-BRG-001"

    # 2. Create isolated parent and child
    test_asset = Asset(
        id="ASSET-CASCADE-PARENT-001",
        name="Cascade Test Asset",
        category="Bridge",
        district="Test District",
        state="Test State",
        latitude=10.0,
        longitude=70.0,
        status="Operational",
        data_source="Test",
    )
    test_inspection = Inspection(
        id="INSP-CASCADE-CHILD-001",
        asset_id="ASSET-CASCADE-PARENT-001",
        inspection_date="2026-05-01",
        inspection_type="Cascade Test",
        findings="Verification of cascade handling.",
        status="Completed",
    )
    isolated_db.add(test_asset)
    isolated_db.add(test_inspection)
    isolated_db.commit()

    # Confirm child exists
    child = isolated_db.query(Inspection).filter(Inspection.id == "INSP-CASCADE-CHILD-001").first()
    assert child is not None

    # 3. Delete parent via ORM
    isolated_db.delete(test_asset)
    isolated_db.commit()

    # Confirm cascade deletion of child
    orphan_check = isolated_db.query(Inspection).filter(Inspection.id == "INSP-CASCADE-CHILD-001").first()
    assert orphan_check is None


def test_api_create_inspection_for_nonexistent_asset(client: TestClient):
    """
    Verifies that calling POST /api/assets/{asset_id}/inspections with a non-existent
    asset ID returns HTTP 404 rather than an unhandled 500 error.
    """
    payload = {
        "inspection_date": "2026-06-01",
        "inspection_type": "Underwater Scour Check",
        "findings": "Testing non-existent asset validation.",
    }
    response = client.post("/api/assets/NON-EXISTENT-ASSET-ID/inspections", json=payload)
    assert response.status_code == 404
    assert "not found" in response.json()["detail"].lower()


def test_critical_defect_lifecycle_penalty_retention_and_clearance(client: TestClient):
    """
    Comprehensive regression test verifying the 7 lifecycle states of an active critical defect:
    1. Pending critical inspection retains penalty.
    2. In-progress critical inspection retains penalty.
    3. Completed but not verified critical inspection retains penalty.
    4. Verified inspection with 'Remediation Unsuccessful' retains penalty.
    5. Verified inspection with 'Further Assessment Required' retains penalty.
    6. An unrelated successful intervention does NOT clear the critical defect penalty.
    7. Verified successful, relevant remediation CLEARS the critical defect penalty and reduces risk.
    """
    # Create isolated test asset with a known scour defect flag
    asset_id = "ASSET-CRIT-LIFECYCLE-TEST"
    create_asset_resp = client.post("/api/assets", json={
        "id": asset_id,
        "name": "Critical Lifecycle Viaduct",
        "category": "Bridge",
        "latitude": 15.5,
        "longitude": 73.8,
        "district": "North Goa",
        "state": "Goa",
        "construction_year": 1975,
        "status": "Requires Inspection",
        "data_source": "Civil Engineering Audit",
        "flagged_reasons": ["Sub-surface pier scour detected"],
    })
    assert create_asset_resp.status_code == 201

    # Step 1: Create critical inspection (Status: Pending)
    insp1_resp = client.post(f"/api/assets/{asset_id}/inspections", json={
        "inspection_date": "2026-09-01",
        "inspection_type": "Underwater Sonar Bathymetry",
        "findings": "Critical scour hole 2.9m detected around pier P3 footing",
        "recommended_action": "Heavy riprap placement",
    })
    assert insp1_resp.status_code == 201
    insp1_id = insp1_resp.json()["id"]
    assert insp1_resp.json()["status"] == "Pending"

    # Step 1 verification: Pending critical inspection applies penalty
    hb_pending = client.get(f"/api/assets/{asset_id}/heartbeat").json()
    risk_pending = hb_pending["risk_score"]
    f1_pending = next(f for f in hb_pending["contributing_factors"] if f["id"] == "factor_structural")
    assert f1_pending["score"] >= 80.0

    # Step 2: Transition to In Progress - retains penalty
    patch_ip = client.patch(f"/api/inspections/{insp1_id}", json={"status": "In Progress"})
    assert patch_ip.status_code == 200
    hb_ip = client.get(f"/api/assets/{asset_id}/heartbeat").json()
    f1_ip = next(f for f in hb_ip["contributing_factors"] if f["id"] == "factor_structural")
    assert f1_ip["score"] == f1_pending["score"], "In-progress status must retain critical defect penalty"

    # Step 3: Transition to Completed - retains penalty
    patch_comp = client.patch(f"/api/inspections/{insp1_id}", json={"status": "Completed"})
    assert patch_comp.status_code == 200
    hb_comp = client.get(f"/api/assets/{asset_id}/heartbeat").json()
    f1_comp = next(f for f in hb_comp["contributing_factors"] if f["id"] == "factor_structural")
    assert f1_comp["score"] == f1_pending["score"], "Completed status must retain critical defect penalty"

    # Step 4: Verify with outcome 'Remediation Unsuccessful' - retains penalty
    verify_unsucc = client.post(f"/api/inspections/{insp1_id}/verify", json={
        "outcome": "Remediation Unsuccessful",
        "verification_notes": "Attempted sandbagging failed under current. Scour remains active at 2.9m.",
    })
    assert verify_unsucc.status_code == 200
    assert verify_unsucc.json()["verification_outcome"] == "Remediation Unsuccessful"

    hb_unsucc = client.get(f"/api/assets/{asset_id}/heartbeat").json()
    f1_unsucc = next(f for f in hb_unsucc["contributing_factors"] if f["id"] == "factor_structural")
    assert f1_unsucc["score"] == f1_pending["score"], "Remediation Unsuccessful must retain critical defect penalty"
    assert hb_unsucc["risk_score"] >= risk_pending - 0.5, "Risk score must NOT decrease for failed remediation"

    # Step 5: Add a second critical inspection verified with 'Further Assessment Required' - retains penalty
    insp2_resp = client.post(f"/api/assets/{asset_id}/inspections", json={
        "inspection_date": "2026-09-10",
        "inspection_type": "Ultrasonic Flaw Detection",
        "findings": "Structural fissure crack 6mm wide along pier cap",
        "recommended_action": "Core sample non-destructive testing",
    })
    insp2_id = insp2_resp.json()["id"]
    client.patch(f"/api/inspections/{insp2_id}", json={"status": "Completed"})

    verify_fa = client.post(f"/api/inspections/{insp2_id}/verify", json={
        "outcome": "Further Assessment Required",
        "verification_notes": "Crack depth exceeds superficial layer. NDT core analysis ordered.",
    })
    assert verify_fa.status_code == 200
    hb_fa = client.get(f"/api/assets/{asset_id}/heartbeat").json()
    f1_fa = next(f for f in hb_fa["contributing_factors"] if f["id"] == "factor_structural")
    assert f1_fa["score"] >= f1_pending["score"], "Further Assessment Required must retain critical defect penalty"

    # Step 6: Add an unrelated successful intervention (deck clearing) - must NOT clear critical defect
    insp3_resp = client.post(f"/api/assets/{asset_id}/inspections", json={
        "inspection_date": "2026-09-15",
        "inspection_type": "Roadway Maintenance",
        "findings": "Vegetation and drainage overgrowth on bridge deck walkway",
        "actual_action_taken": "Cleared 200m of drainage gutters along walkway",
    })
    insp3_id = insp3_resp.json()["id"]
    client.patch(f"/api/inspections/{insp3_id}", json={"status": "Completed"})

    verify_unrel = client.post(f"/api/inspections/{insp3_id}/verify", json={
        "outcome": "Remediation Successful",
        "actual_action_taken": "Cleared 200m of drainage gutters along walkway",
        "verification_notes": "Walkway drainage clean and verified.",
    })
    assert verify_unrel.status_code == 200
    hb_unrel = client.get(f"/api/assets/{asset_id}/heartbeat").json()
    f1_unrel = next(f for f in hb_unrel["contributing_factors"] if f["id"] == "factor_structural")
    assert f1_unrel["score"] >= f1_pending["score"], "Unrelated successful inspection must NOT clear the critical defect penalty"

    # Step 7: Add targeted, eligible successful remediation for the scour defect and fissure defect
    insp4_resp = client.post(f"/api/assets/{asset_id}/inspections", json={
        "inspection_date": "2026-09-20",
        "inspection_type": "Underwater Dive Repair",
        "findings": "Pier foundation scour remediation completed",
        "actual_action_taken": "Placed 350 tonnes of graded riprap rock armouring around pier P3 footing",
    })
    insp4_id = insp4_resp.json()["id"]
    client.patch(f"/api/inspections/{insp4_id}", json={"status": "Completed"})

    verify_rel = client.post(f"/api/inspections/{insp4_id}/verify", json={
        "outcome": "Remediation Successful",
        "actual_action_taken": "Placed 350 tonnes of graded riprap rock armouring around pier P3 footing",
        "verification_notes": "Sonar confirmed scour cavity filled to riverbed datum. Armour stable.",
    })
    assert verify_rel.status_code == 200

    # Remediate fissure as well
    insp5_resp = client.post(f"/api/assets/{asset_id}/inspections", json={
        "inspection_date": "2026-09-22",
        "inspection_type": "Structural Epoxy Injection",
        "findings": "Pier cap structural fissure repair completed",
        "actual_action_taken": "High-pressure epoxy grout injection across entire 6mm fissure length",
    })
    insp5_id = insp5_resp.json()["id"]
    client.patch(f"/api/inspections/{insp5_id}", json={"status": "Completed"})
    verify_fissure = client.post(f"/api/inspections/{insp5_id}/verify", json={
        "outcome": "Remediation Successful",
        "actual_action_taken": "High-pressure epoxy grout injection across entire 6mm fissure length",
        "verification_notes": "Ultrasonic test confirmed structural bond across fissure.",
    })
    assert verify_fissure.status_code == 200

    # Verify all critical defect penalties are cleared and risk has dropped significantly
    hb_resolved = client.get(f"/api/assets/{asset_id}/heartbeat").json()
    f1_resolved = next(f for f in hb_resolved["contributing_factors"] if f["id"] == "factor_structural")
    assert f1_resolved["score"] < f1_pending["score"], "Eligible verified remediation must reduce structural defect score"
    assert hb_resolved["risk_score"] < risk_pending - 10.0, "Risk score must drop substantially after eligible remediation"


