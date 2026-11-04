/**
 * API Service for AAYAM Infrastructure Intelligence Layer
 * Communicates with FastAPI backend with structured error handling and JWT RBAC authentication.
 */

/**
 * Resolves the API base URL for single-domain and multi-environment architecture:
 * - Production builds (Vercel): Uses relative paths ('') so requests to /api/* 
 *   route directly through Vercel's reverse proxy rewrites to Render (single-domain architecture).
 * - Development: If VITE_API_BASE_URL is explicitly set, uses it (sanitizing trailing slashes).
 *   Otherwise, relative '' allows Vite dev server to proxy /api to http://127.0.0.1:8000.
 * - Test / Node environments: Falls back to http://127.0.0.1:8000 to prevent ERR_INVALID_URL in Node fetch.
 */
function resolveApiBaseUrl() {
  const envUrl = (import.meta.env?.VITE_API_BASE_URL || '').trim();
  if (envUrl) {
    return envUrl.replace(/\/+$/, '');
  }
  // In test runner (Vitest / Node.js)
  if (import.meta.env?.MODE === 'test') {
    return 'http://127.0.0.1:8000';
  }
  // In production builds (Vercel deployment), use relative '' for single-domain proxy
  if (import.meta.env?.PROD) {
    return '';
  }
  // In non-browser Node environments where window/origin is missing
  if (typeof window === 'undefined' || !window.location?.origin || window.location.origin === 'null') {
    return 'http://127.0.0.1:8000';
  }
  // In local browser development, relative '' lets Vite dev server proxy /api to local FastAPI
  return '';
}

export const BASE_URL = resolveApiBaseUrl();

let currentAuthToken = null;
let onUnauthorizedCallback = null;

/**
 * Configure active in-memory JWT bearer token
 * @param {string|null} token
 */
export function setAuthToken(token) {
  currentAuthToken = token;
}

/**
 * Get active in-memory JWT bearer token
 * @returns {string|null}
 */
export function getAuthToken() {
  return currentAuthToken;
}

/**
 * Register unauthorized 401 callback handler from AuthContext
 * @param {Function|null} callback
 */
export function setUnauthorizedHandler(callback) {
  onUnauthorizedCallback = callback;
}

function handleUnauthorized() {
  if (typeof onUnauthorizedCallback === 'function') {
    onUnauthorizedCallback();
  }
}

/**
 * Build request headers including Authorization Bearer if token is available
 * @param {Object} customHeaders
 */
function getAuthHeaders(customHeaders = {}) {
  const headers = { ...customHeaders };
  if (currentAuthToken) {
    headers['Authorization'] = `Bearer ${currentAuthToken}`;
  }
  return headers;
}

/**
 * Format structured error response from FastAPI
 */
function formatApiError(errorData, status, defaultAction = 'perform operation') {
  if (errorData) {
    if (typeof errorData.detail === 'string') {
      return errorData.detail;
    }
    if (Array.isArray(errorData.detail)) {
      return errorData.detail
        .map((d) => {
          const fieldName = Array.isArray(d.loc)
            ? d.loc.filter((x) => x !== 'body').join('.')
            : 'field';
          return `${fieldName}: ${d.msg}`;
        })
        .join('; ');
    }
    if (errorData.detail) {
      return JSON.stringify(errorData.detail);
    }
  }
  return `Failed to ${defaultAction} (HTTP ${status})`;
}

// ==============================================================================
// AUTHENTICATION & PROFILE ENDPOINTS
// ==============================================================================

/**
 * Register a new Common User account via POST /api/auth/register
 * @param {Object} data - { username, email, full_name, password, confirm_password }
 */
export async function registerUser(data) {
  const { username, email, full_name, password, confirm_password } = data || {};
  if (!username || !email || !full_name || !password || !confirm_password) {
    const err = new Error('All registration fields are required.');
    err.status = 400;
    throw err;
  }
  if (password !== confirm_password) {
    const err = new Error('Passwords do not match.');
    err.status = 400;
    throw err;
  }

  try {
    const res = await fetch(`${BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        username: username.trim(),
        email: email.trim().toLowerCase(),
        full_name: full_name.trim(),
        password,
        confirm_password,
      }),
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      const msg = formatApiError(errData, res.status, 'register account');
      const err = new Error(msg);
      err.status = res.status;
      throw err;
    }

    return await res.json();
  } catch (err) {
    if (!err.status) {
      err.message = 'Unable to connect to backend authentication server. Ensure the FastAPI backend is running.';
    }
    console.error('API Error in registerUser:', err);
    throw err;
  }
}

/**
 * Authenticate against POST /api/auth/login
 * @param {Object} credentials - { username, password }
 */
export async function loginUser(credentials) {
  const { username, password } = credentials || {};
  if (!username || !password) {
    const err = new Error('Please enter both username and password.');
    err.status = 400;
    throw err;
  }

  try {
    const res = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        username: username.trim(),
        password,
      }),
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      const msg = formatApiError(errData, res.status, 'authenticate');
      const err = new Error(msg);
      err.status = res.status;
      throw err;
    }

    return await res.json();
  } catch (err) {
    if (!err.status) {
      // Network failure / server offline
      err.message = 'Unable to connect to backend authentication server. Ensure the FastAPI backend is running.';
    }
    console.error('API Error in loginUser:', err);
    throw err;
  }
}

/**
 * Fetch authenticated user profile via GET /api/auth/me
 */
export async function fetchCurrentUserProfile() {
  try {
    const res = await fetch(`${BASE_URL}/api/auth/me`, {
      headers: getAuthHeaders({ 'Accept': 'application/json' }),
    });

    if (!res.ok) {
      if (res.status === 401) {
        handleUnauthorized();
      }
      const errData = await res.json().catch(() => ({}));
      const msg = formatApiError(errData, res.status, 'verify session profile');
      const err = new Error(msg);
      err.status = res.status;
      throw err;
    }

    return await res.json();
  } catch (err) {
    console.error('API Error in fetchCurrentUserProfile:', err);
    throw err;
  }
}

// ==============================================================================
// PUBLIC & READ-ONLY ENDPOINTS
// ==============================================================================

/**
 * Fetch backend health status
 */
export async function fetchHealth() {
  try {
    const res = await fetch(`${BASE_URL}/api/health`, {
      headers: getAuthHeaders({ 'Accept': 'application/json' }),
    });
    if (!res.ok) {
      throw new Error(`Health check failed with status: ${res.status}`);
    }
    return await res.json();
  } catch (err) {
    console.error('Failed to connect to backend health endpoint:', err);
    throw err;
  }
}

/**
 * Fetch summary statistics for dashboard cards
 */
export async function fetchAssetStats() {
  try {
    const res = await fetch(`${BASE_URL}/api/assets/summary/stats`, {
      headers: getAuthHeaders({ 'Accept': 'application/json' }),
    });
    if (!res.ok) {
      throw new Error(`Stats endpoint failed with status: ${res.status}`);
    }
    return await res.json();
  } catch (err) {
    console.error('Failed to fetch asset summary stats:', err);
    throw err;
  }
}

/**
 * Fetch infrastructure assets with optional filters
 * @param {Object} params - { category, status, district, search }
 */
export async function fetchAssets(params = {}) {
  try {
    const query = new URLSearchParams();
    if (params.category && params.category !== 'All') {
      query.append('category', params.category);
    }
    if (params.status && params.status !== 'All') {
      query.append('status', params.status);
    }
    if (params.district) {
      query.append('district', params.district);
    }
    if (params.search) {
      query.append('search', params.search);
    }

    const url = `${BASE_URL}/api/assets${query.toString() ? `?${query.toString()}` : ''}`;
    const res = await fetch(url, {
      headers: getAuthHeaders({ 'Accept': 'application/json' }),
    });

    if (!res.ok) {
      throw new Error(`Failed to fetch assets (HTTP ${res.status})`);
    }

    return await res.json();
  } catch (err) {
    console.error('API Error in fetchAssets:', err);
    throw err;
  }
}

/**
 * Fetch single asset detail by unique ID
 * @param {string} assetId
 */
export async function fetchAssetById(assetId) {
  try {
    const res = await fetch(`${BASE_URL}/api/assets/${encodeURIComponent(assetId)}`, {
      headers: getAuthHeaders({ 'Accept': 'application/json' }),
    });

    if (!res.ok) {
      if (res.status === 404) {
        throw new Error(`Asset '${assetId}' was not found in registry.`);
      }
      throw new Error(`Failed to load asset details (HTTP ${res.status})`);
    }

    return await res.json();
  } catch (err) {
    console.error(`API Error in fetchAssetById(${assetId}):`, err);
    throw err;
  }
}

/**
 * Submit an inquiry to the AI Decision Copilot
 * @param {string} question - The infrastructure inquiry text
 */
export async function askCopilot(question, options = {}) {
  if (!question || !question.trim()) {
    throw new Error('Please enter a question before submitting.');
  }

  try {
    const opts = typeof options === 'string' ? { asset_id: options } : (options || {});
    const payload = { question: question.trim() };
    if (opts.asset_id) payload.asset_id = opts.asset_id;
    if (opts.category && opts.category !== 'All') payload.category = opts.category;
    if (Array.isArray(opts.conversation_history) && opts.conversation_history.length > 0) {
      payload.conversation_history = opts.conversation_history;
    }

    const res = await fetch(`${BASE_URL}/api/copilot/ask`, {
      method: 'POST',
      headers: getAuthHeaders({
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      }),
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      let errorMessage = `Server error (HTTP ${res.status})`;
      try {
        const errorData = await res.json();
        if (errorData && errorData.detail) {
          errorMessage = typeof errorData.detail === 'string' 
            ? errorData.detail 
            : JSON.stringify(errorData.detail);
        }
      } catch (parseErr) {
        // use default HTTP error
      }
      throw new Error(errorMessage);
    }

    return await res.json();
  } catch (err) {
    console.error('API Error in askCopilot:', err);
    throw err;
  }
}

/**
 * Fetch full verified engineering document content and pages for evidence inspection
 * @param {string} documentIdentifier - document name or filename
 */
export async function fetchSourceDocument(documentIdentifier) {
  if (!documentIdentifier || !documentIdentifier.trim()) {
    throw new Error('Document identifier is required.');
  }

  try {
    const res = await fetch(`${BASE_URL}/api/copilot/documents/${encodeURIComponent(documentIdentifier.trim())}`, {
      headers: getAuthHeaders({ 'Accept': 'application/json' }),
    });

    if (!res.ok) {
      let msg = `Failed to load source document (HTTP ${res.status})`;
      if (res.status === 404) {
        msg = `Source document '${documentIdentifier}' is unavailable or not found in evidence repository.`;
      }
      const err = new Error(msg);
      err.status = res.status;
      throw err;
    }

    return await res.json();
  } catch (err) {
    console.error(`API Error in fetchSourceDocument(${documentIdentifier}):`, err);
    throw err;
  }
}

/**
 * Fetch dynamic Digital Heartbeat telemetry and explainable factor breakdown
 * @param {string} assetId
 */
export async function fetchAssetHeartbeat(assetId) {
  try {
    const res = await fetch(`${BASE_URL}/api/assets/${encodeURIComponent(assetId)}/heartbeat`, {
      headers: getAuthHeaders({ 'Accept': 'application/json' }),
    });
    if (!res.ok) {
      throw new Error(`Failed to fetch heartbeat for '${assetId}' (HTTP ${res.status})`);
    }
    return await res.json();
  } catch (err) {
    console.error(`API Error in fetchAssetHeartbeat(${assetId}):`, err);
    throw err;
  }
}

/**
 * Fetch all historical and pending inspection records for an asset
 * @param {string} assetId
 */
export async function fetchAssetInspections(assetId) {
  try {
    const res = await fetch(`${BASE_URL}/api/assets/${encodeURIComponent(assetId)}/inspections`, {
      headers: getAuthHeaders({ 'Accept': 'application/json' }),
    });
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      const msg = formatApiError(errData, res.status, `load inspections for '${assetId}'`);
      const error = new Error(msg);
      error.status = res.status;
      throw error;
    }
    return await res.json();
  } catch (err) {
    console.error(`API Error in fetchAssetInspections(${assetId}):`, err);
    throw err;
  }
}

/**
 * Fetch unified chronological timeline for an asset
 * @param {string} assetId
 */
export async function fetchAssetTimeline(assetId) {
  try {
    const res = await fetch(`${BASE_URL}/api/assets/${encodeURIComponent(assetId)}/timeline`, {
      headers: getAuthHeaders({ 'Accept': 'application/json' }),
    });
    if (!res.ok) {
      throw new Error(`Failed to load timeline for '${assetId}' (HTTP ${res.status})`);
    }
    return await res.json();
  } catch (err) {
    console.error(`API Error in fetchAssetTimeline(${assetId}):`, err);
    throw err;
  }
}

// ==============================================================================
// PROTECTED MUTATING ENDPOINTS (ADMIN-ONLY)
// ==============================================================================

/**
 * Register a new infrastructure asset in the registry (Admin Only)
 * @param {Object} data - AssetCreate schema payload
 */
export async function createAsset(data) {
  try {
    const res = await fetch(`${BASE_URL}/api/assets`, {
      method: 'POST',
      headers: getAuthHeaders({
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      }),
      body: JSON.stringify(data),
    });

    if (!res.ok) {
      if (res.status === 401) {
        handleUnauthorized();
      }
      const errData = await res.json().catch(() => ({}));
      const msg = formatApiError(errData, res.status, 'register asset');
      const error = new Error(msg);
      error.status = res.status;
      throw error;
    }

    return await res.json();
  } catch (err) {
    console.error('API Error in createAsset:', err);
    throw err;
  }
}

/**
 * Record a new field inspection and recommended action (Admin Only)
 * @param {string} assetId
 * @param {Object} data - { inspection_date, inspection_type, findings, recommended_action, actual_action_taken, responsible_user, evidence_references }
 */
export async function createInspection(assetId, data) {
  try {
    const res = await fetch(`${BASE_URL}/api/assets/${encodeURIComponent(assetId)}/inspections`, {
      method: 'POST',
      headers: getAuthHeaders({
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      }),
      body: JSON.stringify(data),
    });

    if (!res.ok) {
      if (res.status === 401) {
        handleUnauthorized();
      }
      const errData = await res.json().catch(() => ({}));
      const msg = formatApiError(errData, res.status, 'record inspection');
      const error = new Error(msg);
      error.status = res.status;
      throw error;
    }

    return await res.json();
  } catch (err) {
    console.error(`API Error in createInspection(${assetId}):`, err);
    throw err;
  }
}

/**
 * Update an inspection action status or intervention details (Admin Only)
 * @param {string} inspectionId
 * @param {Object} data - { status, actual_action_taken, evidence_references }
 */
export async function updateInspection(inspectionId, data) {
  try {
    const res = await fetch(`${BASE_URL}/api/inspections/${encodeURIComponent(inspectionId)}`, {
      method: 'PATCH',
      headers: getAuthHeaders({
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      }),
      body: JSON.stringify(data),
    });

    if (!res.ok) {
      if (res.status === 401) {
        handleUnauthorized();
      }
      const errData = await res.json().catch(() => ({}));
      const msg = formatApiError(errData, res.status, 'update inspection');
      const error = new Error(msg);
      error.status = res.status;
      throw error;
    }

    return await res.json();
  } catch (err) {
    console.error(`API Error in updateInspection(${inspectionId}):`, err);
    throw err;
  }
}

/**
 * Verify outcome of an intervention in the closed-loop workflow (Admin Only)
 * @param {string} inspectionId
 * @param {Object} data - { verification_notes, verification_date, verifier_name, outcome, actual_action_taken }
 */
export async function verifyInspectionOutcome(inspectionId, data) {
  try {
    const res = await fetch(`${BASE_URL}/api/inspections/${encodeURIComponent(inspectionId)}/verify`, {
      method: 'POST',
      headers: getAuthHeaders({
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      }),
      body: JSON.stringify(data),
    });

    if (!res.ok) {
      if (res.status === 401) {
        handleUnauthorized();
      }
      const errData = await res.json().catch(() => ({}));
      const msg = formatApiError(errData, res.status, 'verify inspection outcome');
      const error = new Error(msg);
      error.status = res.status;
      throw error;
    }

    return await res.json();
  } catch (err) {
    console.error(`API Error in verifyInspectionOutcome(${inspectionId}):`, err);
    throw err;
  }
}

// ==============================================================================
// GLOBAL SEARCH & INTELLIGENCE EXTENSIONS
// ==============================================================================

/**
 * Global multi-entity search across assets, findings, and indexed evidence documents
 * @param {string} query
 * @param {number} limit
 */
export async function globalSearch(query, limit = 15) {
  try {
    const res = await fetch(
      `${BASE_URL}/api/search?q=${encodeURIComponent(query)}&limit=${limit}`,
      {
        headers: getAuthHeaders({ 'Accept': 'application/json' }),
      }
    );
    if (!res.ok) {
      if (res.status === 401) handleUnauthorized();
      const errData = await res.json().catch(() => ({}));
      throw new Error(formatApiError(errData, res.status, 'search platform'));
    }
    return await res.json();
  } catch (err) {
    console.error('API Error in globalSearch:', err);
    throw err;
  }
}

/**
 * Fetch visual media for an asset
 * @param {string} assetId
 * @param {string|null} category
 */
export async function fetchAssetMedia(assetId, category = null) {
  try {
    const url = `${BASE_URL}/api/assets/${encodeURIComponent(assetId)}/images${
      category ? `?category=${encodeURIComponent(category)}` : ''
    }`;
    const res = await fetch(url, {
      headers: getAuthHeaders({ 'Accept': 'application/json' }),
    });
    if (!res.ok) {
      if (res.status === 401) handleUnauthorized();
      const errData = await res.json().catch(() => ({}));
      throw new Error(formatApiError(errData, res.status, 'fetch asset media'));
    }
    return await res.json();
  } catch (err) {
    console.error(`API Error in fetchAssetMedia(${assetId}):`, err);
    throw err;
  }
}

/**
 * Upload visual media for an asset
 * @param {string} assetId
 * @param {FormData} formData
 */
export async function uploadAssetMedia(assetId, formData) {
  try {
    const headers = getAuthHeaders(); // note: no Content-Type header so browser adds multipart boundary
    const res = await fetch(`${BASE_URL}/api/assets/${encodeURIComponent(assetId)}/images`, {
      method: 'POST',
      headers,
      body: formData,
    });
    if (!res.ok) {
      if (res.status === 401) handleUnauthorized();
      const errData = await res.json().catch(() => ({}));
      throw new Error(formatApiError(errData, res.status, 'upload asset media'));
    }
    return await res.json();
  } catch (err) {
    console.error(`API Error in uploadAssetMedia(${assetId}):`, err);
    throw err;
  }
}

/**
 * Fetch evidence library catalog
 */
export async function fetchEvidenceCatalog() {
  try {
    const res = await fetch(`${BASE_URL}/api/evidence`, {
      headers: getAuthHeaders({ 'Accept': 'application/json' }),
    });
    if (!res.ok) {
      if (res.status === 401) handleUnauthorized();
      const errData = await res.json().catch(() => ({}));
      throw new Error(formatApiError(errData, res.status, 'fetch evidence catalog'));
    }
    return await res.json();
  } catch (err) {
    console.error('API Error in fetchEvidenceCatalog:', err);
    throw err;
  }
}

/**
 * Fetch provenance sources for an asset
 * @param {string} assetId
 */
export async function fetchAssetSources(assetId) {
  try {
    const res = await fetch(`${BASE_URL}/api/assets/${encodeURIComponent(assetId)}/sources`, {
      headers: getAuthHeaders({ 'Accept': 'application/json' }),
    });
    if (!res.ok) {
      if (res.status === 401) handleUnauthorized();
      const errData = await res.json().catch(() => ({}));
      throw new Error(formatApiError(errData, res.status, 'fetch asset sources'));
    }
    return await res.json();
  } catch (err) {
    console.error(`API Error in fetchAssetSources(${assetId}):`, err);
    throw err;
  }
}

/**
 * Fetch structured engineering findings for an asset
 * @param {string} assetId
 */
export async function fetchAssetFindings(assetId) {
  try {
    const res = await fetch(`${BASE_URL}/api/assets/${encodeURIComponent(assetId)}/findings`, {
      headers: getAuthHeaders({ 'Accept': 'application/json' }),
    });
    if (!res.ok) {
      if (res.status === 401) handleUnauthorized();
      const errData = await res.json().catch(() => ({}));
      throw new Error(formatApiError(errData, res.status, 'fetch asset findings'));
    }
    return await res.json();
  } catch (err) {
    console.error(`API Error in fetchAssetFindings(${assetId}):`, err);
    throw err;
  }
}

/**
 * Create a new engineering finding for an asset (Admin or Inspector)
 * @param {string} assetId
 * @param {Object} data
 */
export async function createAssetFinding(assetId, data) {
  try {
    const res = await fetch(`${BASE_URL}/api/assets/${encodeURIComponent(assetId)}/findings`, {
      method: 'POST',
      headers: getAuthHeaders({
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      }),
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      if (res.status === 401) handleUnauthorized();
      const errData = await res.json().catch(() => ({}));
      throw new Error(formatApiError(errData, res.status, 'create asset finding'));
    }
    return await res.json();
  } catch (err) {
    console.error(`API Error in createAssetFinding(${assetId}):`, err);
    throw err;
  }
}

/**
 * Fetch unified complete intelligence profile for an asset
 * @param {string} assetId
 */
export async function fetchAssetIntelligence(assetId) {
  try {
    const res = await fetch(`${BASE_URL}/api/assets/${encodeURIComponent(assetId)}/intelligence`, {
      headers: getAuthHeaders({ 'Accept': 'application/json' }),
    });
    if (!res.ok) {
      if (res.status === 401) handleUnauthorized();
      const errData = await res.json().catch(() => ({}));
      throw new Error(formatApiError(errData, res.status, 'fetch asset intelligence'));
    }
    return await res.json();
  } catch (err) {
    console.error(`API Error in fetchAssetIntelligence(${assetId}):`, err);
    throw err;
  }
}

/**
 * Run 5-module AI intelligence analysis for an asset
 * @param {string} assetId
 */
export async function runAssetIntelligence(assetId) {
  try {
    const res = await fetch(`${BASE_URL}/api/assets/${encodeURIComponent(assetId)}/intelligence/run`, {
      method: 'POST',
      headers: getAuthHeaders({ 'Accept': 'application/json' }),
    });
    if (!res.ok) {
      if (res.status === 401) handleUnauthorized();
      const errData = await res.json().catch(() => ({}));
      throw new Error(formatApiError(errData, res.status, 'run asset intelligence analysis'));
    }
    return await res.json();
  } catch (err) {
    console.error(`API Error in runAssetIntelligence(${assetId}):`, err);
    throw err;
  }
}

/**
 * Fetch latest AI intelligence run for an asset
 * @param {string} assetId
 */
export async function fetchLatestAssetIntelligence(assetId) {
  try {
    const res = await fetch(`${BASE_URL}/api/assets/${encodeURIComponent(assetId)}/intelligence/latest`, {
      headers: getAuthHeaders({ 'Accept': 'application/json' }),
    });
    if (!res.ok) {
      if (res.status === 401) handleUnauthorized();
      const errData = await res.json().catch(() => ({}));
      throw new Error(formatApiError(errData, res.status, 'fetch latest intelligence run'));
    }
    return await res.json();
  } catch (err) {
    console.error(`API Error in fetchLatestAssetIntelligence(${assetId}):`, err);
    throw err;
  }
}

/**
 * Submit engineer review decision on a finding (Verified, Rejected, Requires Further Inspection)
 * @param {string} findingId
 * @param {Object} reviewData - { verification_status, review_decision_notes, reviewed_by }
 */
export async function reviewAssetFinding(findingId, reviewData) {
  try {
    const res = await fetch(`${BASE_URL}/api/findings/${encodeURIComponent(findingId)}/review`, {
      method: 'POST',
      headers: getAuthHeaders({ 'Content-Type': 'application/json', 'Accept': 'application/json' }),
      body: JSON.stringify(reviewData),
    });
    if (!res.ok) {
      if (res.status === 401) handleUnauthorized();
      const errData = await res.json().catch(() => ({}));
      throw new Error(formatApiError(errData, res.status, 'submit engineer review'));
    }
    return await res.json();
  } catch (err) {
    console.error(`API Error in reviewAssetFinding(${findingId}):`, err);
    throw err;
  }
}

/**
 * Analyze an uploaded inspection report with OpenAI
 * @param {string} assetId
 * @param {File} file
 */
export async function analyzeInspectionDocument(assetId, file) {
  try {
    const formData = new FormData();
    formData.append('file', file);
    const res = await fetch(`${BASE_URL}/api/assets/${encodeURIComponent(assetId)}/intelligence/analyze-document`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: formData,
    });
    if (!res.ok) {
      if (res.status === 401) handleUnauthorized();
      const errData = await res.json().catch(() => ({}));
      throw new Error(formatApiError(errData, res.status, 'analyze inspection document'));
    }
    return await res.json();
  } catch (err) {
    console.error(`API Error in analyzeInspectionDocument(${assetId}):`, err);
    throw err;
  }
}

/**
 * Analyze an infrastructure photo with OpenAI Vision
 * @param {string} assetId
 * @param {File} file
 * @param {string} caption
 */
export async function analyzeInfrastructureImage(assetId, file, caption = '') {
  try {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('caption', caption);
    const res = await fetch(`${BASE_URL}/api/assets/${encodeURIComponent(assetId)}/intelligence/analyze-image`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: formData,
    });
    if (!res.ok) {
      if (res.status === 401) handleUnauthorized();
      const errData = await res.json().catch(() => ({}));
      throw new Error(formatApiError(errData, res.status, 'analyze infrastructure image'));
    }
    return await res.json();
  } catch (err) {
    console.error(`API Error in analyzeInfrastructureImage(${assetId}):`, err);
    throw err;
  }
}

/**
 * Generate/fetch structured printable intelligence report for an asset
 * @param {string} assetId
 */
export async function fetchAssetReport(assetId) {
  try {
    const res = await fetch(`${BASE_URL}/api/assets/${encodeURIComponent(assetId)}/report`, {
      headers: getAuthHeaders({ 'Accept': 'application/json' }),
    });
    if (!res.ok) {
      if (res.status === 401) handleUnauthorized();
      const errData = await res.json().catch(() => ({}));
      throw new Error(formatApiError(errData, res.status, 'fetch asset report'));
    }
    return await res.json();
  } catch (err) {
    console.error(`API Error in fetchAssetReport(${assetId}):`, err);
    throw err;
  }
}

/**
 * Fetch grounded conversation history
 * @param {string|null} assetId
 */
export async function fetchCopilotHistory(assetId = null) {
  try {
    const query = assetId ? `?asset_id=${encodeURIComponent(assetId)}` : '';
    const res = await fetch(`${BASE_URL}/api/copilot/history${query}`, {
      headers: getAuthHeaders({ 'Accept': 'application/json' }),
    });
    if (!res.ok) {
      if (res.status === 401) handleUnauthorized();
      return [];
    }
    return await res.json();
  } catch (err) {
    console.error('API Error in fetchCopilotHistory:', err);
    return [];
  }
}

/**
 * Fetch Central Cloud AI Status and token telemetry
 */
export async function fetchAIStatus() {
  try {
    const res = await fetch(`${BASE_URL}/api/ai/status`, {
      headers: getAuthHeaders({ 'Accept': 'application/json' }),
    });
    if (!res.ok) {
      return { configured: false, status: 'offline', model: 'none' };
    }
    return await res.json();
  } catch (err) {
    return { configured: false, status: 'offline', model: 'none' };
  }
}




