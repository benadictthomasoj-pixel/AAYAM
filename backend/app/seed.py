import logging
from app.database import engine, Base, SessionLocal, ensure_schema_compatibility
from app.models import Asset, Inspection, AssetMedia, EvidenceSource, AssetFinding
from app.seed_data import SAMPLE_ASSETS, SAMPLE_MEDIA, SAMPLE_SOURCES, SAMPLE_FINDINGS

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("aayam.seed")

SAMPLE_INSPECTIONS = [
    {
        "id": "INSP-2023-001",
        "asset_id": "ASSET-BRG-001",
        "inspection_date": "2023-11-14",
        "inspection_type": "Underwater Sonar Bathymetry & Scour Survey",
        "findings": "Sub-surface scour hole depth of 2.4 meters detected beneath Pier 4 concrete footing; expansion joint gap measured at 48mm exceeding 25mm design limit; ultrasonic flaw in tendon anchorage.",
        "recommended_action": "Emergency rip-rap boulder dumping around pier footing; structural load restriction on heavy commercial transit.",
        "actual_action_taken": "Heavy commercial vehicle speed reduced to 30 km/h; boulder dumping contract tendered.",
        "responsible_user": "Executive Engineer S. Rane (Goa PWD Marine Division)",
        "status": "In Progress",
        "evidence_references": "Mandovi_Bridge_Pier_Scour_Audit_2023.pdf",
        "verification_notes": None,
        "verification_date": None,
    },
    {
        "id": "INSP-2024-002",
        "asset_id": "ASSET-WTP-002",
        "inspection_date": "2024-03-02",
        "inspection_type": "Tri-axial Vibration Spectrum & Clarifier Mechanical Audit",
        "findings": "High-lift pump motor #3 radial vibration velocity at 7.82 mm/s (ISO Class III limit: 4.5 mm/s); Clarifier #3 sludge scraper drive torque spikes at 142% rated motor current.",
        "recommended_action": "Isolate and overhaul pump impeller; central turn-table bearing replacement on clarifier.",
        "actual_action_taken": "Clarifier grease pack refreshed; pump overhaul scheduled for Q3 maintenance window.",
        "responsible_user": "Plant Superintendent R. Sharma (RUIDP Kota)",
        "status": "Pending",
        "evidence_references": "Chambal_WTP_Pump_Vibration_Report_2024.txt",
        "verification_notes": None,
        "verification_date": None,
    },
    {
        "id": "INSP-2024-003",
        "asset_id": "ASSET-CNL-004",
        "inspection_date": "2024-08-10",
        "inspection_type": "Annual Irrigation Lock Gate Pre-Monsoon Operability Inspection",
        "findings": "Lock gate hydraulic winch cables inspected; minor seal seepage observed within permissible 0.2 L/min limit.",
        "recommended_action": "Routine high-pressure grease lubrication and seal replacement.",
        "actual_action_taken": "Hydraulic oil flushed and replenished; seal replaced on Gate #12.",
        "responsible_user": "Assistant Executive Engineer V. Rao (AP Water Resources)",
        "status": "Verified",
        "evidence_references": "Field Verification Certificate #AP-WRD-2024-441",
        "verification_notes": "Post-intervention flow test successful; zero seal leakage confirmed under full head pressure.",
        "verification_date": "2024-08-14",
    },
    {
        "id": "INSP-2024-004",
        "asset_id": "ASSET-DRN-006",
        "inspection_date": "2024-02-19",
        "inspection_type": "Tidal Flap Gate Mechanical Operability Appraisal",
        "findings": "Flap gate #2 mechanically seized at 18 degrees open angle due to marine bio-fouling and silt wedging in trunnion hinge pin. High silt sedimentation in intake chamber (>65%).",
        "recommended_action": "High-pressure descaling of hinge pins and hydraulic dredging of 120m approach channel.",
        "actual_action_taken": "Emergency diver survey completed; dredging work order submitted for administrative approval.",
        "responsible_user": "Deputy Chief Engineer M. Joshi (BMC Stormwater Drainage)",
        "status": "In Progress",
        "evidence_references": "Mithi_River_Sluice_Gate_Inspection_2024.txt",
        "verification_notes": None,
        "verification_date": None,
    }
]


def init_db(force_reseed: bool = False):
    """
    Initializes SQLite tables and seeds the initial mock infrastructure assets, inspections,
    visual media, evidence sources, and structured engineering findings.
    """
    logger.info("Initializing database schema...")
    ensure_schema_compatibility(engine)
    Base.metadata.create_all(bind=engine)

    db = SessionLocal()
    try:
        count = db.query(Asset).count()
        if count == 0 or force_reseed:
            if force_reseed and count > 0:
                logger.info("Force re-seed requested. Clearing existing records...")
                db.query(AssetFinding).delete()
                db.query(EvidenceSource).delete()
                db.query(AssetMedia).delete()
                db.query(Inspection).delete()
                db.query(Asset).delete()
                db.commit()

            logger.info(f"Seeding {len(SAMPLE_ASSETS)} sample prototype assets...")
            for item in SAMPLE_ASSETS:
                asset = Asset(
                    id=item["id"],
                    name=item["name"],
                    category=item["category"],
                    district=item["district"],
                    state=item["state"],
                    latitude=item["latitude"],
                    longitude=item["longitude"],
                    construction_year=item.get("construction_year"),
                    ownership_authority=item.get("ownership_authority", "State Public Works Department (PWD)"),
                    status=item["status"],
                    data_source=item["data_source"],
                    risk_score=item.get("risk_score", 15.0),
                    risk_level=item.get("risk_level", "Low"),
                    health_index=item.get("health_index", 85.0),
                    last_inspection_date=item.get("last_inspection_date"),
                    flagged_reasons=item.get("flagged_reasons"),
                    description=item.get("description"),
                )
                db.add(asset)
            db.commit()

        # Seed initial inspections if table is empty
        insp_count = db.query(Inspection).count()
        if insp_count == 0:
            logger.info(f"Seeding {len(SAMPLE_INSPECTIONS)} sample inspection/intervention events...")
            for insp_data in SAMPLE_INSPECTIONS:
                insp = Inspection(
                    id=insp_data["id"],
                    asset_id=insp_data["asset_id"],
                    inspection_date=insp_data["inspection_date"],
                    inspection_type=insp_data["inspection_type"],
                    findings=insp_data["findings"],
                    recommended_action=insp_data.get("recommended_action"),
                    actual_action_taken=insp_data.get("actual_action_taken"),
                    responsible_user=insp_data.get("responsible_user"),
                    status=insp_data.get("status", "Pending"),
                    evidence_references=insp_data.get("evidence_references"),
                    verification_notes=insp_data.get("verification_notes"),
                    verification_date=insp_data.get("verification_date"),
                )
                db.add(insp)
            db.commit()
            logger.info("Seeded initial inspections.")

        # Seed visual media if table is empty
        media_count = db.query(AssetMedia).count()
        if media_count == 0:
            logger.info(f"Seeding {len(SAMPLE_MEDIA)} visual media records...")
            for m_data in SAMPLE_MEDIA:
                media = AssetMedia(
                    id=m_data["id"],
                    asset_id=m_data["asset_id"],
                    inspection_id=m_data.get("inspection_id"),
                    file_name=m_data["file_name"],
                    file_path=m_data["file_path"],
                    caption=m_data["caption"],
                    category=m_data.get("category", "General"),
                    uploader_name=m_data.get("uploader_name", "Authorized Engineering Officer"),
                    captured_at=m_data.get("captured_at"),
                    verification_status=m_data.get("verification_status", "Verified"),
                )
                db.add(media)
            db.commit()
            logger.info("Seeded visual media records.")

        # Seed evidence sources if table is empty
        sources_count = db.query(EvidenceSource).count()
        if sources_count == 0:
            logger.info(f"Seeding {len(SAMPLE_SOURCES)} evidence sources...")
            for s_data in SAMPLE_SOURCES:
                source = EvidenceSource(
                    id=s_data["id"],
                    asset_id=s_data["asset_id"],
                    title=s_data["title"],
                    source_type=s_data["source_type"],
                    provider=s_data["provider"],
                    document_name=s_data.get("document_name"),
                    page_or_paragraph=s_data.get("page_or_paragraph"),
                    excerpt=s_data.get("excerpt"),
                    verification_status=s_data.get("verification_status", "Verified Official"),
                    publication_date=s_data.get("publication_date"),
                )
                db.add(source)
            db.commit()
            logger.info("Seeded evidence sources.")

        # Seed structured findings if table is empty
        findings_count = db.query(AssetFinding).count()
        if findings_count == 0:
            logger.info(f"Seeding {len(SAMPLE_FINDINGS)} structured findings...")
            for f_data in SAMPLE_FINDINGS:
                finding = AssetFinding(
                    id=f_data["id"],
                    asset_id=f_data["asset_id"],
                    title=f_data["title"],
                    plain_explanation=f_data["plain_explanation"],
                    technical_explanation=f_data["technical_explanation"],
                    severity=f_data.get("severity", "Moderate"),
                    affected_component=f_data["affected_component"],
                    supporting_evidence=f_data.get("supporting_evidence"),
                    date_identified=f_data["date_identified"],
                    verification_status=f_data.get("verification_status", "Verified by Field Audit"),
                    recommended_action=f_data["recommended_action"],
                    resolution_status=f_data.get("resolution_status", "Open"),
                )
                db.add(finding)
            db.commit()
            logger.info("Seeded structured findings.")

        # Seed default administrator if none exists
        from app.models import User
        from app.security import hash_password
        admin_exists = db.query(User).filter(User.role == "admin").first()
        if not admin_exists:
            admin_user = User(
                id="USER-ADM-CANONICAL",
                username="admin",
                email="admin@aayam.gov.in",
                full_name="Chief Infrastructure Engineer (Admin)",
                password_hash=hash_password("Admin123456!"),
                role="admin",
                is_active=True,
            )
            db.add(admin_user)
            db.commit()
            logger.info("Seeded canonical administrator account.")

        logger.info(
            f"Database ready: {db.query(Asset).count()} assets, "
            f"{db.query(Inspection).count()} inspections, "
            f"{db.query(AssetMedia).count()} media, "
            f"{db.query(EvidenceSource).count()} sources, "
            f"{db.query(AssetFinding).count()} findings."
        )
        return db.query(Asset).count()
    except Exception as e:
        db.rollback()
        logger.error(f"Error seeding database: {e}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    init_db(force_reseed=False)
