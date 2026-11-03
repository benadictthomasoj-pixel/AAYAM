import json
from datetime import datetime, timezone
from typing import List, Any, Optional
from sqlalchemy import Column, String, Float, Integer, Text, DateTime, ForeignKey, Boolean
from sqlalchemy.orm import relationship
from app.database import Base


def parse_flagged_reasons(raw: Any) -> List[str]:
    """
    Safely deserializes flagged_reasons whether stored as a JSON string list,
    semicolon-delimited text, native list, None, or empty string.
    """
    if raw is None:
        return []
    if isinstance(raw, list):
        return [str(item).strip() for item in raw if str(item).strip()]
    if isinstance(raw, str):
        trimmed = raw.strip()
        if not trimmed:
            return []
        if trimmed.startswith("[") and trimmed.endswith("]"):
            try:
                parsed = json.loads(trimmed)
                if isinstance(parsed, list):
                    return [str(item).strip() for item in parsed if str(item).strip()]
            except (json.JSONDecodeError, ValueError):
                pass
        return [part.strip() for part in trimmed.split(";") if part.strip()]
    return []


def serialize_flagged_reasons(raw: Any) -> Optional[str]:
    """
    Serializes flagged_reasons into valid JSON string text for SQLite Text column,
    or None if empty.
    """
    items = parse_flagged_reasons(raw)
    if not items:
        return None
    return json.dumps(items)


class Asset(Base):
    """
    SQLAlchemy model representing a Public Infrastructure Asset.
    Includes baseline attributes along with preliminary Digital Heartbeat telemetry indicators.
    """
    __tablename__ = "assets"

    id = Column(String(64), primary_key=True, index=True)
    name = Column(String(255), nullable=False, index=True)
    category = Column(String(100), nullable=False, index=True)
    district = Column(String(100), nullable=False, index=True)
    state = Column(String(100), nullable=False, index=True)
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    construction_year = Column(Integer, nullable=True)
    status = Column(String(50), nullable=False, default="Operational", index=True) 
    
    ownership_authority = Column(String(200), nullable=True, default="State Public Works Department (PWD)")
    data_source = Column(
        String(255),
        nullable=False,
        default="Sample Record (Prototype Mock - Not Live Govt Data)"
    )
    
    # Extended intelligence metrics for the Digital Heartbeat concept
    risk_score = Column(Float, nullable=False, default=15.0) # 0 to 100 scale
    risk_level = Column(String(30), nullable=False, default="Low") # Low, Moderate, High, Critical
    health_index = Column(Float, nullable=False, default=85.0) # 0 to 100 scale
    last_inspection_date = Column(String(30), nullable=True)
    flagged_reasons = Column(Text, nullable=True) # Semicolon delimited or JSON investigation flags
    description = Column(Text, nullable=True)

    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    # Relationships
    inspections = relationship("Inspection", back_populates="asset", cascade="all, delete-orphan", order_by="desc(Inspection.inspection_date)")
    media = relationship("AssetMedia", back_populates="asset", cascade="all, delete-orphan", order_by="desc(AssetMedia.created_at)")
    sources = relationship("EvidenceSource", back_populates="asset", cascade="all, delete-orphan", order_by="desc(EvidenceSource.created_at)")
    findings = relationship("AssetFinding", back_populates="asset", cascade="all, delete-orphan", order_by="desc(AssetFinding.created_at)")
    intelligence_runs = relationship("AIIntelligenceRun", back_populates="asset", cascade="all, delete-orphan", order_by="desc(AIIntelligenceRun.created_at)")

    @property
    def flagged_reasons_list(self) -> List[str]:
        return parse_flagged_reasons(self.flagged_reasons)

    def to_dict(self):
        return {
            "id": self.id,
            "name": self.name,
            "category": self.category,
            "district": self.district,
            "state": self.state,
            "latitude": self.latitude,
            "longitude": self.longitude,
            "construction_year": self.construction_year,
            "ownership_authority": self.ownership_authority or "State Public Works Department (PWD)",
            "status": self.status,
            "data_source": self.data_source,
            "risk_score": self.risk_score,
            "risk_level": self.risk_level,
            "health_index": self.health_index,
            "last_inspection_date": self.last_inspection_date,
            "flagged_reasons": parse_flagged_reasons(self.flagged_reasons),
            "description": self.description,
            "media_count": len(self.media) if hasattr(self, "media") and self.media is not None else 0,
            "findings_count": len(self.findings) if hasattr(self, "findings") and self.findings is not None else 0,
            "sources_count": len(self.sources) if hasattr(self, "sources") and self.sources is not None else 0,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }


class Inspection(Base):
    """
    SQLAlchemy model representing field inspections, interventions, and verified outcomes.
    Forms the closed-loop workflow: Detect -> Understand -> Prioritise -> Intervene -> Verify -> Learn.
    """
    __tablename__ = "inspections"

    id = Column(String(64), primary_key=True, index=True)
    asset_id = Column(String(64), ForeignKey("assets.id"), nullable=False, index=True)
    inspection_date = Column(String(30), nullable=False, index=True)
    inspection_type = Column(String(100), nullable=False) # e.g. "Structural Audit", "Underwater Sonar", "Emergency Post-Weather", "NDT Ultrasonic"
    findings = Column(Text, nullable=False)
    recommended_action = Column(Text, nullable=True)
    actual_action_taken = Column(Text, nullable=True)
    responsible_user = Column(String(100), nullable=True, default="Engineering Officer (Unauthenticated Prototype Session)")
    status = Column(String(50), nullable=False, default="Pending", index=True) # "Pending", "In Progress", "Completed", "Verified"
    evidence_references = Column(Text, nullable=True) # References to audit documents, photos, or reports
    verification_notes = Column(Text, nullable=True)
    verification_date = Column(String(30), nullable=True)
    verification_outcome = Column(String(50), nullable=True) # "Remediation Successful", "Remediation Unsuccessful", "Further Assessment Required"

    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    asset = relationship("Asset", back_populates="inspections")
    media = relationship("AssetMedia", back_populates="inspection")

    def to_dict(self):
        return {
            "id": self.id,
            "asset_id": self.asset_id,
            "inspection_date": self.inspection_date,
            "inspection_type": self.inspection_type,
            "findings": self.findings,
            "recommended_action": self.recommended_action,
            "actual_action_taken": self.actual_action_taken,
            "responsible_user": self.responsible_user,
            "status": self.status,
            "evidence_references": self.evidence_references,
            "verification_notes": self.verification_notes,
            "verification_date": self.verification_date,
            "verification_outcome": self.verification_outcome,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }


class AssetMedia(Base):
    """
    SQLAlchemy model representing infrastructure photographs, inspection imagery,
    and verified engineering visual evidence.
    """
    __tablename__ = "asset_media"

    id = Column(String(64), primary_key=True, index=True)
    asset_id = Column(String(64), ForeignKey("assets.id"), nullable=False, index=True)
    inspection_id = Column(String(64), ForeignKey("inspections.id", ondelete="SET NULL"), nullable=True, index=True)
    file_name = Column(String(255), nullable=False)
    file_path = Column(String(255), nullable=False)
    caption = Column(String(255), nullable=False)
    category = Column(String(50), nullable=False, default="General", index=True) # General, Structural, Visible Damage, Inspection, Repairs, Historical
    uploader_name = Column(String(100), nullable=False, default="Authorized Engineering Officer")
    captured_at = Column(String(30), nullable=True)
    verification_status = Column(String(30), nullable=False, default="Verified", index=True) # Verified, Field Submitted, Unverified
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    asset = relationship("Asset", back_populates="media")
    inspection = relationship("Inspection", back_populates="media")

    def to_dict(self):
        return {
            "id": self.id,
            "asset_id": self.asset_id,
            "inspection_id": self.inspection_id,
            "file_name": self.file_name,
            "file_path": self.file_path,
            "url": f"/api/media/{self.file_name}",
            "caption": self.caption,
            "category": self.category,
            "uploader_name": self.uploader_name,
            "captured_at": self.captured_at,
            "verification_status": self.verification_status,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }


class EvidenceSource(Base):
    """
    SQLAlchemy model representing provenance and source citations for infrastructure facts.
    Ensures every factual claim, condition rating, or risk indicator is traceable.
    """
    __tablename__ = "evidence_sources"

    id = Column(String(64), primary_key=True, index=True)
    asset_id = Column(String(64), ForeignKey("assets.id"), nullable=False, index=True)
    title = Column(String(255), nullable=False)
    source_type = Column(String(50), nullable=False) # "Inspection Report", "Technical Audit", "Sensor Telemetry", "Official Notification", "Engineering Drawing"
    provider = Column(String(150), nullable=False) # e.g. "Goa PWD Marine Division", "Central Water Commission"
    document_name = Column(String(255), nullable=True) # Filename or official document ID
    page_or_paragraph = Column(String(50), nullable=True) # e.g. "Page 3, Paragraph 2"
    excerpt = Column(Text, nullable=True) # Direct excerpt or metric recorded
    verification_status = Column(String(30), nullable=False, default="Verified Official") # "Verified Official", "Field Submitted", "Inferred"
    publication_date = Column(String(30), nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    asset = relationship("Asset", back_populates="sources")

    def to_dict(self):
        return {
            "id": self.id,
            "asset_id": self.asset_id,
            "title": self.title,
            "source_type": self.source_type,
            "provider": self.provider,
            "document_name": self.document_name,
            "page_or_paragraph": self.page_or_paragraph,
            "excerpt": self.excerpt,
            "verification_status": self.verification_status,
            "publication_date": self.publication_date,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }


class AssetFinding(Base):
    """
    SQLAlchemy model representing individual, structured engineering findings and recommendations.
    Provides plain-language summary, technical detail, supporting evidence, and resolution status.
    Now extended with 5-module intelligence categories, evidence classifications, and engineer reviews.
    """
    __tablename__ = "asset_findings"

    id = Column(String(64), primary_key=True, index=True)
    asset_id = Column(String(64), ForeignKey("assets.id"), nullable=False, index=True)
    title = Column(String(200), nullable=False)
    plain_explanation = Column(Text, nullable=False)
    technical_explanation = Column(Text, nullable=False)
    severity = Column(String(30), nullable=False, default="Moderate") # Critical, High, Moderate, Low
    affected_component = Column(String(150), nullable=False) # e.g. "Pier 4 Footing", "Flap Gate Hinge"
    supporting_evidence = Column(String(255), nullable=True) # Link to evidence source or document
    date_identified = Column(String(30), nullable=False)
    verification_status = Column(String(50), nullable=False, default="Pending Review") # Pending Review, Verified, Rejected, Requires Further Inspection
    recommended_action = Column(Text, nullable=False)
    resolution_status = Column(String(50), nullable=False, default="Open") # "Open", "Intervention Underway", "Resolved & Certified"

    # Extended Intelligence & Evidence Provenance Attributes
    intelligence_category = Column(String(50), nullable=False, default="Structural", index=True) # Structural, Environmental, Compliance, Operational, Predictive
    evidence_classification = Column(String(50), nullable=False, default="Documented") # Documented, Visually Suspected, Inferred, Unknown
    confidence_level = Column(String(20), nullable=False, default="High") # High, Medium, Low
    source_document = Column(String(255), nullable=True)
    page_number = Column(Integer, nullable=True)
    image_reference = Column(String(255), nullable=True)
    reviewed_by = Column(String(100), nullable=True)
    reviewed_at = Column(String(50), nullable=True)
    review_decision_notes = Column(Text, nullable=True)
    ai_generated = Column(Boolean, nullable=False, default=False)
    run_id = Column(String(64), ForeignKey("ai_intelligence_runs.id", ondelete="SET NULL"), nullable=True, index=True)

    # 10-Point Critical Infrastructure Area Attributes
    exact_location = Column(String(200), nullable=True)
    severity_level = Column(Integer, nullable=True, default=3)
    potential_consequences = Column(Text, nullable=True)
    immediate_action = Column(Text, nullable=True)
    further_investigation = Column(Text, nullable=True)
    responsible_discipline = Column(String(150), nullable=True)
    action_stage = Column(String(30), nullable=True, default="Stage A")
    timeframe = Column(String(50), nullable=True)
    approval_required = Column(String(150), nullable=True)
    risk_contribution_pts = Column(Float, nullable=True, default=0.0)

    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    asset = relationship("Asset", back_populates="findings")
    intelligence_run = relationship("AIIntelligenceRun", back_populates="findings")

    def to_dict(self):
        raw = {
            "id": self.id,
            "asset_id": self.asset_id,
            "title": self.title,
            "plain_explanation": self.plain_explanation,
            "technical_explanation": self.technical_explanation,
            "severity": self.severity,
            "affected_component": self.affected_component,
            "supporting_evidence": self.supporting_evidence,
            "date_identified": self.date_identified,
            "verification_status": self.verification_status,
            "recommended_action": self.recommended_action,
            "resolution_status": self.resolution_status,
            "intelligence_category": self.intelligence_category or "Structural",
            "evidence_classification": self.evidence_classification or "Documented",
            "confidence_level": self.confidence_level or "High",
            "source_document": self.source_document,
            "page_number": self.page_number,
            "image_reference": self.image_reference,
            "reviewed_by": self.reviewed_by,
            "reviewed_at": self.reviewed_at,
            "review_decision_notes": self.review_decision_notes,
            "ai_generated": bool(self.ai_generated),
            "run_id": self.run_id,
            "exact_location": self.exact_location,
            "severity_level": self.severity_level,
            "potential_consequences": self.potential_consequences,
            "immediate_action": self.immediate_action,
            "further_investigation": self.further_investigation,
            "responsible_discipline": self.responsible_discipline,
            "action_stage": self.action_stage or "Stage A",
            "timeframe": self.timeframe,
            "approval_required": self.approval_required,
            "risk_contribution_pts": self.risk_contribution_pts or 0.0,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }
        try:
            from app.component_intelligence import enrich_finding_details
            asset_cat = self.asset.category if self.asset else ""
            return enrich_finding_details(raw, asset_category=asset_cat)
        except Exception:
            return raw


class AIIntelligenceRun(Base):
    """
    SQLAlchemy model representing an AI intelligence analysis execution for an asset.
    Tracks model, tokens, estimated cost, and summaries across the 5 intelligence modules.
    """
    __tablename__ = "ai_intelligence_runs"

    id = Column(String(64), primary_key=True, index=True)
    asset_id = Column(String(64), ForeignKey("assets.id"), nullable=False, index=True)
    model_used = Column(String(100), nullable=False, default="gpt-4o-mini")
    status = Column(String(50), nullable=False, default="completed") # completed, degraded_fallback, failed
    overall_condition_summary = Column(Text, nullable=True)
    structural_summary = Column(Text, nullable=True)
    environmental_summary = Column(Text, nullable=True)
    compliance_summary = Column(Text, nullable=True)
    operational_summary = Column(Text, nullable=True)
    predictive_summary = Column(Text, nullable=True)
    predictive_data_warning = Column(Text, nullable=True)
    data_limitations = Column(Text, nullable=True)
    conflicting_evidence = Column(Text, nullable=True)
    prompt_tokens = Column(Integer, nullable=False, default=0)
    completion_tokens = Column(Integer, nullable=False, default=0)
    total_tokens = Column(Integer, nullable=False, default=0)
    estimated_cost_usd = Column(Float, nullable=False, default=0.0)
    latency_ms = Column(Integer, nullable=False, default=0)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    asset = relationship("Asset", back_populates="intelligence_runs")
    findings = relationship("AssetFinding", back_populates="intelligence_run")

    def to_dict(self):
        return {
            "id": self.id,
            "asset_id": self.asset_id,
            "model_used": self.model_used,
            "status": self.status,
            "overall_condition_summary": self.overall_condition_summary,
            "structural_summary": self.structural_summary,
            "environmental_summary": self.environmental_summary,
            "compliance_summary": self.compliance_summary,
            "operational_summary": self.operational_summary,
            "predictive_summary": self.predictive_summary,
            "predictive_data_warning": self.predictive_data_warning,
            "data_limitations": self.data_limitations,
            "conflicting_evidence": self.conflicting_evidence,
            "prompt_tokens": self.prompt_tokens,
            "completion_tokens": self.completion_tokens,
            "total_tokens": self.total_tokens,
            "estimated_cost_usd": self.estimated_cost_usd,
            "latency_ms": self.latency_ms,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }


class AIConversationMessage(Base):
    """
    SQLAlchemy model representing chat history with the asset-aware intelligence copilot.
    """
    __tablename__ = "ai_conversation_messages"

    id = Column(String(64), primary_key=True, index=True)
    asset_id = Column(String(64), ForeignKey("assets.id", ondelete="SET NULL"), nullable=True, index=True)
    user_id = Column(String(64), ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    question = Column(Text, nullable=False)
    answer = Column(Text, nullable=False)
    citations_json = Column(Text, nullable=True)
    evidence_json = Column(Text, nullable=True)
    model_used = Column(String(100), nullable=False, default="gpt-4o-mini")
    pipeline_type = Column(String(50), nullable=False, default="openai_grounded_rag")
    tokens_used = Column(Integer, nullable=False, default=0)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    asset = relationship("Asset")
    user = relationship("User")

    def to_dict(self):
        import json
        return {
            "id": self.id,
            "asset_id": self.asset_id,
            "user_id": self.user_id,
            "question": self.question,
            "answer": self.answer,
            "citations": json.loads(self.citations_json) if self.citations_json else [],
            "evidence": json.loads(self.evidence_json) if self.evidence_json else [],
            "model_used": self.model_used,
            "pipeline_type": self.pipeline_type,
            "tokens_used": self.tokens_used,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }



class User(Base):
    """
    SQLAlchemy model representing an authenticated user with role-based access control.
    Supported roles: 'admin', 'common_user'
    """
    __tablename__ = "users"

    id = Column(String(64), primary_key=True, index=True)
    username = Column(String(100), unique=True, nullable=False, index=True)
    email = Column(String(255), unique=True, nullable=False, index=True)
    full_name = Column(String(255), nullable=False)
    password_hash = Column(String(255), nullable=False)
    role = Column(String(50), nullable=False, default="common_user", index=True)
    is_active = Column(Boolean, nullable=False, default=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    def to_dict(self):
        return {
            "id": self.id,
            "username": self.username,
            "email": self.email,
            "full_name": self.full_name,
            "role": self.role,
            "is_active": self.is_active,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }

