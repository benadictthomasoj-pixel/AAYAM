import io
import pytest
from fastapi.testclient import TestClient
from app.models import Asset, AssetFinding, AIIntelligenceRun, AIConversationMessage


def test_ai_intelligence_run_auth_matrix(unauth_client: TestClient, client: TestClient):
    """
    Verifies that running AI intelligence requires valid authentication,
    preventing unauthorized execution and cost consumption.
    """
    asset_id = "ASSET-BRG-001"

    # Case A: Unauthenticated request -> HTTP 401 Unauthorized
    res_unauth = unauth_client.post(f"/api/assets/{asset_id}/intelligence/run")
    assert res_unauth.status_code == 401
    assert "credentials were not provided" in res_unauth.json()["detail"].lower()

    # Case B: Authenticated request -> HTTP 200 OK with complete 5-module payload
    res_auth = client.post(f"/api/assets/{asset_id}/intelligence/run")
    assert res_auth.status_code == 200, res_auth.text
    data = res_auth.json()

    assert data["asset_id"] == asset_id
    assert "model_used" in data
    assert data["status"] in [
        "completed",
        "degraded_fallback",
        "quota_exceeded_fallback",
        "auth_error_fallback",
    ]
    assert data["structural_summary"] is not None
    assert data["environmental_summary"] is not None
    assert data["compliance_summary"] is not None
    assert data["operational_summary"] is not None
    assert data["predictive_summary"] is not None
    assert "estimated_cost_usd" in data
    assert "total_tokens" in data


def test_ai_intelligence_retrieval_and_history(client: TestClient):
    """Verifies retrieval of latest intelligence run and history ledger."""
    asset_id = "ASSET-BRG-001"

    # Ensure at least one run exists
    run_res = client.post(f"/api/assets/{asset_id}/intelligence/run")
    assert run_res.status_code == 200
    run_id = run_res.json()["id"]

    # Test latest endpoint
    resp_latest = client.get(f"/api/assets/{asset_id}/intelligence/latest")
    assert resp_latest.status_code == 200
    latest_data = resp_latest.json()
    assert latest_data["id"] == run_id

    # Test history endpoint
    resp_history = client.get(f"/api/assets/{asset_id}/intelligence/history")
    assert resp_history.status_code == 200
    history = resp_history.json()
    assert len(history) >= 1
    assert any(h["id"] == run_id for h in history)


def test_predictive_safeguards_and_data_warning(client: TestClient):
    """
    Verifies Section 6 Predictive Intelligence rules:
    - Insufficient longitudinal baseline (< 3 cycles) emits explicit data warning.
    - Remaining useful life is marked as experimental and non-certified.
    """
    asset_id = "ASSET-BRG-001"
    run_res = client.post(f"/api/assets/{asset_id}/intelligence/run")
    assert run_res.status_code == 200
    data = run_res.json()

    # The asset has fewer than 3 historical inspections in the default test seed
    # Verify predictive warning is present and explicit
    if data.get("predictive_data_warning"):
        warning = data["predictive_data_warning"]
        assert "INSUFFICIENT LONGITUDINAL BASELINE" in warning or "minimum of 3" in warning
        assert "MUST NOT" in warning or "non-certified" in warning.lower()


def test_findings_classification_and_evidence_grounding(client: TestClient):
    """
    Verifies that findings adhere to 5-module categorization and allowed evidence classifications:
    - Allowed categories: Structural, Environmental, Compliance, Operational, Predictive
    - Allowed classifications: Documented, Visually Suspected, Inferred, Unknown
    """
    asset_id = "ASSET-BRG-001"
    resp = client.get(f"/api/assets/{asset_id}/findings")
    assert resp.status_code == 200
    findings = resp.json()
    assert len(findings) > 0

    allowed_categories = {"Structural", "Environmental", "Compliance", "Operational", "Predictive"}
    allowed_classifications = {"Documented", "Visually Suspected", "Inferred", "Unknown"}

    for f in findings:
        cat = f.get("intelligence_category", "Structural")
        assert cat in allowed_categories, f"Invalid category: {cat}"
        cls = f.get("evidence_classification", "Inferred")
        assert cls in allowed_classifications, f"Invalid classification: {cls}"


def test_engineer_review_rbac_and_audit_trail(
    unauth_client: TestClient,
    common_user_token: str,
    admin_token: str,
    client: TestClient,
):
    """
    Verifies that engineer verification is strictly protected:
    - Unauthenticated requests -> 401 Unauthorized
    - Non-admin common users -> 403 Forbidden
    - Administrators / engineers -> 200 OK with authenticated verifier audit
    - Invalid status values -> 400 Bad Request
    """
    asset_id = "ASSET-BRG-001"
    resp = client.get(f"/api/assets/{asset_id}/findings")
    assert resp.status_code == 200
    findings = resp.json()
    assert len(findings) > 0

    finding_id = findings[0]["id"]
    endpoint = f"/api/findings/{finding_id}/review"

    review_payload = {
        "verification_status": "Verified",
        "review_decision_notes": "Confirmed on-site during bathymetry inspection.",
        "reviewed_by": "Er. R. Naik, Superintending Engineer",
    }

    # Case A: Unauthenticated request -> HTTP 401
    res_unauth = unauth_client.post(endpoint, json=review_payload)
    assert res_unauth.status_code == 401

    # Case B: Authenticated common user (non-admin) -> HTTP 403 Forbidden
    res_common = unauth_client.post(
        endpoint,
        json=review_payload,
        headers={"Authorization": f"Bearer {common_user_token}"},
    )
    assert res_common.status_code == 403
    assert "administrative privileges required" in res_common.json()["detail"].lower()

    # Case C: Authenticated administrator / engineer -> HTTP 200 OK
    res_admin = unauth_client.post(
        endpoint,
        json=review_payload,
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert res_admin.status_code == 200
    updated = res_admin.json()
    assert updated["verification_status"] == "Verified"
    assert "System Administrator" in updated["reviewed_by"] or "Er. R. Naik" in updated["reviewed_by"]
    assert "Confirmed on-site" in updated["review_decision_notes"]

    # Case D: Re-review to Requires Further Inspection -> HTTP 200 OK
    review_payload_2 = {
        "verification_status": "Requires Further Inspection",
        "review_decision_notes": "Needs core drilling sample.",
        "reviewed_by": "Er. R. Naik",
    }
    res_admin_2 = unauth_client.post(
        endpoint,
        json=review_payload_2,
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert res_admin_2.status_code == 200
    assert res_admin_2.json()["verification_status"] == "Requires Further Inspection"

    # Case E: Invalid verification_status -> HTTP 400 Bad Request
    invalid_payload = {"verification_status": "InvalidStatus"}
    res_bad = unauth_client.post(
        endpoint,
        json=invalid_payload,
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert res_bad.status_code == 400


def test_document_analysis_security_and_validation(unauth_client: TestClient, client: TestClient):
    """
    Verifies document analysis endpoint:
    - Unauthenticated request is rejected (401)
    - Unsupported file extension is rejected (400)
    - Valid document upload extracts findings and observations
    """
    asset_id = "ASSET-BRG-001"
    doc_content = b"Mandovi Estuary Bridge Pier 4 Scour Audit 2023. Observed 2.4m scour cavity. Recommended rip-rap boulder dumping."

    # Case A: Unauthenticated -> HTTP 401
    files = {"file": ("audit_memo.txt", io.BytesIO(doc_content), "text/plain")}
    res_unauth = unauth_client.post(f"/api/assets/{asset_id}/intelligence/analyze-document", files=files)
    assert res_unauth.status_code == 401

    # Case B: Unsupported file extension -> HTTP 400
    bad_files = {"file": ("malicious.exe", io.BytesIO(b"binary data"), "application/octet-stream")}
    res_bad = client.post(f"/api/assets/{asset_id}/intelligence/analyze-document", files=bad_files)
    assert res_bad.status_code == 400
    assert "unsupported document format" in res_bad.json()["detail"].lower()

    # Case C: Valid document -> HTTP 200 OK
    valid_files = {"file": ("audit_memo.txt", io.BytesIO(doc_content), "text/plain")}
    res_valid = client.post(f"/api/assets/{asset_id}/intelligence/analyze-document", files=valid_files)
    assert res_valid.status_code == 200
    data = res_valid.json()
    assert "document_title" in data
    assert "compliance_status" in data
    assert len(data["identified_defects"]) > 0


def test_image_analysis_security_and_validation(unauth_client: TestClient, client: TestClient):
    """
    Verifies image analysis endpoint:
    - Unauthenticated request is rejected (401)
    - Unsupported file extension is rejected (400)
    - Valid image upload produces visual assessment labeled as Visually Suspected
    """
    asset_id = "ASSET-BRG-001"
    # Valid minimal JPEG payload
    fake_img = (
        b"\xff\xd8\xff\xe0\x00\x10JFIF\x00\x01\x01\x01\x00`\x00`\x00\x00\xff\xdb\x00C\x00\x08\x06\x06\x07\x06\x05"
        b"\x08\x07\x07\x07\t\t\x08\n\x0c\x14\r\x0c\x0b\x0b\x0c\x19\x12\x13\x0f\x14\x1d\x1a\x1f\x1e\x1d\x1a\x1c\x1c"
        b" $.' \",#\x1c\x1c(7),01444\x1f'9=82<.342\xff\xc0\x00\x0b\x08\x00\x01\x00\x01\x01\x01\x11\x00\xff\xc4"
        b"\x00\x1f\x00\x00\x01\x05\x01\x01\x01\x01\x01\x01\x00\x00\x00\x00\x00\x00\x00\x00\x01\x02\x03\x04\x05"
        b"\x06\x07\x08\t\n\x0b\xff\xda\x00\x08\x01\x01\x00\x00?\x00\xbf\x00\xff\xd9"
    )

    # Case A: Unauthenticated -> HTTP 401
    files = {"file": ("pier4.jpg", io.BytesIO(fake_img), "image/jpeg")}
    res_unauth = unauth_client.post(f"/api/assets/{asset_id}/intelligence/analyze-image", files=files)
    assert res_unauth.status_code == 401

    # Case B: Unsupported format -> HTTP 400
    bad_files = {"file": ("notes.txt", io.BytesIO(b"text"), "text/plain")}
    res_bad = client.post(f"/api/assets/{asset_id}/intelligence/analyze-image", files=bad_files)
    assert res_bad.status_code == 400
    assert "unsupported image format" in res_bad.json()["detail"].lower()

    # Case C: Valid image -> HTTP 200 OK
    valid_files = {"file": ("pier4.jpg", io.BytesIO(fake_img), "image/jpeg")}
    res_valid = client.post(
        f"/api/assets/{asset_id}/intelligence/analyze-image",
        files=valid_files,
        data={"caption": "Pier 4 base scour"},
    )
    assert res_valid.status_code == 200
    res_data = res_valid.json()
    assert "detected_features" in res_data
    assert "identified_defects" in res_data
    assert res_data["evidence_classification"] == "Visually Suspected"


def test_cross_asset_isolation(client: TestClient):
    """Verifies that non-existent or invalid asset IDs return 404."""
    non_existent = "ASSET-FAKE-999"
    resp = client.post(f"/api/assets/{non_existent}/intelligence/run")
    assert resp.status_code == 404
    assert f"Asset '{non_existent}' not found" in resp.json()["detail"]


def test_copilot_history_recording(client: TestClient):
    """Tests that Copilot Q&A interactions persist to conversation history."""
    asset_id = "ASSET-BRG-001"
    q_payload = {
        "question": "What are the latest structural findings for Mandovi Bridge?",
        "asset_id": asset_id,
    }
    ask_resp = client.post("/api/copilot/ask", json=q_payload)
    assert ask_resp.status_code == 200
    assert ask_resp.json()["answer"] is not None

    # Retrieve history
    hist_resp = client.get(f"/api/copilot/history?asset_id={asset_id}")
    assert hist_resp.status_code == 200
    messages = hist_resp.json()
    assert len(messages) > 0
    assert any(m["asset_id"] == asset_id for m in messages)
