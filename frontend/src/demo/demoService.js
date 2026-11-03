/**
 * AAYAM Infrastructure Intelligence — Demo Service Layer
 *
 * ARCHITECTURAL ISOLATION GUARANTEES:
 * 1. Independent of the authenticated application flow.
 * 2. Strictly in-memory and read-only: NEVER calls fetch, axios, or any network client.
 * 3. Never reads, sets, or tampers with sessionStorage, localStorage, or JWT bearer tokens.
 * 4. All returned objects are deep-cloned before return to prevent mutation of shared fixtures.
 * 5. All mutating operations (asset creation, inspection submission, verification) throw DemoIsolationError
 *    to prevent accidental writes or reliance on UI button hiding alone.
 */

import {
  DEMO_ASSETS,
  DEMO_CATEGORIES,
  DEMO_STATS,
  DEMO_HEARTBEATS,
  DEMO_INSPECTIONS,
  DEMO_TIMELINES,
  DEMO_COPILOT_QUESTIONS,
  DEMO_COPILOT_RESPONSES,
  DEMO_SOURCE_DOCUMENTS,
  DEMO_DISCLAIMER,
  DEMO_MEDIA,
  DEMO_SOURCES,
  DEMO_FINDINGS,
} from './demoData';
import {
  enrichFinding,
  buildComponentInventory,
  build3StageInterventionPlan,
  buildPrioritizedRiskTable,
  computeWholeAssetSummary,
} from '../utils/componentIntelligence';

/**
 * Custom error thrown when any state mutation is attempted while in Demo Mode.
 */
export class DemoIsolationError extends Error {
  constructor(actionName = 'perform mutation') {
    super(
      `Demo Mode Protection: Cannot ${actionName}. Infrastructure mutations and records creation are disabled in simulated Demo Mode to protect database integrity.`
    );
    this.name = 'DemoIsolationError';
    this.status = 403;
    this.isDemoError = true;
  }
}

/**
 * Safely deep-clone an object or array to prevent caller mutation of shared fixtures.
 */
function clone(data) {
  if (data === undefined || data === null) return data;
  if (typeof structuredClone === 'function') {
    try {
      return structuredClone(data);
    } catch {
      // Fallback for environments where structuredClone may fail on specific prototypes
      return JSON.parse(JSON.stringify(data));
    }
  }
  return JSON.parse(JSON.stringify(data));
}

// ==============================================================================
// READ-ONLY GETTERS (PURE IN-MEMORY, ZERO NETWORK CALLS)
// ==============================================================================

/**
 * Get list of demo assets with optional client-side filtering.
 * Mimics GET /api/assets
 *
 * @param {Object} [params] - { category, status, district, search }
 * @returns {Promise<{ total: number, count: number, items: Array, categories: Array, disclaimer: string }>}
 */
export async function getDemoAssets(params = {}) {
  let items = [...DEMO_ASSETS];

  if (params.category && params.category !== 'All') {
    items = items.filter(
      (a) => a.category.toLowerCase() === params.category.toLowerCase()
    );
  }

  if (params.status && params.status !== 'All') {
    items = items.filter(
      (a) => a.status.toLowerCase() === params.status.toLowerCase()
    );
  }

  if (params.district) {
    items = items.filter((a) =>
      a.district.toLowerCase().includes(params.district.toLowerCase())
    );
  }

  if (params.search) {
    const q = params.search.toLowerCase().trim();
    items = items.filter(
      (a) =>
        a.name.toLowerCase().includes(q) ||
        a.id.toLowerCase().includes(q) ||
        a.district.toLowerCase().includes(q) ||
        a.category.toLowerCase().includes(q) ||
        (a.description && a.description.toLowerCase().includes(q)) ||
        (Array.isArray(a.flagged_reasons) &&
          a.flagged_reasons.some((r) => r.toLowerCase().includes(q)))
    );
  }

  return clone({
    total: DEMO_ASSETS.length,
    count: items.length,
    items,
    categories: DEMO_CATEGORIES,
    disclaimer: DEMO_DISCLAIMER,
  });
}

/**
 * Fetch single demo asset by ID.
 * Mimics GET /api/assets/:assetId
 *
 * @param {string} assetId
 * @returns {Promise<Object>}
 */
export async function getDemoAssetById(assetId) {
  if (!assetId) {
    throw new Error('Asset ID is required.');
  }

  const asset = DEMO_ASSETS.find((a) => a.id === assetId);
  if (!asset) {
    const err = new Error(`Demo Asset '${assetId}' not found in simulated registry.`);
    err.status = 404;
    throw err;
  }

  return clone(asset);
}

/**
 * Fetch demo asset summary statistics.
 * Mimics GET /api/assets/stats/summary
 *
 * @returns {Promise<Object>}
 */
export async function getDemoAssetStats() {
  return clone(DEMO_STATS);
}

/**
 * Fetch available demo categories.
 *
 * @returns {Promise<Array<string>>}
 */
export async function getDemoAssetCategories() {
  return clone(DEMO_CATEGORIES);
}

/**
 * Fetch Digital Heartbeat telemetry for a demo asset.
 * Mimics GET /api/assets/:assetId/heartbeat
 *
 * @param {string} assetId
 * @returns {Promise<Object>}
 */
export async function getDemoHeartbeat(assetId) {
  if (!assetId) {
    throw new Error('Asset ID is required.');
  }

  const heartbeat = DEMO_HEARTBEATS[assetId];
  if (!heartbeat) {
    // Return fallback synthesized heartbeat for unknown demo asset
    return clone({
      asset_id: assetId,
      asset_name: `Simulated Asset ${assetId}`,
      category: 'Infrastructure',
      district: 'Simulated District',
      state: 'Demo State',
      risk_score: 25.0,
      risk_tier: 'Low',
      health_index: 80.0,
      last_inspection_date: '2024-01-01',
      days_since_inspection: 90,
      data_confidence_score: 85.0,
      data_completeness: { verified_fields: ['Telemetry'], missing_fields: [] },
      contributing_factors: [],
      supporting_inspections_count: 0,
      has_verified_intervention: false,
      calculation_timestamp: new Date().toISOString(),
      suggested_investigations: [],
    });
  }

  return clone(heartbeat);
}

/**
 * Fetch historical inspection records for a demo asset.
 * Mimics GET /api/assets/:assetId/inspections
 *
 * @param {string} assetId
 * @returns {Promise<Array<Object>>}
 */
export async function getDemoInspections(assetId) {
  if (!assetId) {
    throw new Error('Asset ID is required.');
  }

  const list = DEMO_INSPECTIONS[assetId] || [];
  return clone(list);
}

/**
 * Fetch chronological lifecycle timeline events for a demo asset.
 * Mimics GET /api/assets/:assetId/timeline
 *
 * @param {string} assetId
 * @returns {Promise<Array<Object>>}
 */
export async function getDemoTimeline(assetId) {
  if (!assetId) {
    throw new Error('Asset ID is required.');
  }

  const list = DEMO_TIMELINES[assetId] || [];
  return clone(list);
}

/**
 * Get the list of curated interactive starter questions for Copilot Demo exploration.
 *
 * @returns {Promise<Array<Object>>}
 */
export async function getDemoQuestions() {
  return clone(DEMO_COPILOT_QUESTIONS);
}

/**
 * Query the simulated AI Decision Copilot.
 * Returns deterministic grounded demo answers with interactive citations.
 * Mimics POST /api/copilot/ask
 *
 * @param {string} question - Inquiry text
 * @param {Object} [options] - { asset_id, category }
 * @returns {Promise<Object>}
 */
export async function askDemoCopilot(question, options = {}) {
  if (!question || !question.trim()) {
    throw new Error('Please enter a question before submitting.');
  }

  const normalized = question.trim().toLowerCase();
  const isTamil = /[\u0B80-\u0BFF]/.test(question);
  const isHindi = /[\u0900-\u097F]/.test(question);

  // 1. Multilingual matching for Mandovi Bridge
  const isMandovi =
    normalized.includes('mandovi') ||
    normalized.includes('scour') ||
    normalized.includes('bridge') ||
    normalized.includes('மண்டோவி') ||
    normalized.includes('ஆபத்து') ||
    normalized.includes('मंडोवी') ||
    normalized.includes('पुल') ||
    options.asset_id === 'DEMO-BRG-001';

  // 2. Multilingual matching for Chambal WTP
  const isChambal =
    normalized.includes('chambal') ||
    normalized.includes('water') ||
    normalized.includes('wtp') ||
    normalized.includes('pump') ||
    normalized.includes('சம்பல்') ||
    normalized.includes('அதிர்வு') ||
    normalized.includes('चंबल') ||
    normalized.includes('कंपन') ||
    options.asset_id === 'DEMO-WTP-002';

  // 3. Multilingual matching for Kazhakootam Skyway
  const isKazhakootam =
    normalized.includes('kazhakootam') ||
    normalized.includes('skyway') ||
    normalized.includes('highway') ||
    normalized.includes('bearing') ||
    normalized.includes('கழக்கூட்டம்') ||
    normalized.includes('कझाकूट्टम') ||
    options.asset_id === 'DEMO-HWY-003';

  if (isMandovi) {
    const res = clone(DEMO_COPILOT_RESPONSES['DEMO-Q-001']);
    res.question = question.trim();
    if (isTamil) {
      res.answer = `#### நிர்வாக கட்டமைப்பு சுருக்கம்
**மாண்டோவி முகத்துவார நினைவு பாலம் (மாதிரி ஆய்வு)** தற்போது **கவனத்திற்குரிய தீவிர நிலை (Critical Attention)** என வகைப்படுத்தப்பட்டுள்ளது. இதன் AI ஆபத்து மதிப்பீடு **86.5 / 100** மற்றும் கட்டமைப்பு நலக் குறியீடு **32.0 / 100** ஆகும்.

#### முதன்மை ஆபத்துக் கண்டுபிடிப்பு: தூண் அடித்தள அரிப்பு
மல்டி-பீம் பாத்திமெட்ரி சோனார் ஆய்வில் **தூண் P-04** சுற்றளவில் கடுமையான நீரடி அரிப்பு கண்டறியப்பட்டது [Ref 1]. அடிமட்ட வண்டல் அரிப்பு **-4.20 மீட்டரை** எட்டியுள்ளது, இது அடித்தள கிணற்றை நேரடியாக வெளிப்படுத்துகிறது மற்றும் IS 14593 பிரிவு 7-ல் குறிப்பிடப்பட்டுள்ள பாதுகாப்பு வரம்பை மீறுகிறது [Ref 1].

#### பரிந்துரைக்கப்படும் பொறியியல் தலையீடுகள்
1. **ரிப்-ராப் பாறை பாதுகாப்பு (Riprap Armor Pitching)**: தூண் P-04 சுற்றளவில் அதிக அடர்த்தி கொண்ட ஜியோடெக்ஸ்டைல் மற்றும் கனரக பாறை அமைப்புகளை உடனடியாக நிறுவ வேண்டும் [Ref 2].
2. **போக்குவரத்து கட்டுப்பாடுகள் (Traffic Restrictions)**: சுழற்சி அழுத்தங்களைக் குறைக்க செயலில் உள்ள 20 கி.மீ/மணி வேகக் கட்டுப்பாடு மற்றும் அச்சு எடை கண்காணிப்பைத் தொடரவும் [Ref 2].
3. **தொடர் அரிப்பு கண்காணிப்பு**: பருவமழை உயர் அலைகளில் படுக்கை மாற்றங்களைக் கண்காணிக்க தொடர் ஒலி உணரிகளைப் பயன்படுத்தவும்.`;
      res.observed_facts = [
        'தற்போதைய நிலை: தீவிர கவனம் (ஆபத்து மதிப்பீடு: 86.5, நலக் குறியீடு: 32.0).',
        'சோனார் ஆய்வில் தூண் P-04 சுற்றளவில் -4.2 மீ படுகை மட்ட அரிப்பு பதிவானது.',
        'IS 14593 பிரிவு 7 அனுமதிக்கப்பட்ட அடித்தள வரம்பை மீறுகிறது.',
        'செயலில் உள்ள தலையீடு: வெளிப்புற இடைவெளிகளில் 20 கி.மீ/மணி வேகக் கட்டுப்பாடு அமலில் உள்ளது.',
      ];
      res.recommendations = [
        'தூண் P-04 சுற்றளவில் அவசர கனரக ரிப்-ராப் பாறை அமைப்பை நிறுவவும்.',
        'நிகழ்நேர மீயொலி அரிப்பு ஆழ டிரான்ஸ்பாண்டர்களைப் பயன்படுத்தவும்.',
        'ரிப்-ராப் அமைக்கப்பட்ட 30 நாட்களுக்குள் பின்தொடர் சோனார் ஸ்கேன் திட்டமிடவும்.',
      ];
    } else if (isHindi) {
      res.answer = `#### कार्यकारी संरचनात्मक सारांश
**मंडोवी एस्टुअरी मेमोरियल ब्रिज (डेमो नमूना)** वर्तमान में **गंभीर ध्यान (Critical Attention)** स्थिति के तहत वर्गीकृत है, जिसका जोखिम स्कोर **86.5 / 100** और स्वास्थ्य सूचकांक **32.0 / 100** है।

#### प्राथमिक जोखिम खोज: पियर नींव कटाव
बाथिमेट्रिक मल्टीबीम सोनार प्रोफाइलिंग ने **पियर P-04** के चारों ओर गंभीर पानी के नीचे कटाव की पहचान की है [Ref 1]। तलछट निकासी संदर्भ स्तर से **-4.20 मीटर** नीचे पहुंच गई है, जो IS 14593 खंड 7 में निर्दिष्ट स्वीकार्य सीमा से अधिक है [Ref 1]।

#### अनुशंसित इंजीनियरिंग हस्तक्षेप
1. **रिप्रैप बोल्डर पिचिंग**: पियर P-04 के चारों ओर भारी पत्थर का कवच तैनात करें [Ref 2]।
2. **यातायात प्रतिबंध**: सक्रिय 20 किमी/घंटा गति प्रतिबंध बनाए रखें [Ref 2]।
3. **निरंतर कटाव निगरानी**: ज्वारीय चक्रों के माध्यम से तल परिवर्तन को ट्रैक करने के लिए ध्वनिक सेंसर तैनात करें।`;
    }
    return res;
  }

  if (isChambal) {
    const res = clone(DEMO_COPILOT_RESPONSES['DEMO-Q-002']);
    res.question = question.trim();
    return res;
  }

  if (isKazhakootam) {
    const res = clone(DEMO_COPILOT_RESPONSES['DEMO-Q-003']);
    res.question = question.trim();
    return res;
  }

  // 2. Generic fallback response for arbitrary questions in demo mode
  return clone({
    question: question.trim(),
    matched_assets_count: DEMO_ASSETS.length,
    answer: `#### Simulated Copilot Guidance
Thank you for exploring the **AAYAM Infrastructure Intelligence Layer** demo.

In full deployment, the AI Decision Copilot synthesizes live multi-sensor telemetry, engineering CAD specifications, and historical inspection records through our grounded Retrieval-Augmented Generation (RAG) pipeline.

For this interactive walkthrough, you can explore detailed simulated analysis for our three benchmark specimens:
- **Mandovi Estuary Memorial Bridge**: Ask about pier scour degradation and emergency riprap armor [Ref 1].
- **Chambal Valley Water Treatment Plant**: Review nominal pump vibration spectra and potable effluent turbidity.
- **Kazhakootam Skyway Corridor**: Investigate overdue elastomeric bearing audits and expansion joint maintenance.`,
    observed_facts: [
      'Demo Mode provides deterministic responses for curated sample assets.',
      'Three simulated specimens available: Mandovi Bridge (Critical), Chambal WTP (Operational), Kazhakootam Skyway (Requires Inspection).',
    ],
    recommendations: [
      'Try selecting one of the pre-curated prompt pills above for in-depth grounded citations.',
      'Inspect the linked evidence documents using the interactive [Ref] buttons.',
    ],
    citations: ['[Ref 1]'],
    evidence: [
      {
        citation_label: '[Ref 1]',
        source: 'Simulated Demo Guide Specimen',
        document_name: 'SIMULATED-DOC-BRG-01-SCOUR.pdf',
        filename: 'SIMULATED-DOC-BRG-01-SCOUR.pdf',
        section_title: 'Section 1: General Demo Overview',
        page_number: 1,
        excerpt:
          'AAYAM Demo Mode presents realistic synthetic engineering specimens to demonstrate automated risk ranking, digital heartbeat factor breakdown, and closed-loop verification.',
        evidence_type: 'document_audit_passage',
        relevance_score: 85.0,
        description: 'Simulated walkthrough overview excerpt.',
        asset_id: 'DEMO-BRG-001',
        asset_name: 'Mandovi Estuary Memorial Bridge (Demo Specimen)',
        status: 'Critical Attention',
        risk_score: 86.5,
      },
    ],
    evidence_sufficiency: 'sufficient',
    confidence_level: 'High (Simulated)',
    limitations_note: DEMO_DISCLAIMER,
    pipeline_type: 'simulated_demo_pipeline',
  });
}

/**
 * Fetch full synthetic engineering document content for EvidenceViewerModal.
 * Mimics GET /api/copilot/documents/:documentIdentifier
 *
 * @param {string} documentIdentifier
 * @returns {Promise<Object>}
 */
export async function getDemoSourceDocument(documentIdentifier) {
  if (!documentIdentifier || !documentIdentifier.trim()) {
    throw new Error('Document identifier is required.');
  }

  const clean = documentIdentifier.trim();
  const doc = DEMO_SOURCE_DOCUMENTS[clean];

  if (!doc) {
    // Try matching by prefix or substring
    const match = Object.values(DEMO_SOURCE_DOCUMENTS).find(
      (d) =>
        d.filename.toLowerCase() === clean.toLowerCase() ||
        d.document_name.toLowerCase().includes(clean.toLowerCase())
    );

    if (match) {
      return clone(match);
    }

    const err = new Error(
      `Simulated document '${clean}' is not available in the demo evidence repository.`
    );
    err.status = 404;
    throw err;
  }

  return clone(doc);
}

// ==============================================================================
// STRICT MUTATION BLOCKERS (DEFENSE-IN-DEPTH ISOLATION)
// ==============================================================================

/**
 * Blocked: Asset registration is disallowed in Demo Mode.
 */
export async function createDemoAsset() {
  throw new DemoIsolationError('register new infrastructure asset');
}

/**
 * Blocked: Inspection creation is disallowed in Demo Mode.
 */
export async function createDemoInspection() {
  throw new DemoIsolationError('record new inspection');
}

/**
 * Blocked: Inspection updates are disallowed in Demo Mode.
 */
export async function updateDemoInspection() {
  throw new DemoIsolationError('update inspection status');
}

/**
 * Blocked: Verification sign-off is disallowed in Demo Mode.
 */
export async function verifyDemoInspectionOutcome() {
  throw new DemoIsolationError('verify inspection outcome');
}

// ==============================================================================
// DEMO INTELLIGENCE & DISCOVERY SERVICES
// ==============================================================================

/**
 * Global search across demo assets, findings, and documents
 */
export async function getDemoGlobalSearch(query, limit = 15) {
  if (!query || !query.trim()) {
    return {
      query: '',
      total_matches: 0,
      results: [],
      timestamp: new Date().toISOString(),
    };
  }

  const q = query.toLowerCase().trim();
  const results = [];

  // Match demo assets
  for (const a of DEMO_ASSETS) {
    if (
      a.name.toLowerCase().includes(q) ||
      a.id.toLowerCase().includes(q) ||
      a.district.toLowerCase().includes(q) ||
      a.category.toLowerCase().includes(q) ||
      (a.description && a.description.toLowerCase().includes(q))
    ) {
      results.push({
        entity_type: 'asset',
        entity_id: a.id,
        title: a.name,
        subtitle: `${a.category} • ${a.district}, ${a.state}`,
        snippet: a.description || `Status: ${a.status} • Risk: ${a.risk_score}`,
        asset_id: a.id,
        category: a.category,
        status: a.status,
        risk_score: a.risk_score,
      });
    }
  }

  // Match demo findings
  for (const f of DEMO_FINDINGS) {
    if (
      f.title.toLowerCase().includes(q) ||
      f.plain_explanation.toLowerCase().includes(q) ||
      f.affected_component.toLowerCase().includes(q)
    ) {
      results.push({
        entity_type: 'finding',
        entity_id: f.id,
        title: f.title,
        subtitle: `Finding (${f.severity}) • Component: ${f.affected_component}`,
        snippet: f.plain_explanation,
        asset_id: f.asset_id,
        category: 'Finding',
        status: f.resolution_status,
      });
    }
  }

  // Match demo documents
  for (const doc of Object.values(DEMO_SOURCE_DOCUMENTS)) {
    if (
      doc.filename.toLowerCase().includes(q) ||
      doc.document_name.toLowerCase().includes(q) ||
      (doc.content && doc.content.toLowerCase().includes(q))
    ) {
      results.push({
        entity_type: 'document',
        entity_id: doc.filename,
        title: doc.document_name,
        subtitle: `Document • ${doc.source_agency || 'Technical Report'}`,
        snippet: (doc.content || '').slice(0, 160) + '...',
        asset_id: doc.asset_id,
        category: 'Document',
      });
    }
  }

  const sliced = results.slice(0, limit);
  return clone({
    query,
    total_matches: results.length,
    results: sliced,
    timestamp: new Date().toISOString(),
  });
}

/**
 * Fetch demo media for an asset
 */
export async function getDemoAssetMedia(assetId, category = null) {
  let media = DEMO_MEDIA.filter((m) => m.asset_id === assetId);
  if (category && category !== 'All') {
    media = media.filter((m) => m.category.toLowerCase() === category.toLowerCase());
  }
  return clone({
    asset_id: assetId,
    total_count: media.length,
    items: media,
  });
}

/**
 * Demo upload blocker
 */
export async function uploadDemoAssetMedia() {
  throw new DemoIsolationError('upload infrastructure photographs or media');
}

/**
 * Fetch demo evidence catalog
 */
export async function getDemoEvidenceCatalog() {
  const items = Object.values(DEMO_SOURCE_DOCUMENTS).map((doc) => ({
    filename: doc.filename,
    title: doc.document_name,
    file_type: doc.file_type || 'PDF',
    size_bytes: doc.size_bytes || 102400,
    page_count: doc.pages ? doc.pages.length : 1,
    associated_asset_ids: doc.asset_id ? [doc.asset_id] : [],
    summary: (doc.content || '').slice(0, 200) + '...',
    last_indexed_at: '2024-03-12T00:00:00Z',
    is_available: true,
  }));

  return clone({
    total_documents: items.length,
    items,
  });
}

/**
 * Fetch demo sources for an asset
 */
export async function getDemoAssetSources(assetId) {
  const sources = DEMO_SOURCES.filter((s) => s.asset_id === assetId);
  return clone({
    asset_id: assetId,
    total_count: sources.length,
    items: sources,
  });
}

/**
 * Fetch demo findings for an asset
 */
export async function getDemoAssetFindings(assetId) {
  const findings = DEMO_FINDINGS.filter((f) => f.asset_id === assetId);
  return clone({
    asset_id: assetId,
    total_count: findings.length,
    items: findings,
  });
}

/**
 * Demo finding creation blocker
 */
export async function createDemoAssetFinding() {
  throw new DemoIsolationError('create engineering findings');
}

/**
 * Get unified intelligence profile for a demo asset
 */
export async function getDemoAssetIntelligence(assetId) {
  const asset = DEMO_ASSETS.find((a) => a.id === assetId);
  if (!asset) {
    const err = new Error(`Simulated asset '${assetId}' not found.`);
    err.status = 404;
    throw err;
  }

  const heartbeat = DEMO_HEARTBEATS[assetId] || {
    asset_id: asset.id,
    asset_name: asset.name,
    risk_score: asset.risk_score,
    risk_tier: asset.risk_level || 'Moderate',
    health_index: asset.health_index || 70.0,
    contributing_factors: [],
    suggested_investigations: [],
    data_confidence_score: 0.95,
  };

  const rawFindings = DEMO_FINDINGS.filter((f) => f.asset_id === assetId);
  const findings = rawFindings.map((f) => enrichFinding(f, asset.category));
  const sources = DEMO_SOURCES.filter((s) => s.asset_id === assetId);
  const media = DEMO_MEDIA.filter((m) => m.asset_id === assetId);
  const inspections = (DEMO_INSPECTIONS[assetId] || []);
  const timeline = (DEMO_TIMELINES[assetId] || []);

  const componentInventory = buildComponentInventory(asset, findings, inspections, media);
  const interventionPlan = build3StageInterventionPlan(asset, findings);
  const prioritizedRisks = buildPrioritizedRiskTable(findings);
  const criticalAreas = findings.filter((f) => f.severity_level === 1 || f.severity_level === 2);
  const conditionSummary = computeWholeAssetSummary(asset, heartbeat, findings, componentInventory, inspections);

  return clone({
    asset,
    completeness: {
      percentage: 92,
      total_fields: 10,
      verified_fields: ['id', 'name', 'category', 'district', 'state', 'latitude', 'longitude', 'construction_year', 'last_inspection_date'],
      missing_fields: ['ownership_authority'],
    },
    heartbeat,
    findings,
    sources,
    media,
    inspections,
    timeline,
    critical_areas: criticalAreas.length > 0 ? criticalAreas : findings.slice(0, 2),
    intervention_plan: interventionPlan,
    prioritized_risks: prioritizedRisks,
    component_inventory: componentInventory,
    condition_summary: conditionSummary,
    meta: {
      generated_at: new Date().toISOString(),
      disclaimer: DEMO_DISCLAIMER,
    },
  });
}

/**
 * Get structured printable report for a demo asset
 */
export async function getDemoAssetReport(assetId) {
  const intel = await getDemoAssetIntelligence(assetId);
  const { asset, heartbeat, findings, sources, inspections } = intel;

  return clone({
    asset_id: asset.id,
    asset_name: asset.name,
    report_title: `Infrastructure Intelligence & Condition Assessment Audit — ${asset.name}`,
    generated_at: new Date().toISOString(),
    executive_summary: `Intelligence assessment audit for ${asset.name} (${asset.id}). Current operational status is ${asset.status} with a calculated Digital Heartbeat Risk Score of ${heartbeat.risk_score.toFixed(1)}/100 and Health Index of ${heartbeat.health_index.toFixed(1)}/100. Audit references ${sources.length} traceable evidence citations, ${findings.length} registered engineering findings, and ${inspections.length} recorded field inspection evaluations.`,
    overall_risk_score: heartbeat.risk_score,
    overall_health_index: heartbeat.health_index,
    risk_category: heartbeat.risk_tier,
    completeness_percentage: intel.completeness.percentage,
    sections: [
      {
        section_id: 'sec-1',
        title: '1. Asset Identity, Geographic Context & Operational Scope',
        summary: `${asset.name} is classified under category ${asset.category}, situated at coordinates ${asset.latitude}, ${asset.longitude} within ${asset.district}, ${asset.state}.`,
        details: [
          `Category: ${asset.category}`,
          `Location: ${asset.district}, ${asset.state} (${asset.latitude}, ${asset.longitude})`,
          `Commissioning: Year ${asset.construction_year || 'Unrecorded'}`,
          `Current Operational Status: ${asset.status}`,
          `Data Completeness Score: ${intel.completeness.percentage}%`,
        ],
        evidence_citations: sources.slice(0, 2).map((s) => s.title),
      },
      {
        section_id: 'sec-2',
        title: '2. Digital Heartbeat & Condition Telemetry',
        summary: `Dynamic risk index calculated at ${heartbeat.risk_score.toFixed(1)} (${heartbeat.risk_tier}), with an overall Health Index of ${heartbeat.health_index.toFixed(1)}/100.`,
        details: [
          `Risk Tier: ${heartbeat.risk_tier}`,
          `Confidence Score: ${(heartbeat.data_confidence_score * 100).toFixed(0)}%`,
          `Inspection Recency: ${asset.last_inspection_date}`,
        ],
        evidence_citations: ['Digital Heartbeat Deterministic 4-Factor Engine (Simulated)'],
      },
      {
        section_id: 'sec-3',
        title: '3. Engineering Findings & Observed Defects',
        summary: `Identified ${findings.length} structured findings requiring civil engineering attention.`,
        details: findings.map((f) => `[${f.severity}] ${f.title} — Component: ${f.affected_component}. Status: ${f.resolution_status}`),
        evidence_citations: findings.map((f) => f.supporting_evidence).filter(Boolean),
      },
      {
        section_id: 'sec-4',
        title: '4. Inspection & Verification Lifecycle',
        summary: `Audit history contains ${inspections.length} field evaluations.`,
        details: inspections.map((i) => `${i.inspection_date} [${i.status}]: ${i.inspection_type} by ${i.responsible_user} — Outcome: ${i.verification_outcome || 'Pending'}`),
        evidence_citations: inspections.map((i) => i.evidence_references).filter(Boolean),
      },
      {
        section_id: 'sec-5',
        title: '5. Data Gaps & Recommended Investigations',
        summary: 'Identified telemetry and audit gaps requiring field investigation.',
        details: [
          'Recommended Action: Verify underwater foundation with diver acoustic survey',
          'Missing Parameter: ownership_authority',
        ],
        evidence_citations: ['AAYAM Data Quality & Completeness Audit (Simulated)'],
      },
    ],
    verified_data_points: ['Asset Coordinates', 'Sensor Data Feed', 'Inspection History'],
    unverified_claims: ['Subsurface foundation bedrock integrity pending core drilling sample'],
    evidence_gaps: ['Statutory 5-year seismic vulnerability re-assessment pending'],
    disclaimer: DEMO_DISCLAIMER,
  });
}

/**
 * Simulated AI intelligence run for demo mode
 */
export async function runDemoAssetIntelligence(assetId) {
  const intel = await getDemoAssetIntelligence(assetId);
  return clone({
    id: `RUN-DEMO-${assetId}-${Date.now().toString(36).toUpperCase()}`,
    asset_id: assetId,
    model_used: 'gpt-4o-mini',
    status: 'completed',
    overall_condition_summary: `AI Intelligence Assessment for ${intel.asset.name}. Risk Score: ${intel.asset.risk_score}/100, Health Index: ${intel.asset.health_index}%.`,
    structural_summary: `Structural analysis detects physical load fatigue and concrete micro-fissures matching field inspection observations.`,
    environmental_summary: `High exposure to regional monsoon precipitation and environmental degradation factors in ${intel.asset.district}.`,
    compliance_summary: `Statutory inspections logged according to PWD/IRC compliance matrix. 0 overdue safety audits.`,
    operational_summary: `Continuous civic usage under state operational demand. No active mechanical shutdowns.`,
    predictive_summary: `Deterioration rate estimated at 1.4% annually under normal weather. Recommend scheduled preventive remediation within 90 days.`,
    data_limitations: 'Simulated demo evaluation grounded in demo asset records.',
    conflicting_evidence: null,
    prompt_tokens: 1420,
    completion_tokens: 380,
    total_tokens: 1800,
    estimated_cost_usd: 0.000441,
    latency_ms: 1240,
    created_at: new Date().toISOString(),
  });
}

/**
 * Simulated engineer review decision in demo mode
 */
export async function reviewDemoAssetFinding(findingId, reviewData) {
  const status = reviewData.verification_status || reviewData.decision || 'Verified';
  const reviewer = reviewData.reviewed_by || reviewData.reviewer_name || 'Demo Reviewing Engineer';
  const notes = reviewData.review_decision_notes || reviewData.decision_notes || '';
  const finding = DEMO_FINDINGS.find((f) => f.id === findingId);
  if (finding) {
    finding.verification_status = status;
    finding.reviewed_by = reviewer;
    finding.reviewed_at = new Date().toISOString().replace('T', ' ').slice(0, 16) + ' UTC';
    if (notes) {
      finding.review_decision_notes = notes;
    }
    return clone(finding);
  }
  return {
    id: findingId,
    verification_status: status,
    reviewed_by: reviewer,
    reviewed_at: new Date().toISOString(),
    review_decision_notes: notes,
  };
}


