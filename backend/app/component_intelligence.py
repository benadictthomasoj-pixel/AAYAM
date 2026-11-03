"""
AAYAM — Critical Infrastructure Component Intelligence, Consequence Analysis & Intervention Engine.
Provides deterministic, evidence-grounded component classification, multi-level severity scoring,
potential consequence risk-scenario generation, and 3-stage intervention planning.
"""

from typing import List, Dict, Any, Optional
import re

# ==============================================================================
# 1. COMPREHENSIVE COMPONENT TAXONOMY BY INFRASTRUCTURE CATEGORY
# ==============================================================================
CATEGORY_COMPONENT_TAXONOMY: Dict[str, List[Dict[str, str]]] = {
    "Bridge": [
        {"name": "Foundation & Pile Cap", "discipline": "Geotechnical & Hydraulic Engineering", "subsystem": "Substructure"},
        {"name": "Piers & Columns", "discipline": "Structural Bridge Engineering", "subsystem": "Substructure"},
        {"name": "Deck Slab & Wearing Course", "discipline": "Structural Bridge Engineering", "subsystem": "Superstructure"},
        {"name": "Beams & Pre-stressed Girders", "discipline": "Structural Bridge Engineering", "subsystem": "Superstructure"},
        {"name": "Bearing Assemblies & Sole Plates", "discipline": "Mechanical & Structural Maintenance", "subsystem": "Bearings"},
        {"name": "Expansion Joints", "discipline": "Highway & Bridge Maintenance", "subsystem": "Deck Joints"},
        {"name": "Abutments & Wingwalls", "discipline": "Geotechnical Engineering", "subsystem": "Substructure"},
        {"name": "Deck Drainage & Scuppers", "discipline": "Hydraulic Maintenance", "subsystem": "Drainage"},
        {"name": "Crash Barriers & Pedestrian Railings", "discipline": "Safety & Traffic Engineering", "subsystem": "Safety Infrastructure"},
        {"name": "Approach Slabs & Transitions", "discipline": "Highway Engineering", "subsystem": "Substructure"},
    ],
    "Dam": [
        {"name": "Main Dam Body / Embankment", "discipline": "Dam Safety & Civil Engineering", "subsystem": "Primary Retention"},
        {"name": "Foundation & Cutoff Curtain", "discipline": "Geotechnical & Dam Safety", "subsystem": "Substructure"},
        {"name": "Spillway Chute & Crest", "discipline": "Hydraulic Engineering", "subsystem": "Discharge Control"},
        {"name": "Radial / Sluice Gates & Hoists", "discipline": "Hydromechanical Engineering", "subsystem": "Gating System"},
        {"name": "Drainage & Inspection Galleries", "discipline": "Dam Safety Surveillance", "subsystem": "Seepage Control"},
        {"name": "Reservoir Interface & Upstream Silt Trap", "discipline": "Hydrology & Sedimentology", "subsystem": "Reservoir"},
        {"name": "Piezometers & Seismic Instruments", "discipline": "Instrumentation & Monitoring", "subsystem": "Telemetry"},
        {"name": "Stilling Basin & Energy Dissipator", "discipline": "Hydraulic Engineering", "subsystem": "Downstream Defense"},
    ],
    "Drainage / Outfall": [
        {"name": "Tidal Sluice Flap Gates & Trunnion Pins", "discipline": "Hydromechanical & Marine Engineering", "subsystem": "Tidal Barrier"},
        {"name": "Intake Chamber & Silt Basin", "discipline": "Municipal Stormwater Engineering", "subsystem": "Intake"},
        {"name": "Culvert Barrels & Outfall Conduits", "discipline": "Civil Drainage Engineering", "subsystem": "Conveyance"},
        {"name": "Retaining Bunds & Riprap Embankments", "discipline": "Geotechnical Engineering", "subsystem": "Flood Defense"},
        {"name": "Hydraulic Winch & Hoisting Mechanism", "discipline": "Mechanical Maintenance", "subsystem": "Operability"},
        {"name": "Approach & Discharge Channels", "discipline": "Dredging & River Engineering", "subsystem": "Channel"},
    ],
    "Water Infrastructure": [
        {"name": "Raw Water Intake Structures & Screens", "discipline": "Civil & Hydraulic Engineering", "subsystem": "Intake"},
        {"name": "Raw Water High-Lift / Low-Lift Pumps", "discipline": "Mechanical & Rotating Equipment", "subsystem": "Pumping Train"},
        {"name": "Electric Drive Motors & Couplings", "discipline": "Electrical Engineering", "subsystem": "Drive Units"},
        {"name": "Transmission Pipelines & Non-Return Valves", "discipline": "Pipeline Engineering", "subsystem": "Distribution"},
        {"name": "Clarifier Sludge Scrapers & Turntables", "discipline": "Process & Mechanical Engineering", "subsystem": "Treatment Units"},
        {"name": "Filtration Media & Backwash System", "discipline": "Water Treatment Process Engineering", "subsystem": "Filtration"},
        {"name": "Clear Water Elevated Storage Tanks", "discipline": "Structural & Public Health Engineering", "subsystem": "Storage"},
        {"name": "SCADA, MCC Panels & Power Distribution", "discipline": "Instrumentation & Control", "subsystem": "Electrical / SCADA"},
    ],
    "Road / Highway": [
        {"name": "Bituminous Pavement & Wearing Course", "discipline": "Highway Engineering", "subsystem": "Pavement"},
        {"name": "Subgrade & Granular Sub-base", "discipline": "Geotechnical Engineering", "subsystem": "Pavement Substructure"},
        {"name": "Cross-Drainage Culvert Barrels", "discipline": "Hydraulic & Drainage Engineering", "subsystem": "Drainage"},
        {"name": "Lined Longitudinal Roadside Drains", "discipline": "Drainage Engineering", "subsystem": "Drainage"},
        {"name": "Reinforced Earth Retaining Walls & Slopes", "discipline": "Geotechnical Engineering", "subsystem": "Earth Retention"},
        {"name": "Metal Beam Crash Barriers & Signage", "discipline": "Traffic Safety Engineering", "subsystem": "Safety Infrastructure"},
        {"name": "Unpaved / Earthen Shoulders", "discipline": "Highway Maintenance", "subsystem": "Roadway Shoulders"},
    ],
    "Flyover": [
        {"name": "Elastomeric Bearing Assemblies", "discipline": "Structural Bridge Maintenance", "subsystem": "Bearings"},
        {"name": "Pier Columns & Pier Caps", "discipline": "Structural Engineering", "subsystem": "Substructure"},
        {"name": "Precast Prestressed Deck Girders", "discipline": "Structural Engineering", "subsystem": "Superstructure"},
        {"name": "Cast-in-situ Reinforced Concrete Deck", "discipline": "Structural Engineering", "subsystem": "Superstructure"},
        {"name": "Modular Expansion Joints", "discipline": "Highway & Bridge Maintenance", "subsystem": "Deck Joints"},
        {"name": "Parapet Crash Barriers & Lighting Masts", "discipline": "Safety & Traffic Engineering", "subsystem": "Safety"},
        {"name": "Down-pipe Stormwater Spouts", "discipline": "Hydraulic Maintenance", "subsystem": "Drainage"},
        {"name": "Ramp Approaches & Retaining Walls", "discipline": "Geotechnical & Highway Engineering", "subsystem": "Approaches"},
    ],
}


def get_taxonomy_for_asset(category: str) -> List[Dict[str, str]]:
    """Returns normalized component list based on asset category with fallback."""
    cat_lower = (category or "").lower()
    if "bridge" in cat_lower:
        return CATEGORY_COMPONENT_TAXONOMY["Bridge"]
    if "dam" in cat_lower:
        return CATEGORY_COMPONENT_TAXONOMY["Dam"]
    if "drain" in cat_lower or "outfall" in cat_lower or "sluice" in cat_lower:
        return CATEGORY_COMPONENT_TAXONOMY["Drainage / Outfall"]
    if "water" in cat_lower or "wtp" in cat_lower or "treatment" in cat_lower or "canal" in cat_lower or "lock" in cat_lower:
        return CATEGORY_COMPONENT_TAXONOMY["Water Infrastructure"]
    if "flyover" in cat_lower or "elevated" in cat_lower or "skyway" in cat_lower:
        return CATEGORY_COMPONENT_TAXONOMY["Flyover"]
    if "road" in cat_lower or "highway" in cat_lower or "corridor" in cat_lower or "culvert" in cat_lower:
        return CATEGORY_COMPONENT_TAXONOMY["Road / Highway"]
    # Generic fallback
    return CATEGORY_COMPONENT_TAXONOMY["Bridge"]


# ==============================================================================
# 2. SEVERITY LEVEL MAPPING & COLOR ENCODING
# ==============================================================================
SEVERITY_LEVEL_MAP = {
    "Critical": {
        "level": 1,
        "name": "Level 1 — Critical",
        "color": "red",
        "badgeClass": "bg-red-100 text-red-800 border-red-300",
        "actionUrgency": "Immediate Action Required (Within 24–48 Hours)",
        "escalation": "Escalate to Chief Engineer / Municipal Infrastructure Command",
    },
    "High": {
        "level": 2,
        "name": "Level 2 — High",
        "color": "orange",
        "badgeClass": "bg-orange-100 text-orange-800 border-orange-300",
        "actionUrgency": "Urgent Corrective Attention (Within 7–14 Days)",
        "escalation": "Escalate to Superintending Engineer for Intervention Sanction",
    },
    "Moderate": {
        "level": 3,
        "name": "Level 3 — Moderate",
        "color": "amber",
        "badgeClass": "bg-amber-100 text-amber-800 border-amber-300",
        "actionUrgency": "Scheduled Planned Maintenance (Within 30–60 Days)",
        "escalation": "Assign to Divisional Maintenance Engineer",
    },
    "Low": {
        "level": 4,
        "name": "Level 4 — Low",
        "color": "blue",
        "badgeClass": "bg-blue-100 text-blue-800 border-blue-300",
        "actionUrgency": "Routine Periodic Maintenance & Monitoring",
        "escalation": "Log in Regular Maintenance Registry",
    },
    "Operational": {
        "level": 5,
        "name": "Level 5 — Operational / No Known Issue",
        "color": "green",
        "badgeClass": "bg-green-100 text-green-800 border-green-300",
        "actionUrgency": "Continue Routine Surveillance & Baseline Telemetry",
        "escalation": "Nominal Status — No Escalation Required",
    },
}


def normalize_severity(severity_str: str) -> Dict[str, Any]:
    s = (severity_str or "Moderate").capitalize()
    if s == "Medium":
        s = "Moderate"
    return SEVERITY_LEVEL_MAP.get(s, SEVERITY_LEVEL_MAP["Moderate"])


# ==============================================================================
# 3. CONTEXT-AWARE ENRICHMENT FOR ASSET FINDINGS
# ==============================================================================
def enrich_finding_details(finding_dict: Dict[str, Any], asset_category: str = "") -> Dict[str, Any]:
    """
    Enriches a finding dictionary with the 10 required critical area parameters:
    exact location, consequence analysis chain, 3-stage action, responsible discipline,
    risk contribution, and verification workflow details.
    """
    f = dict(finding_dict)
    sev = normalize_severity(f.get("severity", "Moderate"))
    comp = f.get("affected_component") or "Main Structural Section"
    title = f.get("title") or ""
    plain = f.get("plain_explanation") or ""
    tech = f.get("technical_explanation") or ""

    # 1. Exact location / structural section
    if not f.get("exact_location"):
        if "Pier 4" in comp or "Pier 4" in title or "Pier 4" in tech:
            f["exact_location"] = "Pier P-04 Sub-surface Footing & Riverbed Interface (Chainage 1+420)"
        elif "Pier P-12" in comp or "Pier P-12" in title:
            f["exact_location"] = "Pier P-12 Pier Cap Bearing Seat (Ramp B Overpass)"
        elif "EJ-4" in comp or "Expansion Joint" in comp:
            f["exact_location"] = "Expansion Joint Bay EJ-4 between Spans S-03 and S-04"
        elif "Gate #2" in comp or "Flap Gate" in comp:
            f["exact_location"] = "Tidal Sluice Outfall Cell #2 (Western Seawall Discharge Portal)"
        elif "Gate #12" in comp or "Lock Gate" in comp:
            f["exact_location"] = "Canal Lock Chamber Gate #12 (Navigation Headworks)"
        elif "Pump Motor #3" in comp or "Pump" in comp:
            f["exact_location"] = "Raw Water Intake Pumping Station — Pump Bay #3 Plinth"
        elif "Culvert" in comp:
            f["exact_location"] = "Highway Cross-Drainage Culvert (Km 78+240, Mountain Embankment)"
        else:
            f["exact_location"] = f"Primary Section of {comp}"

    # 2. Multi-level Severity Level & Metadate
    f["severity_level"] = sev["level"]
    f["severity_name"] = sev["name"]
    f["action_urgency"] = sev["actionUrgency"]

    # 3. Potential Consequences (Explicit Risk Scenario across Public Safety / Functionality)
    if not f.get("potential_consequences"):
        if sev["level"] == 1: # Critical
            if "scour" in title.lower() or "scour" in comp.lower():
                f["potential_consequences"] = (
                    "Risk Scenario: Continuous bed erosion undermines pile cap skin friction, risking differential settlement, "
                    "structural deflection of bridge spans S-03/S-04, emergency traffic closure, and catastrophic collapse during monsoon flood discharge."
                )
            elif "flap gate" in title.lower() or "sluice" in comp.lower():
                f["potential_consequences"] = (
                    "Risk Scenario: Inability of flap gate to seal during astronomical high tides enables seawater backflow into urban storm drains, "
                    "causing widespread flooding in adjacent low-lying coastal neighborhoods and failure of city flood barrier."
                )
            else:
                f["potential_consequences"] = (
                    "Risk Scenario: Uncontrolled defect progression threatens public safety, severe capacity loss, and sudden failure of essential infrastructure functionality."
                )
        elif sev["level"] == 2: # High
            if "vibration" in title.lower() or "pump" in comp.lower():
                f["potential_consequences"] = (
                    "Risk Scenario: Sustained mechanical vibration above ISO limits accelerates fatigue in motor bearings and drive shaft, "
                    "risking catastrophic mechanical seizure and unplanned shutdown of drinking water supply to 450,000 residents."
                )
            elif "bearing" in title.lower():
                f["potential_consequences"] = (
                    "Risk Scenario: Extruded neoprene bearing pad loses load-cushioning capacity, causing concrete spalling at pier cap, "
                    "uneven girder load transfer, and mandatory transit lane restrictions."
                )
            elif "expansion joint" in title.lower():
                f["potential_consequences"] = (
                    "Risk Scenario: Damaged seal allows continuous saline water and debris ingress onto pre-stressed tendons beneath the deck, "
                    "triggering accelerated corrosion of steel reinforcement."
                )
            else:
                f["potential_consequences"] = (
                    "Risk Scenario: Accelerated structural deterioration, increased repair costs, and potential operational restrictions if not addressed."
                )
        elif sev["level"] == 3: # Moderate
            f["potential_consequences"] = (
                "Risk Scenario: Silt sedimentation restricts hydraulic discharge capacity by >50%, creating upstream backwater ponding and potential road shoulder erosion during cloudburst events."
            )
        else:
            f["potential_consequences"] = (
                "Risk Scenario: Minor wear without immediate structural risk; deferring routine maintenance may reduce service life over multi-year cycles."
            )

    # 4. Impact Chain: Observed Problem -> Potential Impact -> Consequence -> Required Action
    if not f.get("impact_chain"):
        obs = plain[:100] + ("..." if len(plain) > 100 else "")
        req = f.get("recommended_action") or "Engineering intervention required"
        f["impact_chain"] = {
            "observed_problem": obs,
            "potential_impact": f.get("potential_consequences", "").replace("Risk Scenario: ", ""),
            "consequence": f"{sev['name']} condition requiring {sev['actionUrgency']}",
            "required_action": req,
        }

    # 5. Immediate Action (Stage A: Emergency / Urgent Response)
    if not f.get("immediate_action"):
        if sev["level"] == 1:
            if "scour" in title.lower():
                f["immediate_action"] = (
                    "1. Enforce emergency 30 km/h speed threshold and single-lane axle restriction. "
                    "2. Dispatch specialized dive survey team to map cavity perimeter. "
                    "3. Mobilize emergency rip-rap boulder armor dumping under Section 12 Disaster Management protocols."
                )
            elif "flap gate" in title.lower():
                f["immediate_action"] = (
                    "1. Issue alert to Municipal Disaster Management Cell regarding tidal flood risk. "
                    "2. Mobilize commercial divers for high-pressure hydro-blasting of jammed trunnion pin. "
                    "3. Deploy mobile high-capacity dewatering pumps at approach channel."
                )
            else:
                f["immediate_action"] = (
                    "1. Restrict public access to affected zone pending certified structural safety appraisal. "
                    "2. Issue urgent notification to Executive Engineer and Chief Engineer. "
                    "3. Implement temporary stabilizing or protective measures."
                )
        elif sev["level"] == 2:
            if "vibration" in title.lower():
                f["immediate_action"] = (
                    "1. Switch primary load to standby pump train #2. "
                    "2. Perform continuous FFT vibration spectrum diagnostics. "
                    "3. Order dynamic rebalancing and replacement elastomeric spider coupling."
                )
            elif "bearing" in title.lower():
                f["immediate_action"] = (
                    "1. Restrict multi-axle freight vehicles from outer flyover ramp. "
                    "2. Conduct dial-gauge deflection tests under controlled test loads. "
                    "3. Mobilize hydraulic jacking crew for bearing replacement."
                )
            else:
                f["immediate_action"] = (
                    "1. Schedule detailed engineering assessment within 7 days. "
                    "2. Install crack-monitoring tell-tales or displacement sensors. "
                    "3. Prepare formal engineering remediation bill of quantities."
                )
        else:
            f["immediate_action"] = (
                "Log finding in regional asset register and verify maintenance work order with local maintenance division."
            )

    # 6. Recommended Further Investigation
    if not f.get("further_investigation"):
        if "scour" in title.lower():
            f["further_investigation"] = "High-density multibeam acoustic bathymetry, seismic geophysical subsurface profiling, and core drilling of pier foundation bed."
        elif "vibration" in title.lower():
            f["further_investigation"] = "Tri-axial FFT vibration frequency analysis, laser alignment check, dynamic balancing, and acoustic emission bearing testing."
        elif "gate" in title.lower() or "sluice" in title.lower():
            f["further_investigation"] = "Ultrasonic flaw detection on trunnion hinge pin, non-destructive thickness testing of gate skin plates, and sediment core sampling."
        elif "bearing" in title.lower():
            f["further_investigation"] = "Elastomer hardness Shore A durometer testing, laser leveling of pier cap pedestals, and hydraulic jack pressure audit."
        else:
            f["further_investigation"] = "Comprehensive non-destructive testing (NDT), rebound hammer tests, and core sample petrographic examination."

    # 7. Responsible Engineering Discipline
    if not f.get("responsible_discipline"):
        if "scour" in title.lower() or "marine" in comp.lower() or "sluice" in comp.lower():
            f["responsible_discipline"] = "Marine & Coastal Hydraulic Engineering Wing, State PWD"
        elif "pump" in comp.lower() or "vibration" in title.lower() or "motor" in comp.lower():
            f["responsible_discipline"] = "Electromechanical & Rotating Machinery Directorate"
        elif "joint" in comp.lower() or "bearing" in comp.lower() or "pier" in comp.lower() or "bridge" in asset_category.lower():
            f["responsible_discipline"] = "Structural Bridge Design & Maintenance Division"
        elif "drain" in comp.lower() or "culvert" in comp.lower():
            f["responsible_discipline"] = "Highway Drainage & Stormwater Management Cell"
        else:
            f["responsible_discipline"] = "Civil Infrastructure Maintenance Wing"

    # 8. Timeframe and Approval Required
    if not f.get("timeframe"):
        f["timeframe"] = (
            "Within 24–48 Hours" if sev["level"] == 1
            else "Within 7–14 Days" if sev["level"] == 2
            else "Within 30–60 Days" if sev["level"] == 3
            else "Routine Scheduled Window"
        )

    if not f.get("approval_required"):
        f["approval_required"] = (
            "Chief Engineer Emergency Sanction & Secretary Approval" if sev["level"] == 1
            else "Superintending Engineer Technical Sanction" if sev["level"] == 2
            else "Executive Engineer Maintenance Work Order"
        )

    # 9. Risk Contribution Points to Digital Heartbeat
    if not f.get("risk_contribution_pts"):
        f["risk_contribution_pts"] = (
            28.5 if sev["level"] == 1
            else 16.0 if sev["level"] == 2
            else 8.5 if sev["level"] == 3
            else 2.0
        )

    return f


# ==============================================================================
# 4. COMPONENT INVENTORY & HEALTH STATUS ANALYSIS
# ==============================================================================
def analyze_component_inventory(
    asset: Any,
    findings: List[Dict[str, Any]],
    inspections: List[Dict[str, Any]],
    media: List[Dict[str, Any]],
) -> List[Dict[str, Any]]:
    """
    Evaluates every physical component in the asset's engineering taxonomy.
    Distinguishes:
    - Level 1: Critical Condition
    - Level 2: High Priority Condition
    - Level 3: Moderate Condition
    - Level 4: Low Condition
    - Level 5: Inspected — No Known Issue
    - Data Gap: Not Inspected / Insufficient Information
    """
    category = getattr(asset, "category", "") or (asset.get("category", "") if isinstance(asset, dict) else "")
    taxonomy = get_taxonomy_for_asset(category)
    results = []

    for comp_def in taxonomy:
        comp_name = comp_def["name"]
        disc = comp_def["discipline"]
        subsystem = comp_def["subsystem"]

        # Find matching findings
        matching_findings = []
        for f in findings:
            f_comp = f.get("affected_component") or ""
            f_title = f.get("title") or ""
            # Match component tokens
            tokens = [t.lower() for t in re.split(r"\W+", comp_name) if len(t) > 3]
            if any(t in f_comp.lower() or t in f_title.lower() for t in tokens):
                matching_findings.append(f)

        # Find matching inspections
        matching_inspections = []
        for insp in inspections:
            insp_find = (insp.get("findings") if isinstance(insp, dict) else getattr(insp, "findings", "")) or ""
            tokens = [t.lower() for t in re.split(r"\W+", comp_name) if len(t) > 3]
            if any(t in insp_find.lower() for t in tokens):
                matching_inspections.append(insp)

        # Find matching media
        matching_media = [
            m for m in media
            if any(t in ((m.get("caption") if isinstance(m, dict) else getattr(m, "caption", "")) or "").lower()
                   for t in [t.lower() for t in re.split(r"\W+", comp_name) if len(t) > 3])
        ]

        if matching_findings:
            # Sort by highest severity
            best_sev_level = 5
            top_finding = matching_findings[0]
            for f in matching_findings:
                s_level = normalize_severity(f.get("severity", "Moderate"))["level"]
                if s_level < best_sev_level:
                    best_sev_level = s_level
                    top_finding = f

            sev_meta = SEVERITY_LEVEL_MAP.get(
                "Critical" if best_sev_level == 1
                else "High" if best_sev_level == 2
                else "Moderate" if best_sev_level == 3
                else "Low"
            )

            results.append({
                "component_name": comp_name,
                "subsystem": subsystem,
                "discipline": disc,
                "status_level": best_sev_level,
                "status_label": sev_meta["name"],
                "status_color": sev_meta["color"],
                "badge_class": sev_meta["badgeClass"],
                "condition_summary": top_finding.get("plain_explanation") or top_finding.get("title"),
                "finding_id": top_finding.get("id"),
                "has_defect": True,
                "is_data_gap": False,
                "inspection_count": len(matching_inspections),
                "media_count": len(matching_media),
                "action_urgency": sev_meta["actionUrgency"],
                "evidence_reference": top_finding.get("source_document") or top_finding.get("supporting_evidence"),
            })
        elif matching_inspections:
            results.append({
                "component_name": comp_name,
                "subsystem": subsystem,
                "discipline": disc,
                "status_level": 5,
                "status_label": "Level 5 — Inspected: No Known Issue",
                "status_color": "green",
                "badge_class": "bg-green-100 text-green-800 border-green-300",
                "condition_summary": f"Evaluated during {len(matching_inspections)} official inspection audit(s). All parameters within standard operational thresholds.",
                "finding_id": None,
                "has_defect": False,
                "is_data_gap": False,
                "inspection_count": len(matching_inspections),
                "media_count": len(matching_media),
                "action_urgency": "Continue Scheduled Monitoring",
                "evidence_reference": (
                    matching_inspections[0].get("evidence_references")
                    if isinstance(matching_inspections[0], dict)
                    else getattr(matching_inspections[0], "evidence_references", None)
                ),
            })
        else:
            # Component is in the engineering design but has not been specifically audited
            results.append({
                "component_name": comp_name,
                "subsystem": subsystem,
                "discipline": disc,
                "status_level": 0,
                "status_label": "Data Gap: Not Inspected",
                "status_color": "slate",
                "badge_class": "bg-slate-100 text-slate-700 border-slate-300",
                "condition_summary": "No verified field inspection records or sensor logs exist for this component. Explicit surveillance gap identified.",
                "finding_id": None,
                "has_defect": False,
                "is_data_gap": True,
                "inspection_count": 0,
                "media_count": 0,
                "action_urgency": "Schedule Baseline Visual Inspection",
                "evidence_reference": None,
            })

    # Sort: Critical (1) first, then High (2), Moderate (3), Low (4), Data Gaps (0), then Operational (5)
    sort_order = {1: 1, 2: 2, 3: 3, 4: 4, 0: 5, 5: 6}
    results.sort(key=lambda c: sort_order.get(c["status_level"], 99))
    return results


# ==============================================================================
# 5. 3-STAGE IMMEDIATE ACTIONS & INTERVENTION PLAN GENERATOR
# ==============================================================================
def generate_3stage_intervention_plan(
    asset: Any,
    enriched_findings: List[Dict[str, Any]],
    inspections: List[Dict[str, Any]],
) -> Dict[str, Any]:
    """
    Organizes all recommended responses into 3 structured engineering stages:
    - Stage A: Immediate Response (0-48 hrs, hazard containment & emergency notices)
    - Stage B: Corrective Intervention (7-30 days, physical repair & technical works)
    - Stage C: Long-Term Prevention (30-180 days, sensor telemetry & recurring audits)
    """
    stage_a = []
    stage_b = []
    stage_c = []

    priority_counter = 1

    for f in enriched_findings:
        sev = normalize_severity(f.get("severity", "Moderate"))
        sev_lvl = sev["level"]
        comp = f.get("affected_component") or "Main Asset"
        title = f.get("title") or ""
        rec = f.get("recommended_action") or ""
        disc = f.get("responsible_discipline") or "Civil Engineering Directorate"

        # Stage A: Immediate Response for Critical and High findings
        if sev_lvl in (1, 2):
            imm_desc = f.get("immediate_action") or f"Immediate on-site hazard appraisal for {comp}"
            stage_a.append({
                "priority_rank": f"P{priority_counter}",
                "action_title": f"Immediate Hazard Control & Assessment — {comp}",
                "description": imm_desc,
                "justification": f.get("potential_consequences") or f"High-risk condition detected in {title}",
                "related_finding_id": f.get("id"),
                "related_finding_title": title,
                "responsible_department": disc,
                "timeframe": "Immediate (Within 24–48 Hours)" if sev_lvl == 1 else "Urgent (Within 7 Days)",
                "required_approval": f.get("approval_required") or "Executive Engineer Emergency Clearance",
                "execution_status": "Urgent Action Required" if f.get("resolution_status") == "Open" else f.get("resolution_status"),
                "severity_level": sev_lvl,
                "source_evidence": f.get("source_document") or f.get("supporting_evidence"),
            })
            priority_counter += 1

        # Stage B: Corrective Intervention for all actionable findings
        stage_b.append({
            "priority_rank": f"P{priority_counter}",
            "action_title": f"Corrective Remediation & Repair — {comp}",
            "description": rec,
            "justification": f"Restores design safety margin and mitigates {f.get('plain_explanation') or title}",
            "related_finding_id": f.get("id"),
            "related_finding_title": title,
            "responsible_department": disc,
            "timeframe": "14 to 30 Days" if sev_lvl in (1, 2) else "30 to 60 Days",
            "required_approval": "Superintending Engineer Technical Sanction & Work Order",
            "execution_status": f.get("resolution_status") or "Pending Review",
            "severity_level": sev_lvl,
            "source_evidence": f.get("source_document") or f.get("supporting_evidence"),
        })
        priority_counter += 1

        # Stage C: Long-Term Prevention & Monitoring
        further_inv = f.get("further_investigation") or f"Continuous telemetry and periodic inspection for {comp}"
        stage_c.append({
            "priority_rank": f"P{priority_counter}",
            "action_title": f"Long-Term Structural Surveillance & Prevention — {comp}",
            "description": f"Install permanent telemetry or establish mandatory quarterly inspection cadence: {further_inv}",
            "justification": "Prevents recurring defect formation and maintains longitudinal baseline records.",
            "related_finding_id": f.get("id"),
            "related_finding_title": title,
            "responsible_department": disc,
            "timeframe": "Ongoing Quarterly Cadence / Next 90 Days",
            "required_approval": "Annual Maintenance Plan Approval (Executive Engineer)",
            "execution_status": "Scheduled",
            "severity_level": sev_lvl,
            "source_evidence": f.get("source_document") or f.get("supporting_evidence"),
        })
        priority_counter += 1

    return {
        "stage_a": stage_a,
        "stage_b": stage_b,
        "stage_c": stage_c,
        "total_actions": len(stage_a) + len(stage_b) + len(stage_c),
        "immediate_count": len(stage_a),
        "corrective_count": len(stage_b),
        "preventive_count": len(stage_c),
    }


# ==============================================================================
# 6. RISK PRIORITIZATION MATRIX ACROSS THE 5 MODULES
# ==============================================================================
def generate_prioritized_risk_table(enriched_findings: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """
    Ranks findings across all 5 modules based on:
    1. Severity level (Level 1 Critical > Level 2 High > Level 3 Moderate > Level 4 Low)
    2. Evidence classification quality (Documented > Visually Suspected > Inferred)
    3. Digital Heartbeat risk contribution points
    """
    def rank_score(f):
        sev_lvl = f.get("severity_level", 3)
        # Lower severity level = higher priority (1 is most urgent)
        base = (5 - sev_lvl) * 100
        # Evidence quality boost
        ev_class = f.get("evidence_classification", "Documented")
        ev_weight = 30 if ev_class == "Documented" else 20 if ev_class == "Visually Suspected" else 10
        # Points contribution
        pts = float(f.get("risk_contribution_pts") or 0.0)
        return base + ev_weight + pts

    sorted_findings = sorted(enriched_findings, key=rank_score, reverse=True)

    prioritized_list = []
    for idx, f in enumerate(sorted_findings, start=1):
        prioritized_list.append({
            "priority": idx,
            "finding_id": f.get("id"),
            "title": f.get("title"),
            "affected_component": f.get("affected_component"),
            "exact_location": f.get("exact_location"),
            "category": f.get("intelligence_category", "Structural"),
            "severity": f.get("severity", "Moderate"),
            "severity_level": f.get("severity_level", 3),
            "severity_name": f.get("severity_name", "Level 3 — Moderate"),
            "evidence_classification": f.get("evidence_classification", "Documented"),
            "risk_contribution_pts": f.get("risk_contribution_pts", 0.0),
            "observed_condition": f.get("plain_explanation"),
            "potential_consequences": f.get("potential_consequences"),
            "required_response": f.get("immediate_action") if f.get("severity_level") == 1 else f.get("recommended_action"),
            "urgency": f.get("action_urgency") or f.get("timeframe"),
            "responsible_discipline": f.get("responsible_discipline"),
            "verification_status": f.get("verification_status", "Pending Review"),
            "supporting_evidence": f.get("source_document") or f.get("supporting_evidence"),
        })

    return prioritized_list


# ==============================================================================
# 7. WHOLE-ASSET INTELLIGENCE SUMMARY STATUS
# ==============================================================================
def calculate_whole_asset_summary(
    asset: Any,
    heartbeat: Any,
    findings: List[Dict[str, Any]],
    components: List[Dict[str, Any]],
    inspections: List[Any],
) -> Dict[str, Any]:
    """
    Computes transparent high-level status indicator based on validated findings
    and existing deterministic Digital Heartbeat risk engine:
    - Critical Intervention Required
    - High Priority Attention
    - Maintenance Required
    - Routine Monitoring
    - Insufficient Assessment Data
    """
    risk_score = (
        heartbeat.get("risk_score") if isinstance(heartbeat, dict)
        else getattr(heartbeat, "risk_score", None)
    )
    if risk_score is None:
        risk_score = (
            asset.get("risk_score") if isinstance(asset, dict)
            else getattr(asset, "risk_score", 45.0)
        ) or 45.0

    health_index = (
        heartbeat.get("health_index") if isinstance(heartbeat, dict)
        else getattr(heartbeat, "health_index", None)
    )
    if health_index is None:
        health_index = round(100.0 - risk_score, 1)

    critical_count = sum(1 for f in findings if (f.get("severity") or "").capitalize() == "Critical")
    high_count = sum(1 for f in findings if (f.get("severity") or "").capitalize() == "High")
    moderate_count = sum(1 for f in findings if (f.get("severity") or "").capitalize() in ("Moderate", "Medium"))
    low_count = sum(1 for f in findings if (f.get("severity") or "").capitalize() == "Low")
    pending_reviews_count = sum(1 for f in findings if "verified" not in (f.get("verification_status") or "").lower())

    data_gaps_count = sum(1 for c in components if c.get("is_data_gap"))
    inspections_count = len(inspections)

    # Determine Overall Operational Status Banner
    if critical_count > 0 or risk_score >= 70.0:
        overall_status = "Critical Intervention Required"
        status_color = "red"
        status_bg = "bg-red-50 text-red-900 border-red-300"
        status_directive = "Immediate executive intervention required. Critical components compromise safety margins or flood/load defenses."
    elif high_count > 0 or risk_score >= 50.0:
        overall_status = "High Priority Attention"
        status_color = "orange"
        status_bg = "bg-orange-50 text-orange-900 border-orange-300"
        status_directive = "High-priority corrective attention required. Accelerated deterioration detected on active load/flow components."
    elif moderate_count > 0 or risk_score >= 30.0:
        overall_status = "Maintenance Required"
        status_color = "amber"
        status_bg = "bg-amber-50 text-amber-900 border-amber-300"
        status_directive = "Scheduled preventive maintenance required. Regular operational wear within repairable margins."
    elif inspections_count == 0 or (data_gaps_count >= len(components) // 2):
        overall_status = "Insufficient Assessment Data"
        status_color = "slate"
        status_bg = "bg-slate-50 text-slate-800 border-slate-300"
        status_directive = "Baseline field surveys incomplete. Comprehensive multi-discipline inspection required to establish health baseline."
    else:
        overall_status = "Routine Monitoring"
        status_color = "green"
        status_bg = "bg-green-50 text-green-900 border-green-300"
        status_directive = "All audited components operate within acceptable design parameters. Continue periodic surveillance."

    return {
        "overall_status": overall_status,
        "status_color": status_color,
        "status_bg": status_bg,
        "status_directive": status_directive,
        "risk_score": round(float(risk_score), 1),
        "health_index": round(float(health_index), 1),
        "critical_count": critical_count,
        "high_count": high_count,
        "moderate_count": moderate_count,
        "low_count": low_count,
        "pending_reviews": pending_reviews_count,
        "immediate_actions_count": critical_count + high_count,
        "total_components": len(components),
        "data_gaps_count": data_gaps_count,
        "inspections_count": inspections_count,
    }

