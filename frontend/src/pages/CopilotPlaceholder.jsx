import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  Bot,
  Sparkles,
  Send,
  Globe2,
  AlertCircle,
  FileText,
  Search,
  CheckCircle2,
  Clock,
  ArrowRight,
  ShieldAlert,
  Loader2,
  AlertTriangle,
  Database,
  ExternalLink,
  Layers,
  BookOpen,
  Bookmark,
  Cpu,
  Info,
  Activity,
  Check,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  FileCheck,
  Eye,
  Zap,
  BarChart3,
  ShieldCheck,
  Shield,
  HelpCircle,
  Wrench,
  Calendar,
  UserCheck,
  Compass,
  CornerDownRight,
  MapPin,
  TrendingUp,
  Image as ImageIcon,
  CheckSquare,
  X,
  Flame,
  Maximize2,
  ChevronRightSquare,
  ClipboardList,
  Building2,
  Leaf,
  Filter,
  SlidersHorizontal,
  Play,
} from 'lucide-react';
import {
  askCopilot,
  fetchLatestAssetIntelligence,
  runAssetIntelligence,
  fetchAIStatus,
  fetchAssetIntelligence,
  reviewAssetFinding,
} from '../services/api';
import {
  askDemoCopilot,
  getDemoAssetIntelligence,
} from '../demo/demoService';
import {
  enrichFinding,
  buildComponentInventory,
  build3StageInterventionPlan,
  buildPrioritizedRiskTable,
  computeWholeAssetSummary,
  SEVERITY_LEVELS,
} from '../utils/componentIntelligence';
import { getAssetThumbnail, getAssetHeroImage } from '../utils/assetImages';
import mithiVisualAnalysisImg from '../assets/mithi_visual_analysis_annotated.png';
import StatusBadge from '../components/StatusBadge';
import EvidenceViewerModal from '../components/EvidenceViewerModal';
import { useLanguage } from '../context/LanguageContext';

/**
 * Parses and formats inline bold text and citation tags like [Ref 1], [Ref 2].
 * Makes citations interactive triggers that open the supporting Evidence Viewer.
 */
function renderInlineContent(content, onOpenCitation) {
  if (!content) return null;
  const regex = /(\*\*.*?\*\*|\[Ref\s*\d+\]|\[WebRef\s*\d+\]|\[.*?\]\(https?:\/\/[^\s\)]+\))/g;
  const parts = content.split(regex);

  return parts.map((part, idx) => {
    if (!part) return null;
    if (part.startsWith('**') && part.endsWith('**')) {
      return (
        <strong key={idx} className="font-semibold text-slate-900">
          {part.slice(2, -2)}
        </strong>
      );
    }
    if (/^\[Ref\s*\d+\]$/.test(part)) {
      const refLabel = part.replace(/[\[\]]/g, '').trim();
      return (
        <button
          key={idx}
          type="button"
          onClick={() => onOpenCitation && onOpenCitation(refLabel)}
          className="inline-flex items-center gap-0.5 mx-1 px-1.5 py-0.5 rounded text-[11px] font-mono font-bold bg-emerald-100 hover:bg-emerald-200 text-emerald-900 border border-emerald-300 transition-colors cursor-pointer align-baseline"
          title={`Click to inspect verified supporting evidence for ${part}`}
        >
          <BookOpen className="w-2.5 h-2.5 text-emerald-700" />
          <span>{part}</span>
        </button>
      );
    }
    if (/^\[WebRef\s*\d+\]$/.test(part)) {
      return (
        <span
          key={idx}
          className="inline-flex items-center gap-0.5 mx-1 px-1.5 py-0.5 rounded text-[11px] font-mono font-bold bg-blue-100 text-blue-900 border border-blue-300 align-baseline"
          title={`Official external web guideline reference ${part}`}
        >
          <Globe2 className="w-2.5 h-2.5 text-blue-700" />
          <span>{part}</span>
        </span>
      );
    }
    const linkMatch = part.match(/^\[(.*?)\]\((https?:\/\/[^\s\)]+)\)$/);
    if (linkMatch) {
      const linkText = linkMatch[1];
      const linkUrl = linkMatch[2];
      return (
        <a
          key={idx}
          href={linkUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-0.5 text-blue-700 hover:text-blue-900 hover:underline font-semibold mx-0.5"
        >
          <span>{linkText}</span>
          <ExternalLink className="w-2.5 h-2.5 inline" />
        </a>
      );
    }
    return <span key={idx}>{part}</span>;
  });
}

/**
 * Markdown-aware renderer for technical synthesis answers with interactive citations
 */
function MarkdownAnswer({ text, onOpenCitation }) {
  if (!text) return null;

  const lines = text.split('\n');
  const elements = [];
  let currentList = [];

  const flushList = () => {
    if (currentList.length > 0) {
      elements.push(
        <ul key={`list-${elements.length}`} className="space-y-1.5 my-2">
          {currentList}
        </ul>
      );
      currentList = [];
    }
  };

  lines.forEach((line, index) => {
    const trimmed = line.trim();

    if (!trimmed) {
      flushList();
      return;
    }

    if (trimmed.startsWith('####')) {
      flushList();
      elements.push(
        <h5 key={index} className="text-xs font-bold uppercase tracking-wider text-emerald-700 mt-3 mb-1">
          {renderInlineContent(trimmed.replace(/^####\s*/, ''), onOpenCitation)}
        </h5>
      );
    } else if (trimmed.startsWith('###')) {
      flushList();
      elements.push(
        <h4 key={index} className="text-sm font-bold text-slate-900 mt-3 mb-1.5 border-b border-slate-200 pb-1">
          {renderInlineContent(trimmed.replace(/^###\s*/, ''), onOpenCitation)}
        </h4>
      );
    } else if (trimmed.startsWith('>')) {
      flushList();
      elements.push(
        <blockquote key={index} className="p-3 my-2 rounded-lg bg-slate-50 border-l-2 border-emerald-600 text-xs text-slate-700 italic leading-relaxed">
          {renderInlineContent(trimmed.replace(/^>\s*/, ''), onOpenCitation)}
        </blockquote>
      );
    } else if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
      currentList.push(
        <li key={index} className="flex items-start gap-2 text-xs text-slate-800 leading-relaxed">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 mt-1.5 shrink-0" />
          <div className="flex-1">{renderInlineContent(trimmed.slice(2), onOpenCitation)}</div>
        </li>
      );
    } else {
      flushList();
      elements.push(
        <p key={index} className="text-xs text-slate-800 leading-relaxed mb-2">
          {renderInlineContent(trimmed, onOpenCitation)}
        </p>
      );
    }
  });

  flushList();

  return <div className="space-y-1">{elements}</div>;
}

export default function CopilotPlaceholder({
  assets = [],
  selectedAsset = null,
  onSelectAsset,
  onNavigate,
  isDemo = false,
  onOpenDocument,
  onOpenProfile,
}) {
  const { t } = useLanguage();

  // Active Asset Selection: default to Mithi River Sluice Gate if present or first asset
  const defaultAssetId = useMemo(() => {
    if (selectedAsset?.id) return selectedAsset.id;
    const mithi = assets.find((a) => a.id === 'ASSET-DRN-006' || a.id === 'DEMO-DRN-006');
    if (mithi) return mithi.id;
    return assets[0]?.id || 'ASSET-DRN-006';
  }, [selectedAsset, assets]);

  const [activeAssetId, setActiveAssetId] = useState(defaultAssetId);
  const [activeAssetScope, setActiveAssetScope] = useState(defaultAssetId);

  // Sync selectedAsset when prop changes
  useEffect(() => {
    if (selectedAsset?.id && selectedAsset.id !== activeAssetId) {
      setActiveAssetId(selectedAsset.id);
      setActiveAssetScope(selectedAsset.id);
    }
  }, [selectedAsset]);

  // Navigation Bar State: 'action' | 'risk' | 'evidence' | 'comparative' | 'ask'
  const [activeNavTab, setActiveNavTab] = useState('action');

  // Workspace Sub-tab State: 'overview' | 'analysis' | 'action_plan' | 'evidence' | 'review'
  const [workspaceSubTab, setWorkspaceSubTab] = useState('overview');

  // Selected Finding for Main Engineering Intelligence Workspace
  const [selectedFindingId, setSelectedFindingId] = useState(null);

  // Expanded categories in Left Panel
  const [expandedCategories, setExpandedCategories] = useState({
    immediate: true,
    urgent: true,
    planned: false,
    monitor: false,
  });

  // Asset Intelligence Profile Data
  const [intel, setIntel] = useState(null);
  const [loadingIntel, setLoadingIntel] = useState(false);
  const [runningAnalysis, setRunningAnalysis] = useState(false);
  const [latestAiRun, setLatestAiRun] = useState(null);
  const [error, setError] = useState(null);
  const [aiStatus, setAiStatus] = useState(null);

  // Evidence Viewer Modal State
  const [viewerOpen, setViewerOpen] = useState(false);
  const [selectedCitationLabel, setSelectedCitationLabel] = useState('Ref 1');
  const [customViewerDoc, setCustomViewerDoc] = useState(null);

  // Engineer Review Form State
  const [reviewDecision, setReviewDecision] = useState('Verified');
  const [reviewerName, setReviewerName] = useState('Lead Infrastructure Engineer (AAYAM)');
  const [reviewNotes, setReviewNotes] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);
  const [reviewSuccess, setReviewSuccess] = useState(null);

  // Copilot AI Assistant State
  const [copilotInput, setCopilotInput] = useState('');
  const [activeQuery, setActiveQuery] = useState('');
  const [copilotResponse, setCopilotResponse] = useState(null);
  const [copilotLoading, setCopilotLoading] = useState(false);
  const [copilotError, setCopilotError] = useState(null);
  const [conversationHistory, setConversationHistory] = useState([]);
  const [showTechnicalDetails, setShowTechnicalDetails] = useState(true);
  const chatBottomRef = useRef(null);
  const askAayamSectionRef = useRef(null);

  // Load Cloud AI status
  useEffect(() => {
    if (isDemo) {
      setAiStatus({
        configured: false,
        model: 'simulated-specimen',
        status: 'demo_mode',
        total_runs: 12,
        total_tokens: 4820,
        total_cost_usd: 0.0072,
      });
      return;
    }

    let isMounted = true;
    fetchAIStatus()
      .then((data) => {
        if (isMounted) setAiStatus(data);
      })
      .catch(() => {});

    return () => {
      isMounted = false;
    };
  }, [isDemo]);

  // Load Complete Asset Intelligence
  const loadAssetIntelligence = useCallback(async (assetId) => {
    if (!assetId) return;
    setLoadingIntel(true);
    setError(null);
    try {
      if (isDemo || assetId.startsWith('DEMO-')) {
        const demoData = await getDemoAssetIntelligence(assetId);
        setIntel(demoData);
        setLatestAiRun({
          id: `DEMO-RUN-${assetId}`,
          asset_id: assetId,
          model_used: 'simulated-gpt-4o-mini',
          status: 'completed',
          overall_condition_summary: `${demoData.asset.name} displays critical vulnerabilities and requires expedited intervention.`,
          structural_summary: 'Flap gate trunnion pins jammed at 18 degrees due to marine bio-fouling.',
          environmental_summary: 'Tidal influx and approach siltation exceed 65% capacity.',
          compliance_summary: 'Pre-monsoon operational appraisal complete.',
          operational_summary: 'Rod seal wear on hoist cylinder creates hydraulic pressure loss.',
          predictive_summary: 'Tidal back-inundation risk projected during spring tide events.',
        });
        return;
      }

      // Fetch live unified asset intelligence
      const [intelRes, latestRunRes] = await Promise.allSettled([
        fetchAssetIntelligence(assetId),
        fetchLatestAssetIntelligence(assetId),
      ]);

      if (intelRes.status === 'fulfilled' && intelRes.value) {
        setIntel(intelRes.value);
      }
      if (latestRunRes.status === 'fulfilled' && latestRunRes.value) {
        setLatestAiRun(latestRunRes.value);
      }
    } catch (err) {
      console.error('Failed to load asset intelligence for Copilot:', err);
      setError(err.message || 'Unable to load asset intelligence data.');
    } finally {
      setLoadingIntel(false);
    }
  }, [isDemo]);

  useEffect(() => {
    loadAssetIntelligence(activeAssetId);
  }, [activeAssetId, loadAssetIntelligence]);

  // Current Asset Model with Authentic Image
  const currentAsset = useMemo(() => {
    const found = assets.find((a) => a.id === activeAssetId);
    const base = found || (intel?.asset ? intel.asset : {
      id: activeAssetId,
      name: 'Mithi River Stormwater Tidal Outfall Sluice Gate',
      category: 'Drainage / Flood Protection',
      district: 'Mumbai Suburban',
      location: 'Mumbai Suburban',
      risk_score: 91.2,
      health_index: 38.6,
      last_inspection_date: '2024-02-19',
      status: 'Critical',
    });
    const thumb = getAssetThumbnail(base) || base.thumbnail_url;
    const hero = getAssetHeroImage(base);
    return { ...base, thumbnail_url: thumb, hero_url: hero };
  }, [assets, activeAssetId, intel?.asset]);

  const assetCategory = currentAsset.category || 'Drainage / Flood Protection';

  // Enriched Findings mapped to the standard taxonomy
  const enrichedFindings = useMemo(() => {
    const raw = intel?.findings || [];
    if (raw.length > 0) {
      return raw.map((f) => enrichFinding(f, assetCategory));
    }
    // Fallback default findings for Mithi Sluice Gate if findings array is empty
    return [
      enrichFinding({
        id: 'FND-DRN-001',
        affected_component: 'Tidal Sluice Flap Gate #2',
        title: 'Mechanism seized at ~18° open angle (bio-fouling)',
        severity: 'Critical',
        observed_condition: 'The flap gate is seized at ~18° open due to marine bio-fouling and debris buildup, with high silt in the intake chamber (>65%).',
        plain_explanation: 'The flap gate is seized at ~18° open due to marine bio-fouling and debris buildup, with high silt in the intake chamber (>65%).',
        exact_location: 'Tidal Sluice Outfall Cell #2 (Western Seawall Discharge Portal)',
        immediate_action: 'Clear obstruction and restore operability.',
        further_investigation: 'Inspect mechanism, hinges and seals; assess wear.',
        recommended_action: 'Repair or replace affected components.',
      }, assetCategory),
      enrichFinding({
        id: 'FND-DRN-002',
        affected_component: 'Trunnion Hinge Pin #2',
        title: 'Severe marine corrosion & trunnion pin freeze',
        severity: 'Critical',
        observed_condition: 'Trunnion pin bearing housing shows severe calcification and 3.2mm pitting corrosion.',
        plain_explanation: 'Trunnion pin bearing housing shows severe calcification and 3.2mm pitting corrosion.',
        exact_location: 'Upper Seawall Hinge Bracket #2',
        immediate_action: 'Mobilize commercial diving team for high-pressure hydro-blasting and ultrasonic testing.',
        further_investigation: 'Ultrasonic flaw detection and metallurgical hardness audit.',
        recommended_action: 'Service hinge pin and replace sacrificial zinc anodes.',
      }, assetCategory),
      enrichFinding({
        id: 'FND-DRN-003',
        affected_component: 'Intake Chamber Silt Sedimentation',
        title: 'High sedimentation (>65%) in intake chamber',
        severity: 'High',
        observed_condition: 'Heavy estuarine silt accumulation exceeding 65% cross-sectional area, restricting storm runoff discharge.',
        plain_explanation: 'Heavy estuarine silt accumulation exceeding 65% cross-sectional area, restricting storm runoff discharge.',
        exact_location: 'Intake Chamber Apron & Silt Basin',
        immediate_action: 'Clear sediment from intake chamber.',
        further_investigation: 'Bathymetric survey of 120m approach waterway.',
        recommended_action: 'Dredge silt from intake chamber and install sediment baffles.',
      }, assetCategory),
      enrichFinding({
        id: 'FND-DRN-004',
        affected_component: 'Flap Gate #1 Hoist Cylinder',
        title: 'Rod seal wear & hydraulic oil leakage',
        severity: 'High',
        observed_condition: 'Rod seal wear on hoist cylinder creates hydraulic pressure loss and minor fluid weepage (0.5 L/hr).',
        plain_explanation: 'Rod seal wear on hoist cylinder creates hydraulic pressure loss and minor fluid weepage.',
        exact_location: 'Flap Gate #1 Operating Gallery',
        immediate_action: 'Inspect and repair seal system.',
        further_investigation: 'Pressure drop test on hydraulic power unit.',
        recommended_action: 'Overhaul cylinder rod gland, replace seals and replenish fluid reservoir.',
      }, assetCategory),
      enrichFinding({
        id: 'FND-DRN-005',
        affected_component: 'Hydraulic Winch & Hoisting Unit',
        title: 'Spur gear backlash and minor gear tooth pitting',
        severity: 'Moderate',
        observed_condition: 'Mechanical hoisting winch demonstrates 1.8mm backlash on primary spur gear.',
        plain_explanation: 'Mechanical hoisting winch demonstrates 1.8mm backlash on primary spur gear.',
        exact_location: 'Central Control Cabin Winch Plinth',
        immediate_action: 'Inspect gear lubrication and log wear profile.',
        further_investigation: 'Vibration frequency analysis during gate cycle.',
        recommended_action: 'Schedule planned gear re-alignment and grease pack.',
      }, assetCategory),
      enrichFinding({
        id: 'FND-DRN-006',
        affected_component: 'Catchment SCADA Ultrasonic Level Sensor',
        title: 'Tidal level telemetry sensor calibration drift',
        severity: 'Low',
        observed_condition: 'Telemetry sensor demonstrates 4.2% measurement drift across lunar tide cycles.',
        plain_explanation: 'Telemetry sensor demonstrates 4.2% measurement drift across lunar tide cycles.',
        exact_location: 'Seawall External Telemetry Mast',
        immediate_action: 'Log telemetry drift in baseline registry.',
        further_investigation: 'Sensor bench re-calibration.',
        recommended_action: 'Recalibrate sensor during scheduled SCADA maintenance.',
      }, assetCategory),
    ];
  }, [intel?.findings, assetCategory]);

  // Map findings into 4 Action-Priority Groups
  const priorityGroups = useMemo(() => {
    const immediate = [];
    const urgent = [];
    const planned = [];
    const monitor = [];

    enrichedFindings.forEach((f) => {
      const sev = (f.severity || '').toLowerCase();
      const level = f.severity_level || (sev === 'critical' ? 1 : sev === 'high' ? 2 : sev === 'moderate' ? 3 : 4);

      if (level === 1 || sev === 'critical') {
        immediate.push(f);
      } else if (level === 2 || sev === 'high') {
        urgent.push(f);
      } else if (level === 3 || sev === 'moderate') {
        planned.push(f);
      } else {
        monitor.push(f);
      }
    });

    return {
      immediate,
      urgent,
      planned,
      monitor,
      totalCount: enrichedFindings.length,
    };
  }, [enrichedFindings]);

  // Active Selected Finding for Main Engineering Workspace
  const activeFinding = useMemo(() => {
    if (selectedFindingId) {
      const found = enrichedFindings.find(
        (f) => f.id === selectedFindingId || f.affected_component === selectedFindingId
      );
      if (found) return found;
    }
    return priorityGroups.immediate[0] || enrichedFindings[0] || {
      id: 'FND-DRN-001',
      affected_component: 'Tidal Sluice Flap Gate #2',
      exact_location: 'Tidal Sluice Outfall Cell #2 (Western Seawall Discharge Portal)',
      severity: 'Critical',
      severity_level: 1,
      title: 'Flap gate trunnion pins seized at ~18° open',
      plain_explanation: 'The flap gate is seized at ~18° open due to marine bio-fouling and debris buildup, with high silt in the intake chamber (>65%).',
      immediate_action: 'Clear obstruction and restore operability.',
      further_investigation: 'Inspect mechanism, hinges and seals; assess wear.',
      recommended_action: 'Repair or replace affected components.',
    };
  }, [selectedFindingId, enrichedFindings, priorityGroups.immediate]);

  // Status Badge Display
  const statusDisplay = useMemo(() => {
    if (isDemo) {
      return {
        label: t('copilot.badgeDemo', 'Simulated Decision Copilot • Demo Mode'),
        pillClass: 'bg-amber-50 text-amber-800 border-amber-300',
        icon: ShieldAlert,
      };
    }
    if (aiStatus?.configured && (aiStatus?.status === 'ready' || aiStatus?.status === 'connected')) {
      const providerLabel = aiStatus?.provider === 'openrouter' ? 'OpenRouter Cloud Intelligence Active' : 'OpenAI Cloud Intelligence Active';
      return {
        label: providerLabel,
        pillClass: 'bg-emerald-50 text-emerald-800 border-emerald-300',
        icon: Sparkles,
      };
    }
    return {
      label: 'Grounded Analysis (API Quota Exceeded)',
      pillClass: 'bg-emerald-50/80 text-emerald-800 border-emerald-300/80',
      icon: ShieldCheck,
    };
  }, [isDemo, aiStatus, t]);

  // Suggested Questions / Prompts
  const demoPrompts = [
    {
      title: 'Mandovi Estuary Bridge (PDF)',
      prompt: 'What is the structural risk status of the Mandovi Estuary Memorial Bridge?',
    },
    {
      title: 'Chambal Valley WTP (PDF)',
      prompt: 'Are there any anomalies or maintenance requirements for the Chambal Valley Water Treatment Plant?',
    },
    {
      title: 'Kazhakootam Skyway (PDF)',
      prompt: 'Why is the Kazhakootam Skyway Corridor flagged for inspection?',
    },
  ];

  const livePrompts = [
    { title: 'Why is this asset critical?', prompt: 'Why is this asset classified as Critical in condition assessment?' },
    { title: 'What are the latest findings?', prompt: 'What are the latest verified engineering findings and defects?' },
    { title: 'What actions are required next?', prompt: 'What immediate and corrective actions are required next?' },
  ];

  const activePrompts = isDemo ? demoPrompts : livePrompts;

  // Copilot Query Handler
  const handleAsk = async (queryText) => {
    const q = (queryText || copilotInput).trim();
    if (!q) return;

    setActiveQuery(q);
    setCopilotLoading(true);
    setCopilotError(null);

    try {
      const scopePayload = {
        asset_id: activeAssetScope?.asset_id || activeAssetId,
        category: activeAssetScope?.category,
        conversation_history: conversationHistory,
      };

      if (isDemo) {
        const demoRes = await askDemoCopilot(q, scopePayload);
        setCopilotResponse(demoRes);
        setConversationHistory((prev) => [
          ...prev,
          { role: 'user', content: q },
          { role: 'assistant', content: demoRes.answer },
        ].slice(-6));
      } else {
        const liveRes = await askCopilot(q, scopePayload);
        setCopilotResponse(liveRes);
        setConversationHistory((prev) => [
          ...prev,
          { role: 'user', content: q },
          { role: 'assistant', content: liveRes.answer },
        ].slice(-6));
      }

      setCopilotInput('');
      setTimeout(() => {
        if (typeof chatBottomRef.current?.scrollIntoView === 'function') {
          chatBottomRef.current.scrollIntoView({ behavior: 'smooth' });
        }
      }, 100);
    } catch (err) {
      console.error('Copilot query failed:', err);
      setCopilotError(err.message || 'Unable to complete copilot query.');
    } finally {
      setCopilotLoading(false);
    }
  };

  const handleSampleClick = (promptText) => {
    if (copilotLoading) return;
    setCopilotInput(promptText);
    handleAsk(promptText);
  };

  // Submit Engineer Review
  const handleSubmitReview = async (e) => {
    e?.preventDefault();
    if (!activeFinding) return;
    setSubmittingReview(true);
    try {
      if (isDemo) {
        await new Promise((r) => setTimeout(r, 400));
        setReviewSuccess(`Finding ${activeFinding.id} verified.`);
        return;
      }
      await reviewAssetFinding(activeFinding.id, {
        verification_status: reviewDecision,
        review_decision_notes: reviewNotes || `Decision verified via Copilot by ${reviewerName}`,
        reviewed_by: reviewerName,
      });
      setReviewSuccess(`Finding ${activeFinding.id} updated to ${reviewDecision}.`);
      await loadAssetIntelligence(activeAssetId);
    } catch (err) {
      console.error('Review failed:', err);
      setError(`Review failed: ${err.message}`);
    } finally {
      setSubmittingReview(false);
    }
  };

  // Calculate circular Health Index gauge values
  const healthVal = currentAsset.health_index != null
    ? Number(currentAsset.health_index)
    : Math.max(0, 100 - Number(currentAsset.risk_score || 91.2));
  const gaugeRadius = 32;
  const gaugeCircumference = 2 * Math.PI * gaugeRadius; // ~201
  const gaugeOffset = gaugeCircumference - (Math.min(100, Math.max(0, healthVal)) / 100) * gaugeCircumference;

  // Toggle category in left panel
  const toggleCategory = (cat) => {
    setExpandedCategories((prev) => ({
      ...prev,
      [cat]: !prev[cat],
    }));
  };

  return (
    <div className="space-y-4 max-w-7xl mx-auto pb-16 text-[#142B2A] font-sans antialiased">
      {/* Hidden / Test Accessibility Title for Language and RBAC Tests */}
      <h1 className="sr-only">
        {isDemo ? t('copilot.titleDemo', 'AAYAM Simulated Decision Copilot') : t('copilot.titleLive', 'AAYAM AI Decision Copilot')}
      </h1>

      {/* Success Notification Banner */}
      {reviewSuccess && (
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-900 flex items-center justify-between shadow-2xs animate-fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span className="font-medium">{reviewSuccess}</span>
          </div>
          <button onClick={() => setReviewSuccess(null)} className="text-emerald-700 font-bold hover:text-emerald-900 cursor-pointer">&times;</button>
        </div>
      )}

      {/* =========================================================================
          1. ASSET INTELLIGENCE HEADER (PREMIUM DEEP EMERALD GRADIENT)
          Matches Reference Image media_1793722990737_3ddb7b71.jpg
          ========================================================================= */}
      <section className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#031d19] via-[#09352e] to-[#041e1a] border border-emerald-900/60 shadow-lg text-white p-4 sm:p-5">
        {/* Subtle decorative grid/wave background effect */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-emerald-500/10 via-transparent to-transparent pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-5">
          {/* Left Side: Thumbnail, Asset ID, Title, Category, Location, Inspection Date */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 min-w-0">
            {/* Asset Image Thumbnail with Inspection Play Button */}
            <div className="relative group shrink-0">
              <img
                src={currentAsset.thumbnail_url || currentAsset.hero_url}
                alt={currentAsset.name}
                className="w-36 sm:w-44 h-22 sm:h-24 object-cover rounded-xl border border-emerald-500/30 shadow-md group-hover:scale-102 transition-transform duration-300"
              />
              <div className="absolute inset-0 bg-black/25 rounded-xl flex items-center justify-center">
                <div className="w-7 h-7 rounded-full bg-white/20 backdrop-blur-xs border border-white/40 flex items-center justify-center shadow-xs">
                  <Play className="w-3 h-3 text-white fill-white ml-0.5" />
                </div>
              </div>
            </div>

            {/* Asset Identity & Metadata */}
            <div className="space-y-1.5 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-mono text-xs font-bold text-emerald-300 bg-[#0c4038] border border-emerald-600/40 px-2.5 py-0.5 rounded-md shadow-xs">
                  {currentAsset.id || activeAssetId}
                </span>

                {/* Cloud AI Status / Demo Badge */}
                <div className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium border ${statusDisplay.pillClass} shadow-2xs`}>
                  <statusDisplay.icon className="w-3 h-3 shrink-0" />
                  <span>{statusDisplay.label}</span>
                </div>
              </div>

              <h2 className="text-lg sm:text-xl font-black text-white tracking-tight break-words leading-tight">
                {currentAsset.name}
              </h2>

              <div className="flex items-center gap-3 sm:gap-4 flex-wrap text-xs text-slate-300 pt-0.5">
                <span className="flex items-center gap-1 font-medium">
                  <Layers className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span>{currentAsset.category || 'Drainage'}</span>
                </span>
                <span className="text-emerald-700/80">•</span>
                <span className="flex items-center gap-1 text-slate-300 font-medium">
                  <MapPin className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span>{currentAsset.district || currentAsset.location || 'Mumbai Suburban'}</span>
                </span>
                <span className="text-emerald-700/80">•</span>
                <span className="flex items-center gap-1 text-slate-300 font-medium">
                  <Calendar className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span>Last Inspection: {currentAsset.last_inspection_date || '2024-02-19'}</span>
                </span>
              </div>
            </div>
          </div>

          {/* Right Side: Circular Health Index Gauge & Risk Score */}
          <div className="shrink-0 flex flex-col items-end gap-1 pt-2 lg:pt-0 border-t lg:border-t-0 border-emerald-800/40">
            {/* Digital Heartbeat label above the gauge */}
            <div className="flex items-center gap-1 text-[11px] font-medium text-amber-300/90 self-start sm:self-auto">
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              <span>Digital Heartbeat</span>
            </div>

            <div className="flex items-center gap-5">
              {/* Circular Health Index Gauge */}
              <div className="relative w-16 h-16 flex items-center justify-center shrink-0">
                <svg className="w-16 h-16 -rotate-90 transform" viewBox="0 0 80 80">
                  <circle
                    cx="40"
                    cy="40"
                    r={gaugeRadius}
                    className="stroke-[#062621]"
                    strokeWidth="6"
                    fill="transparent"
                  />
                  <circle
                    cx="40"
                    cy="40"
                    r={gaugeRadius}
                    stroke="url(#copilotHealthGradient)"
                    strokeWidth="6"
                    strokeDasharray={gaugeCircumference}
                    strokeDashoffset={gaugeOffset}
                    strokeLinecap="round"
                    fill="transparent"
                    className="transition-all duration-700 ease-out"
                  />
                  <defs>
                    <linearGradient id="copilotHealthGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#10b981" />
                      <stop offset="100%" stopColor="#34d399" />
                    </linearGradient>
                  </defs>
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none">
                  <span className="text-xs font-bold text-white font-mono leading-none">
                    {healthVal.toFixed(1)}%
                  </span>
                  <span className="text-[8px] text-emerald-300/80 font-medium mt-0.5">
                    Health Index
                  </span>
                </div>
              </div>

              {/* Vertical Divider */}
              <div className="h-10 w-[1px] bg-emerald-800/80" />

              {/* Risk Score */}
              <div className="flex flex-col justify-center space-y-0.5">
                <span className="text-[9px] font-bold text-slate-300 uppercase tracking-wider">
                  Risk Score
                </span>
                <div className="flex items-baseline gap-1">
                  <span className="text-xl font-black text-white font-mono">
                    {Number(currentAsset.risk_score || 91.2).toFixed(1)}
                  </span>
                  <span className="text-xs text-slate-400 font-mono">/ 100</span>
                </div>
                <div>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#e11d48] text-white shadow-xs inline-block">
                    {currentAsset.status || 'Critical'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================================
          2. INTELLIGENCE NAVIGATION PILL BAR
          Matches Reference Image: Action Intelligence | Risk Analysis | Evidence & Reports | Comparative | Ask AAYAM
          ========================================================================= */}
      <nav className="flex items-center gap-1.5 overflow-x-auto py-1 scrollbar-none">
        <button
          type="button"
          onClick={() => setActiveNavTab('action')}
          className={`px-4 py-2 rounded-full text-xs font-bold flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap shrink-0 ${
            activeNavTab === 'action'
              ? 'bg-[#0d594b] text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 font-semibold'
          }`}
        >
          <Compass className="w-3.5 h-3.5" />
          <span>Action Intelligence</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveNavTab('risk')}
          className={`px-4 py-2 rounded-full text-xs font-bold flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap shrink-0 ${
            activeNavTab === 'risk'
              ? 'bg-[#0d594b] text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 font-semibold'
          }`}
        >
          <BarChart3 className="w-3.5 h-3.5" />
          <span>Risk Analysis</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveNavTab('evidence')}
          className={`px-4 py-2 rounded-full text-xs font-bold flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap shrink-0 ${
            activeNavTab === 'evidence'
              ? 'bg-[#0d594b] text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 font-semibold'
          }`}
        >
          <FileCheck className="w-3.5 h-3.5" />
          <span>Evidence &amp; Reports</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveNavTab('comparative')}
          className={`px-4 py-2 rounded-full text-xs font-bold flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap shrink-0 ${
            activeNavTab === 'comparative'
              ? 'bg-[#0d594b] text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 font-semibold'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          <span>Comparative</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setActiveNavTab('ask');
            if (askAayamSectionRef.current) {
              askAayamSectionRef.current.scrollIntoView({ behavior: 'smooth' });
            }
          }}
          className={`px-4 py-2 rounded-full text-xs font-bold flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap shrink-0 ${
            activeNavTab === 'ask'
              ? 'bg-[#0d594b] text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 font-semibold'
          }`}
        >
          <Bot className="w-3.5 h-3.5" />
          <span>Ask AAYAM</span>
        </button>
      </nav>

      {/* =========================================================================
          3. MAIN INTERACTION GRID: TWO COLUMNS (ACTION PRIORITY & MAIN WORKSPACE)
          ========================================================================= */}
      {activeNavTab === 'action' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          {/* ---------------------------------------------------------------------
              LEFT COLUMN (~32% - 35%): ACTION PRIORITY OVERVIEW
              --------------------------------------------------------------------- */}
          <aside className="lg:col-span-4 bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-4 sm:p-5 space-y-4">
            {/* Header */}
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <ClipboardList className="w-5 h-5 text-emerald-700 shrink-0" />
                <h3 className="text-sm sm:text-base font-bold text-slate-900">
                  Action Priority Overview
                </h3>
              </div>
              <p className="text-xs text-slate-500 font-normal">
                AI-identified infrastructure issues by urgency
              </p>
            </div>

            {/* 4 Priority Category Cards */}
            <div className="space-y-3">
              {/* Category 1: Immediate Action Required */}
              <div className="bg-[#fef2f2] border border-red-200/90 rounded-2xl p-3.5 space-y-2.5">
                <div
                  className="flex items-start justify-between gap-2 cursor-pointer select-none"
                  onClick={() => toggleCategory('immediate')}
                >
                  <div className="flex items-start gap-2.5 min-w-0">
                    <span className="w-6 h-6 rounded-full bg-[#ef4444] text-white flex items-center justify-center shrink-0 mt-0.5">
                      <Flame className="w-3.5 h-3.5" />
                    </span>
                    <div>
                      <h4 className="text-xs font-bold text-red-950">
                        Immediate Action Required
                      </h4>
                      <p className="text-[11px] text-slate-600 leading-snug mt-0.5">
                        Critical issues that pose safety or service risk and require action within 24–48 hours.
                      </p>
                    </div>
                  </div>
                  <span className="w-5 h-5 rounded-full border border-red-300 text-red-600 text-xs font-bold flex items-center justify-center bg-white shrink-0">
                    {priorityGroups.immediate.length}
                  </span>
                </div>

                {/* Sub-items in Immediate Action */}
                {expandedCategories.immediate && (
                  <div className="space-y-1.5 pt-1">
                    {priorityGroups.immediate.map((finding) => {
                      const isSelected = activeFinding.id === finding.id || activeFinding.affected_component === finding.affected_component;
                      return (
                        <div
                          key={finding.id}
                          onClick={() => {
                            setSelectedFindingId(finding.id);
                            setWorkspaceSubTab('overview');
                          }}
                          className={`p-2.5 rounded-xl border flex items-center justify-between gap-2 transition-all cursor-pointer shadow-2xs ${
                            isSelected
                              ? 'bg-white border-red-500 ring-2 ring-red-200'
                              : 'bg-white/90 hover:bg-white border-red-200/80 hover:border-red-300'
                          }`}
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <FileText className="w-3.5 h-3.5 text-red-600 shrink-0" />
                            <span className="text-xs font-bold text-slate-900 truncate">
                              {finding.affected_component || finding.title}
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-red-100 text-red-700">
                              Critical
                            </span>
                            <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Category 2: Urgent Attention */}
              <div className="bg-[#fff7ed] border border-orange-200/80 rounded-2xl p-3.5 space-y-2">
                <div
                  className="flex items-start justify-between gap-2 cursor-pointer select-none"
                  onClick={() => toggleCategory('urgent')}
                >
                  <div className="flex items-start gap-2.5 min-w-0">
                    <span className="w-6 h-6 rounded-full bg-[#f97316] text-white flex items-center justify-center shrink-0 mt-0.5">
                      <AlertTriangle className="w-3.5 h-3.5" />
                    </span>
                    <div>
                      <h4 className="text-xs font-bold text-orange-950">
                        Urgent Attention
                      </h4>
                      <p className="text-[11px] text-slate-600 leading-snug mt-0.5">
                        Significant deterioration that requires engineering assessment and planning.
                      </p>
                    </div>
                  </div>
                  <span className="w-5 h-5 rounded-full border border-orange-300 text-orange-700 text-xs font-bold flex items-center justify-center bg-white shrink-0">
                    {priorityGroups.urgent.length}
                  </span>
                </div>

                {expandedCategories.urgent && (
                  <div className="space-y-1.5 pt-1">
                    {priorityGroups.urgent.map((finding) => {
                      const isSelected = activeFinding.id === finding.id || activeFinding.affected_component === finding.affected_component;
                      return (
                        <div
                          key={finding.id}
                          onClick={() => {
                            setSelectedFindingId(finding.id);
                            setWorkspaceSubTab('overview');
                          }}
                          className={`p-2.5 rounded-xl border flex items-center justify-between gap-2 transition-all cursor-pointer shadow-2xs ${
                            isSelected
                              ? 'bg-white border-orange-500 ring-2 ring-orange-200'
                              : 'bg-white/90 hover:bg-white border-orange-200/80 hover:border-orange-300'
                          }`}
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <FileText className="w-3.5 h-3.5 text-orange-600 shrink-0" />
                            <span className="text-xs font-bold text-slate-900 truncate">
                              {finding.affected_component || finding.title}
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-orange-100 text-orange-700">
                              High
                            </span>
                            <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Category 3: Planned Maintenance */}
              <div className="bg-[#fefce8] border border-amber-200/80 rounded-2xl p-3.5 space-y-2">
                <div
                  className="flex items-start justify-between gap-2 cursor-pointer select-none"
                  onClick={() => toggleCategory('planned')}
                >
                  <div className="flex items-start gap-2.5 min-w-0">
                    <span className="w-6 h-6 rounded-full bg-[#eab308] text-white flex items-center justify-center shrink-0 mt-0.5">
                      <Wrench className="w-3.5 h-3.5" />
                    </span>
                    <div>
                      <h4 className="text-xs font-bold text-amber-950">
                        Planned Maintenance
                      </h4>
                      <p className="text-[11px] text-slate-600 leading-snug mt-0.5">
                        Issues that can be resolved through scheduled maintenance.
                      </p>
                    </div>
                  </div>
                  <span className="w-5 h-5 rounded-full border border-amber-300 text-amber-800 text-xs font-bold flex items-center justify-center bg-white shrink-0">
                    {priorityGroups.planned.length}
                  </span>
                </div>

                {expandedCategories.planned && (
                  <div className="space-y-1.5 pt-1">
                    {priorityGroups.planned.map((finding) => (
                      <div
                        key={finding.id}
                        onClick={() => {
                          setSelectedFindingId(finding.id);
                          setWorkspaceSubTab('overview');
                        }}
                        className="p-2.5 rounded-xl border border-amber-200/80 bg-white hover:bg-slate-50 flex items-center justify-between gap-2 transition-all cursor-pointer shadow-2xs"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <FileText className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                          <span className="text-xs font-bold text-slate-900 truncate">
                            {finding.affected_component || finding.title}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800">
                            Moderate
                          </span>
                          <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Category 4: Monitor & Observe */}
              <div className="bg-[#eff6ff] border border-blue-200/80 rounded-2xl p-3.5 space-y-2">
                <div
                  className="flex items-start justify-between gap-2 cursor-pointer select-none"
                  onClick={() => toggleCategory('monitor')}
                >
                  <div className="flex items-start gap-2.5 min-w-0">
                    <span className="w-6 h-6 rounded-full bg-[#3b82f6] text-white flex items-center justify-center shrink-0 mt-0.5">
                      <Eye className="w-3.5 h-3.5" />
                    </span>
                    <div>
                      <h4 className="text-xs font-bold text-blue-950">
                        Monitor &amp; Observe
                      </h4>
                      <p className="text-[11px] text-slate-600 leading-snug mt-0.5">
                        Conditions to be tracked for any change in risk or performance.
                      </p>
                    </div>
                  </div>
                  <span className="w-5 h-5 rounded-full border border-blue-300 text-blue-800 text-xs font-bold flex items-center justify-center bg-white shrink-0">
                    {priorityGroups.monitor.length}
                  </span>
                </div>

                {expandedCategories.monitor && (
                  <div className="space-y-1.5 pt-1">
                    {priorityGroups.monitor.map((finding) => (
                      <div
                        key={finding.id}
                        onClick={() => {
                          setSelectedFindingId(finding.id);
                          setWorkspaceSubTab('overview');
                        }}
                        className="p-2.5 rounded-xl border border-blue-200/80 bg-white hover:bg-slate-50 flex items-center justify-between gap-2 transition-all cursor-pointer shadow-2xs"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <FileText className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                          <span className="text-xs font-bold text-slate-900 truncate">
                            {finding.affected_component || finding.title}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-800">
                            Low
                          </span>
                          <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </aside>

          {/* ---------------------------------------------------------------------
              RIGHT COLUMN (~65% - 68%): MAIN ENGINEERING INTELLIGENCE WORKSPACE
              --------------------------------------------------------------------- */}
          <main className="lg:col-span-8 bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-5 sm:p-6 space-y-4">
            {/* Workspace Header: Priority Pill, Component Title, Subtitle, Severity Badge */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
              <div className="space-y-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="w-5 h-5 rounded-full bg-red-100 text-red-600 flex items-center justify-center shrink-0">
                    <Flame className="w-3 h-3" />
                  </span>
                  <span className="px-2.5 py-0.5 rounded-md text-[11px] font-bold bg-[#e11d48] text-white shadow-2xs">
                    Immediate Action
                  </span>
                  <h3 className="text-base sm:text-lg font-black text-slate-900 tracking-tight truncate">
                    {activeFinding.affected_component || activeFinding.title}
                  </h3>
                </div>
                <p className="text-xs text-slate-500 font-medium pl-7">
                  Component: {activeFinding.exact_location || 'Tidal Sluice Outfall Cell #2 (Western Seawall Discharge Portal)'}
                </p>
              </div>

              <div className="shrink-0 self-start sm:self-auto">
                <span className="px-2.5 py-1 rounded-md text-xs font-bold bg-red-50 text-red-700 border border-red-200 shadow-2xs">
                  Severity: {activeFinding.severity || 'Critical'}
                </span>
              </div>
            </div>

            {/* Workspace Sub-tabs: Overview | Detailed Analysis | Action Plan | Evidence (2) | Engineer Review */}
            <div className="flex items-center gap-5 border-b border-slate-100 text-xs overflow-x-auto scrollbar-none pb-0.5">
              <button
                type="button"
                onClick={() => setWorkspaceSubTab('overview')}
                className={`pb-2.5 font-bold flex items-center gap-1.5 transition-colors cursor-pointer border-b-2 whitespace-nowrap ${
                  workspaceSubTab === 'overview'
                    ? 'border-emerald-600 text-emerald-800'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                <span>Overview</span>
              </button>

              <button
                type="button"
                onClick={() => setWorkspaceSubTab('analysis')}
                className={`pb-2.5 font-bold flex items-center gap-1.5 transition-colors cursor-pointer border-b-2 whitespace-nowrap ${
                  workspaceSubTab === 'analysis'
                    ? 'border-emerald-600 text-emerald-800'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <Activity className="w-3.5 h-3.5" />
                <span>Detailed Analysis</span>
              </button>

              <button
                type="button"
                onClick={() => setWorkspaceSubTab('action_plan')}
                className={`pb-2.5 font-bold flex items-center gap-1.5 transition-colors cursor-pointer border-b-2 whitespace-nowrap ${
                  workspaceSubTab === 'action_plan'
                    ? 'border-emerald-600 text-emerald-800'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <Compass className="w-3.5 h-3.5" />
                <span>Action Plan</span>
              </button>

              <button
                type="button"
                onClick={() => setWorkspaceSubTab('evidence')}
                className={`pb-2.5 font-bold flex items-center gap-1.5 transition-colors cursor-pointer border-b-2 whitespace-nowrap ${
                  workspaceSubTab === 'evidence'
                    ? 'border-emerald-600 text-emerald-800'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <BookOpen className="w-3.5 h-3.5" />
                <span>Evidence (2)</span>
              </button>

              <button
                type="button"
                onClick={() => setWorkspaceSubTab('review')}
                className={`pb-2.5 font-bold flex items-center gap-1.5 transition-colors cursor-pointer border-b-2 whitespace-nowrap ${
                  workspaceSubTab === 'review'
                    ? 'border-emerald-600 text-emerald-800'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <UserCheck className="w-3.5 h-3.5" />
                <span>Engineer Review</span>
              </button>
            </div>

            {/* TAB CONTENT: 1. OVERVIEW (Matches Reference Visual Image + 3 Cards + Roadmap) */}
            {workspaceSubTab === 'overview' && (
              <div className="space-y-4">
                {/* Upper Grid: Visual Analysis (Left) & 3 Engineering Cards (Right) */}
                <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-stretch">
                  {/* Left (md:col-span-6): Visual Infrastructure Analysis */}
                  <div className="md:col-span-6 relative rounded-xl overflow-hidden border border-slate-200 bg-slate-900 shadow-2xs min-h-[290px] flex items-center justify-center">
                    <img
                      src={
                        (currentAsset.id === 'ASSET-DRN-006' || currentAsset.id === 'DEMO-DRN-006' || currentAsset.name?.toLowerCase().includes('mithi'))
                          ? mithiVisualAnalysisImg
                          : (currentAsset.hero_url || currentAsset.thumbnail_url)
                      }
                      alt={activeFinding.affected_component || 'Visual Infrastructure Analysis'}
                      className="w-full h-full object-cover min-h-[290px]"
                    />
                  </div>

                  {/* Right (md:col-span-6): 3 Engineering Cards */}
                  <div className="md:col-span-6 flex flex-col justify-between space-y-3">
                    {/* Card 1: What's the Problem? */}
                    <div className="p-3.5 rounded-xl bg-slate-50/70 border border-slate-200/90 shadow-2xs space-y-1.5">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                        <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wide">
                          What's the Problem?
                        </h4>
                      </div>
                      <p className="text-xs text-slate-700 leading-relaxed font-normal">
                        {activeFinding.plain_explanation || activeFinding.observed_condition || activeFinding.title}
                      </p>
                    </div>

                    {/* Card 2: Risk & Impact */}
                    <div className="p-3.5 rounded-xl bg-slate-50/70 border border-slate-200/90 shadow-2xs space-y-1.5">
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 text-red-500 shrink-0" />
                        <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wide">
                          Risk &amp; Impact
                        </h4>
                      </div>
                      <ul className="space-y-1 text-xs text-slate-700">
                        <li className="flex items-start gap-1.5 leading-snug">
                          <span className="w-1.5 h-1.5 rounded-full bg-red-500 mt-1 shrink-0" />
                          <span>Reduced gate closure during high tide.</span>
                        </li>
                        <li className="flex items-start gap-1.5 leading-snug">
                          <span className="w-1.5 h-1.5 rounded-full bg-red-500 mt-1 shrink-0" />
                          <span>Risk of backwater ingress and urban flooding.</span>
                        </li>
                        <li className="flex items-start gap-1.5 leading-snug">
                          <span className="w-1.5 h-1.5 rounded-full bg-red-500 mt-1 shrink-0" />
                          <span>Increased structural load and faster wear.</span>
                        </li>
                        <li className="flex items-start gap-1.5 leading-snug">
                          <span className="w-1.5 h-1.5 rounded-full bg-red-500 mt-1 shrink-0" />
                          <span>May lead to service disruption during storms.</span>
                        </li>
                      </ul>
                    </div>

                    {/* Card 3: Recommended Changes */}
                    <div className="p-3.5 rounded-xl bg-slate-50/70 border border-slate-200/90 shadow-2xs space-y-1.5">
                      <div className="flex items-center gap-2">
                        <Wrench className="w-4 h-4 text-emerald-600 shrink-0" />
                        <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wide">
                          Recommended Changes
                        </h4>
                      </div>
                      <ul className="space-y-1 text-xs text-slate-700">
                        <li className="flex items-start gap-1.5 leading-snug">
                          <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                          <span>Remove debris and clear bio-fouling.</span>
                        </li>
                        <li className="flex items-start gap-1.5 leading-snug">
                          <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                          <span>Inspect and service hinge and trunnion assembly.</span>
                        </li>
                        <li className="flex items-start gap-1.5 leading-snug">
                          <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                          <span>Dredge silt from intake chamber.</span>
                        </li>
                        <li className="flex items-start gap-1.5 leading-snug">
                          <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                          <span>Test full gate closure and operational response.</span>
                        </li>
                      </ul>
                    </div>
                  </div>
                </div>

                {/* Lower Section: Execution Roadmap (4 Connected Horizontal Stages) */}
                <div className="space-y-2 pt-2">
                  <div className="flex items-center gap-2">
                    <Compass className="w-4 h-4 text-emerald-700" />
                    <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wide">
                      Execution Roadmap
                    </h4>
                  </div>

                  <div className="flex flex-col lg:flex-row items-stretch lg:items-center gap-2">
                    {/* Stage 1: Immediate Response */}
                    <div className="p-2.5 rounded-xl bg-red-50/40 border border-red-200/80 shadow-2xs space-y-1.5 flex-1 flex flex-col justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center gap-1.5">
                          <span className="w-4 h-4 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center shrink-0">
                            1
                          </span>
                          <span className="text-xs font-bold text-slate-900">
                            1 Immediate Response
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-600 leading-snug">
                          Clear obstruction and restore operability.
                        </p>
                      </div>
                      <div>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-700 inline-block">
                          Within 24 - 48 hours
                        </span>
                      </div>
                    </div>

                    <ArrowRight className="w-4 h-4 text-slate-300 shrink-0 hidden lg:block" />

                    {/* Stage 2: Engineering Investigation */}
                    <div className="p-2.5 rounded-xl bg-blue-50/40 border border-blue-200/80 shadow-2xs space-y-1.5 flex-1 flex flex-col justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center gap-1.5">
                          <span className="w-4 h-4 rounded-full bg-blue-500 text-white text-[10px] font-bold flex items-center justify-center shrink-0">
                            2
                          </span>
                          <span className="text-xs font-bold text-slate-900">
                            Engineering Investigation
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-600 leading-snug">
                          Inspect mechanism, hinges and seals; assess wear.
                        </p>
                      </div>
                      <div>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-700 inline-block">
                          Within 7 days
                        </span>
                      </div>
                    </div>

                    <ArrowRight className="w-4 h-4 text-slate-300 shrink-0 hidden lg:block" />

                    {/* Stage 3: Corrective Changes */}
                    <div className="p-2.5 rounded-xl bg-emerald-50/40 border border-emerald-200/80 shadow-2xs space-y-1.5 flex-1 flex flex-col justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center gap-1.5">
                          <span className="w-4 h-4 rounded-full bg-emerald-600 text-white text-[10px] font-bold flex items-center justify-center shrink-0">
                            3
                          </span>
                          <span className="text-xs font-bold text-slate-900">
                            3. Corrective Changes
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-600 leading-snug">
                          Repair or replace affected components.
                        </p>
                      </div>
                      <div>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700 inline-block">
                          As per investigation
                        </span>
                      </div>
                    </div>

                    <ArrowRight className="w-4 h-4 text-slate-300 shrink-0 hidden lg:block" />

                    {/* Stage 4: Long-Term Prevention */}
                    <div className="p-2.5 rounded-xl bg-purple-50/40 border border-purple-200/80 shadow-2xs space-y-1.5 flex-1 flex flex-col justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center gap-1.5">
                          <span className="w-4 h-4 rounded-full bg-purple-600 text-white text-[10px] font-bold flex items-center justify-center shrink-0">
                            4
                          </span>
                          <span className="text-xs font-bold text-slate-900">
                            4 Long-Term Prevention
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-600 leading-snug">
                          Implement anti-fouling measures and periodic functional testing.
                        </p>
                      </div>
                      <div>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-700 inline-block">
                          Ongoing / Scheduled
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB CONTENT: 2. DETAILED ANALYSIS */}
            {workspaceSubTab === 'analysis' && (
              <div className="space-y-3 p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs">
                <h4 className="font-bold text-slate-900 text-sm">
                  Technical Diagnostics &amp; Engineering Synthesis
                </h4>
                <p className="text-slate-700 leading-relaxed">
                  {activeFinding.technical_explanation || activeFinding.observed_condition || activeFinding.plain_explanation}
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                  <div className="p-3 rounded-lg bg-white border border-slate-200 space-y-1">
                    <strong className="block text-slate-900 text-[11px]">Responsible Engineering Discipline</strong>
                    <span className="text-slate-600 font-medium">{activeFinding.responsible_discipline || 'Hydromechanical & Marine Engineering'}</span>
                  </div>
                  <div className="p-3 rounded-lg bg-white border border-slate-200 space-y-1">
                    <strong className="block text-slate-900 text-[11px]">Required Administrative Approval</strong>
                    <span className="text-slate-600 font-medium">{activeFinding.approval_required || 'Chief Engineer Emergency Sanction'}</span>
                  </div>
                </div>
              </div>
            )}

            {/* TAB CONTENT: 3. ACTION PLAN */}
            {workspaceSubTab === 'action_plan' && (
              <div className="space-y-3 p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs">
                <h4 className="font-bold text-slate-900 text-sm">
                  Structured 3-Stage Intervention Plan
                </h4>
                <div className="space-y-2">
                  <div className="p-3 rounded-lg bg-white border border-red-200/80 space-y-1">
                    <strong className="text-red-900 font-bold block">Stage A: Immediate Hazard Mitigation (24–48h)</strong>
                    <p className="text-slate-700">{activeFinding.immediate_action || 'Mobilize commercial diving crew for high-pressure waterjet cleaning.'}</p>
                  </div>
                  <div className="p-3 rounded-lg bg-white border border-orange-200/80 space-y-1">
                    <strong className="text-orange-900 font-bold block">Stage B: Corrective Engineering Works (7–14d)</strong>
                    <p className="text-slate-700">{activeFinding.recommended_action || 'Complete disassembly, ultrasonic testing and seal replacements.'}</p>
                  </div>
                  <div className="p-3 rounded-lg bg-white border border-emerald-200/80 space-y-1">
                    <strong className="text-emerald-900 font-bold block">Stage C: Preventive Surveillance (Ongoing)</strong>
                    <p className="text-slate-700">{activeFinding.further_investigation || 'Quarterly operational cycle audit and ultrasonic thickness gauging.'}</p>
                  </div>
                </div>
              </div>
            )}

            {/* TAB CONTENT: 4. EVIDENCE (2) */}
            {workspaceSubTab === 'evidence' && (
              <div className="space-y-3 p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs">
                <h4 className="font-bold text-slate-900 text-sm">
                  Documented Inspection Audits &amp; Provenance
                </h4>
                <div className="space-y-2">
                  <div className="p-3 rounded-lg bg-white border border-slate-200 flex items-center justify-between gap-3">
                    <div>
                      <strong className="block text-slate-900 font-bold">Mithi River Sluice Gate Pre-Monsoon Audit 2024 (PDF)</strong>
                      <span className="text-slate-500 text-[11px]">Section 2.4 — Flap Gate Pin Clearance &amp; Bio-fouling Appraisal</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedCitationLabel('Ref 1');
                        setViewerOpen(true);
                      }}
                      className="px-2.5 py-1 rounded bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 font-bold text-[11px] cursor-pointer"
                    >
                      Inspect Evidence
                    </button>
                  </div>

                  <div className="p-3 rounded-lg bg-white border border-slate-200 flex items-center justify-between gap-3">
                    <div>
                      <strong className="block text-slate-900 font-bold">Approach Waterway Sonar &amp; Silt Profiling (PDF)</strong>
                      <span className="text-slate-500 text-[11px]">Bathymetric cross-section audit showing &gt;65% intake siltation</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedCitationLabel('Ref 2');
                        setViewerOpen(true);
                      }}
                      className="px-2.5 py-1 rounded bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 font-bold text-[11px] cursor-pointer"
                    >
                      Inspect Evidence
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* TAB CONTENT: 5. ENGINEER REVIEW */}
            {workspaceSubTab === 'review' && (
              <form onSubmit={handleSubmitReview} className="space-y-3 p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs">
                <h4 className="font-bold text-slate-900 text-sm">
                  Official Infrastructure Engineer Review &amp; Verification
                </h4>
                <div className="space-y-2">
                  <div>
                    <label className="block text-slate-700 font-bold mb-1">Reviewer Name &amp; Designation</label>
                    <input
                      type="text"
                      value={reviewerName}
                      onChange={(e) => setReviewerName(e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded-lg p-2 text-xs text-slate-900"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-700 font-bold mb-1">Verification Decision</label>
                    <select
                      value={reviewDecision}
                      onChange={(e) => setReviewDecision(e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded-lg p-2 text-xs text-slate-900"
                    >
                      <option value="Verified">Verified — Endorse Finding &amp; Urgency</option>
                      <option value="Modified Severity">Modified Severity — Request Re-evaluation</option>
                      <option value="Resolution In Progress">Resolution In Progress — Works Mobilized</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-slate-700 font-bold mb-1">Technical Review Notes</label>
                    <textarea
                      rows={2}
                      value={reviewNotes}
                      onChange={(e) => setReviewNotes(e.target.value)}
                      placeholder="Add engineering validation remarks..."
                      className="w-full bg-white border border-slate-300 rounded-lg p-2 text-xs text-slate-900"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={submittingReview}
                    className="px-4 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs cursor-pointer shadow-xs disabled:opacity-50"
                  >
                    {submittingReview ? 'Submitting Review...' : 'Submit Engineer Verification'}
                  </button>
                </div>
              </form>
            )}
          </main>
        </div>
      )}

      {/* =========================================================================
          4. BOTTOM BANNER: AAYAM INTELLIGENCE INSIGHT
          Matches Reference Image: AAYAM Insight | Executive Summary | Ask a Follow-up
          ========================================================================= */}
      <section className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#031d19] via-[#09352e] to-[#041e1a] border border-emerald-900/60 shadow-lg text-white p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-start sm:items-center gap-3 min-w-0">
          <div className="flex items-center gap-2 shrink-0">
            <Sparkles className="w-5 h-5 text-emerald-400" />
            <h3 className="text-sm sm:text-base font-black text-white tracking-tight">
              AAYAM Insight
            </h3>
          </div>
          <div className="hidden sm:block h-5 w-[1px] bg-emerald-700/80 shrink-0" />
          <p className="text-xs text-slate-200 leading-relaxed font-normal">
            The {activeFinding.affected_component || 'Tidal Sluice Flap Gate #2'} is a critical point for flood defense. Restoring full closure and clearing silt should be prioritized within 48 hours to maintain system safety during upcoming high tides.
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            setActiveNavTab('ask');
            if (askAayamSectionRef.current) {
              askAayamSectionRef.current.scrollIntoView({ behavior: 'smooth' });
            }
          }}
          className="shrink-0 px-4 py-2 rounded-xl bg-white hover:bg-emerald-50 text-emerald-950 font-bold text-xs flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
        >
          <Bot className="w-4 h-4 text-emerald-800" />
          <span>Ask a Follow-up</span>
        </button>
      </section>

      {/* =========================================================================
          5. INTERACTIVE COPILOT ASSISTANT & EVIDENCE INTEGRATION
          Always available for user queries, sample inquiries, grounded answer synthesis,
          evidence citations, and test verification compatibility.
          ========================================================================= */}
      <section
        ref={askAayamSectionRef}
        className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-5 sm:p-6 space-y-4"
      >
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left: Input Form */}
          <div className="lg:col-span-7 space-y-3">
            <div>
              <h3 className="text-base font-bold text-slate-900 tracking-tight flex items-center gap-2">
                <Bot className="w-4 h-4 text-emerald-600" />
                <span>Ask AAYAM</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Ask about this asset, findings, risks or recommended actions.
              </p>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleAsk();
              }}
              className="relative flex items-center"
            >
              <input
                type="text"
                value={copilotInput}
                onChange={(e) => setCopilotInput(e.target.value)}
                placeholder={t('copilot.inputPlaceholder', "Ask about any infrastructure asset (e.g. 'What did the underwater sonar scour audit find?')...")}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-4 pr-12 py-3 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
              />
              <button
                type="submit"
                disabled={copilotLoading || !copilotInput.trim()}
                className="absolute right-2 p-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white transition-colors cursor-pointer"
                title="Send Question"
              >
                {copilotLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              </button>
            </form>
          </div>

          {/* Right: Suggested Questions / Sample Verification Inquiries */}
          <div className="lg:col-span-5 space-y-2">
            <span className="text-xs font-bold text-slate-700 block">
              {t('copilot.sampleInquiriesTitle', 'Sample Verification Inquiries (Click to Ask)')}
            </span>
            <div className="flex flex-col gap-2">
              {activePrompts.map((q, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleSampleClick(q.prompt)}
                  disabled={copilotLoading}
                  className="px-3.5 py-2 rounded-xl bg-slate-50/70 hover:bg-slate-100 border border-slate-200 text-left text-xs font-medium text-slate-700 flex items-center justify-between group transition-colors cursor-pointer"
                >
                  <span className="group-hover:text-emerald-700">{q.title}</span>
                  <span className="text-slate-400 group-hover:text-emerald-700">&rarr;</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Loading Spinner */}
        {copilotLoading && (
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex items-center gap-3 text-xs text-slate-600">
            <Loader2 className="w-4 h-4 text-emerald-600 animate-spin" />
            <span>Analyzing engineering records, inspection telemetry and grounding evidence...</span>
          </div>
        )}

        {/* Answer Output Window */}
        {copilotResponse && (
          <div className="mt-4 p-5 rounded-xl bg-slate-50/80 border border-slate-200 space-y-4">
            {isDemo && (
              <div
                data-testid="copilot-demo-disclaimer"
                className="p-2.5 rounded-lg bg-amber-50 border border-amber-200 flex items-center gap-2 text-[11px] text-amber-900"
              >
                <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-amber-600" />
                <span>
                  Simulated Demonstration Material: response and citations are synthetic specimens authored for offline walkthrough. Not verified real-world evidence.
                </span>
              </div>
            )}
            <div className="flex items-center justify-between border-b border-slate-200 pb-2">
              <span className="text-xs font-bold text-slate-900">Query: "{activeQuery}"</span>
              <button
                onClick={() => setCopilotResponse(null)}
                className="text-xs text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                Clear
              </button>
            </div>

            {/* Direct Simple Answer Highlight Card */}
            {copilotResponse.simple_answer && (
              <div className="p-4 rounded-xl bg-gradient-to-r from-emerald-50/90 to-teal-50/60 border border-emerald-200 shadow-xs space-y-1.5">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-emerald-700 shrink-0" />
                  <span className="text-xs font-bold uppercase tracking-wider text-emerald-900">
                    Direct Answer (Plain Language)
                  </span>
                  <span className="ml-auto text-[10px] font-medium text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full border border-emerald-200">
                    Understandable Summary
                  </span>
                </div>
                <p className="text-xs text-slate-800 leading-relaxed font-medium">
                  {copilotResponse.simple_answer}
                </p>
              </div>
            )}

            {/* Verified External Intelligence & Official Statutory Guidelines */}
            {copilotResponse.external_sources && copilotResponse.external_sources.length > 0 && (
              <div className="p-4 rounded-xl bg-blue-50/50 border border-blue-200/80 space-y-3 shadow-xs">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <Globe2 className="w-4 h-4 text-blue-700" />
                    <span className="text-xs font-bold uppercase tracking-wider text-blue-900">
                      Verified External Intelligence &amp; Official Guidelines
                    </span>
                  </div>
                  {copilotResponse.search_provider && (
                    <span className="text-[10px] font-mono font-medium text-blue-800 bg-blue-100/80 px-2 py-0.5 rounded border border-blue-200">
                      Provider: {copilotResponse.search_provider}
                    </span>
                  )}
                </div>

                <div className="p-2.5 rounded-lg bg-blue-100/40 border border-blue-200/60 text-[11px] text-blue-900 leading-relaxed flex items-start gap-2">
                  <ShieldCheck className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                  <span>
                    Authoritative statutory codes and central government guidelines retrieved via web search. These standards complement local field audit records and are cited for statutory engineering compliance.
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                  {copilotResponse.external_sources.map((ext, idx) => (
                    <div
                      key={idx}
                      className="p-3 rounded-lg bg-white border border-blue-200 hover:border-blue-300 transition-all space-y-1.5 shadow-2xs"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[10px] font-mono font-bold text-blue-800 bg-blue-50 border border-blue-200 px-1.5 py-0.5 rounded shrink-0">
                          [WebRef {idx + 1}]
                        </span>
                        <span className="text-[10px] font-medium text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded truncate">
                          {ext.domain}
                        </span>
                        <span className="text-[10px] font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded shrink-0 ml-auto">
                          {ext.authority_tier || 'Official Authority'}
                        </span>
                      </div>

                      <a
                        href={ext.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs font-semibold text-blue-700 hover:text-blue-900 hover:underline flex items-center gap-1 group line-clamp-2"
                      >
                        <span>{ext.title}</span>
                        <ExternalLink className="w-3 h-3 shrink-0 opacity-70 group-hover:opacity-100 transition-opacity" />
                      </a>

                      {ext.snippet && (
                        <p className="text-[11px] text-slate-600 leading-normal line-clamp-3">
                          "{ext.snippet}"
                        </p>
                      )}

                      {ext.supports_topic && (
                        <div className="text-[10px] text-slate-500 font-mono pt-1 border-t border-slate-100">
                          Guidance topic: {ext.supports_topic}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Grounded Technical Synthesis Header & Answer */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-700 block">
                  {isDemo ? t('copilot.synthesisDemo', 'Simulated Demonstration Synthesis') : 'Grounded Technical Synthesis'}
                </span>
                <div className="flex items-center gap-3">
                  {copilotResponse.citations && copilotResponse.citations.length > 0 && (
                    <span className="text-[10px] font-mono text-amber-800">
                      {copilotResponse.citations.length} Verified Sources Cited
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => setShowTechnicalDetails(!showTechnicalDetails)}
                    className="text-[11px] font-medium text-slate-600 hover:text-slate-900 cursor-pointer flex items-center gap-1 px-2 py-0.5 rounded bg-white hover:bg-slate-100 border border-slate-200 transition-colors"
                  >
                    <span>{showTechnicalDetails ? 'Collapse Details' : 'Expand Details'}</span>
                    <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showTechnicalDetails ? 'rotate-180' : ''}`} />
                  </button>
                </div>
              </div>
              {showTechnicalDetails && (
                <div className="p-4 rounded-xl bg-white border border-slate-200 text-xs text-slate-800 font-sans shadow-inner">
                  <MarkdownAnswer
                    text={copilotResponse.answer}
                    onOpenCitation={(ref) => {
                      setSelectedCitationLabel(ref);
                      setViewerOpen(true);
                    }}
                  />
                </div>
              )}
            </div>

            {/* Citations Box with Deduplicated Source References (Interactive) */}
            <div className="p-4 rounded-xl bg-white border border-slate-200 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                  <Bookmark className="w-3.5 h-3.5 text-emerald-700" />
                  <span>{isDemo ? t('copilot.evidenceCitationsTitleDemo', 'Simulated Demonstration Citations & Source Provenance') : t('copilot.evidenceCitationsTitleLive', 'Evidence Citations & Source Provenance')}</span>
                </span>
              </div>

              {copilotResponse.citations && copilotResponse.citations.length > 0 ? (
                <div className="space-y-2">
                  {copilotResponse.citations.map((cite, idx) => {
                    const match = cite.match(/\[(Ref\s*\d+)\]/i);
                    const refLabel = match ? match[1] : `Ref ${idx + 1}`;
                    return (
                      <div
                        key={idx}
                        className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-between gap-3 text-xs"
                      >
                        <div className="flex items-start gap-2 min-w-0">
                          <span className="font-mono text-[10px] font-bold text-emerald-800 bg-emerald-100 border border-emerald-300 px-1.5 py-0.5 rounded shrink-0">
                            [{refLabel}]
                          </span>
                          <span className="font-mono text-[11px] text-slate-700 truncate" title={cite}>
                            {cite.replace(/^\[Ref\s*\d+\]\s*/, '')}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedCitationLabel(refLabel);
                            setViewerOpen(true);
                          }}
                          className="px-2.5 py-1 rounded-md bg-white hover:bg-slate-100 text-emerald-800 border border-slate-300 text-[10px] font-semibold flex items-center gap-1 shrink-0 transition-all cursor-pointer"
                        >
                          <BookOpen className="w-3 h-3 text-emerald-700" />
                          <span>{t('copilot.inspectEvidence', 'Inspect Evidence')}</span>
                        </button>
                      </div>
                    );
                  })}
                </div>
              ) : null}
            </div>

            {/* Observed Facts vs Recommendations Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Verified Observed Facts */}
              {copilotResponse.observed_facts && copilotResponse.observed_facts.length > 0 && (
                <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-sm space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wide">
                        {t('copilot.observedFactsTitle', 'Observed Empirical Facts')}
                      </h4>
                    </div>
                  </div>
                  <ul className="space-y-2 text-xs">
                    {copilotResponse.observed_facts.map((fact, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-slate-700 text-[11px] leading-relaxed">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 mt-1.5 shrink-0" />
                        <div>{renderInlineContent(fact, (ref) => {
                          setSelectedCitationLabel(ref);
                          setViewerOpen(true);
                        })}</div>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Recommended Engineering Next Steps */}
              {copilotResponse.recommendations && copilotResponse.recommendations.length > 0 && (
                <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-sm space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <ShieldAlert className="w-4 h-4 text-emerald-700" />
                      <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wide">
                        {t('copilot.recommendedActionsTitle', 'Recommended Actions')}
                      </h4>
                    </div>
                  </div>
                  <ul className="space-y-2 text-xs">
                    {copilotResponse.recommendations.map((rec, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-slate-700 text-[11px] leading-relaxed">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 mt-1.5 shrink-0" />
                        <div>{renderInlineContent(rec, (ref) => {
                          setSelectedCitationLabel(ref);
                          setViewerOpen(true);
                        })}</div>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {/* Supporting Evidence Records */}
            {copilotResponse.evidence && copilotResponse.evidence.length > 0 && (
              <div className="space-y-2.5 pt-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-600">
                    {t('copilot.retrievedEvidenceTitle', 'Retrieved Evidence Passages & Records ({count})', { count: copilotResponse.evidence.length })}
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {copilotResponse.evidence.map((ev, idx) => {
                    const isDoc = ev.evidence_type === 'document_audit_passage';
                    const label = ev.citation_label || `Ref ${idx + 1}`;
                    return (
                      <div
                        key={idx}
                        className="p-3.5 rounded-xl bg-white border border-slate-200 shadow-sm space-y-2 flex flex-col justify-between"
                      >
                        <div className="space-y-2">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <span className="font-mono text-[10px] font-bold text-emerald-700 uppercase block">
                                [{label}] {ev.asset_id || (isDoc ? 'DOCUMENT AUDIT' : 'ASSET')}
                              </span>
                              <h5 className="font-bold text-slate-900 text-xs">
                                {ev.document_name || ev.asset_name || 'Engineering Evidence'}
                              </h5>
                            </div>
                            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200 shrink-0">
                              {isDoc ? 'Doc Excerpt' : 'DB Telemetry'}
                            </span>
                          </div>

                          {isDoc && (
                            <div className="text-[11px] text-slate-700 space-y-1.5">
                              {ev.excerpt && (
                                <blockquote className="p-2 rounded bg-slate-50 border-l-2 border-emerald-600 text-[11px] text-slate-700 italic leading-snug">
                                  "{ev.excerpt.slice(0, 260)}..."
                                </blockquote>
                              )}
                            </div>
                          )}
                        </div>

                        <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedCitationLabel(label);
                              setViewerOpen(true);
                            }}
                            className="text-emerald-700 hover:text-emerald-800 flex items-center gap-1 font-semibold text-[10px] transition-colors cursor-pointer"
                          >
                            <BookOpen className="w-3 h-3 text-emerald-700" />
                            <span>{t('copilot.inspectButton', 'Inspect')}</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </section>

      {/* =========================================================================
          6. GLOBAL EVIDENCE VIEWER MODAL
          ========================================================================= */}
      <EvidenceViewerModal
        isOpen={viewerOpen}
        onClose={() => {
          setViewerOpen(false);
          setCustomViewerDoc(null);
        }}
        selectedCitationLabel={selectedCitationLabel}
        citationLabel={selectedCitationLabel}
        citations={copilotResponse?.citations || []}
        evidence={copilotResponse?.evidence || []}
        documentFilename={customViewerDoc || 'Mithi_River_Sluice_Gate_Inspection_2024.txt'}
        assetId={activeAssetId}
        onNavigate={onNavigate}
        isDemo={isDemo}
      />
    </div>
  );
}
