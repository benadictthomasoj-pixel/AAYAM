from datetime import datetime, timezone
from contextlib import asynccontextmanager
from typing import Optional, List, Dict, Any
from pathlib import Path
import logging
import json
import shutil
from fastapi import FastAPI, Depends, HTTPException, Query, status, UploadFile, File, Form
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from sqlalchemy import or_, func

from app.config import APP_NAME, ENV, CORS_ORIGINS
from app.database import get_db, Base, engine
from app.models import (
    Asset,
    Inspection,
    User,
    AssetMedia,
    EvidenceSource,
    AssetFinding,
    AIIntelligenceRun,
    AIConversationMessage,
    parse_flagged_reasons,
    serialize_flagged_reasons,
)
import re
import uuid
from app.schemas import (
    AssetCreate,
    HealthResponse,
    AssetResponse,
    AssetListResponse,
    AssetSummaryStats,
    CopilotAskRequest,
    CopilotAskResponse,
    HeartbeatResponse,
    InspectionCreateRequest,
    InspectionUpdateRequest,
    InspectionVerifyRequest,
    InspectionResponse,
    TimelineEvent,
    DocumentDetailResponse,
    UserLoginRequest,
    UserRegisterRequest,
    UserResponse,
    TokenResponse,
    AssetMediaResponse,
    EvidenceSourceResponse,
    AssetFindingResponse,
    AssetFindingCreateRequest,
    FindingReviewRequest,
    AIIntelligenceRunResponse,
    GlobalSearchResponse,
    GlobalSearchResultItem,
    AssetIntelligenceResponse,
    AssetCompleteness,
    AssetReportResponse,
    AssetReportSection,
)
from app.security import verify_password, create_access_token, hash_password
from app.dependencies import get_current_user, require_admin, get_current_user_optional
from app.document_store import evidence_store
from app.ai_service import ai_service
from app.copilot_service import query_copilot_evidence, query_copilot_evidence_async
from app.heartbeat_engine import calculate_digital_heartbeat, determine_asset_status
from app.database import ensure_schema_compatibility, engine
from app.seed import init_db

MEDIA_DIR = Path(__file__).resolve().parent.parent / "data" / "media"
MEDIA_DIR.mkdir(parents=True, exist_ok=True)

logging.basicConfig(level=logging.INFO)
from app.copilot_service import install_sensitive_param_filters
install_sensitive_param_filters()
logger = logging.getLogger("aayam.api")


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Application lifespan context:
    Initializes database tables and sample mock records if the database is empty.
    """
    logger.info("AAYAM API starting up. Verifying database and seed data...")
    ensure_schema_compatibility(engine)
    init_db(force_reseed=False)
    yield
    logger.info("AAYAM API shutting down.")


app = FastAPI(
    title=APP_NAME,
    description=(
        "AAYAM — AI-Powered Public Infrastructure Intelligence Layer Prototype. "
        "REST API serving asset records, condition telemetry, and Digital Heartbeat indicators."
    ),
    version="0.1.0",
    lifespan=lifespan,
)

# Configure Cross-Origin Resource Sharing (CORS) for frontend client
app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS if CORS_ORIGINS else ["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/", tags=["Root"])
def root():
    return {
        "app": APP_NAME,
        "version": "0.1.0",
        "status": "online",
        "documentation": "/docs",
        "environment": ENV,
        "note": "Prototype mock dataset mode active.",
    }


@app.get(
    "/api/health",
    response_model=HealthResponse,
    tags=["Health"],
    summary="Service Health and Database Connectivity Check",
)
def get_health(db: Session = Depends(get_db)):
    """
    Verifies that the FastAPI application is alive and can query the SQLite database.
    Returns status, environment, mock mode disclosure, and active asset count.
    """
    try:
        total_assets = db.query(Asset).count()
        db_status = "connected"
    except Exception as e:
        logger.error(f"Database health check failed: {e}")
        db_status = f"unreachable: {str(e)}"
        total_assets = 0

    return HealthResponse(
        status="healthy" if db_status == "connected" else "degraded",
        app_name=APP_NAME,
        environment=ENV,
        timestamp=datetime.now(timezone.utc).isoformat(),
        database=db_status,
        total_assets=total_assets,
        mock_mode=True,
        disclaimer="Hackathon prototype with synthetic/mock data. Never use for operational life-safety decisions.",
    )


# ==============================================================================
# AUTHENTICATION & ACCESS CONTROL FOUNDATION ENDPOINTS
# ==============================================================================

EMAIL_REGEX = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")
USERNAME_REGEX = re.compile(r"^[a-zA-Z0-9_\-\.]{3,50}$")


@app.post(
    "/api/auth/register",
    response_model=UserResponse,
    status_code=status.HTTP_201_CREATED,
    tags=["Authentication"],
    summary="Public self-registration for Common Users",
)
def register_user(payload: UserRegisterRequest, db: Session = Depends(get_db)):
    """
    Public self-registration for Common Users.
    Enforces that:
    1. Every publicly registered account is assigned role='common_user'. Requests attempting
       to specify or escalate to 'admin' privileges are rejected / overridden.
    2. Username and email must be unique across the platform.
    3. Passwords must be at least 8 characters long, maximum 72 bytes, and match confirm_password.
    4. Passwords are securely hashed with bcrypt (12 salt rounds).
    5. Required fields are validated; clear HTTP 400 / 409 errors returned without leaking DB internals.

    NOTE: Email verification and password recovery workflows are not implemented in this version.
    """
    clean_username = payload.username.strip()
    clean_email = payload.email.strip().lower()
    clean_fullname = payload.full_name.strip()

    # 1. Validate username format
    if not USERNAME_REGEX.match(clean_username):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid username format. Must be 3-50 characters consisting of letters, digits, '.', '-', or '_'.",
        )

    # 2. Validate email format
    if not EMAIL_REGEX.match(clean_email):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid email format. Please provide a valid email address.",
        )

    # 3. Validate full name
    if not clean_fullname:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Full name cannot be empty.",
        )

    # 4. Validate password and confirmation
    if payload.password != payload.confirm_password:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Passwords do not match.",
        )

    if len(payload.password) < 8:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password must be at least 8 characters long.",
        )

    password_bytes = payload.password.encode("utf-8")
    if len(password_bytes) > 72:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password must not exceed 72 bytes.",
        )

    # 5. Check uniqueness (Username and Email)
    existing_username = db.query(User).filter(User.username == clean_username).first()
    if existing_username:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Username '{clean_username}' is already registered. Please choose another username.",
        )

    existing_email = db.query(User).filter(User.email == clean_email).first()
    if existing_email:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Email '{clean_email}' is already registered. Please sign in or use another email address.",
        )

    # 6. Hash password safely
    password_hash = hash_password(payload.password)
    user_id = f"USER-COM-{uuid.uuid4().hex[:8].upper()}"

    # 7. Create user with strictly enforced 'common_user' role
    new_user = User(
        id=user_id,
        username=clean_username,
        email=clean_email,
        full_name=clean_fullname,
        password_hash=password_hash,
        role="common_user",
        is_active=True,
        created_at=datetime.now(timezone.utc),
    )

    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    logger.info(f"Registered new public common user: {new_user.username} ({new_user.id})")
    return UserResponse(**new_user.to_dict())


@app.post(
    "/api/auth/login",
    response_model=TokenResponse,
    tags=["Authentication"],
    summary="Authenticate user and issue signed JWT access token",
)
def login(payload: UserLoginRequest, db: Session = Depends(get_db)):
    """
    Authenticates a user via username or email address and password.
    Validates password hash using bcrypt.
    Returns a signed, expiring JWT access token and user metadata.
    Rejects inactive accounts with HTTP 403 Forbidden.
    """
    clean_identifier = payload.username.strip()
    user = (
        db.query(User)
        .filter(or_(User.username == clean_identifier, User.email == clean_identifier.lower()))
        .first()
    )

    if not user or not verify_password(payload.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid username or password.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is deactivated. Access denied.",
        )

    access_token = create_access_token(
        data={
            "sub": user.username,
            "username": user.username,
            "role": user.role,
            "user_id": user.id,
        }
    )

    return TokenResponse(
        access_token=access_token,
        token_type="bearer",
        user=UserResponse(**user.to_dict()),
    )


@app.get(
    "/api/auth/me",
    response_model=UserResponse,
    tags=["Authentication"],
    summary="Get authenticated user profile and active role",
)
def get_current_user_profile(current_user: User = Depends(get_current_user)):
    """
    Returns profile details and active role for the currently authenticated user session.
    Requires a valid, non-expired Bearer access token in the Authorization header.
    """
    return UserResponse(**current_user.to_dict())



@app.get(
    "/api/assets/summary/stats",
    response_model=AssetSummaryStats,
    tags=["Assets"],
    summary="Get aggregated asset intelligence metrics for dashboard cards",
)
def get_asset_stats(db: Session = Depends(get_db)):
    """
    Returns high-level overview metrics such as critical assets, inspection due,
    and average asset health index across the monitored network.
    """
    all_assets = db.query(Asset).all()
    total = len(all_assets)
    if total == 0:
        return AssetSummaryStats(
            total_assets=0,
            critical_assets=0,
            high_risk_assets=0,
            inspection_due=0,
            operational_assets=0,
            average_health_index=0.0,
        )

    critical_count = sum(1 for a in all_assets if a.status == "Critical Attention" or a.risk_level == "Critical")
    high_risk_count = sum(1 for a in all_assets if a.risk_level == "High" and a.status != "Critical Attention")
    inspection_due = sum(1 for a in all_assets if a.status == "Requires Inspection")
    operational_count = sum(1 for a in all_assets if a.status == "Operational")
    avg_health = sum(a.health_index for a in all_assets) / total

    return AssetSummaryStats(
        total_assets=total,
        critical_assets=critical_count,
        high_risk_assets=high_risk_count,
        inspection_due=inspection_due,
        operational_assets=operational_count,
        average_health_index=round(avg_health, 1),
    )


@app.get(
    "/api/assets",
    response_model=AssetListResponse,
    tags=["Assets"],
    summary="List all infrastructure assets with optional filtering and search",
)
def list_assets(
    category: Optional[str] = Query(None, description="Filter by category (e.g. Bridge, Highway, Canal)"),
    status_filter: Optional[str] = Query(None, alias="status", description="Filter by status (e.g. Operational, Critical Attention)"),
    district: Optional[str] = Query(None, description="Filter by district"),
    search: Optional[str] = Query(None, description="Text search on name, district, or ID"),
    db: Session = Depends(get_db),
):
    """
    Retrieve infrastructure assets. Supports filtering by category, status, district,
    and text search. Always returns full asset metadata including risk scores.
    """
    query = db.query(Asset)

    if category:
        query = query.filter(Asset.category == category)
    if status_filter:
        query = query.filter(Asset.status == status_filter)
    if district:
        query = query.filter(Asset.district == district)
    if search:
        search_pattern = f"%{search}%"
        query = query.filter(
            or_(
                Asset.name.ilike(search_pattern),
                Asset.id.ilike(search_pattern),
                Asset.district.ilike(search_pattern),
                Asset.state.ilike(search_pattern),
            )
        )

    items = query.order_by(Asset.risk_score.desc()).all()

    # Extract distinct categories for frontend filter dropdowns
    categories = [cat[0] for cat in db.query(Asset.category).distinct().all()]

    return AssetListResponse(
        total=db.query(Asset).count(),
        count=len(items),
        items=[AssetResponse(**item.to_dict()) for item in items],
        categories=categories,
        disclaimer="Mock dataset for hackathon local prototype. Not live official government data.",
    )

      
@app.post(
    "/api/assets",
    response_model=AssetResponse,
    status_code=status.HTTP_201_CREATED,
    tags=["Assets"],
    summary="Register a new infrastructure asset",
)
def create_asset(
    payload: AssetCreate,
    db: Session = Depends(get_db),
    admin_user: User = Depends(require_admin),
):

    # Prevent duplicate asset IDs
    existing_asset = (
        db.query(Asset)
        .filter(Asset.id == payload.id)
        .first()
    )

    if existing_asset:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Asset with ID '{payload.id}' already exists.",
        )

    # Create and save the asset
    asset_data = payload.model_dump()
    asset_data["flagged_reasons"] = serialize_flagged_reasons(asset_data.get("flagged_reasons"))

    asset = Asset(**asset_data)
    try:
        db.add(asset)
        db.commit()
        db.refresh(asset)
    except Exception as e:
        db.rollback()
        logger.error(f"Failed to create asset '{payload.id}': {e}")
        raise

    return AssetResponse(**asset.to_dict())



@app.get(
    "/api/assets/{asset_id}",
    response_model=AssetResponse,
    tags=["Assets"],
    summary="Retrieve detailed metadata and Digital Heartbeat indicators for a single asset",
)
def get_asset_by_id(asset_id: str, db: Session = Depends(get_db)):
    """
    Find a specific infrastructure asset by its unique identifier.
    Returns 404 if no asset matching the identifier is found.
    """
    asset = db.query(Asset).filter(Asset.id == asset_id).first()
    if not asset:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Asset with ID '{asset_id}' not found in the infrastructure registry.",
        )
    return AssetResponse(**asset.to_dict())


@app.post(
    "/api/copilot/ask",
    response_model=CopilotAskResponse,
    tags=["Copilot"],
    summary="Query AI Decision Copilot grounded in infrastructure evidence",
)
async def ask_copilot(
    payload: CopilotAskRequest,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional),
):
    """
    Submits an inquiry to the AI Decision Copilot.
    Validates the question, searches existing SQLite asset records,
    retrieves relevant evidence, separates observed facts from recommendations,
    and returns transparent, grounded findings without generative hallucination.
    Supports Google Gemini, OpenAI, and Anthropic LLM synthesis with automatic fallback.
    """
    if not payload.question or not payload.question.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Question cannot be empty. Please enter an infrastructure asset inquiry.",
        )

    res = await query_copilot_evidence_async(
        db,
        payload.question,
        asset_id_filter=payload.asset_id,
        category_filter=payload.category,
        conversation_history=payload.conversation_history,
    )

    try:
        conv_msg = AIConversationMessage(
            id=f"MSG-{uuid.uuid4().hex[:10].upper()}",
            asset_id=payload.asset_id,
            user_id=current_user.id if current_user else None,
            question=payload.question,
            answer=res.answer,
            citations_json=json.dumps(res.citations),
            evidence_json=json.dumps([e.model_dump() for e in res.evidence]),
            model_used=ai_service.model if ai_service.is_configured() else "retrieval_fallback",
            pipeline_type=res.pipeline_type,
            tokens_used=0,
        )
        db.add(conv_msg)
        db.commit()
    except Exception as e:
        logger.warning(f"Could not record conversation turn: {e}")

    return res



@app.get(
    "/api/copilot/documents/{document_identifier:path}",
    response_model=DocumentDetailResponse,
    tags=["Copilot"],
    summary="Retrieve verified source evidence document content and metadata",
)
def get_evidence_document(document_identifier: str):
    """
    Retrieves the actual verified supporting evidence document for inspection.
    Returns parsed pages, metadata, and full text for indexed engineering documents.
    Returns 404 if the document is not present in the verified evidence archive.
    Rejects directory traversal attempts.
    """
    if not document_identifier or not document_identifier.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Document identifier must be specified.",
        )

    doc_info = evidence_store.get_document_content(document_identifier)
    if not doc_info:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Source document '{document_identifier}' was not found in the verified evidence archive.",
        )
    return DocumentDetailResponse(**doc_info)


# ==============================================================================
# DIGITAL HEARTBEAT & EXPLAINABLE RISK ENDPOINTS
# ==============================================================================

@app.get(
    "/api/assets/{asset_id}/heartbeat",
    response_model=HeartbeatResponse,
    tags=["Heartbeat"],
    summary="Get live explainable Digital Heartbeat telemetry and factor breakdown",
)
def get_asset_heartbeat(asset_id: str, db: Session = Depends(get_db)):
    """
    Computes and returns the dynamic Digital Heartbeat for an infrastructure asset.
    Derives risk scores, structural health index, contributing factor weights,
    inspection recency, and suggested next investigations based on actual DB records.
    """
    asset = db.query(Asset).filter(Asset.id == asset_id).first()
    if not asset:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Asset with ID '{asset_id}' not found.",
        )

    inspections = db.query(Inspection).filter(Inspection.asset_id == asset_id).order_by(Inspection.inspection_date.desc()).all()
    heartbeat_data = calculate_digital_heartbeat(asset, inspections)
    return HeartbeatResponse(**heartbeat_data)


# ==============================================================================
# INSPECTION & INTERVENTION CLOSED-LOOP WORKFLOW ENDPOINTS
# ==============================================================================

@app.get(
    "/api/assets/{asset_id}/inspections",
    response_model=List[InspectionResponse],
    tags=["Inspections"],
    summary="List all historical and active inspection/intervention records for an asset",
)
def get_asset_inspections(asset_id: str, db: Session = Depends(get_db)):
    asset = db.query(Asset).filter(Asset.id == asset_id).first()
    if not asset:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Asset with ID '{asset_id}' not found.",
        )

    records = db.query(Inspection).filter(Inspection.asset_id == asset_id).order_by(Inspection.inspection_date.desc()).all()
    return [InspectionResponse(**r.to_dict()) for r in records]


@app.post(
    "/api/assets/{asset_id}/inspections",
    response_model=InspectionResponse,
    status_code=status.HTTP_201_CREATED,
    tags=["Inspections"],
    summary="Record a new field inspection and recommended action",
)
def create_inspection(
    asset_id: str,
    payload: InspectionCreateRequest,
    db: Session = Depends(get_db),
    admin_user: User = Depends(require_admin),
):
    asset = db.query(Asset).filter(Asset.id == asset_id).first()
    if not asset:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Asset with ID '{asset_id}' not found.",
        )

    # Generate unique inspection ID
    existing_count = db.query(Inspection).count()
    new_id = f"INSP-2026-{(existing_count + 1):03d}"

    # Record authenticated administrator identity in audit field rather than trusting client-supplied identity
    admin_identity = f"{admin_user.full_name} (@{admin_user.username})"
    if (
        payload.responsible_user
        and payload.responsible_user.strip()
        and payload.responsible_user != "Engineering Officer (Unauthenticated Prototype Session)"
    ):
        responsible_user_audit = f"{admin_identity} - {payload.responsible_user.strip()}"
    else:
        responsible_user_audit = admin_identity

    inspection = Inspection(
        id=new_id,
        asset_id=asset_id,
        inspection_date=payload.inspection_date,
        inspection_type=payload.inspection_type,
        findings=payload.findings,
        recommended_action=payload.recommended_action,
        actual_action_taken=payload.actual_action_taken,
        responsible_user=responsible_user_audit,
        status="Pending",
        evidence_references=payload.evidence_references,
    )
    db.add(inspection)

    # Update asset latest inspection date and recalculate risk
    asset.last_inspection_date = payload.inspection_date
    db.commit()

    # Recalculate asset risk with newly added inspection
    all_inspections = db.query(Inspection).filter(Inspection.asset_id == asset_id).order_by(Inspection.inspection_date.desc()).all()
    updated_hb = calculate_digital_heartbeat(asset, all_inspections)
    asset.risk_score = updated_hb["risk_score"]
    asset.risk_level = updated_hb["risk_tier"]
    asset.health_index = updated_hb["health_index"]
    asset.status = determine_asset_status(asset.risk_score)
    db.commit()
    db.refresh(inspection)

    logger.info(f"Recorded inspection {new_id} for asset {asset_id}. New Risk Score: {asset.risk_score}, Status: {asset.status}")
    return InspectionResponse(**inspection.to_dict())


@app.patch(
    "/api/inspections/{inspection_id}",
    response_model=InspectionResponse,
    tags=["Inspections"],
    summary="Update inspection action status or recorded repair intervention",
)
def update_inspection(
    inspection_id: str,
    payload: InspectionUpdateRequest,
    db: Session = Depends(get_db),
    admin_user: User = Depends(require_admin),
):
    inspection = db.query(Inspection).filter(Inspection.id == inspection_id).first()
    if not inspection:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Inspection record '{inspection_id}' not found.",
        )

    # 1. Enforce lifecycle: terminal certified state cannot be modified
    if inspection.status == "Verified":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Inspection record '{inspection_id}' is already Verified and certified. Modifications are prohibited.",
        )

    # 2. Enforce permitted state transitions
    if payload.status:
        if payload.status == "Verified":
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Direct transition to 'Verified' via PATCH is not permitted. Please use 'POST /api/inspections/{id}/verify' to record verification notes and outcome decision.",
            )

        valid_transitions = {
            "Pending": ["Pending", "In Progress", "Completed"],
            "In Progress": ["In Progress", "Completed", "Pending"],
            "Completed": ["Completed", "In Progress"],
            "Verified": [],
        }
        allowed_next = valid_transitions.get(inspection.status, [])
        if payload.status not in allowed_next:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Invalid inspection status transition from '{inspection.status}' to '{payload.status}'. Allowed transitions: {', '.join(allowed_next) if allowed_next else 'None'}.",
            )
        inspection.status = payload.status

    if payload.actual_action_taken is not None:
        inspection.actual_action_taken = payload.actual_action_taken

    if payload.evidence_references is not None:
        inspection.evidence_references = payload.evidence_references

    db.commit()

    # Recalculate parent asset heartbeat and synchronize status
    asset = db.query(Asset).filter(Asset.id == inspection.asset_id).first()
    if asset:
        all_inspections = db.query(Inspection).filter(Inspection.asset_id == asset.id).order_by(Inspection.inspection_date.desc()).all()
        updated_hb = calculate_digital_heartbeat(asset, all_inspections)
        asset.risk_score = updated_hb["risk_score"]
        asset.risk_level = updated_hb["risk_tier"]
        asset.health_index = updated_hb["health_index"]
        asset.status = determine_asset_status(asset.risk_score)
        db.commit()

    db.refresh(inspection)
    return InspectionResponse(**inspection.to_dict())


ALLOWED_VERIFICATION_OUTCOMES = [
    "Remediation Successful",
    "Remediation Unsuccessful",
    "Further Assessment Required",
]

@app.post(
    "/api/inspections/{inspection_id}/verify",
    response_model=InspectionResponse,
    tags=["Inspections"],
    summary="Record verified outcome of an engineering intervention",
)
def verify_inspection_outcome(
    inspection_id: str,
    payload: InspectionVerifyRequest,
    db: Session = Depends(get_db),
    admin_user: User = Depends(require_admin),
):
    """
    Closed-loop outcome verification step.
    Enforces that:
    1. Inspection must reach 'Completed' state before verification.
    2. Already verified inspections cannot be re-verified (terminal state).
    3. Outcome decision explicitly distinguishes success, failure, or further assessment.
    4. Actual intervention details must be documented for successful remediation.
    5. Parent asset health index, risk score, and status are consistently updated.
    """
    inspection = db.query(Inspection).filter(Inspection.id == inspection_id).first()
    if not inspection:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Inspection record '{inspection_id}' not found.",
        )

    # 1. Reject re-verification of already verified records
    if inspection.status == "Verified":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Inspection record '{inspection_id}' is already Verified and certified. Re-verification is not permitted.",
        )

    # 2. Reject verification if inspection has not reached Completed state
    if inspection.status != "Completed":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Cannot verify inspection in '{inspection.status}' state. Inspection must reach 'Completed' state with documented findings and actions before outcome verification.",
        )

    # 3. Validate outcome decision
    outcome = payload.outcome or "Remediation Successful"
    if outcome not in ALLOWED_VERIFICATION_OUTCOMES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid verification outcome '{outcome}'. Allowed outcomes: {', '.join(ALLOWED_VERIFICATION_OUTCOMES)}.",
        )

    # 4. Update actual_action_taken if supplied in payload
    if payload.actual_action_taken and payload.actual_action_taken.strip():
        inspection.actual_action_taken = payload.actual_action_taken.strip()

    # 5. Require actual intervention details when certifying successful remediation
    if outcome == "Remediation Successful":
        if not (inspection.actual_action_taken and inspection.actual_action_taken.strip()):
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Actual intervention details ('actual_action_taken') must be documented before certifying successful remediation.",
            )

    verification_date = payload.verification_date or datetime.now(timezone.utc).strftime("%Y-%m-%d")

    # Record authenticated administrator identity in verification audit field rather than trusting client-supplied identity
    admin_identity = f"{admin_user.full_name} (@{admin_user.username})"
    if payload.verifier_name and payload.verifier_name.strip():
        verifier_display = f"{admin_identity} [{payload.verifier_name.strip()}]"
    else:
        verifier_display = admin_identity

    inspection.status = "Verified"
    inspection.verification_outcome = outcome
    inspection.verification_notes = payload.verification_notes
    inspection.verification_date = verification_date
    inspection.responsible_user = f"{inspection.responsible_user} | Verified by: {verifier_display} ({outcome})"

    db.commit()

    # 6. Recalculate parent asset heartbeat and synchronize status consistently
    asset = db.query(Asset).filter(Asset.id == inspection.asset_id).first()
    if asset:
        all_inspections = db.query(Inspection).filter(Inspection.asset_id == asset.id).order_by(Inspection.inspection_date.desc()).all()
        updated_hb = calculate_digital_heartbeat(asset, all_inspections)
        asset.risk_score = updated_hb["risk_score"]
        asset.risk_level = updated_hb["risk_tier"]
        asset.health_index = updated_hb["health_index"]
        asset.status = determine_asset_status(asset.risk_score)
        db.commit()

    db.refresh(inspection)
    logger.info(f"Verified outcome '{outcome}' for inspection {inspection_id}. Asset {asset.id} updated risk: {asset.risk_score}, status: {asset.status}")
    return InspectionResponse(**inspection.to_dict())


@app.get(
    "/api/assets/{asset_id}/timeline",
    response_model=List[TimelineEvent],
    tags=["Inspections"],
    summary="Unified chronological lifecycle timeline for an asset",
)
def get_asset_timeline(asset_id: str, db: Session = Depends(get_db)):
    asset = db.query(Asset).filter(Asset.id == asset_id).first()
    if not asset:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Asset with ID '{asset_id}' not found.",
        )

    timeline: List[TimelineEvent] = []

    # 1. Commissioning
    if asset.construction_year:
        timeline.append(TimelineEvent(
            id=f"{asset.id}-commissioning",
            event_type="commissioning",
            date=f"{asset.construction_year}-01-01",
            title="Asset Commissioned",
            description=f"{asset.name} constructed and commissioned for public service in {asset.district}, {asset.state}.",
            status="Operational",
            actor="Public Works Authority",
        ))

    # 2. Inspections & Interventions
    inspections = db.query(Inspection).filter(Inspection.asset_id == asset_id).order_by(Inspection.inspection_date.asc()).all()
    for insp in inspections:
        timeline.append(TimelineEvent(
            id=f"{insp.id}-insp",
            event_type="inspection",
            date=insp.inspection_date,
            title=f"Inspection: {insp.inspection_type}",
            description=insp.findings,
            status=insp.status,
            actor=insp.responsible_user,
        ))

        if insp.actual_action_taken:
            timeline.append(TimelineEvent(
                id=f"{insp.id}-act",
                event_type="intervention",
                date=insp.inspection_date,
                title="Maintenance Intervention",
                description=insp.actual_action_taken,
                status=insp.status,
                actor=insp.responsible_user,
            ))

        if insp.verification_notes and insp.verification_date:
            timeline.append(TimelineEvent(
                id=f"{insp.id}-verif",
                event_type="verification",
                date=insp.verification_date,
                title="Outcome Verification Certified",
                description=insp.verification_notes,
                status="Verified",
                actor=insp.responsible_user,
            ))

    # Sort descending by date
    timeline.sort(key=lambda x: x.date, reverse=True)
    return timeline


# ==============================================================================
# GLOBAL SEARCH & DISCOVERY ENDPOINT
# ==============================================================================

@app.get(
    "/api/search",
    response_model=GlobalSearchResponse,
    tags=["Search"],
    summary="Global infrastructure search across assets, findings, and documents",
)
def global_search(q: str = Query(..., min_length=1, description="Search term"), db: Session = Depends(get_db)):
    clean_q = q.strip().lower()
    search_filter = f"%{clean_q}%"

    # 1. Assets
    matched_assets = db.query(Asset).filter(
        or_(
            Asset.name.ilike(search_filter),
            Asset.id.ilike(search_filter),
            Asset.category.ilike(search_filter),
            Asset.district.ilike(search_filter),
            Asset.state.ilike(search_filter),
            Asset.description.ilike(search_filter),
        )
    ).limit(10).all()

    asset_results = [
        GlobalSearchResultItem(
            id=a.id,
            type="asset",
            title=a.name,
            subtitle=f"{a.category} · {a.district}, {a.state}",
            category=a.category,
            risk_level=a.risk_level,
            asset_id=a.id,
            url=f"/assets/{a.id}",
            snippet=a.description[:120] if a.description else None,
        )
        for a in matched_assets
    ]

    # 2. Findings
    matched_findings = db.query(AssetFinding).filter(
        or_(
            AssetFinding.title.ilike(search_filter),
            AssetFinding.affected_component.ilike(search_filter),
            AssetFinding.plain_explanation.ilike(search_filter),
            AssetFinding.technical_explanation.ilike(search_filter),
        )
    ).limit(10).all()

    finding_results = [
        GlobalSearchResultItem(
            id=f.id,
            type="finding",
            title=f.title,
            subtitle=f"{f.affected_component} · Severity: {f.severity}",
            risk_level=f.severity,
            asset_id=f.asset_id,
            url=f"/assets/{f.asset_id}",
            snippet=f.plain_explanation[:120] if f.plain_explanation else None,
        )
        for f in matched_findings
    ]

    # 3. Documents
    doc_results = []
    evidence_hits = evidence_store.search_evidence(query=clean_q, top_k=5, min_score=15.0)
    for hit in evidence_hits:
        doc_results.append(
            GlobalSearchResultItem(
                id=hit.chunk_id,
                type="document",
                title=hit.document_name,
                subtitle=f"{hit.source_agency} · {hit.file_type}",
                asset_id=hit.asset_id,
                url=f"/documents/{hit.source_file or hit.document_name}",
                snippet=hit.excerpt[:140] if hit.excerpt else None,
            )
        )

    total = len(asset_results) + len(finding_results) + len(doc_results)
    return GlobalSearchResponse(
        query=q,
        total_matches=total,
        assets=asset_results,
        findings=finding_results,
        documents=doc_results,
    )


# ==============================================================================
# VISUAL MEDIA & EVIDENCE FILE SERVING
# ==============================================================================

@app.get(
    "/api/media/{file_name}",
    tags=["Media"],
    summary="Safely serve visual infrastructure media files",
)
def get_media_file(file_name: str):
    if not file_name or ".." in file_name or "/" in file_name or "\\" in file_name:
        raise HTTPException(status_code=400, detail="Invalid media file name.")

    target = (MEDIA_DIR / file_name).resolve()
    if not str(target).startswith(str(MEDIA_DIR.resolve())) or not target.exists() or not target.is_file():
        raise HTTPException(status_code=404, detail="Media file not found.")

    ext = target.suffix.lower()
    media_types = {
        ".svg": "image/svg+xml",
        ".png": "image/png",
        ".jpg": "image/jpeg",
        ".jpeg": "image/jpeg",
        ".webp": "image/webp",
    }
    return FileResponse(path=str(target), media_type=media_types.get(ext, "application/octet-stream"))


@app.get(
    "/api/assets/{asset_id}/images",
    response_model=List[AssetMediaResponse],
    tags=["Media"],
    summary="List visual media records for an asset",
)
def get_asset_media(asset_id: str, category: Optional[str] = None, db: Session = Depends(get_db)):
    asset = db.query(Asset).filter(Asset.id == asset_id).first()
    if not asset:
        raise HTTPException(status_code=404, detail=f"Asset '{asset_id}' not found.")

    query = db.query(AssetMedia).filter(AssetMedia.asset_id == asset_id)
    if category:
        query = query.filter(AssetMedia.category == category)
    items = query.order_by(AssetMedia.created_at.desc()).all()
    return [
        AssetMediaResponse(
            id=m.id,
            asset_id=m.asset_id,
            inspection_id=m.inspection_id,
            file_name=m.file_name,
            file_path=m.file_path,
            url=f"/api/media/{m.file_name}",
            caption=m.caption,
            category=m.category,
            uploader_name=m.uploader_name,
            captured_at=m.captured_at,
            verification_status=m.verification_status,
            created_at=m.created_at.isoformat() if m.created_at else None,
        )
        for m in items
    ]


@app.post(
    "/api/assets/{asset_id}/images",
    response_model=AssetMediaResponse,
    status_code=status.HTTP_201_CREATED,
    tags=["Media"],
    summary="Upload new visual infrastructure media with validation",
)
async def upload_asset_media(
    asset_id: str,
    file: UploadFile = File(...),
    caption: str = Form(...),
    category: str = Form("General"),
    captured_at: Optional[str] = Form(None),
    inspection_id: Optional[str] = Form(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    asset = db.query(Asset).filter(Asset.id == asset_id).first()
    if not asset:
        raise HTTPException(status_code=404, detail=f"Asset '{asset_id}' not found.")

    allowed_exts = {".png", ".jpg", ".jpeg", ".webp", ".svg"}
    original_ext = Path(file.filename or "").suffix.lower()
    if original_ext not in allowed_exts:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file format '{original_ext}'. Allowed formats: {', '.join(allowed_exts)}",
        )

    content = await file.read()
    if len(content) > 10 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="File size exceeds maximum permitted 10MB limit.")

    safe_id = f"MED-{uuid.uuid4().hex[:8].upper()}"
    safe_filename = f"{asset_id.lower()}_{safe_id.lower()}{original_ext}"
    target_path = MEDIA_DIR / safe_filename
    target_path.write_bytes(content)

    media_record = AssetMedia(
        id=safe_id,
        asset_id=asset_id,
        inspection_id=inspection_id,
        file_name=safe_filename,
        file_path=safe_filename,
        caption=caption.strip(),
        category=category.strip(),
        uploader_name=current_user.full_name or current_user.username,
        captured_at=captured_at or datetime.now(timezone.utc).strftime("%Y-%m-%d"),
        verification_status="Verified" if current_user.role == "admin" else "Field Submitted",
    )
    db.add(media_record)
    db.commit()
    db.refresh(media_record)

    return AssetMediaResponse(
        id=media_record.id,
        asset_id=media_record.asset_id,
        inspection_id=media_record.inspection_id,
        file_name=media_record.file_name,
        file_path=media_record.file_path,
        url=f"/api/media/{media_record.file_name}",
        caption=media_record.caption,
        category=media_record.category,
        uploader_name=media_record.uploader_name,
        captured_at=media_record.captured_at,
        verification_status=media_record.verification_status,
        created_at=media_record.created_at.isoformat() if media_record.created_at else None,
    )


# ==============================================================================
# EVIDENCE CATALOG & PROVENANCE SOURCES
# ==============================================================================

@app.get(
    "/api/evidence",
    tags=["Evidence"],
    summary="Catalog of indexed engineering evidence documents",
)
def list_evidence_catalog():
    docs: Dict[str, Any] = {}
    for chunk in evidence_store.chunks:
        doc_key = chunk.source_file or chunk.document_name
        if doc_key not in docs:
            docs[doc_key] = {
                "document_name": chunk.document_name,
                "filename": chunk.source_file or doc_key,
                "file_type": chunk.file_type,
                "source_agency": chunk.source_agency,
                "associated_asset_id": chunk.asset_id,
                "timestamp": chunk.timestamp,
                "total_chunks": 0,
                "sample_excerpt": chunk.excerpt[:200],
            }
        docs[doc_key]["total_chunks"] += 1
        if chunk.asset_id and not docs[doc_key]["associated_asset_id"]:
            docs[doc_key]["associated_asset_id"] = chunk.asset_id

    return {
        "total_documents": len(docs),
        "total_indexed_chunks": len(evidence_store.chunks),
        "documents": list(docs.values()),
    }


@app.get(
    "/api/assets/{asset_id}/sources",
    response_model=List[EvidenceSourceResponse],
    tags=["Evidence"],
    summary="List evidence sources and citations for an asset",
)
def get_asset_sources(asset_id: str, db: Session = Depends(get_db)):
    asset = db.query(Asset).filter(Asset.id == asset_id).first()
    if not asset:
        raise HTTPException(status_code=404, detail=f"Asset '{asset_id}' not found.")
    sources = db.query(EvidenceSource).filter(EvidenceSource.asset_id == asset_id).all()
    return [
        EvidenceSourceResponse(
            id=s.id,
            asset_id=s.asset_id,
            title=s.title,
            source_type=s.source_type,
            provider=s.provider,
            document_name=s.document_name,
            page_or_paragraph=s.page_or_paragraph,
            excerpt=s.excerpt,
            verification_status=s.verification_status,
            publication_date=s.publication_date,
            created_at=s.created_at.isoformat() if s.created_at else None,
        )
        for s in sources
    ]


# ==============================================================================
# STRUCTURED FINDINGS & RECOMMENDATIONS
# ==============================================================================

@app.get(
    "/api/assets/{asset_id}/findings",
    response_model=List[AssetFindingResponse],
    tags=["Findings"],
    summary="List structured engineering findings for an asset",
)
def get_asset_findings(asset_id: str, db: Session = Depends(get_db)):
    asset = db.query(Asset).filter(Asset.id == asset_id).first()
    if not asset:
        raise HTTPException(status_code=404, detail=f"Asset '{asset_id}' not found.")
    findings = (
        db.query(AssetFinding)
        .filter(AssetFinding.asset_id == asset_id)
        .order_by(AssetFinding.created_at.desc())
        .all()
    )
    return [AssetFindingResponse(**f.to_dict()) for f in findings]


@app.post(
    "/api/assets/{asset_id}/findings",
    response_model=AssetFindingResponse,
    status_code=status.HTTP_201_CREATED,
    tags=["Findings"],
    summary="Create a structured engineering finding (Admin required)",
)
def create_asset_finding(
    asset_id: str,
    payload: AssetFindingCreateRequest,
    db: Session = Depends(get_db),
    admin_user: User = Depends(require_admin),
):
    asset = db.query(Asset).filter(Asset.id == asset_id).first()
    if not asset:
        raise HTTPException(status_code=404, detail=f"Asset '{asset_id}' not found.")

    finding_id = f"FND-{uuid.uuid4().hex[:8].upper()}"
    finding = AssetFinding(
        id=finding_id,
        asset_id=asset_id,
        title=payload.title.strip(),
        plain_explanation=payload.plain_explanation.strip(),
        technical_explanation=payload.technical_explanation.strip(),
        severity=payload.severity,
        affected_component=payload.affected_component.strip(),
        supporting_evidence=payload.supporting_evidence,
        date_identified=payload.date_identified,
        verification_status=payload.verification_status,
        recommended_action=payload.recommended_action.strip(),
        resolution_status=payload.resolution_status,
        intelligence_category=payload.intelligence_category or "Structural",
        evidence_classification=payload.evidence_classification or "Documented",
        confidence_level=payload.confidence_level or "High",
        source_document=payload.source_document,
        page_number=payload.page_number,
        image_reference=payload.image_reference,
    )
    db.add(finding)
    db.commit()
    db.refresh(finding)

    return AssetFindingResponse(**finding.to_dict())


# ==============================================================================
# COMPLETE INFRASTRUCTURE INTELLIGENCE PROFILE & REPORTS
# ==============================================================================

@app.get(
    "/api/assets/{asset_id}/intelligence",
    response_model=AssetIntelligenceResponse,
    tags=["Intelligence"],
    summary="Complete unified infrastructure intelligence profile",
)
def get_asset_intelligence(asset_id: str, db: Session = Depends(get_db)):
    asset = db.query(Asset).filter(Asset.id == asset_id).first()
    if not asset:
        raise HTTPException(status_code=404, detail=f"Asset '{asset_id}' not found.")

    findings_db = db.query(AssetFinding).filter(AssetFinding.asset_id == asset_id).all()
    sources_db = db.query(EvidenceSource).filter(EvidenceSource.asset_id == asset_id).all()
    media_db = db.query(AssetMedia).filter(AssetMedia.asset_id == asset_id).all()
    inspections_db = (
        db.query(Inspection)
        .filter(Inspection.asset_id == asset_id)
        .order_by(Inspection.inspection_date.desc())
        .all()
    )

    heartbeat_dict = calculate_digital_heartbeat(asset, inspections_db)
    heartbeat_resp = HeartbeatResponse(**heartbeat_dict)

    timeline_events = get_asset_timeline(asset_id, db)

    verified_fields = ["id", "name", "category", "district", "state", "latitude", "longitude"]
    missing_fields = []
    if asset.construction_year:
        verified_fields.append("construction_year")
    else:
        missing_fields.append("construction_year")
    if asset.last_inspection_date:
        verified_fields.append("last_inspection_date")
    else:
        missing_fields.append("last_inspection_date")
    if asset.ownership_authority:
        verified_fields.append("ownership_authority")
    else:
        missing_fields.append("ownership_authority")

    score = 40
    if len(inspections_db) > 0:
        score += 20
    if len(sources_db) > 0:
        score += 15
    if len(media_db) > 0:
        score += 15
    if len(findings_db) > 0:
        score += 10
    completeness_percentage = min(100, score)

    completeness = AssetCompleteness(
        percentage=completeness_percentage,
        verified_fields=verified_fields,
        missing_fields=missing_fields,
        has_inspections=len(inspections_db) > 0,
        has_media=len(media_db) > 0,
        has_sources=len(sources_db) > 0,
        has_findings=len(findings_db) > 0,
    )

    # Query AI intelligence runs history for this asset
    ai_runs_db = (
        db.query(AIIntelligenceRun)
        .filter(AIIntelligenceRun.asset_id == asset_id)
        .order_by(AIIntelligenceRun.created_at.desc())
        .all()
    )
    latest_run_obj = ai_runs_db[0] if ai_runs_db else None

    # Generate Component Analysis, Critical Areas, 3-Stage Intervention Plan & Risk Prioritization
    from app.component_intelligence import (
        analyze_component_inventory,
        generate_3stage_intervention_plan,
        generate_prioritized_risk_table,
        calculate_whole_asset_summary,
    )

    enriched_findings_dicts = [f.to_dict() for f in findings_db]
    inspections_dicts = [i.to_dict() for i in inspections_db]
    media_dicts = [m.to_dict() for m in media_db]

    component_inventory = analyze_component_inventory(asset, enriched_findings_dicts, inspections_dicts, media_dicts)
    intervention_plan = generate_3stage_intervention_plan(asset, enriched_findings_dicts, inspections_dicts)
    prioritized_risks = generate_prioritized_risk_table(enriched_findings_dicts)
    critical_areas = [f for f in enriched_findings_dicts if f.get("severity_level") in (1, 2)]
    if not critical_areas and enriched_findings_dicts:
        critical_areas = enriched_findings_dicts[:2]
    condition_summary = calculate_whole_asset_summary(asset, heartbeat_resp, enriched_findings_dicts, component_inventory, inspections_db)

    return AssetIntelligenceResponse(
        asset=AssetResponse(**asset.to_dict()),
        completeness=completeness,
        heartbeat=heartbeat_resp,
        findings=[AssetFindingResponse(**f_dict) for f_dict in enriched_findings_dicts],
        sources=[EvidenceSourceResponse(**s.to_dict()) for s in sources_db],
        media=[AssetMediaResponse(**m.to_dict()) for m in media_db],
        timeline=timeline_events,
        inspections=[InspectionResponse(**i.to_dict()) for i in inspections_db],
        latest_ai_run=AIIntelligenceRunResponse(**latest_run_obj.to_dict()) if latest_run_obj else None,
        ai_runs_count=len(ai_runs_db),
        critical_areas=critical_areas,
        intervention_plan=intervention_plan,
        prioritized_risks=prioritized_risks,
        component_inventory=component_inventory,
        condition_summary=condition_summary,
    )


# ==============================================================================
# CLOUD AI CENTRAL INTELLIGENCE ENGINE ENDPOINTS (OPENAI POWERED)
# ==============================================================================

@app.get(
    "/api/ai/status",
    tags=["Intelligence"],
    summary="Get Cloud AI status, connectivity, active model, and token telemetry",
)
def get_ai_status(db: Session = Depends(get_db)):
    """
    Returns live connectivity status of the Central Cloud AI layer (OpenRouter / OpenAI).
    Distinguishes configured, ready, connected, quota_exceeded, degraded_fallback, and unconfigured.
    """
    runs_count = db.query(AIIntelligenceRun).count()
    total_tokens = db.query(func.sum(AIIntelligenceRun.total_tokens)).scalar() or 0
    total_cost = db.query(func.sum(AIIntelligenceRun.estimated_cost_usd)).scalar() or 0.0
    latest_run = db.query(AIIntelligenceRun).order_by(AIIntelligenceRun.created_at.desc()).first()

    is_cfg = ai_service.is_configured()
    status_label = "unconfigured"
    if is_cfg:
        if latest_run and "quota" in (latest_run.status or ""):
            status_label = "quota_exceeded"
        elif latest_run and "completed" in (latest_run.status or ""):
            status_label = "ready"
        elif latest_run and "fallback" in (latest_run.status or ""):
            status_label = latest_run.status
        else:
            status_label = "ready"

    return {
        "configured": is_cfg,
        "provider": getattr(ai_service, "provider", "openrouter"),
        "model": ai_service.model if is_cfg else "none",
        "status": status_label,
        "last_run_status": latest_run.status if latest_run else None,
        "total_runs": runs_count,
        "total_tokens": int(total_tokens),
        "total_cost_usd": round(float(total_cost), 4),
        "latest_run_id": latest_run.id if latest_run else None,
        "latest_run_time": latest_run.created_at.isoformat() if latest_run else None,
    }


@app.get(
    "/api/ai/test-connection",
    tags=["Intelligence"],
    summary="Execute a minimal authenticated ping to verify live OpenRouter connectivity",
)
def test_cloud_ai_connection(
    current_user: User = Depends(get_current_user),
):
    """
    Tests live API connectivity to OpenRouter/OpenAI without logging or exposing secrets.
    Requires authenticated user credentials.
    """
    return ai_service.test_live_connectivity()


@app.post(
    "/api/assets/{asset_id}/intelligence/run",
    response_model=AIIntelligenceRunResponse,
    tags=["Intelligence"],
    summary="Run AI intelligence analysis across the 5 modules with OpenAI",
)
def run_asset_intelligence_analysis(
    asset_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Executes unified 5-module intelligence analysis using OpenAI:
    1. Structural Intelligence: Cracks, corrosion, scouring, deformation, material wear.
    2. Environmental Intelligence: Hydrology, monsoon floods, salinity, soil slope creep.
    3. Compliance Intelligence: Statutory codes (IRC/CPWD/CWC/IS), overdue audit cadence.
    4. Operational Intelligence: Traffic load, operational strain, mechanical reliability.
    5. Predictive Intelligence: Deterioration trend comparison, early intervention flags.
    Saves the structured run and findings into SQLite and returns the complete result.
    Requires authenticated user credentials.
    """
    asset = db.query(Asset).filter(Asset.id == asset_id).first()
    if not asset:
        raise HTTPException(status_code=404, detail=f"Asset '{asset_id}' not found.")

    inspections_db = (
        db.query(Inspection)
        .filter(Inspection.asset_id == asset_id)
        .order_by(Inspection.inspection_date.desc())
        .all()
    )
    media_db = db.query(AssetMedia).filter(AssetMedia.asset_id == asset_id).all()
    sources_db = db.query(EvidenceSource).filter(EvidenceSource.asset_id == asset_id).all()
    existing_findings_db = db.query(AssetFinding).filter(AssetFinding.asset_id == asset_id).all()

    payload, run_status, p_tok, c_tok, t_tok, cost_usd, latency = ai_service.run_asset_intelligence(
        asset, inspections_db, media_db, sources_db, existing_findings_db
    )

    run_id = f"RUN-{asset_id}-{uuid.uuid4().hex[:8].upper()}"
    ai_run = AIIntelligenceRun(
        id=run_id,
        asset_id=asset_id,
        model_used=ai_service.model,
        status=run_status,
        overall_condition_summary=payload.overall_condition_summary,
        structural_summary=payload.structural_summary,
        environmental_summary=payload.environmental_summary,
        compliance_summary=payload.compliance_summary,
        operational_summary=payload.operational_summary,
        predictive_summary=payload.predictive_summary,
        predictive_data_warning=payload.predictive_data_warning,
        data_limitations=payload.data_limitations,
        conflicting_evidence=payload.conflicting_evidence,
        prompt_tokens=p_tok,
        completion_tokens=c_tok,
        total_tokens=t_tok,
        estimated_cost_usd=cost_usd,
        latency_ms=latency,
    )
    db.add(ai_run)
    db.flush()

    # Save findings generated by the analysis run with "Pending Review" status
    for f_item in payload.findings:
        f_id = f"FND-AI-{asset_id}-{uuid.uuid4().hex[:6].upper()}"
        new_finding = AssetFinding(
            id=f_id,
            asset_id=asset_id,
            title=f_item.title,
            plain_explanation=f_item.plain_explanation,
            technical_explanation=f_item.technical_explanation,
            severity=f_item.severity,
            affected_component=f_item.affected_component,
            supporting_evidence=f_item.source_document or (sources_db[0].title if sources_db else "AAYAM Evidence Engine"),
            date_identified=datetime.now(timezone.utc).strftime("%Y-%m-%d"),
            verification_status="Pending Review",
            recommended_action=f_item.recommended_action,
            resolution_status="Open",
            intelligence_category=f_item.intelligence_category,
            evidence_classification=f_item.evidence_classification,
            confidence_level=f_item.confidence_level,
            source_document=f_item.source_document,
            page_number=f_item.page_number,
            image_reference=f_item.image_reference,
            ai_generated=True,
            run_id=run_id,
        )
        db.add(new_finding)

    db.commit()
    db.refresh(ai_run)
    return AIIntelligenceRunResponse(**ai_run.to_dict())


@app.get(
    "/api/assets/{asset_id}/intelligence/latest",
    response_model=AIIntelligenceRunResponse,
    tags=["Intelligence"],
    summary="Get the latest AI intelligence run for this asset",
)
def get_latest_asset_intelligence_run(asset_id: str, db: Session = Depends(get_db)):
    asset = db.query(Asset).filter(Asset.id == asset_id).first()
    if not asset:
        raise HTTPException(status_code=404, detail=f"Asset '{asset_id}' not found.")

    latest_run = (
        db.query(AIIntelligenceRun)
        .filter(AIIntelligenceRun.asset_id == asset_id)
        .order_by(AIIntelligenceRun.created_at.desc())
        .first()
    )
    if not latest_run:
        # Generate initial run on demand for read-only viewing
        inspections_db = (
            db.query(Inspection)
            .filter(Inspection.asset_id == asset_id)
            .order_by(Inspection.inspection_date.desc())
            .all()
        )
        media_db = db.query(AssetMedia).filter(AssetMedia.asset_id == asset_id).all()
        sources_db = db.query(EvidenceSource).filter(EvidenceSource.asset_id == asset_id).all()
        existing_findings_db = db.query(AssetFinding).filter(AssetFinding.asset_id == asset_id).all()

        payload, run_status, p_tok, c_tok, t_tok, cost_usd, latency = ai_service.run_asset_intelligence(
            asset, inspections_db, media_db, sources_db, existing_findings_db
        )

        run_id = f"RUN-{asset_id}-{uuid.uuid4().hex[:8].upper()}"
        latest_run = AIIntelligenceRun(
            id=run_id,
            asset_id=asset_id,
            model_used=ai_service.model,
            status=run_status,
            overall_condition_summary=payload.overall_condition_summary,
            structural_summary=payload.structural_summary,
            environmental_summary=payload.environmental_summary,
            compliance_summary=payload.compliance_summary,
            operational_summary=payload.operational_summary,
            predictive_summary=payload.predictive_summary,
            predictive_data_warning=payload.predictive_data_warning,
            data_limitations=payload.data_limitations,
            conflicting_evidence=payload.conflicting_evidence,
            prompt_tokens=p_tok,
            completion_tokens=c_tok,
            total_tokens=t_tok,
            estimated_cost_usd=cost_usd,
            latency_ms=latency,
        )
        db.add(latest_run)
        db.commit()
        db.refresh(latest_run)

    return AIIntelligenceRunResponse(**latest_run.to_dict())


@app.get(
    "/api/assets/{asset_id}/intelligence/history",
    response_model=List[AIIntelligenceRunResponse],
    tags=["Intelligence"],
    summary="Get history of all AI intelligence runs for this asset",
)
def get_asset_intelligence_history(asset_id: str, db: Session = Depends(get_db)):
    asset = db.query(Asset).filter(Asset.id == asset_id).first()
    if not asset:
        raise HTTPException(status_code=404, detail=f"Asset '{asset_id}' not found.")

    runs = (
        db.query(AIIntelligenceRun)
        .filter(AIIntelligenceRun.asset_id == asset_id)
        .order_by(AIIntelligenceRun.created_at.desc())
        .all()
    )
    return [AIIntelligenceRunResponse(**r.to_dict()) for r in runs]


@app.post(
    "/api/findings/{finding_id}/review",
    response_model=AssetFindingResponse,
    tags=["Intelligence"],
    summary="Submit engineer review for an AI or field finding",
)
def review_asset_finding(
    finding_id: str,
    req: FindingReviewRequest,
    db: Session = Depends(get_db),
    admin_user: User = Depends(require_admin),
):
    """
    Engineer Verification Workflow:
    Findings start as 'Pending Review' and require human-in-the-loop sign-off:
    - 'Verified': Confirmed by authorized engineer as genuine engineering defect
    - 'Rejected': Ruled out by engineer with documented justification
    - 'Requires Further Inspection': Queued for physical site visit / NDT
    Requires administrative / engineering role authorization.
    """
    valid_statuses = ["Pending Review", "Verified", "Rejected", "Requires Further Inspection"]
    if req.verification_status not in valid_statuses:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid verification_status. Allowed values: {', '.join(valid_statuses)}",
        )

    finding = db.query(AssetFinding).filter(AssetFinding.id == finding_id).first()
    if not finding:
        raise HTTPException(status_code=404, detail=f"Finding '{finding_id}' not found.")

    admin_identity = f"{admin_user.full_name} (@{admin_user.username})"
    if req.reviewed_by and req.reviewed_by.strip() and req.reviewed_by.strip() != "Authorized Engineering Officer":
        reviewer = f"{admin_identity} [{req.reviewed_by.strip()}]"
    else:
        reviewer = admin_identity

    finding.verification_status = req.verification_status
    finding.reviewed_by = reviewer
    finding.reviewed_at = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC")
    if req.review_decision_notes:
        finding.review_decision_notes = req.review_decision_notes

    # If rejected, mark resolution status as Closed/Rejected
    if req.verification_status == "Rejected":
        finding.resolution_status = "Rejected"
    elif req.verification_status == "Verified" and finding.resolution_status == "Rejected":
        finding.resolution_status = "Open"

    db.commit()
    db.refresh(finding)
    return AssetFindingResponse(**finding.to_dict())


@app.post(
    "/api/assets/{asset_id}/intelligence/analyze-document",
    tags=["Intelligence"],
    summary="Upload and analyze an inspection document with OpenAI",
)
async def analyze_inspection_document_endpoint(
    asset_id: str,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    asset = db.query(Asset).filter(Asset.id == asset_id).first()
    if not asset:
        raise HTTPException(status_code=404, detail=f"Asset '{asset_id}' not found.")

    # Validation: File extension and size
    ext = Path(file.filename or "").suffix.lower()
    if ext not in [".pdf", ".txt", ".md"]:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported document format '{ext}'. Allowed: .pdf, .txt, .md",
        )

    content_bytes = await file.read()
    if len(content_bytes) > 10 * 1024 * 1024:
        raise HTTPException(status_code=413, detail="Document exceeds maximum 10MB limit.")

    text_extracted = ""
    if ext == ".pdf":
        try:
            import pypdf
            import io
            reader = pypdf.PdfReader(io.BytesIO(content_bytes))
            text_extracted = "\n\n".join(page.extract_text() or "" for page in reader.pages)
        except Exception:
            text_extracted = f"Binary PDF content uploaded: {file.filename} ({len(content_bytes)} bytes)"
    else:
        try:
            text_extracted = content_bytes.decode("utf-8", errors="replace")
        except Exception:
            text_extracted = str(content_bytes[:4000])

    analysis_res = ai_service.analyze_document(text_extracted, file.filename or "uploaded_report.pdf", asset)
    return analysis_res.model_dump()


@app.post(
    "/api/assets/{asset_id}/intelligence/analyze-image",
    tags=["Intelligence"],
    summary="Analyze an infrastructure photograph with OpenAI Vision",
)
async def analyze_infrastructure_image_endpoint(
    asset_id: str,
    file: UploadFile = File(...),
    caption: str = Form(""),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    asset = db.query(Asset).filter(Asset.id == asset_id).first()
    if not asset:
        raise HTTPException(status_code=404, detail=f"Asset '{asset_id}' not found.")

    ext = Path(file.filename or "").suffix.lower()
    if ext not in [".jpg", ".jpeg", ".png", ".webp"]:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported image format '{ext}'. Allowed: .jpg, .jpeg, .png, .webp",
        )

    img_bytes = await file.read()
    if len(img_bytes) > 10 * 1024 * 1024:
        raise HTTPException(status_code=413, detail="Image exceeds maximum 10MB limit.")

    analysis_res = ai_service.analyze_image(img_bytes, file.filename or "photo.jpg", asset, caption=caption)
    return analysis_res.model_dump()


@app.get(
    "/api/copilot/history",
    tags=["Copilot"],
    summary="Get recent grounded conversation history",
)
def get_copilot_history(
    asset_id: Optional[str] = Query(None),
    limit: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
):
    query = db.query(AIConversationMessage)
    if asset_id:
        query = query.filter(AIConversationMessage.asset_id == asset_id)
    messages = query.order_by(AIConversationMessage.created_at.desc()).limit(limit).all()
    return [m.to_dict() for m in messages]



@app.get(
    "/api/assets/{asset_id}/report",
    response_model=AssetReportResponse,
    tags=["Reports"],
    summary="Generate comprehensive audit-ready infrastructure intelligence report",
)
def get_asset_report(asset_id: str, db: Session = Depends(get_db)):
    intel = get_asset_intelligence(asset_id, db)
    asset = intel.asset
    hb = intel.heartbeat

    sections = [
        AssetReportSection(
            section_id="sec-1",
            title="1. Infrastructure Identity & Executive Summary",
            summary=f"Official profile for {asset.name} ({asset.id}) under the jurisdiction of {asset.ownership_authority}.",
            details=[
                f"Classification: {asset.category} in {asset.district}, {asset.state}",
                f"Coordinates: {asset.latitude:.4f} N, {asset.longitude:.4f} E",
                f"Commissioning: Year {asset.construction_year or 'Unrecorded'}",
                f"Current Operational Status: {asset.status}",
                f"Data Completeness Score: {intel.completeness.percentage}%",
            ],
            evidence_citations=[s.title for s in intel.sources[:2]],
        ),
        AssetReportSection(
            section_id="sec-2",
            title="2. Digital Heartbeat & Condition Telemetry",
            summary=f"Dynamic risk index calculated at {hb.risk_score:.1f} ({hb.risk_tier}), with an overall Health Index of {hb.health_index:.1f}/100.",
            details=[
                f"Structural Deterioration Factor: {next((f.score for f in hb.contributing_factors if f.id == 'structural'), 0):.1f}",
                f"Environmental Vulnerability Factor: {next((f.score for f in hb.contributing_factors if f.id == 'environmental'), 0):.1f}",
                f"Compliance & Recency Factor: {next((f.score for f in hb.contributing_factors if f.id == 'compliance'), 0):.1f}",
                f"Days Since Last Audit: {hb.days_since_inspection} days",
                f"Confidence Score: {hb.data_confidence_score * 100:.0f}%",
            ],
            evidence_citations=["Digital Heartbeat Deterministic 4-Factor Engine"],
        ),
        AssetReportSection(
            section_id="sec-3",
            title="3. Engineering Findings & Observed Defects",
            summary=f"Identified {len(intel.findings)} structured findings requiring civil engineering attention.",
            details=[
                f"[{f.severity}] {f.title} — Component: {f.affected_component}. Status: {f.resolution_status}"
                for f in intel.findings
            ] if intel.findings else ["No acute critical findings registered in active database."],
            evidence_citations=[f.supporting_evidence for f in intel.findings if f.supporting_evidence],
        ),
        AssetReportSection(
            section_id="sec-4",
            title="4. Inspection & Verification Lifecycle",
            summary=f"Audit history contains {len(intel.inspections)} field evaluations.",
            details=[
                f"{i.inspection_date} [{i.status}]: {i.inspection_type} by {i.responsible_user} — Outcome: {i.verification_outcome or 'Pending'}"
                for i in intel.inspections
            ] if intel.inspections else ["No historical inspections on record."],
            evidence_citations=[i.evidence_references for i in intel.inspections if i.evidence_references],
        ),
        AssetReportSection(
            section_id="sec-5",
            title="5. Data Gaps & Recommended Investigations",
            summary="Identified telemetry and audit gaps requiring field investigation.",
            details=[
                f"Recommended Action: {inv.title} ({inv.priority} Priority) — {inv.detail}"
                for inv in hb.suggested_investigations
            ] + [f"Missing Parameter: {m}" for m in intel.completeness.missing_fields],
            evidence_citations=["AAYAM Data Quality & Completeness Audit"],
        ),
    ]

    crit_count = sum(1 for f in intel.findings if f.severity in ["Critical", "High"])
    open_count = sum(1 for f in intel.findings if f.resolution_status != "Resolved & Certified")
    verified_count = sum(1 for i in intel.inspections if i.status == "Verified")

    return AssetReportResponse(
        report_id=f"REP-{asset.id}-{datetime.now(timezone.utc).strftime('%Y%m%d%H%M')}",
        generated_at=datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S UTC"),
        generated_by="AAYAM Platform Intelligence Engine v0.1",
        asset_id=asset.id,
        asset_name=asset.name,
        category=asset.category,
        district=asset.district,
        state=asset.state,
        ownership_authority=asset.ownership_authority,
        overall_risk_score=hb.risk_score,
        risk_level=hb.risk_tier,
        health_index=hb.health_index,
        sections=sections,
        critical_findings_count=crit_count,
        open_actions_count=open_count,
        verified_interventions_count=verified_count,
    )




