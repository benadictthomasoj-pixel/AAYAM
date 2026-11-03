/**
 * AAYAM Infrastructure Intelligence — Client-Side Component Intelligence & Decision Engine
 * Mirrors the backend component taxonomy, multi-level severity classification,
 * consequence risk scenarios, and 3-stage intervention plan generator.
 */

export const CATEGORY_COMPONENT_TAXONOMY = {
  Bridge: [
    { name: 'Pier 4 Footing & Pile Cap', discipline: 'Geotechnical & Hydraulic Engineering', subsystem: 'Substructure' },
    { name: 'Piers & Columns', discipline: 'Structural Bridge Engineering', subsystem: 'Substructure' },
    { name: 'Expansion Joint EJ-4', discipline: 'Highway & Bridge Maintenance', subsystem: 'Deck Joints' },
    { name: 'Beams & Pre-stressed Girders', discipline: 'Structural Bridge Engineering', subsystem: 'Superstructure' },
    { name: 'Deck Slab & Wearing Course', discipline: 'Structural Bridge Engineering', subsystem: 'Superstructure' },
    { name: 'Bearing Assemblies & Sole Plates', discipline: 'Mechanical & Structural Maintenance', subsystem: 'Bearings' },
    { name: 'Abutments & Wingwalls', discipline: 'Geotechnical Engineering', subsystem: 'Substructure' },
    { name: 'Deck Drainage & Scuppers', discipline: 'Hydraulic Maintenance', subsystem: 'Drainage' },
    { name: 'Parapet Crash Barriers & Railings', discipline: 'Safety & Traffic Engineering', subsystem: 'Safety Infrastructure' },
    { name: 'Approach Slabs & Transitions', discipline: 'Highway Engineering', subsystem: 'Substructure' },
  ],
  Dam: [
    { name: 'Main Dam Body / Embankment', discipline: 'Dam Safety & Civil Engineering', subsystem: 'Primary Retention' },
    { name: 'Foundation & Cutoff Curtain', discipline: 'Geotechnical & Dam Safety', subsystem: 'Substructure' },
    { name: 'Spillway Chute & Crest', discipline: 'Hydraulic Engineering', subsystem: 'Discharge Control' },
    { name: 'Radial / Sluice Gates & Hoists', discipline: 'Hydromechanical Engineering', subsystem: 'Gating System' },
    { name: 'Drainage & Inspection Galleries', discipline: 'Dam Safety Surveillance', subsystem: 'Seepage Control' },
    { name: 'Reservoir Interface & Upstream Silt Trap', discipline: 'Hydrology & Sedimentology', subsystem: 'Reservoir' },
    { name: 'Piezometers & Seismic Instruments', discipline: 'Instrumentation & Monitoring', subsystem: 'Telemetry' },
    { name: 'Stilling Basin & Energy Dissipator', discipline: 'Hydraulic Engineering', subsystem: 'Downstream Defense' },
  ],
  'Drainage / Outfall': [
    { name: 'Tidal Sluice Flap Gate #2 Trunnion Pin', discipline: 'Hydromechanical & Marine Engineering', subsystem: 'Tidal Barrier' },
    { name: 'Intake Chamber & Silt Basin', discipline: 'Municipal Stormwater Engineering', subsystem: 'Intake' },
    { name: 'Culvert Barrels & Outfall Conduits', discipline: 'Civil Drainage Engineering', subsystem: 'Conveyance' },
    { name: 'Retaining Bunds & Riprap Embankments', discipline: 'Geotechnical Engineering', subsystem: 'Flood Defense' },
    { name: 'Hydraulic Winch & Hoisting Mechanism', discipline: 'Mechanical Maintenance', subsystem: 'Operability' },
    { name: 'Approach & Discharge Channels', discipline: 'Dredging & River Engineering', subsystem: 'Channel' },
  ],
  'Water Infrastructure': [
    { name: 'Raw Water Intake Structures & Screens', discipline: 'Civil & Hydraulic Engineering', subsystem: 'Intake' },
    { name: 'Raw Water High-Lift Pump Train #3', discipline: 'Mechanical & Rotating Equipment', subsystem: 'Pumping Train' },
    { name: 'Pump Motor #3 Drive Assembly & Bearings', discipline: 'Electrical Engineering', subsystem: 'Drive Units' },
    { name: 'Transmission Pipelines & Non-Return Valves', discipline: 'Pipeline Engineering', subsystem: 'Distribution' },
    { name: 'Clarifier Sludge Scrapers & Turntables', discipline: 'Process & Mechanical Engineering', subsystem: 'Treatment Units' },
    { name: 'Filtration Media & Backwash Siphon', discipline: 'Water Treatment Process Engineering', subsystem: 'Filtration' },
    { name: 'Clear Water Storage Reservoir (CWR)', discipline: 'Structural & Public Health Engineering', subsystem: 'Storage' },
    { name: 'SCADA, MCC Panels & Power Distribution', discipline: 'Instrumentation & Control', subsystem: 'Electrical / SCADA' },
  ],
  'Road / Highway': [
    { name: 'Bituminous Pavement & Wearing Course', discipline: 'Highway Engineering', subsystem: 'Pavement' },
    { name: 'Subgrade & Granular Sub-base', discipline: 'Geotechnical Engineering', subsystem: 'Pavement Substructure' },
    { name: 'Cross-Drainage Culvert Box Barrel', discipline: 'Hydraulic & Drainage Engineering', subsystem: 'Drainage' },
    { name: 'Lined Longitudinal Roadside Drains', discipline: 'Drainage Engineering', subsystem: 'Drainage' },
    { name: 'Reinforced Earth Retaining Walls & Slopes', discipline: 'Geotechnical Engineering', subsystem: 'Earth Retention' },
    { name: 'Metal Beam Crash Barriers (W-Beam)', discipline: 'Traffic Safety Engineering', subsystem: 'Safety Infrastructure' },
    { name: 'Unpaved / Earthen Shoulders', discipline: 'Highway Maintenance', subsystem: 'Roadway Shoulders' },
  ],
  Flyover: [
    { name: 'Pier P-12 Bearing Assembly', discipline: 'Structural Bridge Maintenance', subsystem: 'Bearings' },
    { name: 'Pier Columns & Pier Caps', discipline: 'Structural Engineering', subsystem: 'Substructure' },
    { name: 'Precast Prestressed Deck Girders', discipline: 'Structural Engineering', subsystem: 'Superstructure' },
    { name: 'Cast-in-situ Reinforced Concrete Deck', discipline: 'Structural Engineering', subsystem: 'Superstructure' },
    { name: 'Modular Expansion Joints', discipline: 'Highway & Bridge Maintenance', subsystem: 'Deck Joints' },
    { name: 'Parapet Crash Barriers & Lighting Masts', discipline: 'Safety & Traffic Engineering', subsystem: 'Safety' },
    { name: 'Down-pipe Stormwater Spouts', discipline: 'Hydraulic Maintenance', subsystem: 'Drainage' },
    { name: 'Ramp Approaches & Retaining Walls', discipline: 'Geotechnical & Highway Engineering', subsystem: 'Approaches' },
  ],
};

export const SEVERITY_LEVELS = {
  Critical: {
    level: 1,
    name: 'Level 1 — Critical',
    color: 'red',
    badgeClass: 'bg-red-100 text-red-800 border-red-300',
    barClass: 'bg-red-600',
    actionUrgency: 'Immediate Action Required (Within 24–48 Hours)',
    escalation: 'Escalate to Chief Engineer / Infrastructure Command',
  },
  High: {
    level: 2,
    name: 'Level 2 — High',
    color: 'orange',
    badgeClass: 'bg-orange-100 text-orange-800 border-orange-300',
    barClass: 'bg-orange-500',
    actionUrgency: 'Urgent Corrective Attention (Within 7–14 Days)',
    escalation: 'Escalate to Superintending Engineer for Intervention Sanction',
  },
  Moderate: {
    level: 3,
    name: 'Level 3 — Moderate',
    color: 'amber',
    badgeClass: 'bg-amber-100 text-amber-800 border-amber-300',
    barClass: 'bg-amber-500',
    actionUrgency: 'Scheduled Planned Maintenance (Within 30–60 Days)',
    escalation: 'Assign to Divisional Maintenance Engineer',
  },
  Low: {
    level: 4,
    name: 'Level 4 — Low',
    color: 'blue',
    badgeClass: 'bg-blue-100 text-blue-800 border-blue-300',
    barClass: 'bg-blue-500',
    actionUrgency: 'Routine Periodic Maintenance & Monitoring',
    escalation: 'Log in Regular Maintenance Registry',
  },
  Operational: {
    level: 5,
    name: 'Level 5 — Operational / No Known Issue',
    color: 'green',
    badgeClass: 'bg-green-100 text-green-800 border-green-300',
    barClass: 'bg-green-600',
    actionUrgency: 'Continue Routine Baseline Surveillance',
    escalation: 'Nominal Operational Status — No Escalation Required',
  },
};

export function getTaxonomyForCategory(category = '') {
  const cat = (category || '').toLowerCase();
  if (cat.includes('bridge')) return CATEGORY_COMPONENT_TAXONOMY.Bridge;
  if (cat.includes('dam')) return CATEGORY_COMPONENT_TAXONOMY.Dam;
  if (cat.includes('drain') || cat.includes('outfall') || cat.includes('sluice')) return CATEGORY_COMPONENT_TAXONOMY['Drainage / Outfall'];
  if (cat.includes('water') || cat.includes('wtp') || cat.includes('treatment') || cat.includes('canal') || cat.includes('lock')) return CATEGORY_COMPONENT_TAXONOMY['Water Infrastructure'];
  if (cat.includes('flyover') || cat.includes('skyway') || cat.includes('elevated')) return CATEGORY_COMPONENT_TAXONOMY.Flyover;
  if (cat.includes('road') || cat.includes('highway') || cat.includes('corridor') || cat.includes('culvert')) return CATEGORY_COMPONENT_TAXONOMY['Road / Highway'];
  return CATEGORY_COMPONENT_TAXONOMY.Bridge;
}

export function enrichFinding(f, assetCategory = '') {
  if (!f) return null;
  const item = { ...f };
  const rawSev = (item.severity || 'Moderate').trim();
  const sevKey = rawSev.toLowerCase() === 'critical' ? 'Critical'
    : rawSev.toLowerCase() === 'high' ? 'High'
    : (rawSev.toLowerCase() === 'moderate' || rawSev.toLowerCase() === 'medium') ? 'Moderate'
    : 'Low';
  const meta = SEVERITY_LEVELS[sevKey] || SEVERITY_LEVELS.Moderate;

  const comp = item.affected_component || 'Primary Structural Section';
  const title = item.title || '';
  const tech = item.technical_explanation || '';
  const plain = item.plain_explanation || '';

  // 1. Exact Location
  if (!item.exact_location) {
    if (/pier\s*4/i.test(comp) || /pier\s*4/i.test(title)) {
      item.exact_location = 'Pier P-04 Sub-surface Footing & Riverbed Interface (Chainage 1+420)';
    } else if (/pier\s*p-?12/i.test(comp) || /pier\s*p-?12/i.test(title)) {
      item.exact_location = 'Pier P-12 Pier Cap Bearing Seat (Ramp B Overpass)';
    } else if (/ej-?4|expansion joint/i.test(comp)) {
      item.exact_location = 'Expansion Joint Bay EJ-4 between Spans S-03 and S-04';
    } else if (/gate\s*#?2|flap/i.test(comp)) {
      item.exact_location = 'Tidal Sluice Outfall Cell #2 (Western Seawall Discharge Portal)';
    } else if (/gate\s*#?12|lock/i.test(comp)) {
      item.exact_location = 'Canal Lock Chamber Gate #12 (Navigation Headworks)';
    } else if (/pump\s*#?3|motor/i.test(comp)) {
      item.exact_location = 'Raw Water Intake Pumping Station — Pump Bay #3 Plinth';
    } else if (/culvert/i.test(comp)) {
      item.exact_location = 'Highway Cross-Drainage Culvert (Km 78+240, Mountain Embankment)';
    } else {
      item.exact_location = `Primary Inspection Section of ${comp}`;
    }
  }

  // 2. Multi-level Severity Level & Metadate
  item.severity_level = meta.level;
  item.severity_name = meta.name;
  item.action_urgency = meta.actionUrgency;
  item.badgeClass = meta.badgeClass;

  // 3. Potential Consequences (Explicit Risk Scenario)
  if (!item.potential_consequences) {
    if (meta.level === 1) {
      if (/scour/i.test(title) || /scour/i.test(comp)) {
        item.potential_consequences = 'Risk Scenario: Continuous bed erosion undermines pile cap skin friction, risking differential settlement, structural deflection of bridge spans S-03/S-04, emergency traffic closure, and catastrophic collapse during monsoon flood discharge.';
      } else if (/flap|gate|sluice/i.test(title) || /flap|gate|sluice/i.test(comp)) {
        item.potential_consequences = 'Risk Scenario: Inability of flap gate to seal during astronomical high tides enables seawater backflow into urban storm drains, causing widespread flooding in adjacent low-lying coastal neighborhoods and failure of city flood barrier.';
      } else {
        item.potential_consequences = 'Risk Scenario: Uncontrolled defect progression threatens public safety, severe capacity loss, and sudden failure of essential infrastructure functionality.';
      }
    } else if (meta.level === 2) {
      if (/vibration|pump|motor/i.test(title)) {
        item.potential_consequences = 'Risk Scenario: Sustained mechanical vibration above ISO limits accelerates fatigue in motor bearings and drive shaft, risking catastrophic mechanical seizure and unplanned shutdown of drinking water supply to 450,000 residents.';
      } else if (/bearing/i.test(comp) || /bearing/i.test(title)) {
        item.potential_consequences = 'Risk Scenario: Extruded neoprene bearing pad loses load-cushioning capacity, causing concrete spalling at pier cap, uneven girder load transfer, and mandatory transit lane restrictions.';
      } else if (/expansion|joint/i.test(comp)) {
        item.potential_consequences = 'Risk Scenario: Damaged seal allows continuous saline water and debris ingress onto pre-stressed tendons beneath the deck, triggering accelerated corrosion of steel reinforcement.';
      } else {
        item.potential_consequences = 'Risk Scenario: Accelerated structural deterioration, increased repair costs, and potential operational restrictions if not addressed.';
      }
    } else if (meta.level === 3) {
      item.potential_consequences = 'Risk Scenario: Silt sedimentation restricts hydraulic discharge capacity by >50%, creating upstream backwater ponding and potential road shoulder erosion during cloudburst events.';
    } else {
      item.potential_consequences = 'Risk Scenario: Minor wear without immediate structural risk; deferring routine maintenance may reduce service life over multi-year cycles.';
    }
  }

  // 4. Impact Chain
  if (!item.impact_chain) {
    item.impact_chain = {
      observed_problem: plain.length > 100 ? `${plain.slice(0, 100)}...` : plain,
      potential_impact: item.potential_consequences.replace('Risk Scenario: ', ''),
      consequence: `${meta.name} condition requiring ${meta.actionUrgency}`,
      required_action: item.recommended_action || 'Engineering intervention required',
    };
  }

  // 5. Immediate Action (Stage A)
  if (!item.immediate_action) {
    if (meta.level === 1) {
      if (/scour/i.test(title)) {
        item.immediate_action = '1. Enforce emergency 30 km/h speed threshold and single-lane axle restriction. 2. Dispatch specialized dive survey team to map cavity perimeter. 3. Mobilize emergency rip-rap boulder armor dumping under Section 12 Disaster Management protocols.';
      } else if (/flap|sluice/i.test(title)) {
        item.immediate_action = '1. Issue alert to Municipal Disaster Management Cell regarding tidal flood risk. 2. Mobilize commercial divers for high-pressure hydro-blasting of jammed trunnion pin. 3. Deploy mobile high-capacity dewatering pumps at approach channel.';
      } else {
        item.immediate_action = '1. Restrict public access to affected zone pending certified structural safety appraisal. 2. Issue urgent notification to Executive Engineer and Chief Engineer. 3. Implement temporary stabilizing or protective measures.';
      }
    } else if (meta.level === 2) {
      if (/vibration/i.test(title)) {
        item.immediate_action = '1. Switch primary load to standby pump train #2. 2. Perform continuous FFT vibration spectrum diagnostics. 3. Order dynamic rebalancing and replacement elastomeric spider coupling.';
      } else if (/bearing/i.test(comp)) {
        item.immediate_action = '1. Restrict multi-axle freight vehicles from outer flyover ramp. 2. Conduct dial-gauge deflection tests under controlled test loads. 3. Mobilize hydraulic jacking crew for bearing replacement.';
      } else {
        item.immediate_action = '1. Schedule detailed engineering assessment within 7 days. 2. Install crack-monitoring tell-tales or displacement sensors. 3. Prepare formal engineering remediation bill of quantities.';
      }
    } else {
      item.immediate_action = 'Log finding in regional asset register and verify maintenance work order with local maintenance division.';
    }
  }

  // 6. Recommended Further Investigation
  if (!item.further_investigation) {
    if (/scour/i.test(title)) {
      item.further_investigation = 'High-density multibeam acoustic bathymetry, seismic geophysical subsurface profiling, and core drilling of pier foundation bed.';
    } else if (/vibration/i.test(title)) {
      item.further_investigation = 'Tri-axial FFT vibration frequency analysis, laser alignment check, dynamic balancing, and acoustic emission bearing testing.';
    } else if (/gate|sluice/i.test(title)) {
      item.further_investigation = 'Ultrasonic flaw detection on trunnion hinge pin, non-destructive thickness testing of gate skin plates, and sediment core sampling.';
    } else if (/bearing/i.test(comp)) {
      item.further_investigation = 'Elastomer hardness Shore A durometer testing, laser leveling of pier cap pedestals, and hydraulic jack pressure audit.';
    } else {
      item.further_investigation = 'Comprehensive non-destructive testing (NDT), rebound hammer tests, and core sample petrographic examination.';
    }
  }

  // 7. Responsible Engineering Discipline
  if (!item.responsible_discipline) {
    if (/scour|marine|sluice/i.test(title) || /marine|sluice/i.test(comp)) {
      item.responsible_discipline = 'Marine & Coastal Hydraulic Engineering Wing, State PWD';
    } else if (/pump|vibration|motor/i.test(title) || /pump|motor/i.test(comp)) {
      item.responsible_discipline = 'Electromechanical & Rotating Machinery Directorate';
    } else if (/joint|bearing|pier/i.test(comp) || /bridge/i.test(assetCategory)) {
      item.responsible_discipline = 'Structural Bridge Design & Maintenance Division';
    } else if (/drain|culvert/i.test(comp)) {
      item.responsible_discipline = 'Highway Drainage & Stormwater Management Cell';
    } else {
      item.responsible_discipline = 'Civil Infrastructure Maintenance Wing';
    }
  }

  // 8. Timeframe & Approval
  if (!item.timeframe) {
    item.timeframe = meta.level === 1 ? 'Within 24–48 Hours'
      : meta.level === 2 ? 'Within 7–14 Days'
      : meta.level === 3 ? 'Within 30–60 Days'
      : 'Routine Scheduled Window';
  }

  if (!item.approval_required) {
    item.approval_required = meta.level === 1 ? 'Chief Engineer Emergency Sanction & Secretary Approval'
      : meta.level === 2 ? 'Superintending Engineer Technical Sanction'
      : 'Executive Engineer Maintenance Work Order';
  }

  // 9. Risk Contribution Points
  if (!item.risk_contribution_pts) {
    item.risk_contribution_pts = meta.level === 1 ? 28.5 : meta.level === 2 ? 16.0 : meta.level === 3 ? 8.5 : 2.0;
  }

  return item;
}

export function buildComponentInventory(asset, findings = [], inspections = [], media = []) {
  const category = asset?.category || 'Bridge';
  const taxonomy = getTaxonomyForCategory(category);

  return taxonomy.map((compDef) => {
    const compName = compDef.name;
    const tokens = compName.toLowerCase().split(/\W+/).filter((t) => t.length > 3);

    // Matching findings
    const matchingFindings = findings.filter((f) => {
      const fComp = (f.affected_component || '').toLowerCase();
      const fTitle = (f.title || '').toLowerCase();
      return tokens.some((t) => fComp.includes(t) || fTitle.includes(t));
    });

    // Matching inspections
    const matchingInspections = inspections.filter((insp) => {
      const text = (insp.findings || '').toLowerCase();
      return tokens.some((t) => text.includes(t));
    });

    if (matchingFindings.length > 0) {
      let topFinding = matchingFindings[0];
      let bestLevel = 5;
      matchingFindings.forEach((f) => {
        const sev = (f.severity || '').toLowerCase();
        const lvl = sev === 'critical' ? 1 : sev === 'high' ? 2 : (sev === 'moderate' || sev === 'medium') ? 3 : 4;
        if (lvl < bestLevel) {
          bestLevel = lvl;
          topFinding = f;
        }
      });

      const sevMeta = bestLevel === 1 ? SEVERITY_LEVELS.Critical
        : bestLevel === 2 ? SEVERITY_LEVELS.High
        : bestLevel === 3 ? SEVERITY_LEVELS.Moderate
        : SEVERITY_LEVELS.Low;

      return {
        component_name: compName,
        subsystem: compDef.subsystem,
        discipline: compDef.discipline,
        status_level: bestLevel,
        status_label: sevMeta.name,
        status_color: sevMeta.color,
        badge_class: sevMeta.badgeClass,
        condition_summary: topFinding.plain_explanation || topFinding.title,
        finding_id: topFinding.id,
        has_defect: true,
        is_data_gap: false,
        action_urgency: sevMeta.actionUrgency,
        evidence_reference: topFinding.source_document || topFinding.supporting_evidence,
      };
    }

    if (matchingInspections.length > 0) {
      return {
        component_name: compName,
        subsystem: compDef.subsystem,
        discipline: compDef.discipline,
        status_level: 5,
        status_label: 'Level 5 — Inspected: No Known Issue',
        status_color: 'green',
        badge_class: SEVERITY_LEVELS.Operational.badgeClass,
        condition_summary: `Evaluated during ${matchingInspections.length} official inspection audit(s). All parameters within standard operational thresholds.`,
        finding_id: null,
        has_defect: false,
        is_data_gap: false,
        action_urgency: 'Continue Scheduled Monitoring',
        evidence_reference: matchingInspections[0].evidence_references || null,
      };
    }

    return {
      component_name: compName,
      subsystem: compDef.subsystem,
      discipline: compDef.discipline,
      status_level: 0,
      status_label: 'Data Gap: Not Inspected',
      status_color: 'slate',
      badge_class: 'bg-slate-100 text-slate-700 border-slate-300',
      condition_summary: 'No verified field inspection records or sensor logs exist for this component. Explicit surveillance gap identified.',
      finding_id: null,
      has_defect: false,
      is_data_gap: true,
      action_urgency: 'Schedule Baseline Visual Inspection',
      evidence_reference: null,
    };
  }).sort((a, b) => {
    const order = { 1: 1, 2: 2, 3: 3, 4: 4, 0: 5, 5: 6 };
    return (order[a.status_level] || 99) - (order[b.status_level] || 99);
  });
}

export function build3StageInterventionPlan(asset, enrichedFindings = []) {
  const stageA = [];
  const stageB = [];
  const stageC = [];

  let p = 1;
  enrichedFindings.forEach((f) => {
    const lvl = f.severity_level || 3;
    const comp = f.affected_component || 'Main Asset';
    const disc = f.responsible_discipline || 'Civil Infrastructure Wing';

    if (lvl === 1 || lvl === 2) {
      stageA.push({
        priority_rank: `P${p++}`,
        action_title: `Immediate Hazard Control & Assessment — ${comp}`,
        description: f.immediate_action || `Emergency field appraisal for ${comp}`,
        justification: f.potential_consequences || `High-risk condition observed in ${f.title}`,
        related_finding_id: f.id,
        related_finding_title: f.title,
        responsible_department: disc,
        timeframe: lvl === 1 ? 'Immediate (Within 24–48 Hours)' : 'Urgent (Within 7 Days)',
        required_approval: f.approval_required || 'Chief Engineer Emergency Clearance',
        execution_status: f.resolution_status === 'Open' ? 'Urgent Action Required' : f.resolution_status,
        severity_level: lvl,
        source_evidence: f.source_document || f.supporting_evidence,
      });
    }

    stageB.push({
      priority_rank: `P${p++}`,
      action_title: `Corrective Remediation & Repair — ${comp}`,
      description: f.recommended_action || 'Technical corrective engineering works',
      justification: `Restores design safety margin and remediates ${f.plain_explanation || f.title}`,
      related_finding_id: f.id,
      related_finding_title: f.title,
      responsible_department: disc,
      timeframe: lvl <= 2 ? '14 to 30 Days' : '30 to 60 Days',
      required_approval: 'Superintending Engineer Technical Sanction & Work Order',
      execution_status: f.resolution_status || 'Pending Review',
      severity_level: lvl,
      source_evidence: f.source_document || f.supporting_evidence,
    });

    stageC.push({
      priority_rank: `P${p++}`,
      action_title: `Long-Term Structural Surveillance & Prevention — ${comp}`,
      description: `Install permanent telemetry or establish mandatory quarterly inspection cadence: ${f.further_investigation || 'Continuous monitoring'}`,
      justification: 'Prevents recurring defect formation and maintains longitudinal baseline records.',
      related_finding_id: f.id,
      related_finding_title: f.title,
      responsible_department: disc,
      timeframe: 'Ongoing Quarterly Cadence / Next 90 Days',
      required_approval: 'Annual Maintenance Plan Approval (Executive Engineer)',
      execution_status: 'Scheduled',
      severity_level: lvl,
      source_evidence: f.source_document || f.supporting_evidence,
    });
  });

  return {
    stage_a: stageA,
    stage_b: stageB,
    stage_c: stageC,
    total_actions: stageA.length + stageB.length + stageC.length,
    immediate_count: stageA.length,
    corrective_count: stageB.length,
    preventive_count: stageC.length,
  };
}

export function buildPrioritizedRiskTable(enrichedFindings = []) {
  const ranked = [...enrichedFindings].sort((a, b) => {
    const aLvl = a.severity_level || 3;
    const bLvl = b.severity_level || 3;
    if (aLvl !== bLvl) return aLvl - bLvl;
    return (b.risk_contribution_pts || 0) - (a.risk_contribution_pts || 0);
  });

  return ranked.map((f, idx) => ({
    priority: idx + 1,
    finding_id: f.id,
    title: f.title,
    affected_component: f.affected_component,
    exact_location: f.exact_location,
    category: f.intelligence_category || 'Structural',
    severity: f.severity || 'Moderate',
    severity_level: f.severity_level || 3,
    severity_name: f.severity_name || 'Level 3 — Moderate',
    evidence_classification: f.evidence_classification || 'Documented',
    risk_contribution_pts: f.risk_contribution_pts || 0.0,
    observed_condition: f.plain_explanation,
    potential_consequences: f.potential_consequences,
    required_response: f.severity_level === 1 ? f.immediate_action : f.recommended_action,
    urgency: f.action_urgency || f.timeframe,
    responsible_discipline: f.responsible_discipline,
    verification_status: f.verification_status || 'Pending Review',
    supporting_evidence: f.source_document || f.supporting_evidence,
  }));
}

export function computeWholeAssetSummary(asset, heartbeat, findings = [], components = [], inspections = []) {
  const riskScore = Number(heartbeat?.risk_score ?? asset?.risk_score ?? 45.0);
  const healthIndex = Number(heartbeat?.health_index ?? (100 - riskScore));

  const criticalCount = findings.filter((f) => (f.severity || '').toLowerCase() === 'critical').length;
  const highCount = findings.filter((f) => (f.severity || '').toLowerCase() === 'high').length;
  const moderateCount = findings.filter((f) => ['moderate', 'medium'].includes((f.severity || '').toLowerCase())).length;
  const lowCount = findings.filter((f) => (f.severity || '').toLowerCase() === 'low').length;
  const pendingReviews = findings.filter((f) => !(f.verification_status || '').toLowerCase().includes('verified')).length;
  const dataGapsCount = components.filter((c) => c.is_data_gap).length;

  let overallStatus = 'Routine Monitoring';
  let statusColor = 'green';
  let statusBg = 'bg-green-50 text-green-900 border-green-300';
  let statusDirective = 'All audited components operate within acceptable design parameters. Continue periodic surveillance.';

  if (criticalCount > 0 || riskScore >= 70.0) {
    overallStatus = 'Critical Intervention Required';
    statusColor = 'red';
    statusBg = 'bg-red-50 text-red-900 border-red-300';
    statusDirective = 'Immediate executive intervention required. Critical components compromise safety margins or flood/load defenses.';
  } else if (highCount > 0 || riskScore >= 50.0) {
    overallStatus = 'High Priority Attention';
    statusColor = 'orange';
    statusBg = 'bg-orange-50 text-orange-900 border-orange-300';
    statusDirective = 'High-priority corrective attention required. Accelerated deterioration detected on active load/flow components.';
  } else if (moderateCount > 0 || riskScore >= 30.0) {
    overallStatus = 'Maintenance Required';
    statusColor = 'amber';
    statusBg = 'bg-amber-50 text-amber-900 border-amber-300';
    statusDirective = 'Scheduled preventive maintenance required. Regular operational wear within repairable margins.';
  } else if (inspections.length === 0 || dataGapsCount >= Math.floor(components.length / 2)) {
    overallStatus = 'Insufficient Assessment Data';
    statusColor = 'slate';
    statusBg = 'bg-slate-50 text-slate-800 border-slate-300';
    statusDirective = 'Baseline field surveys incomplete. Comprehensive multi-discipline inspection required to establish health baseline.';
  }

  return {
    overall_status: overallStatus,
    status_color: statusColor,
    status_bg: statusBg,
    status_directive: statusDirective,
    risk_score: Number(riskScore.toFixed(1)),
    health_index: Number(healthIndex.toFixed(1)),
    critical_count: criticalCount,
    high_count: highCount,
    moderate_count: moderateCount,
    low_count: lowCount,
    pending_reviews: pendingReviews,
    immediate_actions_count: criticalCount + highCount,
    total_components: components.length,
    data_gaps_count: dataGapsCount,
    inspections_count: inspections.length,
  };
}

