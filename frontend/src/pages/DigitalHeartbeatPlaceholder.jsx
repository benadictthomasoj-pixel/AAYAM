import React, { useState, useEffect, useMemo } from 'react';
import {
  Activity,
  ShieldAlert,
  Clock,
  Gauge,
  Layers,
  CheckCircle2,
  AlertTriangle,
  Info,
  Calendar,
  Compass,
  FileText,
  PlusCircle,
  CheckSquare,
  History,
  Send,
  Loader2,
  UserCheck,
  ChevronRight,
  ChevronDown,
  ExternalLink,
  MapPin,
  Building2,
  Droplets,
  ClipboardCheck,
  Settings,
  Waves,
  Wrench,
  Shield,
  ArrowRight,
  Sparkles,
  X,
} from 'lucide-react';
import StatusBadge from '../components/StatusBadge';
import { useLanguage } from '../context/LanguageContext';
import {
  fetchAssetHeartbeat,
  fetchAssetInspections,
  createInspection,
  updateInspection,
  verifyInspectionOutcome,
  fetchAssetTimeline,
} from '../services/api';
import {
  getDemoHeartbeat,
  getDemoInspections,
  getDemoTimeline,
  createDemoInspection,
  updateDemoInspection,
  verifyDemoInspectionOutcome,
} from '../demo/demoService';
import {
  getAssetHeroImage,
  getAssetThumbnail as resolveAssetThumbnail,
} from '../utils/assetImages';

// Helper to resolve authentic high-resolution infrastructure photography
function getAssetThumbnail(asset, isHero = false) {
  if (isHero) return getAssetHeroImage(asset);
  return resolveAssetThumbnail(asset);
}

// Semicircular Structural Health Index gauge meter
function CircularHealthGauge({ value = 38.6 }) {
  const radius = 54;
  const stroke = 10;
  // Arc length for semicircle: π * r ≈ 169.646
  const arcLength = Math.PI * radius;
  const clampedValue = Math.min(100, Math.max(0, typeof value === 'number' ? value : 0));
  const strokeDashoffset = arcLength - (clampedValue / 100) * arcLength;

  return (
    <div className="flex flex-col items-center justify-center">
      <div className="relative w-44 h-24 flex items-center justify-center">
        <svg
          viewBox="0 0 160 96"
          className="w-full h-full overflow-visible"
        >
          {/* Background Arc: Semicircle from left (26, 82) to right (134, 82) */}
          <path
            d="M 26 82 A 54 54 0 0 1 134 82"
            fill="none"
            stroke="#E2E8F0"
            strokeWidth={stroke}
            strokeLinecap="round"
          />
          {/* Progress Arc: Semicircle filling clockwise from left */}
          <path
            d="M 26 82 A 54 54 0 0 1 134 82"
            fill="none"
            stroke="#087F4F"
            strokeWidth={stroke}
            strokeDasharray={arcLength}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            className="transition-all duration-700 ease-out"
          />
          {/* Centered Health Percentage Text */}
          <text
            x="80"
            y="72"
            textAnchor="middle"
            className="font-black text-[26px] fill-[#142B2A] font-sans"
            style={{ fontWeight: 900, fontSize: '26px', fill: '#142B2A' }}
          >
            {clampedValue.toFixed(1)}%
          </text>
        </svg>
      </div>
      <div className="flex items-center justify-center gap-1 text-[11px] font-semibold text-slate-500 mt-1">
        <span>Structural Health Index</span>
        <Info className="w-3.5 h-3.5 text-slate-400" />
      </div>
    </div>
  );
}

export default function DigitalHeartbeatPlaceholder({
  assets = [],
  selectedAsset,
  onSelectAsset,
  onNavigate,
  onRefresh,
  isAdmin = false,
  isDemo = false,
}) {
  const { t } = useLanguage();
  const currentAsset = selectedAsset || assets[0] || null;
  const [heartbeat, setHeartbeat] = useState(null);
  const [inspections, setInspections] = useState([]);
  const [timeline, setTimeline] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [actionSuccess, setActionSuccess] = useState(null);
  const [actionError, setActionError] = useState(null);
  const [activeTab, setActiveTab] = useState('heartbeat'); // 'heartbeat' (redesign), 'inspections', 'timeline'

  // New Inspection Form State
  const [showAddForm, setShowAddForm] = useState(false);
  const [formDate, setFormDate] = useState(new Date().toISOString().split('T')[0]);
  const [formType, setFormType] = useState('Structural Audit');
  const [formFindings, setFormFindings] = useState('');
  const [formRecommendedAction, setFormRecommendedAction] = useState('');
  const [formActionTaken, setFormActionTaken] = useState('');
  const [formEvidenceRef, setFormEvidenceRef] = useState('');
  const [submittingInsp, setSubmittingInsp] = useState(false);

  // Verification Modal State
  const [verifyingInspId, setVerifyingInspId] = useState(null);
  const [verificationNotes, setVerificationNotes] = useState('');
  const [verificationDate, setVerificationDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [verifierName, setVerifierName] = useState('Senior Verification Engineer');
  const [verificationOutcome, setVerificationOutcome] = useState('Remediation Successful');
  const [verificationActionTaken, setVerificationActionTaken] = useState('');
  const [submittingVerify, setSubmittingVerify] = useState(false);

  const canManage = isAdmin || isDemo;

  // Load telemetry
  const loadAssetTelemetry = async (assetId) => {
    if (!assetId) return;
    setLoading(true);
    setError(null);
    try {
      if (isDemo) {
        const [hbData, inspData, timelineData] = await Promise.all([
          getDemoHeartbeat(assetId),
          getDemoInspections(assetId),
          getDemoTimeline(assetId),
        ]);
        setHeartbeat(hbData);
        setInspections(inspData || []);
        setTimeline(timelineData || []);
        return;
      }

      const [hbData, inspData, timelineData] = await Promise.all([
        fetchAssetHeartbeat(assetId),
        fetchAssetInspections(assetId),
        fetchAssetTimeline(assetId),
      ]);
      setHeartbeat(hbData);
      setInspections(inspData || []);
      setTimeline(timelineData || []);
    } catch (err) {
      console.error('Failed to load asset telemetry:', err);
      setError(err.message || 'Error communicating with Digital Heartbeat API.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (currentAsset?.id) {
      loadAssetTelemetry(currentAsset.id);
      setActionSuccess(null);
      setActionError(null);
    }
  }, [currentAsset?.id]);

  const handleCreateInspection = async (e) => {
    e.preventDefault();
    if (!formFindings.trim() || submittingInsp) return;

    setActionError(null);
    setActionSuccess(null);
    setSubmittingInsp(true);

    if (isDemo) {
      try {
        await createDemoInspection();
      } catch (err) {
        setActionError(err.message || 'Demo Mode: Recording inspections is disabled.');
      } finally {
        setSubmittingInsp(false);
      }
      return;
    }

    try {
      const res = await createInspection(currentAsset.id, {
        inspection_date: formDate,
        inspection_type: formType,
        findings: formFindings.trim(),
        recommended_action: formRecommendedAction.trim() || undefined,
        actual_action_taken: formActionTaken.trim() || undefined,
        evidence_references: formEvidenceRef.trim() || undefined,
      });

      setFormFindings('');
      setFormRecommendedAction('');
      setFormActionTaken('');
      setFormEvidenceRef('');
      setShowAddForm(false);
      setActionSuccess(`Inspection recorded successfully! Risk score recalculated.`);
      await loadAssetTelemetry(currentAsset.id);
      if (onRefresh) onRefresh();
    } catch (err) {
      console.error('Failed to save inspection:', err);
      setActionError(`Failed to save inspection: ${err.message}`);
    } finally {
      setSubmittingInsp(false);
    }
  };

  const handleVerifySubmit = async (inspectionId) => {
    if (!verificationNotes.trim() || submittingVerify) return;
    setActionError(null);
    setActionSuccess(null);
    setSubmittingVerify(true);

    if (isDemo) {
      try {
        await verifyDemoInspectionOutcome();
      } catch (err) {
        setActionError(err.message || 'Demo Mode: Verification is disabled.');
      } finally {
        setSubmittingVerify(false);
      }
      return;
    }

    try {
      await verifyInspectionOutcome(inspectionId, {
        verification_notes: verificationNotes.trim(),
        verification_date: verificationDate.trim() || undefined,
        verifier_name: verifierName.trim() || undefined,
        outcome: verificationOutcome,
        actual_action_taken: verificationActionTaken.trim() || undefined,
      });
      setVerifyingInspId(null);
      setVerificationNotes('');
      setVerificationActionTaken('');
      setVerificationOutcome('Remediation Successful');
      setActionSuccess(`Outcome verified as "${verificationOutcome}"! Asset risk score updated.`);
      await loadAssetTelemetry(currentAsset.id);
      if (onRefresh) onRefresh();
    } catch (err) {
      console.error('Verification failed:', err);
      setActionError(`Verification failed: ${err.message}`);
    } finally {
      setSubmittingVerify(false);
    }
  };

  // Four-factor cards data mapped from heartbeat contributing_factors
  const factorCards = useMemo(() => {
    const rawFactors = heartbeat?.contributing_factors || [];
    const defaults = [
      {
        id: 'factor_structural',
        name: 'Structural & Material',
        weight: 0.35,
        score: 92.0,
        color: '#E54848',
        bg: 'bg-red-50 text-red-600 border-red-200/80',
        barColor: 'bg-[#E54848]',
        Icon: Building2,
      },
      {
        id: 'factor_environmental',
        name: 'Environmental & Climate',
        weight: 0.25,
        score: 85.0,
        color: '#E9A23B',
        bg: 'bg-amber-50 text-amber-700 border-amber-200/80',
        barColor: 'bg-[#E9A23B]',
        Icon: Droplets,
      },
      {
        id: 'factor_compliance',
        name: 'Inspection & Compliance',
        weight: 0.25,
        score: 88.0,
        color: '#E9A23B',
        bg: 'bg-amber-50 text-amber-700 border-amber-200/80',
        barColor: 'bg-[#E9A23B]',
        Icon: ClipboardCheck,
      },
      {
        id: 'factor_operational',
        name: 'Operational Strain',
        weight: 0.15,
        score: 78.0,
        color: '#169B62',
        bg: 'bg-emerald-50 text-emerald-700 border-emerald-200/80',
        barColor: 'bg-[#169B62]',
        Icon: Settings,
      },
    ];

    return defaults.map((d, index) => {
      const match = rawFactors[index] || rawFactors.find((rf) => rf.id === d.id);
      return {
        ...d,
        name: match?.name || d.name,
        weight: match?.weight ?? d.weight,
        score: match?.score ?? d.score,
        contribution: match?.contribution,
      };
    });
  }, [heartbeat]);

  const riskScoreValue = heartbeat?.risk_score ?? currentAsset?.risk_score ?? 91.2;
  const healthIndexValue = heartbeat?.health_index ?? currentAsset?.health_index ?? 38.6;
  const riskTierValue = heartbeat?.risk_tier || currentAsset?.risk_level || 'Critical';
  const confidenceScore = heartbeat?.data_confidence_score ? Math.round(heartbeat.data_confidence_score) : 92;

  return (
    <div className="space-y-4 pb-8 flex flex-col font-sans">
      {/* Demo Mode Notice Banner */}
      {isDemo && (
        <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-between text-xs text-amber-900 shadow-2xs">
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded bg-amber-200 text-amber-900 font-bold uppercase tracking-wider text-[10px]">
              {t('heartbeat.badgeDemo', 'Simulated Digital Twin Telemetry • Demo Mode')}
            </span>
            <span>
              {t('heartbeat.descDemo', 'Multi-factor decomposition of simulated scour, structural vibration, and telemetry for synthetic specimens. All actions are locally simulated and blocked from database mutations.')}
            </span>
          </div>
        </div>
      )}

      {/* Top Header Section with Styled Asset Selector */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-1">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-[#087F4F] text-white flex items-center justify-center shrink-0 shadow-2xs">
            <Activity className="w-5 h-5 stroke-[2.2]" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl sm:text-2xl font-black text-[#142B2A] tracking-tight">
                Digital Heartbeat
              </h1>
              <span className="text-xs font-semibold text-slate-700 hidden md:inline">
                {isDemo
                  ? t('heartbeat.titleDemo', 'Demo Digital Heartbeat & Verification')
                  : t('heartbeat.titleLive', 'Asset Condition, Dynamic Risk & Closed-Loop Verification')}
              </span>
            </div>
            <p className="text-xs text-slate-500">
              Infrastructure health, risk intelligence and condition monitoring.
            </p>
          </div>
        </div>

        {/* Top-Right Styled Asset Selector */}
        <div className="flex items-center gap-2 w-full sm:w-auto shrink-0">
          <span className="text-xs text-slate-500 font-medium hidden sm:inline">Select Asset</span>
          <div className="relative w-full sm:w-auto">
            <select
              value={currentAsset?.id || ''}
              onChange={(e) => {
                const found = assets.find((a) => a.id === e.target.value);
                if (found && onSelectAsset) onSelectAsset(found);
              }}
              className="w-full sm:w-80 appearance-none bg-white border border-slate-200/90 rounded-xl pl-11 pr-8 py-2 text-xs font-bold text-slate-900 shadow-2xs hover:border-emerald-600 focus:outline-none focus:border-emerald-600 cursor-pointer"
            >
              {assets.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name} ({a.id})
                </option>
              ))}
            </select>
            <div className="w-7 h-7 rounded-lg overflow-hidden absolute left-2 top-1/2 -translate-y-1/2 pointer-events-none border border-slate-200 bg-slate-100">
              <img
                src={getAssetThumbnail(currentAsset)}
                alt=""
                className="w-full h-full object-cover"
                onError={(e) => {
                  e.target.onerror = null;
                  e.target.src = mandoviBridgeThumbnail;
                }}
              />
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        </div>
      </div>

      {/* Sub-Navigation Tabs (Accessible navigation & test compatibility) */}
      <div className="flex items-center gap-1 border-b border-slate-200/80 pb-2 text-xs">
        <button
          type="button"
          onClick={() => setActiveTab('heartbeat')}
          className={`px-3 py-1.5 rounded-lg font-bold transition-colors cursor-pointer flex items-center gap-1.5 ${
            activeTab === 'heartbeat'
              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200/90 shadow-2xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Activity className="w-3.5 h-3.5 text-emerald-700" />
          <span>{t('heartbeat.tabFactors', 'Factor Decomposition')}</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('inspections')}
          className={`px-3 py-1.5 rounded-lg font-bold transition-colors cursor-pointer flex items-center gap-1.5 ${
            activeTab === 'inspections'
              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200/90 shadow-2xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <CheckSquare className="w-3.5 h-3.5 text-emerald-700" />
          <span>{t('heartbeat.tabInterventions', 'Interventions & Verifications ({count})', { count: inspections.length })}</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('timeline')}
          className={`px-3 py-1.5 rounded-lg font-bold transition-colors cursor-pointer flex items-center gap-1.5 ${
            activeTab === 'timeline'
              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200/90 shadow-2xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <History className="w-3.5 h-3.5 text-emerald-700" />
          <span>{t('heartbeat.tabTimeline', 'Asset Timeline ({count})', { count: timeline.length })}</span>
        </button>
      </div>

      {/* Alert Notices */}
      {actionSuccess && (
        <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center justify-between shadow-2xs animate-fadeIn">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
            <span>{actionSuccess}</span>
          </div>
          <button type="button" onClick={() => setActionSuccess(null)} className="text-emerald-700 hover:text-emerald-900">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
      {actionError && (
        <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs flex items-center justify-between shadow-2xs animate-fadeIn">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
            <span>{actionError}</span>
          </div>
          <button type="button" onClick={() => setActionError(null)} className="text-red-700 hover:text-red-900">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* TAB 1: Main Digital Heartbeat Dashboard View */}
      {activeTab === 'heartbeat' && currentAsset && (
        <div className="space-y-4">
          {/* 1. Main Asset Health Prominent Card */}
          <div className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200/90 shadow-2xs">
            <div className="flex flex-col xl:flex-row items-stretch xl:items-center justify-between gap-5 xl:gap-6">
              {/* Left: Asset Image & Core Info */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 flex-1 min-w-0">
                <div className="w-full sm:w-52 h-34 rounded-xl overflow-hidden bg-slate-100 border border-slate-200/90 shadow-2xs shrink-0 relative group">
                  <img
                    src={getAssetThumbnail(currentAsset, true)}
                    alt={currentAsset.name}
                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                    onError={(e) => {
                      e.target.onerror = null;
                      e.target.src = mandoviBridgeThumbnail;
                    }}
                  />
                </div>

                <div className="space-y-2 min-w-0 flex-1">
                  <div>
                    <h2 className="text-base sm:text-lg font-black text-[#142B2A] leading-snug line-clamp-2">
                      {currentAsset.name}
                    </h2>
                    <div className="font-mono text-xs text-slate-400 font-medium mt-0.5">
                      {currentAsset.id}
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-50 text-red-700 border border-red-200/80">
                      <span className="text-[10px]">▲</span>
                      <span>Critical Attention</span>
                    </span>
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200">
                      {currentAsset.category}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 text-xs text-slate-600">
                    <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span className="truncate">
                      {currentAsset.district}, {currentAsset.state}
                    </span>
                  </div>
                </div>
              </div>

              {/* Middle: Circular Structural Health Gauge with Vertical Dividers */}
              <div className="border-t xl:border-t-0 xl:border-l border-slate-200/80 pt-4 xl:pt-0 xl:pl-6 xl:pr-6 flex items-center justify-center shrink-0">
                <CircularHealthGauge value={healthIndexValue} />
              </div>

              {/* Right: Calculated Risk Score & Key Metrics */}
              <div className="border-t xl:border-t-0 xl:border-l border-slate-200/80 pt-4 xl:pt-0 xl:pl-6 flex flex-row items-center justify-between sm:justify-start gap-6 sm:gap-8 shrink-0">
                {/* Risk Score */}
                <div className="min-w-[105px]">
                  <div className="text-xs text-slate-500 font-medium">
                    {t('heartbeat.calculatedRiskScore', 'Risk Score')}
                  </div>
                  <div className="flex items-baseline gap-1 mt-0.5">
                    <span
                      className={`text-2xl sm:text-3xl font-black font-mono ${
                        riskScoreValue >= 80
                          ? 'text-red-700'
                          : riskScoreValue >= 50
                          ? 'text-amber-700'
                          : 'text-emerald-700'
                      }`}
                    >
                      {riskScoreValue.toFixed(1)}
                    </span>
                    <span className="text-xs text-slate-400 font-medium">/ 100</span>
                  </div>
                  <div className="mt-1 flex items-center gap-1.5">
                    <span className="text-[11px] text-slate-400">Risk Tier</span>
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-red-50 text-red-700 border border-red-200">
                      <span className="w-1.5 h-1.5 rounded-full bg-red-600" />
                      <span>{riskTierValue}</span>
                    </span>
                  </div>
                </div>

                {/* Vertical separator between Risk Score & Secondary Metrics */}
                <div className="hidden sm:block w-px h-16 bg-slate-200/80 shrink-0" />

                {/* Last Assessment & Data Confidence */}
                <div className="space-y-2.5 text-xs min-w-[130px]">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200/80 flex items-center justify-center shrink-0">
                      <Calendar className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-[10px] text-slate-400 uppercase font-semibold">Last Assessment</div>
                      <div className="font-mono font-bold text-slate-800 text-xs">
                        {currentAsset.last_inspection_date || '2024-02-19'}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200/80 flex items-center justify-center shrink-0">
                      <Gauge className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-[10px] text-slate-400 uppercase font-semibold">Data Confidence</div>
                      <div className="font-bold text-slate-800 text-xs">
                        High ({confidenceScore}%)
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 2. Four-Factor Risk Assessment (Single Row) */}
          <div className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200/90 shadow-2xs space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-1">
              <div className="flex items-center gap-2">
                <Layers className="w-4.5 h-4.5 text-[#087F4F]" />
                <h3 className="text-base font-bold text-[#142B2A]">
                  Four-Factor Risk Assessment
                </h3>
              </div>
              <div className="text-xs text-slate-400 font-medium">
                Weighted model: Structural (35%) &bull; Environmental (25%) &bull; Compliance (25%) &bull; Operational (15%)
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
              {factorCards.map((f) => {
                const IconComponent = f.Icon;
                return (
                  <div
                    key={f.id}
                    className="p-3.5 rounded-xl border border-slate-200/90 bg-slate-50/50 space-y-3 transition-shadow hover:shadow-2xs"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border ${f.bg}`}>
                          <IconComponent className="w-4 h-4" />
                        </div>
                        <span className="text-xs font-bold text-slate-900 truncate">
                          {f.name}
                        </span>
                      </div>
                      <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-red-50 text-red-700 border border-red-200/80 shrink-0">
                        {Math.round(f.weight * 100)}%
                      </span>
                    </div>

                    <div>
                      <div className="flex items-baseline gap-1 font-mono">
                        <span className="text-lg font-black text-slate-900">
                          {f.score.toFixed(1)}
                        </span>
                        <span className="text-xs text-slate-400 font-normal">/ 100</span>
                      </div>
                      <div className="w-full h-1.5 rounded-full bg-slate-200 overflow-hidden mt-1.5">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${f.barColor}`}
                          style={{ width: `${Math.min(100, Math.max(5, f.score))}%` }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 3. Bottom Three-Column Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Column A: Key Findings */}
            <div className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200/90 shadow-2xs space-y-3.5 flex flex-col justify-between">
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <div className="p-1 rounded-md bg-emerald-50 text-emerald-700">
                    <AlertTriangle className="w-4 h-4" />
                  </div>
                  <h3 className="text-sm font-bold text-[#142B2A]">Key Findings</h3>
                </div>

                <div className="space-y-2.5">
                  {/* Finding 1 */}
                  <div className="flex items-start gap-3 p-2.5 rounded-xl bg-slate-50/70 border border-slate-200/70">
                    <div className="w-7 h-7 rounded-lg bg-red-50 text-red-600 border border-red-200 flex items-center justify-center shrink-0 mt-0.5">
                      <AlertTriangle className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-900 leading-snug">
                        Structural deterioration
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">
                        Cracks and material aging observed.
                      </p>
                    </div>
                  </div>

                  {/* Finding 2 */}
                  <div className="flex items-start gap-3 p-2.5 rounded-xl bg-slate-50/70 border border-slate-200/70">
                    <div className="w-7 h-7 rounded-lg bg-amber-50 text-amber-700 border border-amber-200 flex items-center justify-center shrink-0 mt-0.5">
                      <Waves className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-900 leading-snug">
                        High environmental exposure
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">
                        Continuous tidal and saline impact.
                      </p>
                    </div>
                  </div>

                  {/* Finding 3 */}
                  <div className="flex items-start gap-3 p-2.5 rounded-xl bg-slate-50/70 border border-slate-200/70">
                    <div className="w-7 h-7 rounded-lg bg-amber-50 text-amber-700 border border-amber-200 flex items-center justify-center shrink-0 mt-0.5">
                      <Calendar className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-900 leading-snug">
                        Inspection overdue
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">
                        Last inspection &gt; 8 months ago.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Column B: Intervention Timeline */}
            <div className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200/90 shadow-2xs space-y-3.5 flex flex-col justify-between">
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <div className="p-1 rounded-md bg-emerald-50 text-emerald-700">
                    <Wrench className="w-4 h-4" />
                  </div>
                  <h3 className="text-sm font-bold text-[#142B2A]">Intervention Timeline</h3>
                </div>

                <div className="relative pl-5 space-y-4 before:content-[''] before:absolute before:left-2 before:top-2.5 before:bottom-2.5 before:w-0.5 before:bg-slate-200">
                  {/* Timeline Item 1 */}
                  <div className="relative flex items-start gap-2.5">
                    <div className="absolute -left-5 top-0.5 w-4 h-4 rounded-full bg-emerald-600 text-white flex items-center justify-center ring-4 ring-white">
                      <CheckCircle2 className="w-3 h-3 stroke-[3]" />
                    </div>
                    <div className="flex items-baseline gap-2.5">
                      <span className="font-mono text-xs font-bold text-slate-900 shrink-0">
                        Mar 2024
                      </span>
                      <span className="text-xs text-slate-600 leading-snug">
                        Inspection conducted
                      </span>
                    </div>
                  </div>

                  {/* Timeline Item 2 */}
                  <div className="relative flex items-start gap-2.5">
                    <div className="absolute -left-5 top-0.5 w-4 h-4 rounded-full bg-emerald-600 text-white flex items-center justify-center ring-4 ring-white">
                      <CheckCircle2 className="w-3 h-3 stroke-[3]" />
                    </div>
                    <div className="flex items-baseline gap-2.5">
                      <span className="font-mono text-xs font-bold text-slate-900 shrink-0">
                        Jun 2024
                      </span>
                      <span className="text-xs text-slate-600 leading-snug">
                        Partial intervention executed
                      </span>
                    </div>
                  </div>

                  {/* Timeline Item 3 (Pending) */}
                  <div className="relative flex items-start gap-2.5 p-2 rounded-lg bg-emerald-50/50 border border-emerald-100/80 -ml-2">
                    <div className="w-3.5 h-3.5 rounded-full border-2 border-slate-400 bg-white shrink-0 mt-0.5" />
                    <div className="flex items-baseline gap-2.5">
                      <span className="font-mono text-xs font-bold text-slate-900 shrink-0">
                        Aug 2024
                      </span>
                      <span className="text-xs text-slate-700 font-semibold leading-snug">
                        Verification pending
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Column C: Recommended Next Actions */}
            <div className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200/90 shadow-2xs space-y-3.5 flex flex-col justify-between">
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <div className="p-1 rounded-md bg-emerald-50 text-emerald-700">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <h3 className="text-sm font-bold text-[#142B2A]">Recommended Next Actions</h3>
                </div>

                <div className="space-y-2.5">
                  {/* Action 1 */}
                  <div className="p-3 rounded-xl bg-red-50/70 border border-red-200/80 space-y-1">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5">
                        <Wrench className="w-3.5 h-3.5 text-red-600" />
                        <span className="text-xs font-bold text-slate-900">
                          Structural repair &amp; strengthening
                        </span>
                      </div>
                      <span className="text-[10px] font-bold px-2 py-0.2 rounded-full bg-red-100 text-red-700 border border-red-200">
                        High
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-600 leading-snug pl-5">
                      Address material deterioration and cracks.
                    </p>
                  </div>

                  {/* Action 2 */}
                  <div className="p-3 rounded-xl bg-amber-50/70 border border-amber-200/80 space-y-1">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5">
                        <Shield className="w-3.5 h-3.5 text-amber-700" />
                        <span className="text-xs font-bold text-slate-900">
                          Anti-corrosion protection
                        </span>
                      </div>
                      <span className="text-[10px] font-bold px-2 py-0.2 rounded-full bg-amber-100 text-amber-800 border border-amber-200">
                        Medium
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-600 leading-snug pl-5">
                      Reduce saline and environmental damage.
                    </p>
                  </div>
                </div>
              </div>

              {/* Functional Record Action Button */}
              <button
                type="button"
                onClick={() => setShowAddForm(true)}
                className="w-full py-2.5 px-4 rounded-xl bg-[#087F4F] hover:bg-[#06653E] text-white font-semibold text-xs sm:text-sm transition-all flex items-center justify-center gap-2 cursor-pointer shadow-xs active:scale-[0.99] mt-2"
              >
                <span>Record Action</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: Detailed Interventions & Verifications (Complete audit ledger & RBAC test compatibility) */}
      {activeTab === 'inspections' && currentAsset && (
        <div className="space-y-4">
          <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-2xs flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                {t('heartbeat.tabInterventions', 'Interventions & Verifications')}
              </h3>
              <p className="text-xs text-slate-500">
                Closed-loop inspection log and certified engineering verifications.
              </p>
            </div>
            {canManage && (
              <button
                id="btn-dh-record-inspection"
                type="button"
                onClick={() => setShowAddForm(!showAddForm)}
                className="px-3 py-1.5 rounded-lg bg-[#087F4F] hover:bg-[#06653E] text-white font-semibold text-xs flex items-center gap-1.5 shadow-2xs cursor-pointer"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                <span>
                  {showAddForm
                    ? t('heartbeat.closeForm', 'Close Form')
                    : isDemo
                    ? t('heartbeat.scheduleInspectionDemo', 'Schedule Inspection (Demo)')
                    : t('heartbeat.recordNewInspection', 'Record New Inspection')}
                </span>
              </button>
            )}
          </div>

          {inspections.length === 0 ? (
            <div className="p-8 text-center rounded-xl bg-white border border-slate-200 space-y-2">
              <ClipboardCheck className="w-8 h-8 text-slate-300 mx-auto" />
              <p className="text-xs font-semibold text-slate-700">No inspections recorded yet</p>
              <p className="text-[11px] text-slate-400">
                Record an inspection to initiate closed-loop verification.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {inspections.map((insp) => (
                <div
                  key={insp.id}
                  className="p-4 rounded-xl bg-white border border-slate-200/90 shadow-2xs space-y-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-emerald-700">{insp.id}</span>
                        <span className="text-xs text-slate-400">&bull;</span>
                        <span className="font-mono text-xs text-slate-600">{insp.inspection_date}</span>
                      </div>
                      <h4 className="text-sm font-bold text-slate-900 mt-1">{insp.inspection_type}</h4>
                    </div>
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                      {insp.status}
                    </span>
                  </div>

                  <p className="text-xs text-slate-600 leading-relaxed bg-slate-50 p-2.5 rounded-lg border border-slate-200/70">
                    {insp.findings}
                  </p>

                  <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
                    <span className="text-slate-500">By: {insp.responsible_user || 'Inspection Engineer'}</span>
                    {canManage && insp.status !== 'Remediation Verified' && (
                      <button
                        type="button"
                        onClick={() => {
                          setVerifyingInspId(insp.id);
                          setVerificationNotes('');
                          setVerificationActionTaken(insp.actual_action_taken || '');
                        }}
                        className="px-3 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 font-semibold text-xs cursor-pointer"
                      >
                        Verify Outcome
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: Asset Timeline View */}
      {activeTab === 'timeline' && currentAsset && (
        <div className="p-5 rounded-xl bg-white border border-slate-200 shadow-2xs space-y-4">
          <h3 className="text-sm font-bold text-slate-900">Full Structural Lifecycle Timeline</h3>
          <div className="relative pl-6 space-y-4 before:content-[''] before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
            {timeline.map((evt) => (
              <div key={evt.id} className="relative flex items-start gap-3">
                <div className="absolute -left-6 top-1 w-3.5 h-3.5 rounded-full bg-emerald-600 ring-4 ring-white" />
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-slate-900">{evt.date}</span>
                    <span className="text-xs font-semibold text-emerald-800">{evt.title}</span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">{evt.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Record Action / Add Inspection Modal */}
      {showAddForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4 my-8 relative">
            <div className="flex items-start justify-between border-b border-slate-200 pb-3">
              <div className="flex items-center gap-2">
                <PlusCircle className="w-5 h-5 text-emerald-700" />
                <h3 className="text-base font-bold text-slate-900">
                  {t('heartbeat.recordNewInspection', 'Record New Inspection')}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="text-slate-400 hover:text-slate-700 p-1 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateInspection} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-700 font-semibold block mb-1">Inspection Date</label>
                  <input
                    id="input-insp-date"
                    type="date"
                    required
                    value={formDate}
                    onChange={(e) => setFormDate(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-lg p-2 font-mono"
                  />
                </div>
                <div>
                  <label className="text-slate-700 font-semibold block mb-1">Inspection Type</label>
                  <select
                    id="select-insp-type"
                    value={formType}
                    onChange={(e) => setFormType(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-lg p-2"
                  >
                    <option value="Structural Audit">Structural Audit</option>
                    <option value="Underwater Bathymetry Sonar">Underwater Bathymetry Sonar</option>
                    <option value="Vibration & Bearing Appraisal">Vibration &amp; Bearing Appraisal</option>
                    <option value="Emergency Remediation Action">Emergency Remediation Action</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-slate-700 font-semibold block mb-1">
                  {t('heartbeat.observedFindings', 'Findings & Defect Observations')} *
                </label>
                <textarea
                  id="textarea-insp-findings"
                  rows="3"
                  required
                  value={formFindings}
                  onChange={(e) => setFormFindings(e.target.value)}
                  placeholder={t(
                    'heartbeat.findingsPlaceholder',
                    'Document verified anomalies, crack widths, scour depths, sensor discrepancies...'
                  )}
                  className="w-full bg-white border border-slate-300 rounded-lg p-2"
                />
              </div>

              <div>
                <label className="text-slate-700 font-semibold block mb-1">Action Taken / Remediation Executed</label>
                <textarea
                  id="textarea-insp-actual"
                  rows="2"
                  value={formActionTaken}
                  onChange={(e) => setFormActionTaken(e.target.value)}
                  placeholder="Details of physical repairs, strengthening, descaling, or grout injection..."
                  className="w-full bg-white border border-slate-300 rounded-lg p-2"
                />
              </div>

              <div>
                <label className="text-slate-700 font-semibold block mb-1">Evidence Reference / Document</label>
                <input
                  id="input-insp-evidence"
                  type="text"
                  value={formEvidenceRef}
                  onChange={(e) => setFormEvidenceRef(e.target.value)}
                  placeholder="e.g. Sonar_Bathymetry_Report_2024.pdf"
                  className="w-full bg-white border border-slate-300 rounded-lg p-2 font-mono"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="px-3.5 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingInsp}
                  className="px-4 py-2 rounded-lg bg-[#087F4F] hover:bg-[#06653E] text-white font-semibold flex items-center gap-1.5 shadow-2xs cursor-pointer"
                >
                  {submittingInsp ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <PlusCircle className="w-3.5 h-3.5" />}
                  <span>{t('heartbeat.saveAndRecalculate', 'Save & Recalculate Risk')}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Verification Modal */}
      {verifyingInspId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4 my-8 relative">
            <div className="flex items-start justify-between border-b border-slate-200 pb-3">
              <div className="flex items-center gap-2">
                <UserCheck className="w-5 h-5 text-emerald-700" />
                <h3 className="text-base font-bold text-slate-900">
                  Verify Inspection: {verifyingInspId}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setVerifyingInspId(null)}
                className="text-slate-400 hover:text-slate-700 p-1 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3.5 text-xs">
              <div>
                <label className="text-slate-700 font-semibold block mb-1">Verification Outcome</label>
                <select
                  value={verificationOutcome}
                  onChange={(e) => setVerificationOutcome(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-lg p-2"
                >
                  <option value="Remediation Successful">Remediation Successful (Risk Reduction Applied)</option>
                  <option value="Partially Effective">Partially Effective</option>
                  <option value="Remediation Failed">Remediation Failed</option>
                </select>
              </div>

              <div>
                <label className="text-slate-700 font-semibold block mb-1">Actual Action Taken</label>
                <textarea
                  rows="2"
                  value={verificationActionTaken}
                  onChange={(e) => setVerificationActionTaken(e.target.value)}
                  placeholder="Confirm exact remediation physical work conducted..."
                  className="w-full bg-white border border-slate-300 rounded-lg p-2"
                />
              </div>

              <div>
                <label className="text-slate-700 font-semibold block mb-1">Verification Notes &amp; Certification *</label>
                <textarea
                  rows="3"
                  required
                  value={verificationNotes}
                  onChange={(e) => setVerificationNotes(e.target.value)}
                  placeholder="Certifying engineer notes and field outcome assessment..."
                  className="w-full bg-white border border-slate-300 rounded-lg p-2"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setVerifyingInspId(null)}
                  className="px-3.5 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => handleVerifySubmit(verifyingInspId)}
                  disabled={submittingVerify}
                  className="px-4 py-2 rounded-lg bg-[#087F4F] hover:bg-[#06653E] text-white font-semibold flex items-center gap-1.5 shadow-2xs cursor-pointer"
                >
                  {submittingVerify ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <UserCheck className="w-3.5 h-3.5" />}
                  <span>Certify Verification</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
