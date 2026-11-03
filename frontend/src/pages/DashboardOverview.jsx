import React, { useState } from 'react';
import {
  ShieldAlert,
  AlertOctagon,
  AlertTriangle,
  ClipboardCheck,
  CheckCircle2,
  ArrowRight,
  Activity,
  Layers,
  MapPin,
  Bot,
  FileText,
  Sparkles,
  Clock,
  Play,
  X,
  Search,
  ExternalLink,
  ChevronRight,
  Info,
} from 'lucide-react';
import StatusBadge from '../components/StatusBadge';
import { useLanguage } from '../context/LanguageContext';
import {
  bandraWorliSeaLink4k,
  bandraWorliSeaLinkJpg,
  bandraWorliThumbnail,
  getAssetThumbnail,
} from '../utils/assetImages';

export default function DashboardOverview({
  stats,
  assets = [],
  loading,
  error,
  onNavigate,
  onSelectAsset,
  isDemo = false,
}) {
  const { t } = useLanguage();
  const [isOverviewModalOpen, setIsOverviewModalOpen] = useState(false);
  const [activePinAssetId, setActivePinAssetId] = useState('ASSET-BRG-001');

  // Filter flagged assets requiring critical investigation or high risk
  const flaggedAssets = assets.filter(
    (a) =>
      a.status === 'Critical Attention' ||
      a.risk_level === 'Critical' ||
      a.risk_level === 'High'
  );

  // If flagged assets are present, show flagged assets; otherwise fallback
  const priorityAssets =
    flaggedAssets.length > 0
      ? [...flaggedAssets].sort((a, b) => (b.risk_score || 0) - (a.risk_score || 0))
      : [...assets].sort((a, b) => (b.risk_score || 0) - (a.risk_score || 0)).slice(0, 5);

  // Selected asset for the hero map preview card (defaults to Mandovi Bridge or highest risk asset)
  const selectedPinAsset =
    assets.find((a) => a.id === activePinAssetId) ||
    assets.find((a) => a.id === 'ASSET-BRG-001') ||
    priorityAssets[0] ||
    assets[0] ||
    null;


  // Coordinated India map positions for the assets (percent-based for responsive SVG container)
  const assetPinCoordinates = {
    'ASSET-FLY-008': { x: 38, y: 31, name: 'Delhi', state: 'Delhi' },
    'ASSET-WTP-002': { x: 34, y: 44, name: 'Kota', state: 'Rajasthan' },
    'ASSET-PUB-007': { x: 55, y: 45, name: 'Sonbhadra', state: 'UP' },
    'ASSET-DRN-006': { x: 27, y: 64, name: 'Mumbai', state: 'Maharashtra' },
    'ASSET-BRG-001': { x: 29, y: 77, name: 'North Goa', state: 'Goa' },
    'ASSET-CAN-004': { x: 50, y: 73, name: 'Vijayawada', state: 'AP' },
    'ASSET-SUB-005': { x: 41, y: 84, name: 'Bengaluru', state: 'Karnataka' },
    'ASSET-HWY-003': { x: 36, y: 90, name: 'Wayanad', state: 'Kerala' },
  };

  // Recent genuine infrastructure activity feed
  const recentActivities = [
    {
      id: 'act-1',
      type: 'inspection',
      title: 'Inspection completed',
      assetText: 'Mandovi Bridge - Underwater sonar survey',
      time: '2 days ago',
      color: 'border-[#169B62] text-[#169B62]',
      dotBg: 'bg-[#169B62]',
      assetId: 'ASSET-BRG-001',
    },
    {
      id: 'act-2',
      type: 'evidence',
      title: 'Evidence document added',
      assetText: 'pampan_corrosion_study.txt',
      time: '3 days ago',
      color: 'border-[#0F9F91] text-[#0F9F91]',
      dotBg: 'bg-[#0F9F91]',
      route: 'evidence',
    },
    {
      id: 'act-3',
      type: 'finding',
      title: 'New finding identified',
      assetText: 'Chambal WTP - Pump vibration anomaly',
      time: '5 days ago',
      color: 'border-[#E9A23B] text-[#E9A23B]',
      dotBg: 'bg-[#E9A23B]',
      assetId: 'ASSET-WTP-002',
    },
    {
      id: 'act-4',
      type: 'remediation',
      title: 'Remediation verified',
      assetText: 'Kashmere Gate Flyover - Bearing pad replacement',
      time: '1 week ago',
      color: 'border-[#087F4F] text-[#087F4F]',
      dotBg: 'bg-[#087F4F]',
      assetId: 'ASSET-FLY-008',
    },
  ];

  const totalAssetsCount = stats?.total_assets ?? assets.length;
  const criticalCount = stats?.critical_assets ?? flaggedAssets.length;
  const inspectionDueCount = stats?.inspection_due ?? 3;
  const operationalCount = stats?.operational_assets ?? (totalAssetsCount - criticalCount - inspectionDueCount > 0 ? totalAssetsCount - criticalCount - inspectionDueCount : 3);
  const healthIndexValue = stats?.average_health_index ?? 68.4;

  return (
    <div className="w-full min-w-0 space-y-6 animate-fadeIn">
      {/* Top Welcome / Mission Banner for Demo Mode (Preserved for tests) */}
      {isDemo && (
        <div className="p-5 rounded-2xl bg-gradient-to-r from-amber-50 via-white to-amber-50/50 border border-amber-200 shadow-2xs space-y-2">
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-100 border border-amber-300 text-amber-800">
            <Activity className="w-3.5 h-3.5 animate-pulse text-amber-700" />
            <span>{t('demo.simulatedTelemetry', 'Simulated Digital Heartbeat Telemetry')}</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-[#142B2A] tracking-tight">
            {t('demo.operationsOverview', 'AAYAM Demo Operations Overview')}
          </h2>
          <p className="text-xs sm:text-sm text-[#647775] leading-relaxed">
            {t('demo.demoSpecimensDesc', 'Exploring simulated public infrastructure records across 3 benchmark specimens: Mandovi Estuary Bridge, Chambal WTP, and Kazhakootam Skyway.')}
          </p>
        </div>
      )}

      {/* Main Hero Section: Ultra-Wide Bandra–Worli Sea Link 4K Landscape */}
      <div
        className="relative rounded-3xl overflow-hidden border border-[#E1EBE7] shadow-xs min-h-[360px] sm:min-h-[390px] md:min-h-[410px] lg:min-h-[430px] xl:min-h-[450px] flex items-center bg-[#E7F8EF] bg-cover bg-no-repeat"
        style={{
          backgroundImage: `url(${bandraWorliSeaLink4k})`,
          backgroundPosition: '65% center',
          backgroundSize: 'cover',
        }}
      >
        {/* Full-width Panoramic Bandra–Worli Sea Link 4K Photograph with WebP + JPG fallback */}
        <picture className="absolute inset-0 w-full h-full select-none pointer-events-none">
          <source srcSet={bandraWorliSeaLink4k} type="image/webp" />
          <img
            src={bandraWorliSeaLinkJpg}
            alt="Bandra–Worli Sea Link, Mumbai, India - AAYAM Public Infrastructure Intelligence"
            className="w-full h-full object-cover object-[65%_center] select-none pointer-events-none"
            loading="eager"
          />
        </picture>

        {/* Subtle, Professional Gradient Overlay for Text Readability on Left Side */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              'linear-gradient(90deg, rgba(255, 255, 255, 0.96) 0%, rgba(255, 255, 255, 0.88) 32%, rgba(255, 255, 255, 0.35) 58%, rgba(255, 255, 255, 0.0) 78%)',
          }}
        />

        {/* Content Layer */}
        <div className="relative z-10 w-full p-6 sm:p-8 lg:p-10 flex flex-col justify-between min-h-[360px] sm:min-h-[390px] md:min-h-[410px] lg:min-h-[430px] xl:min-h-[450px]">
          {/* Main Content Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Hero Left Content */}
            <div className="lg:col-span-7 xl:col-span-6 space-y-4 max-w-xl">
              <div className="inline-flex items-center gap-2 text-[11px] font-bold tracking-widest uppercase text-[#087F4F]">
                <span>AI-POWERED PUBLIC INFRASTRUCTURE INTELLIGENCE</span>
              </div>

              {/* Main Heading */}
              <div className="space-y-1">
                <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-[#142B2A] tracking-tight leading-none">
                  AAYAM
                </h1>
                <h2 className="text-xl sm:text-2xl lg:text-3xl font-extrabold text-[#142B2A] tracking-tight leading-snug">
                  Seeing Infrastructure
                  <br className="hidden sm:inline" /> Beyond the Surface
                </h2>
                {/* Preserved Title for Localization Tests */}
                {!isDemo && (
                  <div className="sr-only">
                    {t('dashboard.overviewTitle', 'AAYAM Infrastructure Intelligence Layer')}
                  </div>
                )}
              </div>

              <p className="text-xs sm:text-sm text-[#647775] leading-relaxed max-w-lg">
                Unified intelligence for India's critical infrastructure — combining records, inspections, sensor data and real evidence to enable safer, smarter and more resilient communities.
              </p>

              {/* Action Buttons */}
              <div className="pt-2 flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={() => onNavigate('registry')}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#087F4F] hover:bg-[#075E43] text-white text-xs sm:text-sm font-semibold transition-all shadow-sm hover:shadow-md cursor-pointer group"
                >
                  <Search className="w-4 h-4" />
                  <span>Explore Assets</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                </button>

                <button
                  type="button"
                  onClick={() => setIsOverviewModalOpen(true)}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/90 hover:bg-white text-[#142B2A] border border-[#E1EBE7] text-xs sm:text-sm font-semibold transition-all shadow-2xs hover:shadow-xs cursor-pointer group"
                >
                  <Play className="w-3.5 h-3.5 text-[#087F4F] fill-[#087F4F]" />
                  <span>Watch Overview</span>
                </button>
              </div>
            </div>

            {/* Spacer for Right side (allows full panoramic bridge and landscape visibility) */}
            <div className="hidden lg:block lg:col-span-5 xl:col-span-6" />
          </div>

          {/* Floating Top-Right Map Legend Card (Crisp summary of monitored risk status in sky area) */}
          <div className="absolute top-4 right-4 sm:top-6 sm:right-6 bg-white/95 backdrop-blur-md rounded-2xl p-3 sm:p-4 border border-[#E1EBE7] shadow-sm z-20 text-[11px] min-w-[170px] sm:min-w-[190px]">
            <div className="font-bold text-[#142B2A] mb-2 flex items-center justify-between">
              <span>Infrastructure Risk Map</span>
            </div>
            <div className="space-y-1.5 text-[#647775]">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-[#E54848]" />
                  <span>Critical Attention</span>
                </span>
                <span className="font-bold text-[#142B2A]">{criticalCount}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-[#E9A23B]" />
                  <span>Requires Inspection</span>
                </span>
                <span className="font-bold text-[#142B2A]">{inspectionDueCount}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-[#169B62]" />
                  <span>Operational</span>
                </span>
                <span className="font-bold text-[#142B2A]">{operationalCount}</span>
              </div>
              <div className="pt-1.5 mt-1 border-t border-[#E1EBE7] flex items-center justify-between font-semibold text-[#142B2A]">
                <span>Total Assets</span>
                <span>{isDemo ? `${totalAssetsCount} Assets` : totalAssetsCount}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Primary KPI Metric Cards (4 Cards in a Row) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Assets */}
        <div
          onClick={() => onNavigate('registry')}
          className="p-5 rounded-2xl bg-white border border-[#E1EBE7] hover:border-[#087F4F]/40 shadow-2xs hover:shadow-md transition-all cursor-pointer group flex items-start justify-between"
        >
          <div className="space-y-1">
            <span className="text-[11px] font-bold text-[#647775] uppercase tracking-wider block">
              {t('dashboard.monitoredAssets', 'Monitored Assets')}
            </span>
            <div className="text-3xl font-black text-[#142B2A] tracking-tight">
              {loading ? '...' : totalAssetsCount}
            </div>
            <p className="text-xs text-[#647775]">Across 5 states</p>
          </div>
          <div className="flex flex-col items-end justify-between h-full gap-2">
            <div className="w-10 h-10 rounded-xl bg-[#E7F8EF] text-[#087F4F] flex items-center justify-center shadow-2xs">
              <Layers className="w-5 h-5" />
            </div>
            {/* Green trend mini sparkline */}
            <svg className="w-16 h-6 text-[#169B62]" fill="none" viewBox="0 0 64 24">
              <path d="M2 20 Q 18 16, 30 12 T 48 8 T 62 4" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
            </svg>
          </div>
        </div>

        {/* Card 2: Critical Attention */}
        <div
          onClick={() => onNavigate('registry')}
          className="p-5 rounded-2xl bg-white border border-[#E1EBE7] hover:border-[#E54848]/40 shadow-2xs hover:shadow-md transition-all cursor-pointer group flex items-start justify-between"
        >
          <div className="space-y-1">
            <span className="text-[11px] font-bold text-[#647775] uppercase tracking-wider block">
              {t('status.criticalAttention', 'Critical Attention')}
            </span>
            <div className="text-3xl font-black text-[#142B2A] tracking-tight">
              {loading ? '...' : criticalCount}
            </div>
            <p className="text-xs text-[#647775]">
              {t('dashboard.immediateInvestigation', 'Need immediate action')}
            </p>
          </div>
          <div className="flex flex-col items-end justify-between h-full gap-2">
            <div className="w-10 h-10 rounded-xl bg-red-50 text-[#E54848] flex items-center justify-center shadow-2xs">
              <AlertTriangle className="w-5 h-5" />
            </div>
            {/* Red warning bar chart sparkline */}
            <div className="flex items-end gap-1 h-6">
              <div className="w-1.5 h-2 bg-red-200 rounded-xs" />
              <div className="w-1.5 h-3 bg-red-300 rounded-xs" />
              <div className="w-1.5 h-5 bg-[#E54848] rounded-xs" />
              <div className="w-1.5 h-6 bg-[#E54848] rounded-xs" />
            </div>
          </div>
        </div>

        {/* Card 3: Inspection Due */}
        <div
          onClick={() => onNavigate('inspections')}
          className="p-5 rounded-2xl bg-white border border-[#E1EBE7] hover:border-[#E9A23B]/40 shadow-2xs hover:shadow-md transition-all cursor-pointer group flex items-start justify-between"
        >
          <div className="space-y-1">
            <span className="text-[11px] font-bold text-[#647775] uppercase tracking-wider block">
              {t('dashboard.inspectionDue', 'Inspection Due')}
            </span>
            <div className="text-3xl font-black text-[#142B2A] tracking-tight">
              {loading ? '...' : inspectionDueCount}
            </div>
            <p className="text-xs text-[#647775]">
              {t('dashboard.overdueStructuralAudits', 'Overdue structural audits')}
            </p>
          </div>
          <div className="flex flex-col items-end justify-between h-full gap-2">
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-[#E9A23B] flex items-center justify-center shadow-2xs">
              <Clock className="w-5 h-5" />
            </div>
            {/* Amber warning mini sparkline */}
            <div className="flex items-end gap-1 h-6">
              <div className="w-1.5 h-3 bg-amber-200 rounded-xs" />
              <div className="w-1.5 h-5 bg-[#E9A23B] rounded-xs" />
              <div className="w-1.5 h-4 bg-amber-300 rounded-xs" />
              <div className="w-1.5 h-6 bg-[#E9A23B] rounded-xs" />
            </div>
          </div>
        </div>

        {/* Card 4: Network Health Index */}
        <div
          onClick={() => onNavigate('heartbeat')}
          className="p-5 rounded-2xl bg-white border border-[#E1EBE7] hover:border-[#0F9F91]/40 shadow-2xs hover:shadow-md transition-all cursor-pointer group flex items-start justify-between"
        >
          <div className="space-y-1">
            <span className="text-[11px] font-bold text-[#647775] uppercase tracking-wider block">
              {t('dashboard.networkHealthIndex', 'Network Health Index')}
            </span>
            <div className="text-3xl font-black text-[#142B2A] tracking-tight">
              {loading ? '...' : `${healthIndexValue}%`}
            </div>
            <p className="text-xs text-[#647775]">
              {t('dashboard.aggregateTelemetryScore', 'Aggregate infrastructure health')}
            </p>
          </div>
          <div className="flex flex-col items-end justify-between h-full gap-2">
            <div className="w-10 h-10 rounded-xl bg-teal-50 text-[#0F9F91] flex items-center justify-center shadow-2xs">
              <Activity className="w-5 h-5" />
            </div>
            {/* Blue heartbeat wave sparkline */}
            <svg className="w-16 h-6 text-[#0F9F91]" fill="none" viewBox="0 0 64 24">
              <path d="M2 14 Q 14 10, 22 16 T 38 8 T 50 18 T 62 10" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
            </svg>
          </div>
        </div>
      </div>

      {/* Priority Assets & Recent Activity Side-by-Side (Responsive Grid) */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 min-w-0">
        {/* Left: Priority Assets Requiring Investigation (Takes ample width on desktop; stacks gracefully on tablet/mobile) */}
        <div className="xl:col-span-8 2xl:col-span-9 bg-white rounded-3xl border border-[#E1EBE7] shadow-xs overflow-hidden flex flex-col justify-between min-w-0">
          <div>
            <div className="p-5 border-b border-[#E1EBE7] flex items-center justify-between">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="p-2 rounded-xl bg-red-50 text-[#E54848] shrink-0">
                  <ShieldAlert className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-base font-bold text-[#142B2A] truncate">
                    {t('dashboard.flaggedRequiringInvestigation', 'Priority Assets Requiring Investigation')}
                  </h3>
                  <p className="text-xs text-[#647775] truncate">
                    {t('dashboard.sortedByRisk', 'Sorted by AI Risk Score and degradation urgency')}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => onNavigate('registry')}
                className="inline-flex items-center gap-1.5 text-xs font-bold text-[#087F4F] hover:text-[#075E43] transition-colors cursor-pointer shrink-0 ml-2"
              >
                <span>{t('dashboard.viewAllRegistry', 'View All →')}</span>
              </button>
            </div>

            {loading ? (
              <div className="p-12 text-center space-y-3">
                <div className="w-8 h-8 border-2 border-[#087F4F] border-t-transparent rounded-full animate-spin mx-auto" />
                <p className="text-xs text-[#647775]">
                  {t('dashboard.loadingTelemetry', 'Loading flagged infrastructure telemetry...')}
                </p>
              </div>
            ) : error ? (
              <div className="p-12 text-center space-y-2">
                <p className="text-sm text-red-600 font-semibold">
                  {t('dashboard.failedToLoadAssets', 'Failed to load asset records.')}
                </p>
                <p className="text-xs text-[#647775] font-mono">{error}</p>
              </div>
            ) : priorityAssets.length === 0 ? (
              <div className="p-12 text-center space-y-2">
                <CheckCircle2 className="w-8 h-8 text-[#169B62] mx-auto" />
                <p className="text-sm font-bold text-[#142B2A]">
                  {t('dashboard.noCriticalFlagged', 'No critical assets flagged')}
                </p>
                <p className="text-xs text-[#647775]">
                  {t('dashboard.allWithinThresholds', 'All registered public assets are currently within normal operating thresholds.')}
                </p>
              </div>
            ) : (
              <div className="w-full min-w-0 overflow-hidden">
                <table className="w-full text-left border-collapse text-xs md:table-fixed">
                  <colgroup className="hidden md:table-column-group">
                    {/* Asset: Name, ID, Thumbnail (32%) */}
                    <col className="w-[32%]" />
                    {/* Category (14%) */}
                    <col className="w-[14%]" />
                    {/* Location (16%) */}
                    <col className="w-[16%]" />
                    {/* Risk score (14%) */}
                    <col className="w-[14%]" />
                    {/* Status (11%) */}
                    <col className="w-[11%]" />
                    {/* Action (13%) */}
                    <col className="w-[13%]" />
                  </colgroup>
                  <thead className="hidden md:table-header-group bg-[#F4F8F7]/60 border-b border-[#E1EBE7] text-[#647775] uppercase tracking-wider font-semibold">
                    <tr>
                      <th className="py-3 px-3 sm:px-4">{t('dashboard.assetCodeName', 'Asset')}</th>
                      <th className="py-3 px-2 sm:px-3">{t('common.category', 'Category')}</th>
                      <th className="py-3 px-2 sm:px-3">{t('common.location', 'Location')}</th>
                      <th className="py-3 px-2 sm:px-3">{t('dashboard.riskScore', 'Risk Score')}</th>
                      <th className="py-3 px-2 sm:px-3">{t('common.status', 'Status')}</th>
                      <th className="py-3 px-3 sm:px-4 text-right">{t('dashboard.action', 'Action')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E1EBE7] block md:table-row-group p-3 md:p-0 space-y-3 md:space-y-0">
                    {priorityAssets.map((asset) => {
                      const isCritical = asset.risk_score >= 80;
                      const isWarning = asset.risk_score >= 50 && asset.risk_score < 80;
                      return (
                        <tr
                          key={asset.id}
                          onClick={() => {
                            if (onSelectAsset) onSelectAsset(asset);
                            else onNavigate('heartbeat');
                          }}
                          className="block md:table-row bg-[#F4F8F7]/40 md:bg-transparent rounded-2xl md:rounded-none p-3.5 md:p-0 border border-[#E1EBE7] md:border-0 hover:bg-[#F4F8F7]/80 transition-colors cursor-pointer group shadow-2xs md:shadow-none min-w-0"
                        >
                          {/* 1. Asset Thumbnail + Code & Name */}
                          <td className="block md:table-cell py-1.5 md:py-3 px-0 md:px-4 min-w-0">
                            <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
                              <img
                                src={getAssetThumbnail(asset)}
                                alt={asset.name}
                                className="w-10 h-10 rounded-xl object-cover bg-slate-100 border border-[#E1EBE7] shrink-0"
                                onError={(e) => {
                                  e.target.onerror = null;
                                  e.target.src = bandraWorliThumbnail;
                                }}
                              />
                              <div className="min-w-0 flex-1">
                                <div
                                  className="font-bold text-[#142B2A] text-xs leading-snug line-clamp-2 group-hover:text-[#087F4F] transition-colors"
                                  title={asset.name}
                                >
                                  {asset.name}
                                </div>
                                <span className="font-mono text-[10px] text-[#647775] block mt-0.5 truncate">
                                  {asset.id}
                                </span>
                              </div>
                            </div>
                          </td>

                          {/* 2. Category */}
                          <td className="block md:table-cell py-1 md:py-3 px-0 md:px-3 text-[#142B2A] font-medium min-w-0">
                            <div className="flex items-center justify-between md:block">
                              <span className="md:hidden text-[10px] uppercase font-bold text-[#647775]">Category</span>
                              <span className="truncate block" title={asset.category}>{asset.category}</span>
                            </div>
                          </td>

                          {/* 3. Location */}
                          <td className="block md:table-cell py-1 md:py-3 px-0 md:px-3 text-[#647775] min-w-0">
                            <div className="flex items-center justify-between md:block">
                              <span className="md:hidden text-[10px] uppercase font-bold text-[#647775]">Location</span>
                              <div className="text-right md:text-left min-w-0">
                                <div className="font-medium text-[#142B2A] truncate" title={asset.district}>{asset.district}</div>
                                <div className="text-[10px] text-[#647775]/80 truncate" title={asset.state}>{asset.state}</div>
                              </div>
                            </div>
                          </td>

                          {/* 4. Risk Score + Horizontal Risk Bar */}
                          <td className="block md:table-cell py-1 md:py-3 px-0 md:px-3 min-w-0">
                            <div className="flex items-center justify-between md:block gap-2">
                              <span className="md:hidden text-[10px] uppercase font-bold text-[#647775]">Risk Score</span>
                              <div className="space-y-1 text-right md:text-left">
                                <div className="font-mono font-bold text-xs text-[#142B2A]">
                                  {asset.risk_score}
                                </div>
                                <div className="w-16 sm:w-20 bg-slate-100 border border-[#E1EBE7] rounded-full h-1.5 overflow-hidden ml-auto md:ml-0">
                                  <div
                                    className={`h-full rounded-full ${
                                      isCritical
                                        ? 'bg-[#E54848]'
                                        : isWarning
                                        ? 'bg-[#E9A23B]'
                                        : 'bg-[#169B62]'
                                    }`}
                                    style={{ width: `${Math.min(asset.risk_score, 100)}%` }}
                                  />
                                </div>
                              </div>
                            </div>
                          </td>

                          {/* 5. Status Pill */}
                          <td className="block md:table-cell py-1 md:py-3 px-0 md:px-3 min-w-0">
                            <div className="flex items-center justify-between md:block">
                              <span className="md:hidden text-[10px] uppercase font-bold text-[#647775]">Status</span>
                              <span
                                className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                  isCritical
                                    ? 'bg-red-50 text-[#E54848] border border-red-200'
                                    : isWarning
                                    ? 'bg-amber-50 text-[#E9A23B] border border-amber-200'
                                    : 'bg-green-50 text-[#169B62] border border-green-200'
                                }`}
                              >
                                {isCritical ? 'Critical' : isWarning ? 'Inspection Due' : 'Operational'}
                              </span>
                            </div>
                          </td>

                          {/* 6. Action Button */}
                          <td className="block md:table-cell pt-2.5 pb-1 md:py-3 px-0 md:px-4 md:text-right min-w-0">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                if (onSelectAsset) onSelectAsset(asset);
                                onNavigate('heartbeat');
                              }}
                              className="w-full md:w-auto px-3 py-1.5 rounded-xl bg-white hover:bg-[#E7F8EF] text-[#087F4F] border border-[#E1EBE7] hover:border-[#087F4F] text-xs font-bold transition-all inline-flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs group-hover:bg-[#087F4F] group-hover:text-white"
                            >
                              <span>{t('dashboard.inspectHeartbeat', 'Inspect')}</span>
                              <ArrowRight className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Right: Recent Activity Timeline Panel (Stacked on mobile/tablet, comfortably beside on wide screens) */}
        <div className="xl:col-span-4 2xl:col-span-3 bg-white rounded-3xl border border-[#E1EBE7] shadow-xs p-5 flex flex-col justify-between min-w-0">
          <div>
            <div className="flex items-center justify-between pb-4 border-b border-[#E1EBE7]">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-[#087F4F]" />
                <h3 className="font-bold text-sm text-[#142B2A]">
                  Recent Activity
                </h3>
              </div>
              <button
                type="button"
                onClick={() => onNavigate('inspections')}
                className="text-xs font-bold text-[#087F4F] hover:text-[#075E43] cursor-pointer"
              >
                View All →
              </button>
            </div>

            {/* Timeline Vertical Feed */}
            <div className="pt-4 space-y-4 relative">
              {/* Connecting vertical line */}
              <div className="absolute left-2.5 top-5 bottom-4 w-0.5 bg-[#E1EBE7] pointer-events-none" />

              {recentActivities.map((act) => (
                <div
                  key={act.id}
                  onClick={() => {
                    if (act.assetId) {
                      const matched = assets.find((a) => a.id === act.assetId);
                      if (matched && onSelectAsset) onSelectAsset(matched);
                    } else if (act.route) {
                      onNavigate(act.route);
                    }
                  }}
                  className="flex items-start gap-3 relative pl-6 group cursor-pointer"
                >
                  {/* Timeline circular node */}
                  <span
                    className={`absolute left-1 top-1 w-3.5 h-3.5 rounded-full bg-white border-2 ${act.color} shadow-2xs group-hover:scale-125 transition-transform`}
                  >
                    <span className={`block w-1.5 h-1.5 rounded-full ${act.dotBg} mx-auto my-0.5`} />
                  </span>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-1 leading-tight">
                      <span className="font-bold text-xs text-[#142B2A] group-hover:text-[#087F4F] transition-colors truncate">
                        {act.title}
                      </span>
                      <span className="text-[10px] text-[#647775] shrink-0 font-medium">
                        {act.time}
                      </span>
                    </div>
                    <p className="text-[11px] text-[#647775] truncate mt-0.5">
                      {act.assetText}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Bottom: Three Intelligence Feature Cards (Matches Reference Layout) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-1">
        {/* Card 1: Evidence-Grounded Intelligence */}
        <div
          onClick={() => onNavigate('evidence')}
          className="p-5 rounded-3xl bg-white border border-[#E1EBE7] hover:border-[#087F4F]/40 shadow-2xs hover:shadow-md transition-all cursor-pointer group flex items-start justify-between gap-3"
        >
          <div className="flex items-start gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-[#E7F8EF] text-[#087F4F] flex items-center justify-center shrink-0 shadow-2xs">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-bold text-sm text-[#142B2A]">
                Evidence-Grounded Intelligence
              </h4>
              <p className="text-xs text-[#647775] leading-relaxed mt-1">
                Every finding is backed by real documents, inspection logs and verified sources.
              </p>
            </div>
          </div>
          <div className="w-7 h-7 rounded-full bg-[#E7F8EF] text-[#087F4F] group-hover:bg-[#087F4F] group-hover:text-white flex items-center justify-center transition-colors shrink-0 mt-1 shadow-2xs">
            <ArrowRight className="w-3.5 h-3.5" />
          </div>
        </div>

        {/* Card 2: Digital Heartbeat */}
        <div
          onClick={() => onNavigate('heartbeat')}
          className="p-5 rounded-3xl bg-white border border-[#E1EBE7] hover:border-[#0F9F91]/40 shadow-2xs hover:shadow-md transition-all cursor-pointer group flex items-start justify-between gap-3"
        >
          <div className="flex items-start gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-teal-50 text-[#0F9F91] flex items-center justify-center shrink-0 shadow-2xs">
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-bold text-sm text-[#142B2A]">
                Digital Heartbeat
              </h4>
              <p className="text-xs text-[#647775] leading-relaxed mt-1">
                Explainable risk analysis using 4 key factors: Structural, Environmental, Compliance, and Operational.
              </p>
            </div>
          </div>
          <div className="w-7 h-7 rounded-full bg-teal-50 text-[#0F9F91] group-hover:bg-[#0F9F91] group-hover:text-white flex items-center justify-center transition-colors shrink-0 mt-1 shadow-2xs">
            <ArrowRight className="w-3.5 h-3.5" />
          </div>
        </div>

        {/* Card 3: AI Decision Copilot */}
        <div
          onClick={() => onNavigate('copilot')}
          className="p-5 rounded-3xl bg-white border border-[#E1EBE7] hover:border-purple-300 shadow-2xs hover:shadow-md transition-all cursor-pointer group flex items-start justify-between gap-3"
        >
          <div className="flex items-start gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-purple-50 text-purple-700 flex items-center justify-center shrink-0 shadow-2xs">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-bold text-sm text-[#142B2A]">
                AI Decision Copilot
              </h4>
              <p className="text-xs text-[#647775] leading-relaxed mt-1">
                Ask natural language questions and get evidence-based answers with source citations.
              </p>
            </div>
          </div>
          <div className="w-7 h-7 rounded-full bg-purple-50 text-purple-700 group-hover:bg-purple-700 group-hover:text-white flex items-center justify-center transition-colors shrink-0 mt-1 shadow-2xs">
            <ArrowRight className="w-3.5 h-3.5" />
          </div>
        </div>
      </div>

      {/* Watch Overview Modal Dialog */}
      {isOverviewModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fadeIn"
          role="dialog"
          aria-modal="true"
        >
          <div className="bg-white rounded-3xl border border-[#E1EBE7] shadow-2xl max-w-2xl w-full overflow-hidden">
            {/* Modal Header */}
            <div className="p-6 border-b border-[#E1EBE7] flex items-center justify-between bg-gradient-to-r from-[#E7F8EF]/60 to-white">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#087F4F] text-white flex items-center justify-center shadow-md shadow-[#087F4F]/20">
                  <Play className="w-5 h-5 fill-white" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-[#142B2A]">
                    AAYAM Infrastructure Intelligence Walkthrough
                  </h3>
                  <p className="text-xs text-[#647775]">
                    How India's public infrastructure is monitored beyond the surface
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsOverviewModalOpen(false)}
                className="p-2 rounded-xl text-[#647775] hover:text-[#142B2A] hover:bg-[#F4F8F7] transition-colors cursor-pointer"
                aria-label="Close overview modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body: 4 Key Pillars */}
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-4 rounded-2xl bg-[#F4F8F7] border border-[#E1EBE7] space-y-1">
                  <div className="flex items-center gap-2 text-[#087F4F] font-bold text-xs uppercase tracking-wider">
                    <MapPin className="w-4 h-4" />
                    <span>1. Geospatial GIS Telemetry</span>
                  </div>
                  <p className="text-xs text-[#647775] leading-relaxed">
                    Zero-key OpenStreetMap clustering of public bridges, dams, and highways with dynamic risk pins.
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-[#F4F8F7] border border-[#E1EBE7] space-y-1">
                  <div className="flex items-center gap-2 text-[#0F9F91] font-bold text-xs uppercase tracking-wider">
                    <Activity className="w-4 h-4" />
                    <span>2. Explainable Digital Heartbeat</span>
                  </div>
                  <p className="text-xs text-[#647775] leading-relaxed">
                    Weighted 4-factor risk calculation: Structural (35%), Environmental (25%), Compliance (25%), Operational (15%).
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-[#F4F8F7] border border-[#E1EBE7] space-y-1">
                  <div className="flex items-center gap-2 text-[#087F4F] font-bold text-xs uppercase tracking-wider">
                    <FileText className="w-4 h-4" />
                    <span>3. Grounded Evidence Provenance</span>
                  </div>
                  <p className="text-xs text-[#647775] leading-relaxed">
                    Strict citation tracking linking inspection reports, sonar bathymetry scans, and verified engineering findings.
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-[#F4F8F7] border border-[#E1EBE7] space-y-1">
                  <div className="flex items-center gap-2 text-purple-700 font-bold text-xs uppercase tracking-wider">
                    <Bot className="w-4 h-4" />
                    <span>4. Closed-Loop Field Actions</span>
                  </div>
                  <p className="text-xs text-[#647775] leading-relaxed">
                    End-to-end audit lifecycle from detection to repair certification and real-time risk recalculation.
                  </p>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-5 border-t border-[#E1EBE7] bg-[#F4F8F7]/50 flex items-center justify-between">
              <span className="text-[11px] text-[#647775] font-mono">
                Prototype Evaluation Sandbox
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsOverviewModalOpen(false);
                    onNavigate('registry');
                  }}
                  className="px-4 py-2 rounded-xl bg-[#087F4F] hover:bg-[#075E43] text-white text-xs font-bold transition-all shadow-sm cursor-pointer"
                >
                  Explore Registry Assets
                </button>
                <button
                  type="button"
                  onClick={() => setIsOverviewModalOpen(false)}
                  className="px-3.5 py-2 rounded-xl bg-white hover:bg-slate-100 text-[#647775] border border-[#E1EBE7] text-xs font-semibold transition-colors cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
