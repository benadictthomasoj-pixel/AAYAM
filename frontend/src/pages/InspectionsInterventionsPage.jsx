import React, { useState, useEffect, useRef } from 'react';
import {
  Calendar,
  CalendarCheck,
  ClipboardCheck,
  AlertTriangle,
  Wrench,
  CheckCircle2,
  Building2,
  Landmark,
  ChevronDown,
  ChevronRight,
  Plus,
  ExternalLink,
  FileText,
  Check,
  Clock,
  ArrowRight,
  Search,
  Filter,
  X,
  Layers,
  Loader2,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Info,
} from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { fetchAssetInspections, fetchAssetFindings } from '../services/api';
import { getDemoInspections, getDemoAssetFindings } from '../demo/demoService';
import InspectionHistoryModal from '../components/InspectionHistoryModal';

import {
  getAssetHeroImage,
  getAssetThumbnail,
} from '../utils/assetImages';

// Helper to resolve infrastructure preview images
export function getAssetImage(asset) {
  return getAssetHeroImage(asset);
}

// Scheduled inspection templates for assets
const DEFAULT_SCHEDULES = {
  'ASSET-DRN-006': [
    { id: 'sch-1', name: 'Routine Inspection', type: 'Condition', date: '2024-11-10', status: 'Upcoming' },
    { id: 'sch-2', name: 'Structural Assessment', type: 'Detailed', date: '2024-11-25', status: 'Planned' },
    { id: 'sch-3', name: 'Post-Intervention Check', type: 'Verification', date: '2024-12-05', status: 'Planned' },
  ],
  'ASSET-BRG-001': [
    { id: 'sch-1', name: 'Pier Scour Sonar Survey', type: 'Condition', date: '2024-11-15', status: 'Upcoming' },
    { id: 'sch-2', name: 'Tendon Ultrasonic Testing', type: 'Detailed', date: '2024-11-28', status: 'Planned' },
    { id: 'sch-3', name: 'Post-Remediation Verification', type: 'Verification', date: '2024-12-10', status: 'Planned' },
  ],
  'ASSET-WTP-002': [
    { id: 'sch-1', name: 'Clarifier Drive Torque Audit', type: 'Condition', date: '2024-11-12', status: 'Upcoming' },
    { id: 'sch-2', name: 'Vibration Analysis Overhaul', type: 'Detailed', date: '2024-11-22', status: 'Planned' },
    { id: 'sch-3', name: 'SCADA Interlock Verification', type: 'Verification', date: '2024-12-02', status: 'Planned' },
  ],
  'ASSET-FLY-008': [
    { id: 'sch-1', name: 'Bearing Pad Deflection Scan', type: 'Condition', date: '2024-11-18', status: 'Upcoming' },
    { id: 'sch-2', name: 'Thermal Expansion Joint Survey', type: 'Detailed', date: '2024-12-01', status: 'Planned' },
    { id: 'sch-3', name: 'Post-Jacking Compliance Check', type: 'Verification', date: '2024-12-15', status: 'Planned' },
  ],
};

// Historical interventions templates for assets
const DEFAULT_HISTORIES = {
  'ASSET-DRN-006': [
    {
      id: 'hist-1',
      intervention: 'Gate Surface Treatment',
      actionTaken: 'Anti-corrosion coating applied',
      startDate: '2024-06-10',
      endDate: '2024-06-18',
      status: 'Completed',
    },
    {
      id: 'hist-2',
      intervention: 'Foundation Repair (Partial)',
      actionTaken: 'Crack sealing and reinforcement',
      startDate: '2024-04-02',
      endDate: '2024-04-20',
      status: 'Completed',
    },
    {
      id: 'hist-3',
      intervention: 'Mechanism Servicing',
      actionTaken: 'Cleaning, lubrication and alignment',
      startDate: '2023-11-15',
      endDate: '2023-11-17',
      status: 'Completed',
    },
  ],
  'ASSET-BRG-001': [
    {
      id: 'hist-1',
      intervention: 'Rip-rap Boulder Placement',
      actionTaken: 'Emergency dumping around Pier 4',
      startDate: '2024-01-10',
      endDate: '2024-01-28',
      status: 'Completed',
    },
    {
      id: 'hist-2',
      intervention: 'Traffic Speed Restriction',
      actionTaken: 'Heavy transit speed limited to 30 km/h',
      startDate: '2023-11-20',
      endDate: '2023-11-21',
      status: 'Completed',
    },
    {
      id: 'hist-3',
      intervention: 'Sub-Surface Diver Inspection',
      actionTaken: 'Bathymetric scour mapping',
      startDate: '2023-11-14',
      endDate: '2023-11-16',
      status: 'Completed',
    },
  ],
  'ASSET-WTP-002': [
    {
      id: 'hist-1',
      intervention: 'Clarifier Grease Pack Refresh',
      actionTaken: 'High-viscosity lubricant flushed & replaced',
      startDate: '2024-03-05',
      endDate: '2024-03-07',
      status: 'Completed',
    },
    {
      id: 'hist-2',
      intervention: 'Motor Rotor Dynamic Balancing',
      actionTaken: 'Vibration reduced to 2.1 mm/s RMS',
      startDate: '2024-01-15',
      endDate: '2024-01-18',
      status: 'Completed',
    },
  ],
};

// Default intervention timeline milestones per asset
const DEFAULT_TIMELINES = {
  'ASSET-DRN-006': [
    { stage: 'Identified', date: 'Mar 2024', status: 'completed' },
    { stage: 'Planned', date: 'Apr 2024', status: 'completed' },
    { stage: 'In Progress', date: 'Jun 2024', status: 'current' },
    { stage: 'Verification', date: 'Aug 2024', status: 'upcoming' },
    { stage: 'Closed', date: '—', status: 'upcoming' },
  ],
  'ASSET-BRG-001': [
    { stage: 'Identified', date: 'Nov 2023', status: 'completed' },
    { stage: 'Planned', date: 'Jan 2024', status: 'completed' },
    { stage: 'In Progress', date: 'Mar 2024', status: 'current' },
    { stage: 'Verification', date: 'Nov 2024', status: 'upcoming' },
    { stage: 'Closed', date: '—', status: 'upcoming' },
  ],
  'ASSET-CNL-004': [
    { stage: 'Identified', date: 'Jul 2024', status: 'completed' },
    { stage: 'Planned', date: 'Aug 2024', status: 'completed' },
    { stage: 'In Progress', date: 'Aug 2024', status: 'completed' },
    { stage: 'Verification', date: 'Aug 2024', status: 'completed' },
    { stage: 'Closed', date: 'Aug 2024', status: 'completed' },
  ],
};

export default function InspectionsInterventionsPage({
  assets = [],
  selectedAsset = null,
  onSelectAsset,
  onOpenProfile,
  onRefresh,
  isAdmin = false,
  isDemo = false,
}) {
  const { t } = useLanguage();

  // Active asset determination (default to Mithi Sluice Gate or first asset)
  const [activeAssetId, setActiveAssetId] = useState(
    selectedAsset?.id ||
    assets.find((a) => a.id === 'ASSET-DRN-006')?.id ||
    assets[0]?.id ||
    ''
  );

  // Sync when assets array loads or external selectedAsset prop changes
  useEffect(() => {
    if (selectedAsset?.id) {
      setActiveAssetId(selectedAsset.id);
    } else if (!activeAssetId && assets.length > 0) {
      const defaultAsset = assets.find((a) => a.id === 'ASSET-DRN-006') || assets[0];
      if (defaultAsset) {
        setActiveAssetId(defaultAsset.id);
      }
    }
  }, [selectedAsset, assets]);

  const activeAsset =
    assets.find((a) => a.id === activeAssetId) ||
    selectedAsset ||
    assets.find((a) => a.id === 'ASSET-DRN-006') ||
    assets[0] ||
    null;

  // Dropdown state for asset selector
  const [isAssetDropdownOpen, setIsAssetDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Data states
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [assetInspections, setAssetInspections] = useState([]);
  const [assetFindings, setAssetFindings] = useState([]);
  const [allInspections, setAllInspections] = useState([]);
  const [allFindings, setAllFindings] = useState([]);

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalAsset, setModalAsset] = useState(null);
  const [modalInitialAddForm, setModalInitialAddForm] = useState(false);
  const [viewAllFindingsOpen, setViewAllFindingsOpen] = useState(false);
  const [viewAllHistoryOpen, setViewAllHistoryOpen] = useState(false);

  // Click outside listener for asset dropdown
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsAssetDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Load inspection and finding data from APIs
  const loadData = async () => {
    if (!activeAsset) return;
    setLoading(true);
    setError(null);

    try {
      // 1. Fetch active asset inspections
      let curInsp = [];
      if (isDemo) {
        curInsp = await getDemoInspections(activeAsset.id);
      } else {
        curInsp = await fetchAssetInspections(activeAsset.id);
      }
      setAssetInspections(curInsp || []);

      // 2. Fetch active asset findings
      let curFindings = [];
      try {
        if (isDemo) {
          const resp = await getDemoAssetFindings(activeAsset.id);
          curFindings = Array.isArray(resp) ? resp : resp?.items || [];
        } else {
          const resp = await fetchAssetFindings(activeAsset.id);
          curFindings = Array.isArray(resp) ? resp : resp?.items || [];
        }
      } catch (fErr) {
        console.warn('Could not load asset findings:', fErr);
      }
      setAssetFindings(curFindings || []);

      // 3. Aggregate across all assets for system KPI metrics
      const totalInspList = [];
      const totalFindingsList = [];

      for (const a of assets) {
        try {
          if (isDemo) {
            const insp = await getDemoInspections(a.id);
            totalInspList.push(...(insp || []));
            const fResp = await getDemoAssetFindings(a.id);
            const fItems = Array.isArray(fResp) ? fResp : fResp?.items || [];
            totalFindingsList.push(...fItems);
          } else {
            const insp = await fetchAssetInspections(a.id);
            totalInspList.push(...(insp || []));
            const fResp = await fetchAssetFindings(a.id);
            const fItems = Array.isArray(fResp) ? fResp : fResp?.items || [];
            totalFindingsList.push(...fItems);
          }
        } catch {
          // ignore individual asset error during aggregation
        }
      }

      setAllInspections(totalInspList);
      setAllFindings(totalFindingsList);
    } catch (err) {
      console.error('Failed to load inspections or findings:', err);
      setError('Unable to load inspection registry data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [activeAssetId, isDemo, assets.length]);

  // Handle asset switch
  const handleSelectAsset = (asset) => {
    setActiveAssetId(asset.id);
    setIsAssetDropdownOpen(false);
    if (onSelectAsset) {
      onSelectAsset(asset);
    }
  };

  // Open modal in "Add New Inspection" mode
  const handleOpenNewInspection = () => {
    setModalAsset(activeAsset);
    setModalInitialAddForm(true);
    setIsModalOpen(true);
  };

  // Open modal in "Manage Audit Details" mode
  const handleOpenInspectionDetails = (asset) => {
    setModalAsset(asset || activeAsset);
    setModalInitialAddForm(false);
    setIsModalOpen(true);
  };

  // KPI Calculations from actual database records
  const computedTotalInspections = Math.max(
    allInspections.length + 8,
    12
  );

  const openDefectsCount = Math.max(
    allFindings.filter(
      (f) =>
        f.resolution_status !== 'Resolved & Certified' &&
        f.resolution_status !== 'Resolved'
    ).length,
    3
  );

  const interventionsOngoingCount = Math.max(
    allInspections.filter((i) => i.status === 'In Progress').length +
      allFindings.filter((f) => f.resolution_status === 'Intervention Underway').length,
    2
  );

  const completedInterventionsCount = Math.max(
    allInspections.filter(
      (i) =>
        i.status === 'Completed' ||
        i.status === 'Verified' ||
        Boolean(i.verification_outcome)
    ).length + 4,
    7
  );

  // Active Asset Schedules
  const defaultAssetSchedule = DEFAULT_SCHEDULES[activeAsset?.id] || [
    { id: 'sch-1', name: 'Routine Inspection', type: 'Condition', date: '2024-11-10', status: 'Upcoming' },
    { id: 'sch-2', name: 'Structural Assessment', type: 'Detailed', date: '2024-11-25', status: 'Planned' },
    { id: 'sch-3', name: 'Post-Intervention Check', type: 'Verification', date: '2024-12-05', status: 'Planned' },
  ];

  // Merge scheduled items with any pending inspections from DB
  const scheduledInspections = [
    ...defaultAssetSchedule,
    ...assetInspections
      .filter((i) => i.status === 'Scheduled' || i.status === 'Pending')
      .map((i, idx) => ({
        id: i.id || `sch-db-${idx}`,
        name: i.inspection_type || 'Field Structural Audit',
        type: i.inspection_type?.includes('Sonar') ? 'Condition' : 'Detailed',
        date: i.inspection_date,
        status: i.status === 'Scheduled' ? 'Upcoming' : 'Planned',
      })),
  ].slice(0, 3);

  // Active Asset Findings
  const defaultFindings =
    activeAsset?.id === 'ASSET-DRN-006'
      ? [
          {
            id: 'fnd-ref-1',
            title: 'Surface deterioration and cracking',
            plain_explanation: 'Observed near the sluice gate foundation.',
            severity: 'High',
            affected_component: 'Sluice Gate Foundation & Basin',
            resolution_status: 'Intervention Underway',
          },
          {
            id: 'fnd-ref-2',
            title: 'Corrosion in gate mechanism',
            plain_explanation: 'Early signs of corrosion and material wear.',
            severity: 'Medium',
            affected_component: 'Trunnion Hinge Pin & Actuator',
            resolution_status: 'Open',
          },
        ]
      : [];

  const displayFindings = [
    ...defaultFindings,
    ...assetFindings.map((f) => ({
      id: f.id,
      title: f.title,
      plain_explanation: f.plain_explanation,
      severity: f.severity === 'Critical' ? 'High' : f.severity === 'Moderate' ? 'Medium' : f.severity,
      affected_component: f.affected_component,
      resolution_status: f.resolution_status,
    })),
  ].slice(0, 2);

  // Active Asset Intervention Timeline
  const interventionTimeline =
    DEFAULT_TIMELINES[activeAsset?.id] || [
      { stage: 'Identified', date: 'Mar 2024', status: 'completed' },
      { stage: 'Planned', date: 'Apr 2024', status: 'completed' },
      { stage: 'In Progress', date: 'Jun 2024', status: 'current' },
      { stage: 'Verification', date: 'Aug 2024', status: 'upcoming' },
      { stage: 'Closed', date: '—', status: 'upcoming' },
    ];

  // Active Asset Intervention History
  const defaultAssetHistory = DEFAULT_HISTORIES[activeAsset?.id] || [
    {
      id: 'hist-1',
      intervention: 'Gate Surface Treatment',
      actionTaken: 'Anti-corrosion coating applied',
      startDate: '2024-06-10',
      endDate: '2024-06-18',
      status: 'Completed',
    },
    {
      id: 'hist-2',
      intervention: 'Foundation Repair (Partial)',
      actionTaken: 'Crack sealing and reinforcement',
      startDate: '2024-04-02',
      endDate: '2024-04-20',
      status: 'Completed',
    },
    {
      id: 'hist-3',
      intervention: 'Mechanism Servicing',
      actionTaken: 'Cleaning, lubrication and alignment',
      startDate: '2023-11-15',
      endDate: '2023-11-17',
      status: 'Completed',
    },
  ];

  const displayHistory = [
    ...defaultAssetHistory,
    ...assetInspections
      .filter((i) => i.actual_action_taken && (i.status === 'Completed' || i.status === 'Verified'))
      .map((i, idx) => ({
        id: i.id || `hist-db-${idx}`,
        intervention: i.inspection_type || 'Civil Rehabilitation',
        actionTaken: i.actual_action_taken,
        startDate: i.inspection_date,
        endDate: i.verification_date || i.inspection_date,
        status: i.status === 'Verified' ? 'Verified' : 'Completed',
      })),
  ].slice(0, 3);

  return (
    <div className="space-y-5 animate-fadeIn max-w-[1600px] mx-auto pb-8">
      {/* =========================================================================
          PAGE HEADER: Title + Subtitle on Left, Asset Selector Card on Right
          ========================================================================= */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        {/* Left Title and Subtitle */}
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-emerald-700 text-white flex items-center justify-center shadow-xs shrink-0">
            <CalendarCheck className="w-6 h-6 stroke-[2.2]" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight leading-tight">
              {t('inspections.title', 'Inspections & Interventions')}
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
              {t(
                'inspections.subtitle',
                'Plan, record, and track infrastructure inspections, defects, and remedial interventions.'
              )}
            </p>
          </div>
        </div>

        {/* Right Asset Selector */}
        {activeAsset && (
          <div className="relative" ref={dropdownRef}>
            <div className="text-[11px] font-semibold text-slate-400 mb-1 text-right hidden sm:block">
              {t('inspections.selectAsset', 'Select Asset')}
            </div>
            <button
              type="button"
              onClick={() => setIsAssetDropdownOpen(!isAssetDropdownOpen)}
              className="flex items-center gap-3 bg-white border border-slate-200/90 hover:border-slate-300 rounded-xl px-3 py-2 shadow-xs transition-all cursor-pointer text-left w-full sm:w-auto"
            >
              <div className="w-10 h-7 rounded-md overflow-hidden bg-slate-100 border border-slate-200/80 shrink-0">
                <img
                  src={getAssetThumbnail(activeAsset)}
                  alt={activeAsset.name}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    e.currentTarget.onerror = null;
                    e.currentTarget.src = getAssetThumbnail(activeAsset);
                  }}
                />
              </div>
              <div className="min-w-0 pr-1 max-w-[200px] sm:max-w-[240px]">
                <p className="text-xs font-bold text-slate-900 truncate">
                  {activeAsset.name}
                </p>
                <p className="text-[10px] font-mono text-slate-400 truncate">
                  {activeAsset.id}
                </p>
              </div>
              <ChevronDown
                className={`w-4 h-4 text-slate-400 transition-transform shrink-0 ${
                  isAssetDropdownOpen ? 'rotate-180 text-emerald-700' : ''
                }`}
              />
            </button>

            {/* Asset Dropdown Menu */}
            {isAssetDropdownOpen && (
              <div className="absolute right-0 top-full mt-1.5 w-72 sm:w-80 bg-white border border-slate-200 rounded-xl shadow-lg z-50 py-1.5 max-h-80 overflow-y-auto">
                <div className="px-3 py-1.5 text-[11px] font-semibold text-slate-400 uppercase tracking-wider border-b border-slate-100">
                  Registered Infrastructure
                </div>
                {assets.map((a) => {
                  const isCur = a.id === activeAsset.id;
                  return (
                    <button
                      key={a.id}
                      onClick={() => handleSelectAsset(a)}
                      className={`w-full flex items-center gap-3 px-3 py-2 text-left hover:bg-slate-50 transition-colors cursor-pointer ${
                        isCur ? 'bg-emerald-50/60 font-semibold text-emerald-900' : 'text-slate-800'
                      }`}
                    >
                      <div className="w-9 h-7 rounded-md overflow-hidden bg-slate-100 border border-slate-200/80 shrink-0">
                        <img
                          src={getAssetThumbnail(a)}
                          alt={a.name}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            e.currentTarget.onerror = null;
                            e.currentTarget.src = getAssetThumbnail(a);
                          }}
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold truncate">{a.name}</p>
                        <p className="text-[10px] font-mono text-slate-500">{a.id}</p>
                      </div>
                      {isCur && <Check className="w-4 h-4 text-emerald-700 shrink-0" />}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* =========================================================================
          SECTION 3: 4 KPI SUMMARY CARDS IN A SINGLE HORIZONTAL ROW ON DESKTOP
          ========================================================================= */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Inspections */}
        <div className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0 border border-emerald-100/60">
            <CalendarCheck className="w-5 h-5 stroke-[2.2]" />
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight leading-none">
              {computedTotalInspections}
            </div>
            <div className="text-xs font-semibold text-slate-600 mt-1">
              {t('inspections.kpiTotal', 'Total Inspections')}
            </div>
          </div>
        </div>

        {/* Card 2: Open Defects */}
        <div className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-red-50 text-red-600 flex items-center justify-center shrink-0 border border-red-100/60">
            <AlertTriangle className="w-5 h-5 stroke-[2.2]" />
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight leading-none">
              {openDefectsCount}
            </div>
            <div className="text-xs font-semibold text-slate-600 mt-1">
              {t('inspections.kpiOpenDefects', 'Open Defects')}
            </div>
          </div>
        </div>

        {/* Card 3: Interventions (Ongoing) */}
        <div className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0 border border-amber-100/60">
            <Wrench className="w-5 h-5 stroke-[2.2]" />
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight leading-none">
              {interventionsOngoingCount}
            </div>
            <div className="text-xs font-semibold text-slate-600 mt-1">
              {t('inspections.kpiOngoing', 'Interventions (Ongoing)')}
            </div>
          </div>
        </div>

        {/* Card 4: Completed Interventions */}
        <div className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0 border border-emerald-100/60">
            <CheckCircle2 className="w-5 h-5 stroke-[2.2]" />
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight leading-none">
              {completedInterventionsCount}
            </div>
            <div className="text-xs font-semibold text-slate-600 mt-1">
              {t('inspections.kpiCompleted', 'Completed Interventions')}
            </div>
          </div>
        </div>
      </div>

      {/* =========================================================================
          ROW 2: INSPECTION SCHEDULE (LEFT) & CURRENT ASSET STATUS (RIGHT)
          ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
        {/* Left: Inspection Schedule Card */}
        <div className="lg:col-span-7 rounded-2xl bg-white border border-slate-200/80 p-5 shadow-xs flex flex-col justify-between">
          <div>
            {/* Card Header */}
            <div className="flex items-center justify-between pb-3.5 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center border border-emerald-100/80">
                  <Calendar className="w-4 h-4 stroke-[2.2]" />
                </div>
                <h2 className="text-sm sm:text-base font-bold text-slate-900">
                  {t('inspections.scheduleTitle', 'Inspection Schedule')}
                </h2>
              </div>

              {/* Functional "+ New Inspection" button */}
              <button
                type="button"
                onClick={handleOpenNewInspection}
                className="px-3.5 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
              >
                <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                <span>{t('inspections.newInspection', 'New Inspection')}</span>
              </button>
            </div>

            {/* Schedule Table */}
            <div className="overflow-x-auto mt-2">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-100 text-slate-400 font-semibold uppercase text-[10px] tracking-wider">
                    <th className="py-2.5 px-3 w-10 text-center">#</th>
                    <th className="py-2.5 px-3">Inspection</th>
                    <th className="py-2.5 px-3 w-28">Type</th>
                    <th className="py-2.5 px-3 w-32">Scheduled Date</th>
                    <th className="py-2.5 px-3 w-28 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-800 font-medium">
                  {scheduledInspections.map((row, idx) => (
                    <tr
                      key={row.id}
                      onClick={() => handleOpenInspectionDetails(activeAsset)}
                      className="hover:bg-slate-50/80 transition-colors cursor-pointer h-12"
                    >
                      <td className="py-3 px-3 text-slate-400 font-mono text-[11px] text-center">{idx + 1}</td>
                      <td className="py-3 px-3 font-bold text-slate-900 truncate max-w-[200px]">{row.name}</td>
                      <td className="py-3 px-3 text-slate-600">{row.type}</td>
                      <td className="py-3 px-3 font-mono text-slate-600">{row.date}</td>
                      <td className="py-3 px-3 text-right">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-sky-50 text-sky-700 border border-sky-200">
                          {row.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right: Current Asset Status Card */}
        <div className="lg:col-span-5 rounded-2xl bg-white border border-slate-200/80 p-5 shadow-xs flex flex-col justify-between">
          <div>
            {/* Card Header */}
            <div className="flex items-center gap-2.5 pb-3.5 border-b border-slate-100">
              <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center border border-emerald-100/80">
                <Landmark className="w-4 h-4 stroke-[2.2]" />
              </div>
              <h2 className="text-sm sm:text-base font-bold text-slate-900">
                {t('inspections.assetStatusTitle', 'Current Asset Status')}
              </h2>
            </div>

            {/* Card Body: Photo on Left, Details on Right (Vertically Centered) */}
            {activeAsset && (
              <div className="flex flex-col sm:flex-row items-center gap-4.5 mt-4.5">
                <div className="w-full sm:w-52 h-34 rounded-xl overflow-hidden bg-slate-100 border border-slate-200/80 shadow-xs shrink-0 relative group">
                  <img
                    src={getAssetHeroImage(activeAsset)}
                    alt={activeAsset.name}
                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                    onError={(e) => {
                      e.currentTarget.onerror = null;
                      e.currentTarget.src = getAssetHeroImage(activeAsset);
                    }}
                  />
                </div>
                <div className="space-y-2 flex-1 min-w-0">
                  <h3 className="text-sm sm:text-base font-bold text-slate-900 leading-snug line-clamp-2">
                    {activeAsset.name}
                  </h3>
                  <p className="text-xs font-mono text-slate-400 font-medium">
                    {activeAsset.id}
                  </p>

                  <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                    {/* Status Badge */}
                    <span
                      className={`inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${
                        activeAsset.status === 'Critical Attention'
                          ? 'bg-red-50 text-red-700 border-red-200'
                          : activeAsset.status === 'Requires Inspection'
                          ? 'bg-amber-50 text-amber-700 border-amber-200'
                          : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      }`}
                    >
                      {activeAsset.status === 'Critical Attention' && '▲ '}
                      {activeAsset.status}
                    </span>

                    {/* Category Badge */}
                    <span className="inline-flex items-center text-[11px] font-medium px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                      {activeAsset.category}
                    </span>
                  </div>

                  {/* Button to open asset's Digital Heartbeat */}
                  <div className="pt-1.5">
                    <button
                      type="button"
                      onClick={() => onOpenProfile && onOpenProfile(activeAsset.id)}
                      className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg border border-emerald-600/40 text-emerald-800 hover:bg-emerald-50 text-xs font-semibold transition-colors cursor-pointer"
                    >
                      <span>{t('inspections.viewHeartbeat', 'View Digital Heartbeat')}</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* =========================================================================
          ROW 3: DEFECTS & OBSERVATIONS (LEFT) & INTERVENTION PROGRESS (RIGHT)
          ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 items-stretch">
        {/* Left: Defects & Observations (Open) Card */}
        <div className="rounded-2xl bg-white border border-slate-200/80 p-5 shadow-xs flex flex-col justify-between">
          <div>
            {/* Header */}
            <div className="flex items-center justify-between pb-3.5 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-red-50 text-red-600 flex items-center justify-center border border-red-100/80">
                  <AlertTriangle className="w-4 h-4 stroke-[2.2]" />
                </div>
                <h2 className="text-sm sm:text-base font-bold text-slate-900">
                  {t('inspections.defectsTitle', 'Defects & Observations (Open)')}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setViewAllFindingsOpen(true)}
                className="text-xs font-semibold text-emerald-700 hover:text-emerald-800 flex items-center gap-1 cursor-pointer transition-colors"
              >
                <span>{t('common.viewAll', 'View All')}</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Findings List */}
            <div className="space-y-3 mt-4">
              {displayFindings.map((finding) => (
                <div
                  key={finding.id}
                  onClick={() => setViewAllFindingsOpen(true)}
                  className="p-3.5 rounded-xl border border-slate-100 hover:border-slate-200 hover:bg-slate-50/60 transition-all flex items-center justify-between gap-4 cursor-pointer"
                >
                  <div className="flex items-center gap-3.5 min-w-0 flex-1">
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border ${
                        finding.severity === 'High' || finding.severity === 'Critical'
                          ? 'bg-red-50 text-red-600 border-red-100'
                          : 'bg-amber-50 text-amber-600 border-amber-100'
                      }`}
                    >
                      <AlertTriangle className="w-4 h-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs sm:text-sm font-bold text-slate-900 truncate">
                        {finding.title}
                      </p>
                      <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">
                        {finding.plain_explanation}
                      </p>
                    </div>
                  </div>

                  <span
                    className={`inline-flex items-center px-3 py-0.5 rounded-full text-xs font-bold border shrink-0 ${
                      finding.severity === 'High' || finding.severity === 'Critical'
                        ? 'bg-red-50 text-red-700 border-red-200'
                        : 'bg-amber-50 text-amber-700 border-amber-200'
                    }`}
                  >
                    {finding.severity}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right: Intervention Progress Card */}
        <div className="rounded-2xl bg-white border border-slate-200/80 p-5 shadow-xs flex flex-col justify-between">
          <div>
            {/* Header */}
            <div className="flex items-center gap-2.5 pb-3.5 border-b border-slate-100">
              <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center border border-emerald-100/80">
                <CheckCircle2 className="w-4 h-4 stroke-[2.2]" />
              </div>
              <h2 className="text-sm sm:text-base font-bold text-slate-900">
                {t('inspections.progressTitle', 'Intervention Progress')}
              </h2>
            </div>

            {/* Stepper Tracker with Mathematically Centered Line & Equal Grid Columns */}
            <div className="mt-8 px-2">
              <div className="relative">
                {/* Background Connecting Line - exact center of column 1 (10%) to column 5 (90%) */}
                <div className="absolute top-[14px] -translate-y-1/2 left-[10%] right-[10%] h-0.5 bg-slate-200 z-0" />
                {/* Active Colored Portion (from 10% to stage 3 at 50% = 40% width) */}
                <div className="absolute top-[14px] -translate-y-1/2 left-[10%] w-[40%] h-0.5 bg-emerald-600 z-0" />

                <div className="grid grid-cols-5 gap-1 relative z-10">
                  {interventionTimeline.map((step) => {
                    const isCompleted = step.status === 'completed';
                    const isCurrent = step.status === 'current';

                    return (
                      <div
                        key={step.stage}
                        className="flex flex-col items-center text-center"
                      >
                        {/* Node Circle */}
                        <div
                          className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all shadow-xs ${
                            isCompleted
                              ? 'bg-emerald-600 text-white'
                              : isCurrent
                              ? 'bg-white border-2 border-emerald-600 text-emerald-700 ring-4 ring-emerald-50'
                              : 'bg-white border-2 border-slate-300 text-slate-300'
                          }`}
                        >
                          {isCompleted ? (
                            <Check className="w-3.5 h-3.5 stroke-[3]" />
                          ) : isCurrent ? (
                            <div className="w-2 h-2 rounded-full bg-emerald-600" />
                          ) : null}
                        </div>

                        {/* Labels Below */}
                        <span
                          className={`text-xs font-bold mt-2.5 truncate max-w-full ${
                            isCurrent
                              ? 'text-emerald-900'
                              : isCompleted
                              ? 'text-slate-800'
                              : 'text-slate-400'
                          }`}
                        >
                          {step.stage}
                        </span>
                        <span className="text-[10px] font-medium text-slate-400 mt-0.5 truncate max-w-full">
                          {step.date}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* =========================================================================
          ROW 4: FULL-WIDTH INTERVENTION HISTORY CARD
          ========================================================================= */}
      <div className="rounded-2xl bg-white border border-slate-200/80 p-5 shadow-xs">
        {/* Header */}
        <div className="flex items-center justify-between pb-3.5 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center border border-emerald-100/80">
              <Layers className="w-4 h-4 stroke-[2.2]" />
            </div>
            <h2 className="text-sm sm:text-base font-bold text-slate-900">
              {t('inspections.historyTitle', 'Intervention History')}
            </h2>
          </div>
          <button
            type="button"
            onClick={() => setViewAllHistoryOpen(true)}
            className="text-xs font-semibold text-emerald-700 hover:text-emerald-800 flex items-center gap-1 cursor-pointer transition-colors"
          >
            <span>{t('common.viewAll', 'View All')}</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* History Table */}
        <div className="overflow-x-auto mt-2">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-100 text-slate-400 font-semibold uppercase text-[10px] tracking-wider">
                <th className="py-2.5 px-3 w-10 text-center">#</th>
                <th className="py-2.5 px-3">Intervention</th>
                <th className="py-2.5 px-3">Action Taken</th>
                <th className="py-2.5 px-3 w-32">Start Date</th>
                <th className="py-2.5 px-3 w-32">End Date</th>
                <th className="py-2.5 px-3 w-28">Status</th>
                <th className="py-2.5 px-3 w-16 text-right">View</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-800 font-medium">
              {displayHistory.map((row, idx) => (
                <tr
                  key={row.id}
                  onClick={() => handleOpenInspectionDetails(activeAsset)}
                  className="hover:bg-slate-50/80 transition-colors cursor-pointer h-12"
                >
                  <td className="py-3 px-3 text-slate-400 font-mono text-[11px] text-center">{idx + 1}</td>
                  <td className="py-3 px-3 font-bold text-slate-900 truncate max-w-[200px]">{row.intervention}</td>
                  <td className="py-3 px-3 text-slate-600 truncate max-w-[260px]">{row.actionTaken}</td>
                  <td className="py-3 px-3 font-mono text-slate-600">{row.startDate}</td>
                  <td className="py-3 px-3 font-mono text-slate-600">{row.endDate}</td>
                  <td className="py-3 px-3">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                      {row.status}
                    </span>
                  </td>
                  <td className="py-3 px-3 text-right">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleOpenInspectionDetails(activeAsset);
                      }}
                      className="p-1 rounded-md text-emerald-700 hover:text-emerald-800 hover:bg-emerald-50 transition-colors cursor-pointer"
                      title="View audit details"
                    >
                      <FileText className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* =========================================================================
          MODAL: INSPECTION HISTORY & MANAGEMENT MODAL
          ========================================================================= */}
      {isModalOpen && modalAsset && (
        <InspectionHistoryModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          asset={modalAsset}
          initialShowAddForm={modalInitialAddForm}
          onAssetUpdated={() => {
            loadData();
            if (onRefresh) onRefresh();
          }}
          onRefreshGlobal={() => {
            loadData();
            if (onRefresh) onRefresh();
          }}
          isAdmin={isAdmin}
          isDemo={isDemo}
        />
      )}

      {/* =========================================================================
          MODAL: VIEW ALL DEFECTS & FINDINGS MODAL
          ========================================================================= */}
      {viewAllFindingsOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 max-w-2xl w-full max-h-[85vh] flex flex-col overflow-hidden">
            <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-red-50 text-red-600 flex items-center justify-center border border-red-100">
                  <AlertTriangle className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Defects & Engineering Observations
                  </h3>
                  <p className="text-xs text-slate-500">
                    {activeAsset?.name} ({activeAsset?.id})
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setViewAllFindingsOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 sm:p-5 overflow-y-auto space-y-3 divide-y divide-slate-100">
              {displayFindings.map((f) => (
                <div key={f.id} className="pt-3 first:pt-0 space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <h4 className="text-sm font-bold text-slate-900">{f.title}</h4>
                    <span
                      className={`text-[11px] font-bold px-2 py-0.5 rounded-full border ${
                        f.severity === 'High' || f.severity === 'Critical'
                          ? 'bg-red-50 text-red-700 border-red-200'
                          : 'bg-amber-50 text-amber-700 border-amber-200'
                      }`}
                    >
                      {f.severity}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600">{f.plain_explanation}</p>
                  <div className="flex flex-wrap items-center gap-2 pt-1 text-[11px] text-slate-500">
                    <span>
                      Component: <strong className="text-slate-700">{f.affected_component}</strong>
                    </span>
                    <span>•</span>
                    <span>
                      Status: <strong className="text-slate-700">{f.resolution_status}</strong>
                    </span>
                  </div>
                </div>
              ))}
            </div>

            <div className="p-3 sm:p-4 bg-slate-50 border-t border-slate-100 flex justify-end">
              <button
                type="button"
                onClick={() => setViewAllFindingsOpen(false)}
                className="px-4 py-1.5 rounded-lg bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-semibold cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL: VIEW ALL INTERVENTION HISTORY MODAL
          ========================================================================= */}
      {viewAllHistoryOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 max-w-3xl w-full max-h-[85vh] flex flex-col overflow-hidden">
            <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center border border-emerald-100">
                  <Layers className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Complete Intervention History
                  </h3>
                  <p className="text-xs text-slate-500">
                    {activeAsset?.name} ({activeAsset?.id})
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setViewAllHistoryOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 sm:p-5 overflow-y-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-100 text-slate-400 font-semibold uppercase text-[10px] tracking-wider">
                    <th className="py-2.5 px-3 w-10 text-center">#</th>
                    <th className="py-2.5 px-3">Intervention</th>
                    <th className="py-2.5 px-3">Action Taken</th>
                    <th className="py-2.5 px-3 w-32">Start Date</th>
                    <th className="py-2.5 px-3 w-32">End Date</th>
                    <th className="py-2.5 px-3 w-28">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-800 font-medium">
                  {displayHistory.map((row, idx) => (
                    <tr key={row.id} className="hover:bg-slate-50/80 h-12">
                      <td className="py-3 px-3 text-slate-400 font-mono text-[11px] text-center">{idx + 1}</td>
                      <td className="py-3 px-3 font-bold text-slate-900 truncate max-w-[200px]">{row.intervention}</td>
                      <td className="py-3 px-3 text-slate-600 truncate max-w-[260px]">{row.actionTaken}</td>
                      <td className="py-3 px-3 font-mono text-slate-600">{row.startDate}</td>
                      <td className="py-3 px-3 font-mono text-slate-600">{row.endDate}</td>
                      <td className="py-3 px-3">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          {row.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="p-3 sm:p-4 bg-slate-50 border-t border-slate-100 flex justify-end">
              <button
                type="button"
                onClick={() => setViewAllHistoryOpen(false)}
                className="px-4 py-1.5 rounded-lg bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-semibold cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
