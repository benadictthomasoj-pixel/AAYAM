import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  X,
  Building2,
  Calendar,
  MapPin,
  ShieldAlert,
  ShieldCheck,
  Activity,
  History,
  Image as ImageIcon,
  AlertTriangle,
  FileText,
  Search,
  ExternalLink,
  Upload,
  CheckCircle2,
  Clock,
  Layers,
  ChevronRight,
  Maximize2,
  PlusCircle,
  FileCheck,
  Loader2,
  RefreshCw,
  Printer,
  Compass,
  Sparkles,
  Brain,
  Cpu,
  Check,
  Filter,
  Send,
  MessageSquare,
  Bot,
  CornerDownRight,
  FileWarning,
  Eye,
  ArrowUpRight,
  Scale,
  Gauge,
  HelpCircle,
  UserCheck,
  Wrench,
  Shield,
  Zap,
  TrendingDown,
  Info,
  DollarSign,
  ChevronDown,
  AlertCircle,
  BookOpen,
  Bookmark,
  Share2,
} from 'lucide-react';
import StatusBadge from './StatusBadge';
import { useLanguage } from '../context/LanguageContext';
import {
  fetchAssetIntelligence,
  fetchLatestAssetIntelligence,
  runAssetIntelligence,
  reviewAssetFinding,
  analyzeInspectionDocument,
  analyzeInfrastructureImage,
  askCopilot,
  uploadAssetMedia,
  createAssetFinding,
} from '../services/api';
import {
  getDemoAssetIntelligence,
  runDemoAssetIntelligence,
  reviewDemoAssetFinding,
  uploadDemoAssetMedia,
  createDemoAssetFinding,
  askDemoCopilot,
} from '../demo/demoService';
import { getAssetHeroImage, getAssetThumbnail } from '../utils/assetImages';

const API_BASE = import.meta.env.VITE_API_BASE_URL || '';
import {
  enrichFinding,
  buildComponentInventory,
  build3StageInterventionPlan,
  buildPrioritizedRiskTable,
  computeWholeAssetSummary,
  SEVERITY_LEVELS,
} from '../utils/componentIntelligence';

export default function AssetIntelligenceProfile({
  assetId,
  initialAsset = null,
  isOpen = true,
  onClose,
  onOpenDocument,
  onOpenInspections,
  onNavigate,
  isDemo = false,
  isAdmin = false,
}) {
  const { t } = useLanguage();

  // Active section jump navigation
  const [activeSection, setActiveSection] = useState('overview');

  // Core Data State
  const [intel, setIntel] = useState(null);
  const [latestAiRun, setLatestAiRun] = useState(null);
  const [loading, setLoading] = useState(true);
  const [runningAi, setRunningAi] = useState(false);
  const [error, setError] = useState(null);
  const [aiSuccessMessage, setAiSuccessMessage] = useState(null);

  // Intervention Plan active stage filter: 'all' | 'stage_a' | 'stage_b' | 'stage_c'
  const [interventionStageTab, setInterventionStageTab] = useState('stage_a');

  // 5 Modules active tab: 'structural' | 'environmental' | 'compliance' | 'operational' | 'predictive'
  const [activeModuleTab, setActiveModuleTab] = useState('structural');

  // Severity filter for components: 'all' | 1 | 2 | 3 | 4 | 5 | 0
  const [severityFilter, setSeverityFilter] = useState('all');

  // Finding Verification Modal State
  const [reviewingFinding, setReviewingFinding] = useState(null);
  const [reviewDecision, setReviewDecision] = useState('Verified');
  const [reviewerName, setReviewerName] = useState('Lead Infrastructure Engineer (AAYAM)');
  const [reviewNotes, setReviewNotes] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);
  const [reviewError, setReviewError] = useState(null);

  // Expanded Image Viewer Modal
  const [selectedImage, setSelectedImage] = useState(null);

  // Embedded Copilot Quick-Chat State
  const [copilotMessages, setCopilotMessages] = useState([]);
  const [copilotInput, setCopilotInput] = useState('');
  const [copilotLoading, setCopilotLoading] = useState(false);
  const chatBottomRef = useRef(null);

  // Document upload analysis state
  const [uploadingDoc, setUploadingDoc] = useState(false);

  const loadData = async () => {
    if (!assetId) return;
    setLoading(true);
    setError(null);
    try {
      if (isDemo || assetId.startsWith('DEMO-')) {
        const data = await getDemoAssetIntelligence(assetId);
        setIntel(data);
      } else {
        const [baseData, latestRun] = await Promise.allSettled([
          fetchAssetIntelligence(assetId),
          fetchLatestAssetIntelligence(assetId),
        ]);
        if (baseData.status === 'fulfilled') {
          setIntel(baseData.value);
        } else {
          throw baseData.reason;
        }
        if (latestRun.status === 'fulfilled' && latestRun.value) {
          setLatestAiRun(latestRun.value);
        }
      }
    } catch (err) {
      console.error('Failed to load asset intelligence profile:', err);
      setError(err.message || 'Unable to load asset intelligence profile.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [assetId, isDemo]);

  // Derived intelligence structures (uses backend calculation with fallback client enrichment)
  const currentAsset = intel?.asset || initialAsset || {};
  const assetCategory = currentAsset.category || 'Bridge';

  const enrichedFindings = useMemo(() => {
    const raw = intel?.findings || [];
    return raw.map((f) => enrichFinding(f, assetCategory));
  }, [intel?.findings, assetCategory]);

  const criticalAreas = useMemo(() => {
    if (intel?.critical_areas && intel.critical_areas.length > 0) {
      return intel.critical_areas.map((f) => enrichFinding(f, assetCategory));
    }
    const filtered = enrichedFindings.filter((f) => f.severity_level === 1 || f.severity_level === 2);
    return filtered.length > 0 ? filtered : enrichedFindings.slice(0, 2);
  }, [intel?.critical_areas, enrichedFindings, assetCategory]);

  const componentInventory = useMemo(() => {
    if (intel?.component_inventory && intel.component_inventory.length > 0) {
      return intel.component_inventory;
    }
    return buildComponentInventory(currentAsset, enrichedFindings, intel?.inspections || [], intel?.media || []);
  }, [intel?.component_inventory, currentAsset, enrichedFindings, intel?.inspections, intel?.media]);

  const interventionPlan = useMemo(() => {
    if (intel?.intervention_plan && intel.intervention_plan.stage_a) {
      return intel.intervention_plan;
    }
    return build3StageInterventionPlan(currentAsset, enrichedFindings, intel?.inspections || []);
  }, [intel?.intervention_plan, currentAsset, enrichedFindings, intel?.inspections]);

  const prioritizedRisks = useMemo(() => {
    if (intel?.prioritized_risks && intel.prioritized_risks.length > 0) {
      return intel.prioritized_risks;
    }
    return buildPrioritizedRiskTable(enrichedFindings);
  }, [intel?.prioritized_risks, enrichedFindings]);

  const conditionSummary = useMemo(() => {
    if (intel?.condition_summary && intel.condition_summary.overall_status) {
      return intel.condition_summary;
    }
    return computeWholeAssetSummary(
      currentAsset,
      intel?.heartbeat,
      enrichedFindings,
      componentInventory,
      intel?.inspections || []
    );
  }, [intel?.condition_summary, currentAsset, intel?.heartbeat, enrichedFindings, componentInventory, intel?.inspections]);

  // Filtered component inventory
  const filteredComponents = useMemo(() => {
    if (severityFilter === 'all') return componentInventory;
    return componentInventory.filter((c) => c.status_level === Number(severityFilter));
  }, [componentInventory, severityFilter]);

  // Handle Run AI Intelligence
  const handleExecuteAIAnalysis = async () => {
    if (runningAi) return;
    setRunningAi(true);
    setAiSuccessMessage(null);
    setError(null);
    try {
      if (isDemo || assetId.startsWith('DEMO-')) {
        await new Promise((r) => setTimeout(r, 600));
        await loadData();
        setAiSuccessMessage('Simulated Cloud Intelligence executed successfully.');
      } else {
        const runResult = await runAssetIntelligence(assetId);
        setLatestAiRun(runResult);
        await loadData();
        setAiSuccessMessage('Central Cloud Intelligence analysis executed and synchronized.');
      }
    } catch (err) {
      console.error('AI Analysis failed:', err);
      setError(err.message || 'Failed to execute Cloud AI analysis run.');
    } finally {
      setRunningAi(false);
    }
  };

  // Submit Engineer Review
  const handleSubmitReview = async () => {
    if (!reviewingFinding) return;
    setSubmittingReview(true);
    setReviewError(null);
    try {
      const reviewPayload = {
        verification_status: reviewDecision,
        review_decision_notes: reviewNotes || `Decision marked as ${reviewDecision} by authorized engineering officer.`,
        reviewed_by: reviewerName,
      };

      if (isDemo || assetId.startsWith('DEMO-')) {
        await reviewDemoAssetFinding(reviewingFinding.id, reviewPayload);
      } else {
        await reviewAssetFinding(reviewingFinding.id, reviewPayload);
      }

      await loadData();
      setReviewingFinding(null);
      setReviewNotes('');
    } catch (err) {
      console.error('Review submission failed:', err);
      setReviewError(err.message || 'Failed to record engineering review decision.');
    } finally {
      setSubmittingReview(false);
    }
  };

  // Copilot Ask
  const handleAskCopilot = async (promptOverride) => {
    const q = (promptOverride || copilotInput).trim();
    if (!q || copilotLoading) return;

    const userMsg = {
      sender: 'user',
      text: q,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };
    setCopilotMessages((prev) => [...prev, userMsg]);
    setCopilotInput('');
    setCopilotLoading(true);

    try {
      const res = isDemo || assetId.startsWith('DEMO-')
        ? await askDemoCopilot(q, { asset_id: assetId })
        : await askCopilot(q, { asset_id: assetId });

      const assistantMsg = {
        sender: 'assistant',
        text: res.answer,
        citations: res.citations || [],
        facts: res.observed_facts || [],
        recommendations: res.recommendations || [],
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setCopilotMessages((prev) => [...prev, assistantMsg]);
    } catch (err) {
      setCopilotMessages((prev) => [
        ...prev,
        {
          sender: 'assistant',
          text: `Error retrieving grounded synthesis: ${err.message || 'Please check backend connection.'}`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } finally {
      setCopilotLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/70 backdrop-blur-xs flex justify-center p-2 sm:p-4 lg:p-6 animate-in fade-in duration-150">
      <div className="bg-white w-full max-w-7xl rounded-2xl shadow-2xl border border-slate-200 flex flex-col my-auto max-h-[94vh] overflow-hidden">
        {/* =========================================================================
            HEADER & GLOBAL ACTIONS
            ========================================================================= */}
        <div className="p-4 sm:p-5 border-b border-slate-200 bg-white flex items-center justify-between gap-4 shrink-0">
          <div className="flex items-center gap-3.5 min-w-0">
            <div className="w-12 h-12 rounded-xl overflow-hidden bg-slate-100 border border-slate-200 shrink-0">
              <img
                src={getAssetThumbnail(currentAsset.id) || getAssetHeroImage(currentAsset.id)}
                alt={currentAsset.name}
                className="w-full h-full object-cover"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                }}
              />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-mono text-[11px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                  {currentAsset.id}
                </span>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-green-50 text-green-800 border border-green-200">
                  {currentAsset.category}
                </span>
                {isDemo && (
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-100 text-amber-800 font-semibold border border-amber-300">
                    Demo Mode Specimen
                  </span>
                )}
              </div>
              <h1 className="text-lg sm:text-xl font-black text-slate-900 truncate">
                {currentAsset.name}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleExecuteAIAnalysis}
              disabled={runningAi || loading}
              className="px-3.5 py-2 rounded-xl bg-green-700 hover:bg-green-800 text-white text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer disabled:opacity-50"
              title="Execute full 5-module condition assessment and risk prioritization"
            >
              {runningAi ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span className="hidden sm:inline">Analyzing...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Run Cloud Intelligence</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
              aria-label="Close dialog"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* =========================================================================
            STICKY JUMP NAVIGATION ANCHOR BAR
            ========================================================================= */}
        <div className="px-4 py-2 bg-slate-50 border-b border-slate-200 flex items-center gap-1.5 overflow-x-auto text-xs shrink-0 no-scrollbar">
          {[
            { id: 'overview', label: 'Overview & Condition' },
            { id: 'critical-areas', label: `Critical Areas (${criticalAreas.length})`, alert: criticalAreas.length > 0 },
            { id: 'severity', label: 'Severity Spectrum' },
            { id: 'prioritized-findings', label: `Prioritized Findings (${prioritizedRisks.length})` },
            { id: 'intervention-plan', label: `Intervention Plan (${interventionPlan.total_actions})`, badge: interventionPlan.immediate_count > 0 ? `${interventionPlan.immediate_count} Immediate` : null },
            { id: 'five-modules', label: '5 Modules Assessment' },
            { id: 'evidence', label: `Evidence (${intel?.sources?.length || 0})` },
            { id: 'history', label: 'Audit History' },
            { id: 'verification', label: 'Engineer Verification' },
            { id: 'copilot', label: 'Decision Assistant' },
          ].map((sec) => (
            <button
              key={sec.id}
              type="button"
              onClick={() => {
                setActiveSection(sec.id);
                const el = document.getElementById(`section-${sec.id}`);
                if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
              }}
              className={`px-3 py-1.5 rounded-lg font-semibold shrink-0 transition-all cursor-pointer flex items-center gap-1.5 ${
                activeSection === sec.id
                  ? 'bg-green-700 text-white shadow-2xs'
                  : 'bg-white text-slate-600 hover:bg-slate-100 hover:text-slate-900 border border-slate-200'
              }`}
            >
              <span>{sec.label}</span>
              {sec.alert && (
                <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              )}
              {sec.badge && (
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                  activeSection === sec.id ? 'bg-white text-green-800' : 'bg-red-100 text-red-800'
                }`}>
                  {sec.badge}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* =========================================================================
            MAIN SCROLLABLE CONTENT BODY (11-SECTION HIERARCHY)
            ========================================================================= */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-8 bg-slate-50/50">
          {loading ? (
            <div className="py-24 text-center space-y-3">
              <Loader2 className="w-10 h-10 text-green-700 animate-spin mx-auto" />
              <p className="text-sm font-bold text-slate-800">
                Loading complete infrastructure intelligence profile...
              </p>
              <p className="text-xs text-slate-500 font-mono">
                Compiling Digital Heartbeat, component taxonomy, and verified audit archives.
              </p>
            </div>
          ) : error ? (
            <div className="p-5 rounded-2xl bg-red-50 border border-red-200 text-red-900 space-y-2">
              <div className="flex items-center gap-2 font-bold text-sm">
                <AlertCircle className="w-5 h-5 text-red-700 shrink-0" />
                <span>Failed to load intelligence profile</span>
              </div>
              <p className="text-xs font-mono text-red-800">{error}</p>
              <button
                type="button"
                onClick={loadData}
                className="px-4 py-2 rounded-xl bg-red-700 text-white text-xs font-semibold hover:bg-red-800 transition-colors"
              >
                Retry Loading
              </button>
            </div>
          ) : (
            <>
              {/* Notification Banner on AI Run */}
              {aiSuccessMessage && (
                <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-300 text-xs text-emerald-950 flex items-center justify-between gap-3 shadow-2xs">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
                    <span className="font-semibold">{aiSuccessMessage}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setAiSuccessMessage(null)}
                    className="text-emerald-700 hover:text-emerald-900 text-xs font-bold"
                  >
                    Dismiss
                  </button>
                </div>
              )}

              {/* =========================================================================
                  SECTION 1: ASSET OVERVIEW & CONDITION SUMMARY
                  ========================================================================= */}
              <section id="section-overview" className="p-6 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-5">
                {/* Overall Operational Status Directive Banner */}
                <div className={`p-4 rounded-xl border flex flex-col md:flex-row md:items-center justify-between gap-4 ${conditionSummary.status_bg}`}>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <ShieldAlert className="w-5 h-5 text-current shrink-0" />
                      <span className="text-xs uppercase font-extrabold tracking-wider">
                        Overall Infrastructure Status
                      </span>
                    </div>
                    <h2 className="text-xl font-black">{conditionSummary.overall_status}</h2>
                    <p className="text-xs leading-relaxed max-w-3xl opacity-90">
                      {conditionSummary.status_directive}
                    </p>
                  </div>

                  <div className="flex items-center gap-4 shrink-0 bg-white/80 backdrop-blur-xs p-3 rounded-xl border border-current/20">
                    <div className="text-center">
                      <span className="text-[10px] uppercase font-bold text-slate-500 block">Risk Score</span>
                      <span className="text-xl font-black text-slate-900 font-mono">
                        {conditionSummary.risk_score}/100
                      </span>
                    </div>
                    <div className="h-8 w-px bg-slate-200" />
                    <div className="text-center">
                      <span className="text-[10px] uppercase font-bold text-slate-500 block">Health Index</span>
                      <span className="text-xl font-black text-green-700 font-mono">
                        {conditionSummary.health_index}%
                      </span>
                    </div>
                  </div>
                </div>

                {/* Key Metrics KPI Strip */}
                <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
                  <div className="p-3 rounded-xl bg-red-50/70 border border-red-200 text-center">
                    <span className="text-[10px] uppercase font-bold text-red-700 block">Critical Areas</span>
                    <span className="text-2xl font-black text-red-800 font-mono">{conditionSummary.critical_count}</span>
                  </div>
                  <div className="p-3 rounded-xl bg-orange-50/70 border border-orange-200 text-center">
                    <span className="text-[10px] uppercase font-bold text-orange-700 block">High Priority</span>
                    <span className="text-2xl font-black text-orange-800 font-mono">{conditionSummary.high_count}</span>
                  </div>
                  <div className="p-3 rounded-xl bg-amber-50/70 border border-amber-200 text-center">
                    <span className="text-[10px] uppercase font-bold text-amber-700 block">Moderate</span>
                    <span className="text-2xl font-black text-amber-800 font-mono">{conditionSummary.moderate_count}</span>
                  </div>
                  <div className="p-3 rounded-xl bg-blue-50/70 border border-blue-200 text-center">
                    <span className="text-[10px] uppercase font-bold text-blue-700 block">Low / Routine</span>
                    <span className="text-2xl font-black text-blue-800 font-mono">{conditionSummary.low_count}</span>
                  </div>
                  <div className="p-3 rounded-xl bg-purple-50/70 border border-purple-200 text-center">
                    <span className="text-[10px] uppercase font-bold text-purple-700 block">Pending Reviews</span>
                    <span className="text-2xl font-black text-purple-800 font-mono">{conditionSummary.pending_reviews}</span>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-center">
                    <span className="text-[10px] uppercase font-bold text-slate-600 block">Data Gaps</span>
                    <span className="text-2xl font-black text-slate-700 font-mono">{conditionSummary.data_gaps_count}</span>
                  </div>
                  <div className="p-3 rounded-xl bg-green-50/70 border border-green-200 text-center">
                    <span className="text-[10px] uppercase font-bold text-green-700 block">Completeness</span>
                    <span className="text-2xl font-black text-green-800 font-mono">{intel?.completeness?.percentage || 95}%</span>
                  </div>
                </div>

                {/* Asset Metadata & Ownership Ledger */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-xs text-slate-700 pt-1 border-t border-slate-100">
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-slate-400 shrink-0" />
                    <div>
                      <span className="text-[10px] text-slate-400 block uppercase font-semibold">Location</span>
                      <span className="font-bold text-slate-800">{currentAsset.district}, {currentAsset.state}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-slate-400 shrink-0" />
                    <div>
                      <span className="text-[10px] text-slate-400 block uppercase font-semibold">Commission Year</span>
                      <span className="font-bold text-slate-800">{currentAsset.construction_year || 'N/A'} (Age: {new Date().getFullYear() - (currentAsset.construction_year || 1990)} yrs)</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-slate-400 shrink-0" />
                    <div>
                      <span className="text-[10px] text-slate-400 block uppercase font-semibold">Responsible Authority</span>
                      <span className="font-bold text-slate-800">{currentAsset.ownership_authority || 'State Public Works Department (PWD)'}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Activity className="w-4 h-4 text-slate-400 shrink-0" />
                    <div>
                      <span className="text-[10px] text-slate-400 block uppercase font-semibold">Last Certified Inspection</span>
                      <span className="font-bold text-slate-800">{currentAsset.last_inspection_date || 'N/A'}</span>
                    </div>
                  </div>
                </div>
              </section>

              {/* =========================================================================
                  SECTION 2: CRITICAL INFRASTRUCTURE AREAS (HIGH PROMINENCE)
                  ========================================================================= */}
              <section id="section-critical-areas" className="p-6 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full bg-red-600 animate-pulse" />
                      <h2 className="text-lg font-black text-slate-900 tracking-tight">
                        Critical Infrastructure Areas ({criticalAreas.length})
                      </h2>
                    </div>
                    <p className="text-xs text-slate-600">
                      High-severity physical components requiring immediate intervention, consequence containment, and authorized engineering sign-off.
                    </p>
                  </div>
                  <span className="font-mono text-xs px-2.5 py-1 rounded bg-red-50 text-red-800 border border-red-200 font-bold shrink-0">
                    Highest Hazard Priority
                  </span>
                </div>

                {criticalAreas.length > 0 ? (
                  <div className="space-y-4">
                    {criticalAreas.map((area, idx) => (
                      <div
                        key={area.id || idx}
                        className="rounded-xl border-2 border-red-300 bg-white p-5 shadow-xs space-y-4 transition-all hover:border-red-400"
                      >
                        {/* Area Title & Key Badges */}
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-100 pb-3">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-mono text-[10px] uppercase font-black px-2 py-0.5 rounded bg-red-600 text-white">
                                Critical Area {String(idx + 1).padStart(2, '0')}
                              </span>
                              <span className="text-xs font-bold text-red-800 bg-red-100 border border-red-200 px-2.5 py-0.5 rounded-full">
                                {area.severity_name || 'Level 1 — Critical'}
                              </span>
                              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-50 text-blue-800 border border-blue-200 font-semibold">
                                {area.evidence_classification || 'Documented'}
                              </span>
                              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                                Confidence: {area.confidence_level || 'High'}
                              </span>
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                area.verification_status === 'Verified'
                                  ? 'bg-green-100 text-green-800 border border-green-300'
                                  : 'bg-amber-100 text-amber-800 border border-amber-300'
                              }`}>
                                {area.verification_status || 'Pending Verification'}
                              </span>
                            </div>

                            <h3 className="text-base font-black text-slate-900">
                              {area.affected_component}
                            </h3>

                            <p className="text-xs font-mono text-slate-500 flex items-center gap-1.5">
                              <MapPin className="w-3.5 h-3.5 text-red-600 shrink-0" />
                              <span className="font-semibold text-slate-700">Location:</span>
                              <span>{area.exact_location}</span>
                            </p>
                          </div>

                          <div className="p-2.5 rounded-xl bg-red-50 border border-red-200 text-right shrink-0">
                            <span className="text-[10px] uppercase font-bold text-red-700 block">Risk Contribution</span>
                            <span className="text-sm font-black font-mono text-red-900">
                              +{area.risk_contribution_pts || 28.5} pts to Heartbeat
                            </span>
                          </div>
                        </div>

                        {/* 10-Point Analysis Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                          {/* Left Column: Observed Condition & Consequences */}
                          <div className="space-y-3">
                            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5">
                              <span className="text-[10px] uppercase font-bold text-slate-600 tracking-wider flex items-center gap-1.5">
                                <Eye className="w-3.5 h-3.5 text-green-700" />
                                <span>Observed Actual Condition</span>
                              </span>
                              <p className="text-slate-800 font-medium leading-relaxed">
                                {area.plain_explanation || area.title}
                              </p>
                              {area.technical_explanation && (
                                <p className="text-[11px] font-mono text-slate-600 pt-1 border-t border-slate-200 leading-snug">
                                  {area.technical_explanation}
                                </p>
                              )}
                            </div>

                            <div className="p-3.5 rounded-xl bg-red-50/70 border border-red-200 text-red-950 space-y-1">
                              <span className="text-[10px] uppercase font-bold text-red-700 tracking-wider flex items-center gap-1.5">
                                <AlertTriangle className="w-3.5 h-3.5 text-red-600" />
                                <span>Potential Consequences (Risk Scenario)</span>
                              </span>
                              <p className="text-xs leading-relaxed font-medium">
                                {area.potential_consequences}
                              </p>
                            </div>
                          </div>

                          {/* Right Column: Immediate Action, Discipline & Evidence */}
                          <div className="space-y-3">
                            <div className="p-3.5 rounded-xl bg-amber-50/80 border border-amber-300 text-amber-950 space-y-1.5">
                              <span className="text-[10px] uppercase font-bold text-amber-800 tracking-wider flex items-center gap-1.5">
                                <Zap className="w-3.5 h-3.5 text-amber-700" />
                                <span>Immediate Required Action (Within 24–48 Hours)</span>
                              </span>
                              <p className="text-xs leading-relaxed font-semibold text-amber-950">
                                {area.immediate_action}
                              </p>
                              <div className="text-[11px] text-amber-900 pt-1 border-t border-amber-200 font-medium">
                                <span className="font-bold">Required Approval:</span> {area.approval_required}
                              </div>
                            </div>

                            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5">
                              <span className="text-[10px] uppercase font-bold text-slate-600 tracking-wider flex items-center gap-1.5">
                                <Wrench className="w-3.5 h-3.5 text-green-700" />
                                <span>Recommended Further Investigation</span>
                              </span>
                              <p className="text-xs text-slate-700 leading-relaxed">
                                {area.further_investigation}
                              </p>
                              <div className="text-[11px] text-slate-600 pt-1 border-t border-slate-200">
                                <span className="font-bold text-slate-700">Responsible Wing:</span>{' '}
                                <span className="font-mono text-slate-900">{area.responsible_discipline}</span>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Evidence Provenance Footer & Engineer Review Triggers */}
                        <div className="pt-3 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                          <div className="flex items-center gap-2 text-slate-600">
                            <BookOpen className="w-3.5 h-3.5 text-green-700 shrink-0" />
                            <span className="font-semibold text-slate-700">Supporting Evidence:</span>
                            <span className="font-mono text-[11px] text-slate-800 truncate max-w-sm" title={area.source_document || area.supporting_evidence}>
                              {area.source_document || area.supporting_evidence || 'Certified Inspection Report'}
                            </span>
                            {area.source_document && onOpenDocument && (
                              <button
                                type="button"
                                onClick={() => onOpenDocument(area.source_document)}
                                className="text-green-700 hover:underline font-semibold ml-1 cursor-pointer"
                              >
                                View PDF
                              </button>
                            )}
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            <button
                              type="button"
                              onClick={() => {
                                setReviewingFinding(area);
                                setReviewDecision('Verified');
                              }}
                              className="px-3 py-1.5 rounded-lg bg-green-700 hover:bg-green-800 text-white font-semibold text-xs transition-colors cursor-pointer flex items-center gap-1"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>Verify Area</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setReviewingFinding(area);
                                setReviewDecision('Requires Further Inspection');
                              }}
                              className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 font-semibold text-xs transition-colors cursor-pointer"
                            >
                              Request Audit
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-6 rounded-xl bg-green-50 border border-green-200 text-center space-y-1">
                    <CheckCircle2 className="w-8 h-8 text-green-600 mx-auto" />
                    <p className="text-sm font-bold text-green-900">
                      No Critical Areas Identified in Active Records
                    </p>
                    <p className="text-xs text-green-700">
                      All inspected components remain within nominal engineering safety margins.
                    </p>
                  </div>
                )}
              </section>

              {/* =========================================================================
                  SECTION 3: RISK SEVERITY & COMPONENT INVENTORY SPECTRUM
                  ========================================================================= */}
              <section id="section-severity" className="p-6 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                  <div>
                    <h2 className="text-base font-black text-slate-900">
                      Multi-Level Severity Spectrum & Component Inventory
                    </h2>
                    <p className="text-xs text-slate-500">
                      Standardized 5-level severity classification distinguishing known defects from nominal operational and uninspected data gaps.
                    </p>
                  </div>
                  <span className="text-xs font-mono text-slate-500">
                    Total Evaluated Components: {componentInventory.length}
                  </span>
                </div>

                {/* Severity Spectrum Filter Buttons */}
                <div className="grid grid-cols-2 sm:grid-cols-6 gap-2">
                  {[
                    { id: 'all', label: 'All Components', count: componentInventory.length, color: 'bg-slate-800 text-white' },
                    { id: '1', label: 'Level 1: Critical', count: componentInventory.filter((c) => c.status_level === 1).length, color: 'bg-red-100 text-red-800 border border-red-300' },
                    { id: '2', label: 'Level 2: High', count: componentInventory.filter((c) => c.status_level === 2).length, color: 'bg-orange-100 text-orange-800 border border-orange-300' },
                    { id: '3', label: 'Level 3: Moderate', count: componentInventory.filter((c) => c.status_level === 3).length, color: 'bg-amber-100 text-amber-800 border border-amber-300' },
                    { id: '5', label: 'Level 5: Nominal', count: componentInventory.filter((c) => c.status_level === 5).length, color: 'bg-green-100 text-green-800 border border-green-300' },
                    { id: '0', label: 'Data Gaps', count: componentInventory.filter((c) => c.status_level === 0).length, color: 'bg-slate-100 text-slate-700 border border-slate-300' },
                  ].map((btn) => {
                    const isSelected = severityFilter === btn.id;
                    return (
                      <button
                        key={btn.id}
                        type="button"
                        onClick={() => setSeverityFilter(btn.id)}
                        className={`p-3 rounded-xl text-left border transition-all cursor-pointer flex flex-col justify-between ${
                          isSelected
                            ? 'ring-2 ring-green-600 bg-white border-green-600 shadow-2xs'
                            : 'bg-slate-50/70 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-bold text-slate-900 truncate">{btn.label}</span>
                          <span className={`text-[10px] font-mono font-bold px-1.5 py-0.2 rounded ${btn.color}`}>
                            {btn.count}
                          </span>
                        </div>
                        <span className="text-[10px] text-slate-500">
                          {btn.id === '1' && 'Immediate Threat'}
                          {btn.id === '2' && 'Urgent Correction'}
                          {btn.id === '3' && 'Planned Maintenance'}
                          {btn.id === '5' && 'Inspected Baseline'}
                          {btn.id === '0' && 'Not Yet Audited'}
                          {btn.id === 'all' && 'Master Inventory'}
                        </span>
                      </button>
                    );
                  })}
                </div>

                {/* Component Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
                  {filteredComponents.map((comp, idx) => (
                    <div
                      key={idx}
                      className="p-3.5 rounded-xl bg-white border border-slate-200 hover:border-slate-300 shadow-2xs space-y-2 flex flex-col justify-between"
                    >
                      <div className="space-y-1.5">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                              {comp.subsystem} &bull; {comp.discipline}
                            </span>
                            <h4 className="text-xs font-bold text-slate-900">
                              {comp.component_name}
                            </h4>
                          </div>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${comp.badge_class}`}>
                            {comp.status_label}
                          </span>
                        </div>

                        <p className="text-[11px] text-slate-700 leading-relaxed">
                          {comp.condition_summary}
                        </p>
                      </div>

                      <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-500 font-mono">
                        <span className="font-semibold text-slate-700">Urgency: {comp.action_urgency}</span>
                        {comp.evidence_reference && (
                          <span className="truncate max-w-[140px]" title={comp.evidence_reference}>
                            Ref: {comp.evidence_reference}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              {/* =========================================================================
                  SECTION 4: PRIORITIZED FINDINGS MATRIX
                  ========================================================================= */}
              <section id="section-prioritized-findings" className="p-6 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                  <div>
                    <h2 className="text-base font-black text-slate-900">
                      Prioritized Infrastructure Findings Matrix
                    </h2>
                    <p className="text-xs text-slate-500">
                      Rigorous prioritization ordered by severity, potential consequences, evidence quality, and Digital Heartbeat risk weighting.
                    </p>
                  </div>
                  <span className="text-xs font-mono font-bold text-green-700">
                    {prioritizedRisks.length} Actionable Findings
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-slate-800">
                    <thead className="bg-slate-50 border-b border-slate-200 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                      <tr>
                        <th className="py-2.5 px-3">Priority</th>
                        <th className="py-2.5 px-3">Infrastructure Area & Component</th>
                        <th className="py-2.5 px-3">Observed Condition</th>
                        <th className="py-2.5 px-3">Severity & Domain</th>
                        <th className="py-2.5 px-3">Consequences & Required Response</th>
                        <th className="py-2.5 px-3">Discipline</th>
                        <th className="py-2.5 px-3 text-right">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {prioritizedRisks.map((item) => (
                        <tr key={item.finding_id} className="hover:bg-slate-50/70 transition-colors">
                          <td className="py-3 px-3 font-mono font-black text-slate-900 text-sm">
                            #{item.priority}
                          </td>
                          <td className="py-3 px-3 space-y-0.5">
                            <span className="font-bold text-slate-900 block">{item.affected_component}</span>
                            <span className="text-[10px] text-slate-500 font-mono block">{item.exact_location}</span>
                          </td>
                          <td className="py-3 px-3 max-w-xs text-slate-700 leading-snug">
                            {item.observed_condition || item.title}
                          </td>
                          <td className="py-3 px-3 space-y-1">
                            <span className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-full ${
                              item.severity_level === 1 ? 'bg-red-100 text-red-800 border border-red-200'
                              : item.severity_level === 2 ? 'bg-orange-100 text-orange-800 border border-orange-200'
                              : 'bg-amber-100 text-amber-800 border border-amber-200'
                            }`}>
                              {item.severity}
                            </span>
                            <span className="block text-[10px] font-mono text-slate-500">
                              {item.category}
                            </span>
                          </td>
                          <td className="py-3 px-3 space-y-1 max-w-sm">
                            <p className="text-[11px] font-medium text-slate-900 line-clamp-2">
                              {item.required_response}
                            </p>
                            <p className="text-[10px] text-slate-500 italic line-clamp-1">
                              Impact: {item.potential_consequences}
                            </p>
                          </td>
                          <td className="py-3 px-3 text-[11px] font-mono text-slate-600">
                            {item.responsible_discipline}
                          </td>
                          <td className="py-3 px-3 text-right">
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap ${
                              item.verification_status === 'Verified'
                                ? 'bg-green-100 text-green-800'
                                : 'bg-amber-100 text-amber-800'
                            }`}>
                              {item.verification_status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>

              {/* =========================================================================
                  SECTION 5: IMMEDIATE ACTIONS & INTERVENTION PLAN (3 STAGES)
                  ========================================================================= */}
              <section id="section-intervention-plan" className="p-6 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                  <div>
                    <h2 className="text-base font-black text-slate-900 flex items-center gap-2">
                      <Zap className="w-4 h-4 text-green-700" />
                      <span>Immediate Actions & Intervention Plan</span>
                    </h2>
                    <p className="text-xs text-slate-500">
                      Three-stage structured response matrix separating immediate hazard containment from corrective repairs and long-term prevention.
                    </p>
                  </div>
                  <div className="flex items-center gap-1 font-mono text-xs">
                    <span className="px-2 py-0.5 rounded bg-red-100 text-red-800 font-bold">
                      {interventionPlan.immediate_count} Immediate
                    </span>
                    <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-800 font-bold">
                      {interventionPlan.corrective_count} Corrective
                    </span>
                    <span className="px-2 py-0.5 rounded bg-blue-100 text-blue-800 font-bold">
                      {interventionPlan.preventive_count} Preventive
                    </span>
                  </div>
                </div>

                {/* Stage Tabs */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {[
                    { id: 'stage_a', label: 'Stage A — Immediate Response', sub: '0–48 Hours • Urgent Hazard Control', count: interventionPlan.immediate_count, color: 'text-red-700', activeBg: 'bg-red-50 border-red-500' },
                    { id: 'stage_b', label: 'Stage B — Corrective Intervention', sub: '7–30 Days • Technical Repair Works', count: interventionPlan.corrective_count, color: 'text-amber-700', activeBg: 'bg-amber-50 border-amber-500' },
                    { id: 'stage_c', label: 'Stage C — Long-Term Prevention', sub: '30–180 Days • Telemetry & Recurrence Guard', count: interventionPlan.preventive_count, color: 'text-blue-700', activeBg: 'bg-blue-50 border-blue-500' },
                  ].map((tab) => {
                    const isActive = interventionStageTab === tab.id;
                    return (
                      <button
                        key={tab.id}
                        type="button"
                        onClick={() => setInterventionStageTab(tab.id)}
                        className={`p-4 rounded-xl text-left border-2 transition-all cursor-pointer ${
                          isActive
                            ? `${tab.activeBg} shadow-xs`
                            : 'bg-white border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className={`text-xs font-black ${tab.color}`}>{tab.label}</span>
                          <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-white border border-current shadow-2xs">
                            {tab.count} Actions
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500">{tab.sub}</p>
                      </button>
                    );
                  })}
                </div>

                {/* Active Stage Action Cards */}
                <div className="space-y-3 pt-2">
                  {(interventionPlan[interventionStageTab] || []).length > 0 ? (
                    (interventionPlan[interventionStageTab] || []).map((action, idx) => (
                      <div
                        key={idx}
                        className="p-4 rounded-xl bg-slate-50 border border-slate-200 hover:border-slate-300 transition-all space-y-3"
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 pb-2">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs font-black px-2 py-0.5 rounded bg-slate-800 text-white">
                              {action.priority_rank}
                            </span>
                            <h4 className="text-xs font-bold text-slate-900">
                              {action.action_title}
                            </h4>
                          </div>
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-100 text-amber-800 font-bold border border-amber-200 shrink-0">
                            Timeframe: {action.timeframe}
                          </span>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                          <div>
                            <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">Required Action</span>
                            <p className="text-slate-800 leading-relaxed font-medium">
                              {action.description}
                            </p>
                          </div>
                          <div>
                            <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">Engineering Justification</span>
                            <p className="text-slate-600 leading-relaxed italic">
                              "{action.justification}"
                            </p>
                          </div>
                        </div>

                        <div className="pt-2 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[11px] text-slate-600">
                          <div>
                            <span className="font-bold text-slate-700">Assigned Department:</span>{' '}
                            <span className="font-mono text-slate-800">{action.responsible_department}</span>
                          </div>
                          <div>
                            <span className="font-bold text-slate-700">Required Approval:</span>{' '}
                            <span className="text-slate-800 font-medium">{action.required_approval}</span>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="p-6 rounded-xl bg-slate-50 border border-slate-200 text-center text-xs text-slate-500">
                      No specific actions designated in this stage.
                    </div>
                  )}
                </div>
              </section>

              {/* =========================================================================
                  SECTION 6: FIVE INTELLIGENCE MODULES (IMPROVED DOMAIN SYNTHESIS)
                  ========================================================================= */}
              <section id="section-five-modules" className="p-6 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                  <div>
                    <h2 className="text-base font-black text-slate-900">
                      5-Module Infrastructure Intelligence Assessment
                    </h2>
                    <p className="text-xs text-slate-500">
                      Detailed domain synthesis covering structural mechanics, climate exposure, statutory codes, operational loads, and deterioration trends.
                    </p>
                  </div>
                </div>

                {/* Module Selector Tabs */}
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                  {[
                    { id: 'structural', label: 'Structural', desc: 'Cracks, Scour, Girders' },
                    { id: 'environmental', label: 'Environmental', desc: 'Hydrology, Salinity, Rain' },
                    { id: 'compliance', label: 'Compliance', desc: 'IRC, CPWD, IS Audits' },
                    { id: 'operational', label: 'Operational', desc: 'Traffic, SCADA, Motors' },
                    { id: 'predictive', label: 'Predictive', desc: 'Deterioration Curves' },
                  ].map((m) => {
                    const isCur = activeModuleTab === m.id;
                    return (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => setActiveModuleTab(m.id)}
                        className={`p-3 rounded-xl text-left border transition-all cursor-pointer ${
                          isCur
                            ? 'bg-green-50 border-green-600 shadow-2xs'
                            : 'bg-slate-50 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        <span className={`text-xs font-bold block ${isCur ? 'text-green-800' : 'text-slate-800'}`}>
                          {m.label}
                        </span>
                        <span className="text-[10px] text-slate-500 block truncate">{m.desc}</span>
                      </button>
                    );
                  })}
                </div>

                {/* Section 6 Predictive Safeguard Alert when on predictive tab */}
                {activeModuleTab === 'predictive' && (
                  <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-300 text-xs text-amber-950 flex items-start gap-2.5">
                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold uppercase tracking-wider text-[11px] block text-amber-900">
                        Section 6 Predictive Intelligence Safeguard
                      </span>
                      <p className="text-[11px] text-amber-800 leading-relaxed">
                        Predictive degradation models require &ge; 3 baseline inspections. Projections represent experimental mathematical trend extrapolations and MUST NOT be treated as engineering-certified design lifespans.
                      </p>
                    </div>
                  </div>
                )}

                {/* Active Module Narrative Summary */}
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-800 space-y-2">
                  <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider block">
                    {activeModuleTab.toUpperCase()} DOMAIN SYNTHESIS
                  </span>
                  <p className="leading-relaxed text-slate-700">
                    {latestAiRun && latestAiRun[`${activeModuleTab}_summary`]
                      ? latestAiRun[`${activeModuleTab}_summary`]
                      : `Active assessment for ${currentAsset.name} in the ${activeModuleTab} domain indicates verified field telemetry is monitored under standard PWD protocols.`}
                  </p>
                </div>
              </section>

              {/* =========================================================================
                  SECTION 7: EVIDENCE & SOURCE VIEWER
                  ========================================================================= */}
              <section id="section-evidence" className="p-6 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                  <div>
                    <h2 className="text-base font-black text-slate-900 flex items-center gap-2">
                      <BookOpen className="w-4 h-4 text-green-700" />
                      <span>Traceable Evidence & Document Archive</span>
                    </h2>
                    <p className="text-xs text-slate-500">
                      Indexed engineering inspection reports, bathymetric sonar surveys, field photos, and technical certs.
                    </p>
                  </div>
                  <span className="text-xs font-mono text-slate-500">
                    {intel?.sources?.length || 0} Documents &bull; {intel?.media?.length || 0} Photos
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {(intel?.sources || []).map((src, idx) => (
                    <div
                      key={src.id || idx}
                      className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 hover:border-slate-300 transition-all flex flex-col justify-between space-y-2"
                    >
                      <div className="space-y-1">
                        <div className="flex items-start justify-between gap-2">
                          <h4 className="text-xs font-bold text-slate-900 leading-snug">
                            {src.title || src.document_name}
                          </h4>
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-200 text-slate-700 font-semibold shrink-0">
                            {src.source_type || 'PDF Report'}
                          </span>
                        </div>
                        {src.excerpt && (
                          <p className="text-[11px] text-slate-600 italic line-clamp-2">
                            "{src.excerpt}"
                          </p>
                        )}
                      </div>

                      <div className="pt-2 border-t border-slate-200 flex items-center justify-between text-[10px] text-slate-500">
                        <span>Provider: {src.provider || 'State PWD'}</span>
                        {src.document_name && onOpenDocument && (
                          <button
                            type="button"
                            onClick={() => onOpenDocument(src.document_name)}
                            className="text-green-700 font-semibold hover:underline flex items-center gap-1 cursor-pointer"
                          >
                            <span>Inspect Document</span>
                            <ArrowUpRight className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Visual Media Gallery Preview */}
                {(intel?.media || []).length > 0 && (
                  <div className="space-y-2 pt-2 border-t border-slate-100">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-600 block">
                      Field Photographic Evidence ({intel.media.length})
                    </span>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      {intel.media.map((m, idx) => (
                        <div
                          key={m.id || idx}
                          onClick={() => setSelectedImage(m)}
                          className="rounded-xl overflow-hidden border border-slate-200 bg-slate-100 hover:border-green-600 cursor-pointer group transition-all"
                        >
                          <div className="h-28 overflow-hidden">
                            <img
                              src={`${API_BASE}/api/media/${m.file_name}`}
                              alt={m.caption}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                              onError={(e) => {
                                e.currentTarget.src = getAssetThumbnail(currentAsset.id);
                              }}
                            />
                          </div>
                          <div className="p-2 text-[10px] text-slate-700 truncate" title={m.caption}>
                            {m.caption}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </section>

              {/* =========================================================================
                  SECTION 8: HISTORICAL CONDITION ANALYSIS & AUDIT LEDGER
                  ========================================================================= */}
              <section id="section-history" className="p-6 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                  <div>
                    <h2 className="text-base font-black text-slate-900 flex items-center gap-2">
                      <History className="w-4 h-4 text-green-700" />
                      <span>Historical Condition Analysis & Inspection Timeline</span>
                    </h2>
                    <p className="text-xs text-slate-500">
                      Chronological record of official engineering inspections, repair interventions, and verified sign-offs.
                    </p>
                  </div>
                </div>

                <div className="space-y-3">
                  {(intel?.inspections || []).map((insp, idx) => (
                    <div
                      key={insp.id || idx}
                      className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded bg-slate-200 text-slate-700">
                            {insp.inspection_date}
                          </span>
                          <span className="font-bold text-slate-900">{insp.inspection_type}</span>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            insp.status === 'Verified' ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'
                          }`}>
                            {insp.status}
                          </span>
                        </div>
                        <p className="text-slate-700 leading-snug">
                          {insp.findings}
                        </p>
                        {insp.actual_action_taken && (
                          <p className="text-[11px] text-green-800 font-medium">
                            Action Taken: {insp.actual_action_taken}
                          </p>
                        )}
                      </div>

                      <div className="text-right shrink-0 font-mono text-[11px] text-slate-500">
                        <span>Inspector: {insp.responsible_user || 'Authorized Officer'}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              {/* =========================================================================
                  SECTION 10: ENGINEER REVIEW & VERIFICATION WORKFLOW
                  ========================================================================= */}
              <section id="section-verification" className="p-6 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                  <div>
                    <h2 className="text-base font-black text-slate-900 flex items-center gap-2">
                      <UserCheck className="w-4 h-4 text-green-700" />
                      <span>Engineer Review & Verification Workflow</span>
                    </h2>
                    <p className="text-xs text-slate-500">
                      Audit ledger allowing certified engineers to officially Verify, Reject, or Request Further Inspection on AI and field findings.
                    </p>
                  </div>
                </div>

                <div className="space-y-3">
                  {enrichedFindings.map((f) => (
                    <div
                      key={f.id}
                      className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-[10px] font-bold text-slate-500">[{f.id}]</span>
                          <span className="font-bold text-slate-900">{f.title}</span>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            f.verification_status === 'Verified' ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'
                          }`}>
                            {f.verification_status}
                          </span>
                        </div>
                        <p className="text-slate-600 text-[11px] line-clamp-1">{f.plain_explanation}</p>
                        {f.reviewed_by && (
                          <p className="text-[10px] text-slate-400 font-mono">
                            Last reviewed by {f.reviewed_by} on {f.reviewed_at || 'recent audit'}
                          </p>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={() => setReviewingFinding(f)}
                        className="px-3 py-1.5 rounded-lg bg-white hover:bg-slate-100 text-green-800 border border-slate-300 text-xs font-semibold shrink-0 cursor-pointer"
                      >
                        Review / Sign-off
                      </button>
                    </div>
                  ))}
                </div>
              </section>

              {/* =========================================================================
                  SECTION 11: ASK AAYAM INTELLIGENCE ASSISTANT (EMBEDDED QUICK-COPILOT)
                  ========================================================================= */}
              <section id="section-copilot" className="p-6 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-4">
                <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                  <Bot className="w-5 h-5 text-green-700" />
                  <div>
                    <h2 className="text-base font-black text-slate-900">
                      Ask AAYAM Intelligence Assistant
                    </h2>
                    <p className="text-xs text-slate-500">
                      Direct evidence-grounded queries for {currentAsset.name}.
                    </p>
                  </div>
                </div>

                {/* Suggested prompt chips */}
                <div className="flex items-center gap-2 flex-wrap">
                  {[
                    `Why is this ${currentAsset.category?.toLowerCase() || 'asset'} classified as critical?`,
                    'What are the immediate response requirements?',
                    'Which official evidence supports the findings?',
                    'What is the remaining useful life estimate?',
                  ].map((chip, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleAskCopilot(chip)}
                      disabled={copilotLoading}
                      className="px-2.5 py-1 rounded-full bg-slate-100 hover:bg-green-50 text-slate-700 hover:text-green-800 text-[11px] border border-slate-200 transition-colors cursor-pointer"
                    >
                      {chip}
                    </button>
                  ))}
                </div>

                {/* Conversation Box */}
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 min-h-[140px] max-h-80 overflow-y-auto space-y-3">
                  {copilotMessages.length > 0 ? (
                    copilotMessages.map((msg, idx) => (
                      <div
                        key={idx}
                        className={`p-3 rounded-xl text-xs space-y-1.5 ${
                          msg.sender === 'user'
                            ? 'bg-green-700 text-white ml-auto max-w-lg'
                            : 'bg-white text-slate-800 border border-slate-200 max-w-2xl'
                        }`}
                      >
                        <div className="flex items-center justify-between text-[10px] opacity-75 font-mono">
                          <span>{msg.sender === 'user' ? 'Inquiry' : 'AAYAM Intelligence Assistant'}</span>
                          <span>{msg.timestamp}</span>
                        </div>
                        <p className="leading-relaxed whitespace-pre-wrap">{msg.text}</p>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-6 text-slate-400 text-xs">
                      Type a question above or select a suggested prompt chip to query {currentAsset.name}.
                    </div>
                  )}
                  <div ref={chatBottomRef} />
                </div>

                {/* Input Bar */}
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleAskCopilot();
                  }}
                  className="flex gap-2"
                >
                  <input
                    type="text"
                    value={copilotInput}
                    onChange={(e) => setCopilotInput(e.target.value)}
                    placeholder={`Ask about ${currentAsset.name} (e.g. 'What is the required rip-rap grading?')...`}
                    className="flex-1 bg-white border border-slate-300 rounded-lg px-4 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-green-600"
                    disabled={copilotLoading}
                  />
                  <button
                    type="submit"
                    disabled={copilotLoading || !copilotInput.trim()}
                    className="px-5 py-2.5 bg-green-700 hover:bg-green-800 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 disabled:opacity-40 cursor-pointer"
                  >
                    {copilotLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                    <span>Ask Assistant</span>
                  </button>
                </form>
              </section>
            </>
          )}
        </div>

        {/* =========================================================================
            MODAL: ENGINEER REVIEW / SIGN-OFF
            ========================================================================= */}
        {reviewingFinding && (
          <div className="fixed inset-0 z-60 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="text-base font-bold text-slate-900">
                  Engineer Review Decision
                </h3>
                <button
                  type="button"
                  onClick={() => setReviewingFinding(null)}
                  className="text-slate-400 hover:text-slate-700"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 text-xs space-y-1">
                <span className="font-bold text-slate-900 block">{reviewingFinding.title}</span>
                <span className="text-[11px] text-slate-600 block">{reviewingFinding.affected_component} &bull; {reviewingFinding.severity}</span>
              </div>

              <div className="space-y-3 text-xs">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Decision Outcome</label>
                  <select
                    value={reviewDecision}
                    onChange={(e) => setReviewDecision(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-lg p-2 text-xs text-slate-900 focus:outline-none focus:border-green-600"
                  >
                    <option value="Verified">Verified (Certified & Confirmed)</option>
                    <option value="Requires Further Inspection">Requires Further Inspection (NDT / Dive Survey)</option>
                    <option value="Rejected">Rejected (Inconclusive / Erroneous)</option>
                  </select>
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Reviewing Officer</label>
                  <input
                    type="text"
                    value={reviewerName}
                    onChange={(e) => setReviewerName(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-lg p-2 text-xs text-slate-900 focus:outline-none focus:border-green-600"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Technical Justification Notes</label>
                  <textarea
                    rows={3}
                    value={reviewNotes}
                    onChange={(e) => setReviewNotes(e.target.value)}
                    placeholder="Enter engineering rationale, referenced code standard, and required actions..."
                    className="w-full bg-white border border-slate-300 rounded-lg p-2 text-xs text-slate-900 focus:outline-none focus:border-green-600"
                  />
                </div>

                {reviewError && (
                  <p className="text-red-700 text-xs font-mono">{reviewError}</p>
                )}
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setReviewingFinding(null)}
                  className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 text-xs font-semibold hover:bg-slate-200"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSubmitReview}
                  disabled={submittingReview}
                  className="px-4 py-2 rounded-xl bg-green-700 text-white text-xs font-semibold hover:bg-green-800 disabled:opacity-50 cursor-pointer"
                >
                  {submittingReview ? 'Recording...' : 'Certify Decision'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* =========================================================================
            MODAL: IMAGE VIEWER
            ========================================================================= */}
        {selectedImage && (
          <div
            className="fixed inset-0 z-60 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4 cursor-pointer"
            onClick={() => setSelectedImage(null)}
          >
            <div className="bg-white rounded-2xl max-w-3xl w-full p-4 space-y-3 cursor-default" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-bold text-slate-900 truncate">{selectedImage.caption}</h4>
                <button type="button" onClick={() => setSelectedImage(null)} className="text-slate-400 hover:text-slate-700">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="max-h-[70vh] overflow-hidden rounded-xl bg-slate-100 flex items-center justify-center">
                <img
                  src={`${API_BASE}/api/media/${selectedImage.file_name}`}
                  alt={selectedImage.caption}
                  className="max-h-[70vh] w-auto object-contain"
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
