from typing import List, Optional, Dict, Any
from datetime import datetime
from pydantic import BaseModel, Field, ConfigDict


class HealthResponse(BaseModel):
    status: str = Field(..., json_schema_extra={"example": "healthy"})
    app_name: str = Field(..., json_schema_extra={"example": "AAYAM Infrastructure Intelligence API"})
    environment: str = Field(..., json_schema_extra={"example": "development"})
    timestamp: str
    database: str = Field(..., json_schema_extra={"example": "connected"})
    total_assets: int = Field(..., json_schema_extra={"example": 12})
    mock_mode: bool = True
    disclaimer: str = "Hackathon prototype with synthetic/mock data. Never use for operational life-safety decisions."


class AssetBase(BaseModel):
    id: str
    name: str
    category: str
    district: str
    state: str
    latitude: float
    longitude: float
    construction_year: Optional[int] = None
    ownership_authority: Optional[str] = "State Public Works Department (PWD)"
    status: str
    data_source: str
    risk_score: float = 15.0
    risk_level: str = "Low"
    health_index: float = 85.0
    last_inspection_date: Optional[str] = None
    flagged_reasons: List[str] = []
    description: Optional[str] = None


class AssetCreate(AssetBase):
    """Schema for creating an infrastructure asset."""
    pass

class AssetResponse(AssetBase):
    media_count: int = 0
    findings_count: int = 0
    sources_count: int = 0
    created_at: Optional[str] = None
    updated_at: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class AssetListResponse(BaseModel):
    total: int
    count: int
    items: List[AssetResponse]
    categories: List[str]
    disclaimer: str = "Mock dataset for hackathon local prototype. Not live official government data."


class AssetSummaryStats(BaseModel):
    total_assets: int
    critical_assets: int
    high_risk_assets: int
    inspection_due: int
    operational_assets: int
    average_health_index: float


class ExternalWebSource(BaseModel):
    title: str
    url: str
    domain: str
    snippet: str
    published_date: Optional[str] = None
    accessed_date: str = ""
    authority_tier: str = "Official Reference"
    supports_topic: str = "Infrastructure Guidance"


class CopilotAskRequest(BaseModel):
    question: str = Field(..., description="Infrastructure inquiry question to be grounded in asset records")
    asset_id: Optional[str] = Field(None, description="Optional target asset ID to scope the inquiry")
    category: Optional[str] = Field(None, description="Optional asset category filter")
    conversation_history: Optional[List[Dict[str, str]]] = Field(default=None, description="Prior conversational context turns")


class EvidenceItem(BaseModel):
    asset_id: Optional[str] = None
    asset_name: Optional[str] = None
    category: Optional[str] = None
    district: Optional[str] = None
    state: Optional[str] = None
    source: str
    evidence_type: str = "asset_telemetry_record" # "asset_telemetry_record" or "document_audit_passage"
    description: str
    risk_score: Optional[float] = None
    status: Optional[str] = None
    last_inspection_date: Optional[str] = None
    document_name: Optional[str] = None
    page_number: Optional[int] = None
    section_title: Optional[str] = None
    timestamp: Optional[str] = None
    excerpt: Optional[str] = None
    citation_label: Optional[str] = None
    confidence_score: Optional[float] = None
    filename: Optional[str] = None
    source_file: Optional[str] = None
    file_type: Optional[str] = None
    chunk_id: Optional[str] = None
    relevance_score: Optional[float] = None


class DocumentPage(BaseModel):
    page_number: int
    text: str


class DocumentDetailResponse(BaseModel):
    document_name: str
    filename: str
    file_type: str
    total_pages: int
    source_agency: Optional[str] = None
    timestamp: Optional[str] = None
    asset_id: Optional[str] = None
    content: str
    pages: List[DocumentPage] = []
    status: str = "available"


class CopilotAskResponse(BaseModel):
    question: str
    matched_assets_count: int
    answer: str
    observed_facts: List[str]
    recommendations: List[str]
    evidence: List[EvidenceItem]
    citations: List[str] = []
    evidence_sufficiency: str = "sufficient" # "sufficient", "insufficient", "unmatched"
    confidence_level: str = "High"
    limitations_note: str
    pipeline_type: str = "retrieval_only_fallback" # "llm_grounded_rag" or "retrieval_only_fallback"
    external_sources: List[ExternalWebSource] = []
    search_executed: bool = False
    search_query_used: Optional[str] = None
    search_provider: Optional[str] = None
    simple_answer: Optional[str] = None
    final_summary: Optional[str] = None


class ContributingFactor(BaseModel):
    id: str
    name: str
    weight: float
    score: float
    contribution: float
    description: str
    source: str


class SuggestedInvestigation(BaseModel):
    priority: str
    title: str
    detail: str


class DataCompletenessInfo(BaseModel):
    verified_fields: List[str]
    missing_fields: List[str]


class HeartbeatResponse(BaseModel):
    asset_id: str
    asset_name: str
    category: str
    district: str
    state: str
    risk_score: float
    risk_tier: str
    health_index: float
    last_inspection_date: Optional[str] = None
    days_since_inspection: int
    data_confidence_score: float
    data_completeness: DataCompletenessInfo
    contributing_factors: List[ContributingFactor]
    supporting_inspections_count: int
    has_verified_intervention: bool
    calculation_timestamp: str
    suggested_investigations: List[SuggestedInvestigation]


class InspectionCreateRequest(BaseModel):
    inspection_date: str = Field(..., description="Date of inspection in YYYY-MM-DD")
    inspection_type: str = Field(..., description="Type of audit e.g. Structural Audit, Underwater Sonar, NDT Ultrasonic")
    findings: str = Field(..., description="Observed structural findings and defect description")
    recommended_action: Optional[str] = Field(None, description="Recommended engineering remediation")
    actual_action_taken: Optional[str] = Field(None, description="Intervention action initiated or completed")
    responsible_user: Optional[str] = Field("Engineering Officer (Unauthenticated Prototype Session)", description="Responsible engineer")
    evidence_references: Optional[str] = Field(None, description="Document names, photos or report references")


class InspectionUpdateRequest(BaseModel):
    status: Optional[str] = Field(None, description="Allowed: Pending, In Progress, Completed, Verified")
    actual_action_taken: Optional[str] = Field(None, description="Updated action description")
    evidence_references: Optional[str] = Field(None, description="Document or photo references")


class InspectionVerifyRequest(BaseModel):
    verification_notes: str = Field(..., description="Verification observations confirming repair efficacy")
    verification_date: Optional[str] = Field(None, description="Date verified in YYYY-MM-DD")
    verifier_name: Optional[str] = Field("Senior Verification Engineer", description="Signing authority")
    outcome: Optional[str] = Field(
        "Remediation Successful",
        description="Explicit outcome decision: 'Remediation Successful', 'Remediation Unsuccessful', or 'Further Assessment Required'",
    )
    actual_action_taken: Optional[str] = Field(
        None,
        description="Actual intervention details if not previously recorded on inspection",
    )


class InspectionResponse(BaseModel):
    id: str
    asset_id: str
    inspection_date: str
    inspection_type: str
    findings: str
    recommended_action: Optional[str] = None
    actual_action_taken: Optional[str] = None
    responsible_user: Optional[str] = None
    status: str
    evidence_references: Optional[str] = None
    verification_notes: Optional[str] = None
    verification_date: Optional[str] = None
    verification_outcome: Optional[str] = None
    created_at: Optional[str] = None
    updated_at: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class TimelineEvent(BaseModel):
    id: str
    event_type: str # "commissioning", "inspection", "intervention", "verification"
    date: str
    title: str
    description: str
    status: Optional[str] = None
    actor: Optional[str] = None


# ==============================================================================
# AUTHENTICATION & USER SCHEMAS
# ==============================================================================

class UserLoginRequest(BaseModel):
    username: str = Field(..., description="Username or email address")
    password: str = Field(..., min_length=1, description="Account password")


class UserRegisterRequest(BaseModel):
    username: str = Field(..., min_length=3, max_length=50, description="Username (3-50 characters, letters, digits, '.', '-', '_')")
    email: str = Field(..., description="Valid email address")
    full_name: str = Field(..., min_length=1, max_length=255, description="Full name")
    password: str = Field(..., min_length=8, description="Password (at least 8 characters, maximum 72 bytes)")
    confirm_password: str = Field(..., min_length=8, description="Password confirmation matching password")


class UserResponse(BaseModel):
    id: str
    username: str
    email: str
    full_name: str
    role: str
    is_active: bool = True
    created_at: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse


# ==============================================================================
# INTELLIGENCE PROFILE, MEDIA, FINDINGS, AND PROVENANCE SCHEMAS
# ==============================================================================

class AssetMediaResponse(BaseModel):
    id: str
    asset_id: str
    inspection_id: Optional[str] = None
    file_name: str
    file_path: str
    url: str
    caption: str
    category: str
    uploader_name: str
    captured_at: Optional[str] = None
    verification_status: str
    created_at: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class EvidenceSourceResponse(BaseModel):
    id: str
    asset_id: str
    title: str
    source_type: str
    provider: str
    document_name: Optional[str] = None
    page_or_paragraph: Optional[str] = None
    excerpt: Optional[str] = None
    verification_status: str
    publication_date: Optional[str] = None
    created_at: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class AssetFindingResponse(BaseModel):
    id: str
    asset_id: str
    title: str
    plain_explanation: str
    technical_explanation: str
    severity: str
    affected_component: str
    supporting_evidence: Optional[str] = None
    date_identified: str
    verification_status: str
    recommended_action: str
    resolution_status: str
    intelligence_category: str = "Structural"
    evidence_classification: str = "Documented"
    confidence_level: str = "High"
    source_document: Optional[str] = None
    page_number: Optional[int] = None
    image_reference: Optional[str] = None
    reviewed_by: Optional[str] = None
    reviewed_at: Optional[str] = None
    review_decision_notes: Optional[str] = None
    ai_generated: bool = False
    run_id: Optional[str] = None
    created_at: Optional[str] = None
    exact_location: Optional[str] = None
    severity_level: Optional[int] = 3
    potential_consequences: Optional[str] = None
    immediate_action: Optional[str] = None
    further_investigation: Optional[str] = None
    responsible_discipline: Optional[str] = None
    action_stage: Optional[str] = "Stage A"
    timeframe: Optional[str] = None
    approval_required: Optional[str] = None
    risk_contribution_pts: Optional[float] = 0.0

    model_config = ConfigDict(from_attributes=True)


class AssetFindingCreateRequest(BaseModel):
    title: str = Field(..., description="Short descriptive title of finding")
    plain_explanation: str = Field(..., description="Plain-language description for non-engineers")
    technical_explanation: str = Field(..., description="Engineering description of failure mode or defect")
    severity: str = Field("Moderate", description="Severity: Critical, High, Moderate, Low")
    affected_component: str = Field(..., description="Infrastructure component e.g. Pier Footing, Spillway Gate")
    supporting_evidence: Optional[str] = Field(None, description="Citation or document filename")
    date_identified: str = Field(..., description="Date identified in YYYY-MM-DD")
    verification_status: str = Field("Pending Review", description="Verification state: Pending Review, Verified, Rejected, Requires Further Inspection")
    recommended_action: str = Field(..., description="Recommended engineering intervention")
    resolution_status: str = Field("Open", description="Status: Open, Intervention Underway, Resolved & Certified")
    intelligence_category: Optional[str] = Field("Structural", description="One of: Structural, Environmental, Compliance, Operational, Predictive")
    evidence_classification: Optional[str] = Field("Documented", description="One of: Documented, Visually Suspected, Inferred, Unknown")
    confidence_level: Optional[str] = Field("High", description="High, Medium, Low")
    source_document: Optional[str] = Field(None, description="Document filename")
    page_number: Optional[int] = Field(None, description="Page number")
    image_reference: Optional[str] = Field(None, description="Image reference filename")


class FindingReviewRequest(BaseModel):
    verification_status: str = Field(..., description="Allowed: 'Pending Review', 'Verified', 'Rejected', 'Requires Further Inspection'")
    review_decision_notes: Optional[str] = Field(None, description="Review notes or justification from reviewing engineer")
    reviewed_by: Optional[str] = Field("Authorized Engineering Officer", description="Reviewer name or role")


class AIIntelligenceRunResponse(BaseModel):
    id: str
    asset_id: str
    model_used: str
    status: str
    overall_condition_summary: Optional[str] = None
    structural_summary: Optional[str] = None
    environmental_summary: Optional[str] = None
    compliance_summary: Optional[str] = None
    operational_summary: Optional[str] = None
    predictive_summary: Optional[str] = None
    predictive_data_warning: Optional[str] = None
    data_limitations: Optional[str] = None
    conflicting_evidence: Optional[str] = None
    prompt_tokens: int = 0
    completion_tokens: int = 0
    total_tokens: int = 0
    estimated_cost_usd: float = 0.0
    latency_ms: int = 0
    created_at: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)



class GlobalSearchResultItem(BaseModel):
    id: str
    type: str # "asset", "finding", "document", "inspection"
    title: str
    subtitle: str
    category: Optional[str] = None
    risk_level: Optional[str] = None
    asset_id: Optional[str] = None
    url: Optional[str] = None
    snippet: Optional[str] = None


class GlobalSearchResponse(BaseModel):
    query: str
    total_matches: int
    assets: List[GlobalSearchResultItem] = []
    findings: List[GlobalSearchResultItem] = []
    documents: List[GlobalSearchResultItem] = []


class AssetCompleteness(BaseModel):
    percentage: int
    verified_fields: List[str]
    missing_fields: List[str]
    has_inspections: bool
    has_media: bool
    has_sources: bool
    has_findings: bool


class AssetIntelligenceResponse(BaseModel):
    asset: AssetResponse
    completeness: AssetCompleteness
    heartbeat: HeartbeatResponse
    findings: List[AssetFindingResponse] = []
    sources: List[EvidenceSourceResponse] = []
    media: List[AssetMediaResponse] = []
    timeline: List[TimelineEvent] = []
    inspections: List[InspectionResponse] = []
    latest_ai_run: Optional[AIIntelligenceRunResponse] = None
    ai_runs_count: int = 0
    critical_areas: List[Dict[str, Any]] = []
    intervention_plan: Dict[str, Any] = {}
    prioritized_risks: List[Dict[str, Any]] = []
    component_inventory: List[Dict[str, Any]] = []
    condition_summary: Dict[str, Any] = {}



class AssetReportSection(BaseModel):
    section_id: str
    title: str
    summary: str
    details: List[str] = []
    evidence_citations: List[str] = []


class AssetReportResponse(BaseModel):
    report_id: str
    report_title: str = "Infrastructure Intelligence & Condition Assessment Audit"
    generated_at: str
    generated_by: str
    asset_id: str
    asset_name: str
    category: str
    district: str
    state: str
    ownership_authority: str
    overall_risk_score: float
    risk_level: str
    risk_category: str = ""
    health_index: float
    executive_summary: str = ""
    sections: List[AssetReportSection]
    verified_data_points: List[str] = []
    unverified_claims: List[str] = []
    evidence_gaps: List[str] = []
    critical_findings_count: int
    open_actions_count: int
    verified_interventions_count: int
    disclaimer: str = "AAYAM Prototype Intelligence Report. All metrics grounded in available records."


class ReportSummaryItem(BaseModel):
    report_id: str
    asset_id: str
    asset_name: str
    category: str
    report_title: str
    report_type: str
    report_date: str
    risk_level: str
    risk_score: float
    status: str
    source_document: Optional[str] = None
    findings_count: int
    inspections_count: int
    last_updated: str


class ReportsOverviewMetrics(BaseModel):
    total_assets: int
    total_inspections: int
    pending_inspections: int
    completed_inspections: int
    verified_inspections: int
    open_findings: int
    resolved_findings: int
    critical_risk_assets: int
    available_evidence_documents: int
    reports_available: int


class ReportLibraryResponse(BaseModel):
    summary: ReportsOverviewMetrics
    reports: List[ReportSummaryItem]


class HistoryEventItem(BaseModel):
    event_id: str
    event_date: str
    event_type: str
    asset_id: str
    asset_name: str
    category: str
    title: str
    description: str
    severity: str
    status: Optional[str] = None
    source_record: Optional[str] = None


class HistoryTimelineResponse(BaseModel):
    total_events: int
    events: List[HistoryEventItem]
    historical_snapshots_available: bool = False
    notice: str = "Historical records reflect documented database entries (commissioning, inspections, findings, and verifications). Time-series risk score snapshots prior to the current session are not stored."

