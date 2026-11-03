import React, { useState, useMemo, useEffect } from 'react';
import {
  Search,
  X,
  Layers,
  MapPin,
  AlertTriangle,
  Activity,
  ChevronRight,
  ChevronDown,
  ChevronLeft,
  Database,
  PlusCircle,
  Plus,
  Loader2,
  CheckCircle2,
  AlertCircle,
  ClipboardList,
  Eye,
  Calendar,
  Compass,
  ArrowRight,
  ShieldAlert,
  Droplets,
  Waves,
  Navigation,
  Zap,
  HeartPulse,
  Building2,
  Clock,
  ExternalLink,
} from 'lucide-react';
import StatusBadge from '../components/StatusBadge';
import InspectionHistoryModal from '../components/InspectionHistoryModal';
import { createAsset } from '../services/api';
import { createDemoAsset } from '../demo/demoService';
import { useLanguage } from '../context/LanguageContext';
import {
  getAssetHeroImage,
  getAssetThumbnail as resolveAssetThumbnail,
} from '../utils/assetImages';

// Helper to determine the appropriate category icon
function getCategoryIcon(category) {
  const cat = (category || '').toLowerCase();
  if (cat.includes('drain')) return <Droplets className="w-3.5 h-3.5 text-sky-600" />;
  if (cat.includes('bridge')) return <Layers className="w-3.5 h-3.5 text-emerald-600" />;
  if (cat.includes('high') || cat.includes('flyover') || cat.includes('road'))
    return <Navigation className="w-3.5 h-3.5 text-teal-600" />;
  if (cat.includes('water') || cat.includes('wtp'))
    return <Waves className="w-3.5 h-3.5 text-blue-600" />;
  if (cat.includes('canal')) return <Waves className="w-3.5 h-3.5 text-cyan-600" />;
  if (cat.includes('power') || cat.includes('substation'))
    return <Zap className="w-3.5 h-3.5 text-amber-600" />;
  if (cat.includes('health') || cat.includes('hospital'))
    return <HeartPulse className="w-3.5 h-3.5 text-rose-600" />;
  return <Building2 className="w-3.5 h-3.5 text-slate-600" />;
}

// Helper to resolve authentic high-resolution infrastructure photography
function getAssetThumbnail(asset, isHero = false) {
  if (isHero) return getAssetHeroImage(asset);
  return resolveAssetThumbnail(asset);
}

export default function AssetRegistry({
  assets = [],
  categories = [],
  loading = false,
  error = null,
  selectedAsset,
  onSelectAsset,
  onNavigate,
  onRefresh,
  isAdmin = false,
  isDemo = false,
}) {
  const { t } = useLanguage();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedStatus, setSelectedStatus] = useState('All');
  const [selectedState, setSelectedState] = useState('All');

  // Currently active asset in the right intelligence panel
  const [activeAssetId, setActiveAssetId] = useState(selectedAsset?.id || null);

  // Sync external selectedAsset prop
  useEffect(() => {
    if (selectedAsset?.id) {
      setActiveAssetId(selectedAsset.id);
    }
  }, [selectedAsset]);

  // Modals & form state
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [showInspectionModal, setShowInspectionModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState(null);
  const [formSuccess, setFormSuccess] = useState(null);

  const initialFormState = {
    id: '',
    name: '',
    category: 'Bridge',
    district: '',
    state: '',
    latitude: '',
    longitude: '',
    construction_year: '',
    status: 'Operational',
    data_source: 'Field Officer Registration (AAYAM Portal)',
    risk_score: '15.0',
    risk_level: 'Low',
    health_index: '85.0',
    last_inspection_date: '',
    flagged_reasons: '',
    description: '',
  };
  const [formData, setFormData] = useState(initialFormState);

  // Filter options derived from data
  const uniqueCategories = useMemo(() => {
    const set = new Set(categories.length > 0 ? categories : assets.map((a) => a.category).filter(Boolean));
    return ['All', ...Array.from(set)];
  }, [categories, assets]);

  const uniqueStates = useMemo(() => {
    const set = new Set(assets.map((a) => a.state).filter(Boolean));
    return ['All', ...Array.from(set)];
  }, [assets]);

  // Dynamic summary counters calculated from actual backend dataset
  const totalAssetsCount = assets.length;
  const criticalCount = useMemo(
    () => assets.filter((a) => a.status === 'Critical Attention' || a.risk_level === 'Critical').length,
    [assets]
  );
  const inspectionDueCount = useMemo(
    () =>
      assets.filter(
        (a) =>
          a.status === 'Requires Inspection' ||
          a.risk_level === 'High' ||
          a.risk_level === 'Moderate'
      ).length,
    [assets]
  );
  const operationalCount = useMemo(
    () => assets.filter((a) => a.status === 'Operational' || a.risk_level === 'Low').length,
    [assets]
  );

  // Filtered dataset
  const filteredAssets = useMemo(() => {
    return assets.filter((asset) => {
      const q = searchTerm.trim().toLowerCase();
      const matchesSearch =
        !q ||
        (asset.name && asset.name.toLowerCase().includes(q)) ||
        (asset.id && asset.id.toLowerCase().includes(q)) ||
        (asset.district && asset.district.toLowerCase().includes(q)) ||
        (asset.state && asset.state.toLowerCase().includes(q)) ||
        (asset.category && asset.category.toLowerCase().includes(q));

      const matchesCategory =
        selectedCategory === 'All' || asset.category === selectedCategory;

      const matchesState = selectedState === 'All' || asset.state === selectedState;

      const matchesStatus =
        selectedStatus === 'All'
          ? true
          : selectedStatus === 'Critical Attention' || selectedStatus === 'Critical'
          ? asset.status === 'Critical Attention' || asset.risk_level === 'Critical'
          : selectedStatus === 'Requires Inspection' || selectedStatus === 'Inspection Due'
          ? asset.status === 'Requires Inspection' ||
            asset.risk_level === 'High' ||
            asset.risk_level === 'Moderate'
          : selectedStatus === 'Operational'
          ? asset.status === 'Operational' || asset.risk_level === 'Low'
          : asset.status === selectedStatus;

      return matchesSearch && matchesCategory && matchesState && matchesStatus;
    });
  }, [assets, searchTerm, selectedCategory, selectedState, selectedStatus]);

  // Determine active asset object strictly from filtered results
  const activeAsset = useMemo(() => {
    if (!activeAssetId) return null;
    return filteredAssets.find((a) => a.id === activeAssetId) || null;
  }, [activeAssetId, filteredAssets]);

  const hasActiveFilters =
    searchTerm.trim() !== '' ||
    selectedCategory !== 'All' ||
    selectedStatus !== 'All' ||
    selectedState !== 'All';

  const resetFilters = () => {
    setSearchTerm('');
    setSelectedCategory('All');
    setSelectedStatus('All');
    setSelectedState('All');
  };

  const handleInputChange = (field, value) => {
    setFormData((prev) => {
      const next = { ...prev, [field]: value };
      if (field === 'risk_score') {
        const num = parseFloat(value);
        if (!Number.isNaN(num)) {
          if (num >= 80) next.risk_level = 'Critical';
          else if (num >= 50) next.risk_level = 'High';
          else if (num >= 25) next.risk_level = 'Moderate';
          else next.risk_level = 'Low';
        }
      }
      return next;
    });
  };

  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    if (submitting) return;

    setFormError(null);
    setFormSuccess(null);

    const trimmedId = formData.id.trim();
    if (!trimmedId) {
      setFormError(t('registry.errIdRequired', 'Asset ID is required (e.g. ASSET-BRG-010).'));
      return;
    }

    const trimmedName = formData.name.trim();
    if (!trimmedName) {
      setFormError(t('registry.errNameRequired', 'Asset Name is required.'));
      return;
    }

    const trimmedCategory = formData.category.trim();
    if (!trimmedCategory) {
      setFormError(t('registry.errCategoryRequired', 'Category is required.'));
      return;
    }

    const trimmedDistrict = formData.district.trim();
    if (!trimmedDistrict) {
      setFormError(t('registry.errDistrictRequired', 'District is required.'));
      return;
    }

    const trimmedState = formData.state.trim();
    if (!trimmedState) {
      setFormError(t('registry.errStateRequired', 'State is required.'));
      return;
    }

    if (formData.latitude === '' || formData.latitude === null || formData.latitude === undefined) {
      setFormError(t('registry.errLatRequired', 'Latitude coordinate is required.'));
      return;
    }
    const lat = parseFloat(formData.latitude);
    if (Number.isNaN(lat) || lat < -90 || lat > 90) {
      setFormError(t('registry.errLatValid', 'Latitude must be a valid number between -90 and 90.'));
      return;
    }

    if (formData.longitude === '' || formData.longitude === null || formData.longitude === undefined) {
      setFormError(t('registry.errLngRequired', 'Longitude coordinate is required.'));
      return;
    }
    const lng = parseFloat(formData.longitude);
    if (Number.isNaN(lng) || lng < -180 || lng > 180) {
      setFormError(t('registry.errLngValid', 'Longitude must be a valid number between -180 and 180.'));
      return;
    }

    let constructionYear = null;
    if (formData.construction_year && formData.construction_year.toString().trim()) {
      constructionYear = parseInt(formData.construction_year, 10);
      if (Number.isNaN(constructionYear) || constructionYear < 1800 || constructionYear > 2100) {
        setFormError(
          t('registry.errYearValid', 'Construction year must be a valid 4-digit year between 1800 and 2100.')
        );
        return;
      }
    }

    const riskScore = formData.risk_score !== '' ? parseFloat(formData.risk_score) : 15.0;
    if (Number.isNaN(riskScore) || riskScore < 0 || riskScore > 100) {
      setFormError(t('registry.errRiskValid', 'Risk score must be a number between 0 and 100.'));
      return;
    }

    const healthIndex = formData.health_index !== '' ? parseFloat(formData.health_index) : 85.0;
    if (Number.isNaN(healthIndex) || healthIndex < 0 || healthIndex > 100) {
      setFormError(t('registry.errHealthValid', 'Health index must be a number between 0 and 100.'));
      return;
    }

    const flags = formData.flagged_reasons
      ? formData.flagged_reasons
          .split(/[\n;,]+/)
          .map((s) => s.trim())
          .filter(Boolean)
      : [];

    const payload = {
      id: trimmedId,
      name: trimmedName,
      category: trimmedCategory,
      district: trimmedDistrict,
      state: trimmedState,
      latitude: lat,
      longitude: lng,
      construction_year: constructionYear,
      status: formData.status || 'Operational',
      data_source: formData.data_source.trim() || 'Field Officer Registration (AAYAM Portal)',
      risk_score: riskScore,
      risk_level: formData.risk_level || 'Low',
      health_index: healthIndex,
      last_inspection_date: formData.last_inspection_date ? formData.last_inspection_date.trim() : null,
      flagged_reasons: flags,
      description: formData.description ? formData.description.trim() : null,
    };

    setSubmitting(true);

    if (isDemo) {
      try {
        await createDemoAsset(payload);
      } catch (err) {
        setFormError(
          err.message ||
            t(
              'registry.errDemoDisabled',
              'Demo Mode: Asset creation is disabled. Real database mutation requires an authenticated administrator session.'
            )
        );
      } finally {
        setSubmitting(false);
      }
      return;
    }

    try {
      const createdAsset = await createAsset(payload);
      setFormSuccess(
        t('registry.registerSuccess', "Asset '{id}' ({name}) registered successfully!", {
          id: createdAsset.id,
          name: createdAsset.name,
        })
      );

      if (typeof onRefresh === 'function') {
        await onRefresh();
      }

      setActiveAssetId(createdAsset.id);
      if (typeof onSelectAsset === 'function') {
        onSelectAsset(createdAsset);
      }

      setTimeout(() => {
        setFormData(initialFormState);
        setShowRegisterModal(false);
        setFormSuccess(null);
      }, 1500);
    } catch (err) {
      console.error('Registration failed:', err);
      if (err.status === 409) {
        setFormError(
          t(
            'registry.errConflict409',
            "Asset ID '{id}' already exists in registry (HTTP 409 Conflict). Please choose a unique Asset ID.",
            { id: trimmedId }
          )
        );
      } else if (err.status === 422) {
        setFormError(t('registry.errValidation422', 'Validation error (HTTP 422): {message}', { message: err.message }));
      } else {
        setFormError(err.message || t('registry.errNetwork', 'Network error occurred connecting to backend.'));
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-4 pb-8 flex flex-col">
      {/* Demo Mode Notice Banner */}
      {isDemo && (
        <div
          data-testid="demo-registry-banner"
          className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-between text-xs text-amber-900 shadow-2xs"
        >
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded bg-amber-200 text-amber-900 font-bold uppercase tracking-wider text-[10px]">
              {t('registry.demoRegistryBadge', 'Demo Registry')}
            </span>
            <span>
              {t(
                'registry.demoRegistryNotice',
                'Simulated Asset Registry: displaying 3 synthetic demonstration assets. New registrations and record modifications are isolated from backend.'
              )}
            </span>
          </div>
        </div>
      )}

      {/* 1. Header Section */}
      <div className="space-y-1">
        <h1 className="text-xl sm:text-2xl font-black text-[#142B2A] tracking-tight">
          Asset Registry
        </h1>
        <p className="text-xs text-slate-500">
          Central registry of infrastructure assets with risk, status, and inspection insights.
        </p>
      </div>

      {/* 2. Four Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        {/* Card 1: Total Assets */}
        <div className="p-3.5 sm:p-4 rounded-xl bg-white border border-slate-200/90 shadow-2xs flex items-center gap-3 transition-shadow hover:shadow-xs">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200/80 flex items-center justify-center shrink-0">
            <Layers className="w-5 h-5 text-emerald-700 stroke-[2.2]" />
          </div>
          <div>
            <div className="text-xl sm:text-2xl font-black text-slate-900 leading-tight">
              {totalAssetsCount}
            </div>
            <div className="text-xs text-slate-500 font-medium mt-0.5">Total Assets</div>
          </div>
        </div>

        {/* Card 2: Critical Attention */}
        <div className="p-3.5 sm:p-4 rounded-xl bg-white border border-slate-200/90 shadow-2xs flex items-center gap-3 transition-shadow hover:shadow-xs">
          <div className="w-10 h-10 rounded-xl bg-red-50 text-red-600 border border-red-200/80 flex items-center justify-center shrink-0">
            <AlertTriangle className="w-5 h-5 text-red-600 stroke-[2.2]" />
          </div>
          <div>
            <div className="text-xl sm:text-2xl font-black text-slate-900 leading-tight">
              {criticalCount}
            </div>
            <div className="text-xs text-slate-500 font-medium mt-0.5">Critical Attention</div>
          </div>
        </div>

        {/* Card 3: Inspection Due */}
        <div className="p-3.5 sm:p-4 rounded-xl bg-white border border-slate-200/90 shadow-2xs flex items-center gap-3 transition-shadow hover:shadow-xs">
          <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-700 border border-amber-200/80 flex items-center justify-center shrink-0">
            <Clock className="w-5 h-5 text-amber-700 stroke-[2.2]" />
          </div>
          <div>
            <div className="text-xl sm:text-2xl font-black text-slate-900 leading-tight">
              {inspectionDueCount}
            </div>
            <div className="text-xs text-slate-500 font-medium mt-0.5">Inspection Due</div>
          </div>
        </div>

        {/* Card 4: Operational */}
        <div className="p-3.5 sm:p-4 rounded-xl bg-white border border-slate-200/90 shadow-2xs flex items-center gap-3 transition-shadow hover:shadow-xs">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200/80 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-5 h-5 text-emerald-700 stroke-[2.2]" />
          </div>
          <div>
            <div className="text-xl sm:text-2xl font-black text-slate-900 leading-tight">
              {operationalCount}
            </div>
            <div className="text-xs text-slate-500 font-medium mt-0.5">Operational</div>
          </div>
        </div>
      </div>

      {/* 3. Search and Filters Bar */}
      <div className="p-3 rounded-xl bg-white border border-slate-200/90 shadow-2xs flex flex-wrap items-center justify-between gap-2.5">
        <div className="flex flex-wrap items-center gap-2 flex-1 min-w-[280px]">
          {/* Search Input */}
          <div className="relative flex-1 sm:w-64 min-w-[200px]">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder={t('registry.searchPlaceholder', 'Search by asset code, name, or location...')}
              className="w-full pl-9 pr-7 py-2 bg-white border border-slate-300 rounded-lg text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-500 transition-colors"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
                title="Clear search"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          {/* Category Dropdown */}
          <div className="relative">
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg pl-3 pr-8 py-2 focus:outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-500 cursor-pointer appearance-none transition-colors"
            >
              {uniqueCategories.map((c) => (
                <option key={c} value={c}>
                  {c === 'All' ? 'All Categories' : c}
                </option>
              ))}
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          {/* Status Dropdown */}
          <div className="relative">
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg pl-3 pr-8 py-2 focus:outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-500 cursor-pointer appearance-none transition-colors"
            >
              <option value="All">All Status</option>
              <option value="Critical Attention">Critical Attention</option>
              <option value="Requires Inspection">Inspection Due</option>
              <option value="Operational">Operational</option>
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          {/* State Dropdown */}
          <div className="relative">
            <select
              value={selectedState}
              onChange={(e) => setSelectedState(e.target.value)}
              className="text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg pl-3 pr-8 py-2 focus:outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-500 cursor-pointer appearance-none transition-colors"
            >
              {uniqueStates.map((s) => (
                <option key={s} value={s}>
                  {s === 'All' ? 'All States' : s}
                </option>
              ))}
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          {/* Clear Filters Action */}
          {hasActiveFilters && (
            <button
              type="button"
              onClick={resetFilters}
              className="text-xs text-slate-500 hover:text-slate-800 underline px-1 py-1 cursor-pointer flex items-center gap-1"
            >
              <X className="w-3 h-3" />
              <span>Clear</span>
            </button>
          )}
        </div>

        {/* Add Asset Button (Visible for Admins & Demo) */}
        {(isAdmin || isDemo) && (
          <button
            id="btn-register-asset-open"
            type="button"
            onClick={() => {
              setFormError(null);
              setFormSuccess(null);
              setShowRegisterModal(true);
            }}
            className="px-3.5 py-2 rounded-lg font-semibold text-xs transition-all flex items-center gap-1.5 shadow-2xs bg-[#087F4F] hover:bg-[#06653E] text-white cursor-pointer active:scale-95"
            title={
              isDemo
                ? t('registry.registerDemoTooltip', 'Asset registration is simulated and protected in demo mode')
                : t('registry.registerTooltip', 'Register a new asset')
            }
          >
            <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>
              {isDemo ? t('registry.registerAssetDemo', 'Register Asset (Demo)') : t('registry.registerAsset', 'Add Asset')}
            </span>
          </button>
        )}
      </div>

      {/* 4. Main Workspace Split: Table (~68%) + Asset Intelligence Panel (~32%) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
        {/* Main Asset Registry Table Container */}
        <div className="lg:col-span-8 rounded-xl bg-white border border-slate-200/90 shadow-2xs overflow-hidden flex flex-col">
          {/* Table Header Row */}
          <div className="p-3.5 sm:p-4 border-b border-slate-200/90 flex items-center justify-between bg-white">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-[#087F4F]" />
              <h2 className="text-sm sm:text-base font-bold text-[#142B2A]">
                <span>{t('registry.publicRegistryTitle', 'Registered Assets')}</span>
                <span className="ml-1 text-emerald-700 font-semibold">({filteredAssets.length})</span>
              </h2>
            </div>
            <span className="text-[11px] text-slate-400 hidden sm:inline">
              Select row to preview intelligence
            </span>
          </div>

          {/* Table Body */}
          {loading ? (
            <div className="p-12 text-center space-y-3">
              <div className="w-8 h-8 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-xs text-slate-500">
                {t('registry.loadingSQLite', 'Loading asset records from SQLite database...')}
              </p>
            </div>
          ) : error ? (
            <div className="p-12 text-center space-y-2">
              <p className="text-sm text-red-600 font-semibold">
                {t('registry.errorRetrieving', 'Error retrieving assets')}
              </p>
              <p className="text-xs text-slate-500 font-mono">{error}</p>
            </div>
          ) : filteredAssets.length === 0 ? (
            <div className="p-12 text-center space-y-3">
              <AlertTriangle className="w-8 h-8 text-amber-500 mx-auto" />
              <p className="text-sm font-semibold text-slate-800">
                {t('registry.noMatchingAssets', 'No matching assets found')}
              </p>
              <p className="text-xs text-slate-500">
                {t('registry.tryAdjustingFilters', 'Try adjusting your search criteria or reset filters.')}
              </p>
              <button
                type="button"
                onClick={resetFilters}
                className="mt-2 px-3 py-1.5 text-xs bg-slate-100 hover:bg-slate-200 text-emerald-700 rounded-md font-medium border border-slate-300 cursor-pointer"
              >
                {t('registry.clearAllFilters', 'Clear all filters')}
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50/70 border-b border-slate-200/90 text-slate-500 font-medium">
                    <th className="py-2.5 px-3 w-8 text-center">#</th>
                    <th className="py-2.5 px-3 min-w-[200px]">Asset Name &amp; Code</th>
                    <th className="py-2.5 px-3 min-w-[120px]">Category</th>
                    <th className="py-2.5 px-3 min-w-[130px]">Location</th>
                    <th className="py-2.5 px-3 min-w-[100px]">Risk Score</th>
                    <th className="py-2.5 px-3 min-w-[110px]">Status</th>
                    <th className="py-2.5 px-3 w-12 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-sans">
                  {filteredAssets.map((asset, index) => {
                    const isSelected = activeAsset?.id === asset.id;
                    const score = typeof asset.risk_score === 'number' ? asset.risk_score : 0;
                    return (
                      <tr
                        key={asset.id}
                        onClick={() => setActiveAssetId(asset.id)}
                        className={`cursor-pointer transition-colors ${
                          isSelected
                            ? 'bg-emerald-50/60 hover:bg-emerald-50/80'
                            : 'hover:bg-slate-50/80'
                        }`}
                      >
                        {/* Serial Number */}
                        <td className="py-3 px-3 text-center text-slate-400 font-mono text-[11px]">
                          {index + 1}
                        </td>

                        {/* Asset Name & Code */}
                        <td className="py-3 px-3">
                          <div className="flex items-center gap-2.5">
                            <div className="w-9 h-9 rounded-lg overflow-hidden bg-slate-100 shrink-0 border border-slate-200/80 shadow-2xs">
                              <img
                                src={getAssetThumbnail(asset)}
                                alt={asset.name}
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  e.target.onerror = null;
                                  e.target.src = mandoviBridgeThumbnail;
                                }}
                              />
                            </div>
                            <div className="min-w-0 pr-2">
                              <div className="font-bold text-slate-900 leading-snug line-clamp-1 hover:text-[#087F4F] transition-colors">
                                {asset.name}
                              </div>
                              <div className="font-mono text-[10px] text-slate-400 tracking-wider">
                                {asset.id}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Category */}
                        <td className="py-3 px-3">
                          <div className="flex items-center gap-1.5 text-slate-700 font-medium">
                            <div className="p-1 rounded bg-slate-50 border border-slate-200/70 shrink-0">
                              {getCategoryIcon(asset.category)}
                            </div>
                            <span className="truncate">{asset.category}</span>
                          </div>
                        </td>

                        {/* Location */}
                        <td className="py-3 px-3">
                          <div className="text-slate-700 leading-snug">
                            <div className="font-medium truncate">{asset.district}</div>
                            <div className="text-[11px] text-slate-400 truncate">{asset.state}</div>
                          </div>
                        </td>

                        {/* Risk Score */}
                        <td className="py-3 px-3">
                          <div className="space-y-1">
                            <div
                              className={`font-mono font-bold text-xs ${
                                score >= 80
                                  ? 'text-red-700'
                                  : score >= 50
                                  ? 'text-amber-700'
                                  : 'text-emerald-700'
                              }`}
                            >
                              {score.toFixed(1)}
                            </div>
                            <div className="w-14 h-1.5 rounded-full bg-slate-100 overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all duration-300 ${
                                  score >= 80
                                    ? 'bg-[#E54848]'
                                    : score >= 50
                                    ? 'bg-[#E9A23B]'
                                    : 'bg-[#169B62]'
                                }`}
                                style={{
                                  width: `${Math.min(100, Math.max(8, score))}%`,
                                }}
                              />
                            </div>
                          </div>
                        </td>

                        {/* Status */}
                        <td className="py-3 px-3">
                          {asset.status === 'Critical Attention' || asset.risk_level === 'Critical' ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-red-50 text-red-700 border border-red-200/80">
                              <span className="text-[10px]">▲</span>
                              <span>Critical</span>
                            </span>
                          ) : asset.status === 'Requires Inspection' ||
                            asset.risk_level === 'High' ||
                            asset.risk_level === 'Moderate' ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-800 border border-amber-200/80">
                              <span>Inspection Due</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200/80">
                              <span className="text-[9px]">●</span>
                              <span>Operational</span>
                            </span>
                          )}
                        </td>

                        {/* Action */}
                        <td className="py-3 px-3 text-center">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveAssetId(asset.id);
                              if (typeof onSelectAsset === 'function') {
                                onSelectAsset(asset);
                              }
                            }}
                            className="p-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200/70 transition-colors cursor-pointer inline-flex items-center justify-center shadow-2xs"
                            title="View Asset Details"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Table Footer with Pagination Controls */}
          <div className="p-3 border-t border-slate-200/90 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500 bg-white">
            <div>
              Showing 1–{filteredAssets.length} of {filteredAssets.length} assets
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5">
                <span>Rows per page:</span>
                <span className="font-semibold text-slate-700 px-1.5 py-0.5 rounded border border-slate-200 bg-slate-50">
                  10
                </span>
              </div>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  disabled
                  className="p-1 rounded text-slate-300 border border-slate-200 bg-slate-50 cursor-not-allowed"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
                <span className="px-2 py-0.5 rounded font-bold text-xs bg-[#087F4F] text-white">
                  1
                </span>
                <button
                  type="button"
                  disabled
                  className="p-1 rounded text-slate-300 border border-slate-200 bg-slate-50 cursor-not-allowed"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* 5. Right-Side Selected Asset Intelligence Panel */}
        <div className="lg:col-span-4 rounded-xl bg-white border border-slate-200/90 shadow-2xs p-4 sm:p-5 space-y-4">
          {activeAsset ? (
            <>
              {/* High-quality Infrastructure Image */}
              <div className="relative aspect-video rounded-xl overflow-hidden bg-slate-100 border border-slate-200/80 shadow-2xs group">
                <img
                  src={getAssetThumbnail(activeAsset, true)}
                  alt={activeAsset.name}
                  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                  onError={(e) => {
                    e.target.onerror = null;
                    e.target.src = mandoviBridgeThumbnail;
                  }}
                />
                <div className="absolute top-2.5 right-2.5">
                  <StatusBadge status={activeAsset.status} size="xs" />
                </div>
              </div>

              {/* Title & Asset ID */}
              <div className="space-y-0.5">
                <h3 className="font-bold text-[#142B2A] text-base sm:text-lg leading-snug">
                  {activeAsset.name}
                </h3>
                <div className="font-mono text-xs text-slate-400 font-medium">
                  {activeAsset.id}
                </div>
              </div>

              {/* Badges Row */}
              <div className="flex flex-wrap items-center gap-2">
                {activeAsset.status === 'Critical Attention' || activeAsset.risk_level === 'Critical' ? (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-50 text-red-700 border border-red-200/80">
                    <span className="text-[10px]">▲</span>
                    <span>Critical Attention</span>
                  </span>
                ) : activeAsset.status === 'Requires Inspection' ||
                  activeAsset.risk_level === 'High' ||
                  activeAsset.risk_level === 'Moderate' ? (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200/80">
                    <span>Inspection Due</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200/80">
                    <span className="text-[9px]">●</span>
                    <span>Operational</span>
                  </span>
                )}
                <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200">
                  {activeAsset.category}
                </span>
              </div>

              {/* Detailed Attributes List */}
              <div className="space-y-2.5 text-xs text-slate-600 pt-1 border-t border-slate-100">
                <div className="flex items-center justify-between gap-2">
                  <span className="flex items-center gap-1.5 text-slate-400 shrink-0">
                    <MapPin className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Location</span>
                  </span>
                  <span className="font-medium text-slate-800 text-right truncate">
                    {activeAsset.district}, {activeAsset.state}
                  </span>
                </div>

                <div className="flex items-center justify-between gap-2">
                  <span className="flex items-center gap-1.5 text-slate-400 shrink-0">
                    <Calendar className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Construction Year</span>
                  </span>
                  <span className="font-mono font-medium text-slate-800">
                    {activeAsset.construction_year || 'Unknown'}
                  </span>
                </div>

                <div className="flex items-center justify-between gap-2">
                  <span className="flex items-center gap-1.5 text-slate-400 shrink-0">
                    <Compass className="w-3.5 h-3.5 text-emerald-600" />
                    <span>GPS Coordinates</span>
                  </span>
                  <span className="font-mono text-slate-800 text-[11px]">
                    {typeof activeAsset.latitude === 'number' && typeof activeAsset.longitude === 'number'
                      ? `${activeAsset.latitude.toFixed(4)}°N, ${activeAsset.longitude.toFixed(4)}°E`
                      : 'Not available'}
                  </span>
                </div>

                <div className="flex items-center justify-between gap-2">
                  <span className="flex items-center gap-1.5 text-slate-400 shrink-0">
                    <ClipboardList className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Last Inspection</span>
                  </span>
                  <span className="font-mono font-medium text-slate-800">
                    {activeAsset.last_inspection_date || 'None on record'}
                  </span>
                </div>
              </div>

              {/* Digital Heartbeat Snapshot Box */}
              <div className="p-3.5 rounded-xl bg-slate-50/90 border border-slate-200/80 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 font-bold text-xs text-[#142B2A]">
                    <Activity className="w-3.5 h-3.5 text-emerald-700" />
                    <span>{t('registry.heartbeatSnapshot', 'Digital Heartbeat Snapshot')}</span>
                  </div>
                  <span className="text-[11px] font-mono font-semibold text-slate-500">
                    {t('registry.scoreLabel', 'Score: {score} / 100', { score: activeAsset.risk_score })}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-1">
                  <div>
                    <div className="text-[11px] text-slate-500 font-medium">Health Index</div>
                    <div className="text-sm font-black font-mono text-emerald-700 mt-0.5">
                      {activeAsset.health_index}%
                    </div>
                  </div>
                  <div>
                    <div className="text-[11px] text-slate-500 font-medium">Risk Tier</div>
                    <div
                      className={`text-sm font-black mt-0.5 ${
                        activeAsset.risk_level === 'Critical'
                          ? 'text-red-700'
                          : activeAsset.risk_level === 'High'
                          ? 'text-amber-700'
                          : 'text-emerald-700'
                      }`}
                    >
                      {activeAsset.risk_level}
                    </div>
                  </div>
                </div>
              </div>

              {/* Primary Action Button */}
              <button
                type="button"
                onClick={() => {
                  if (typeof onSelectAsset === 'function') {
                    onSelectAsset(activeAsset);
                  }
                }}
                className="w-full py-2.5 px-4 rounded-xl bg-[#087F4F] hover:bg-[#06653E] text-white font-semibold text-xs sm:text-sm transition-all flex items-center justify-center gap-2 cursor-pointer shadow-xs active:scale-[0.99]"
              >
                <span>View Full Asset Intelligence</span>
                <ArrowRight className="w-4 h-4 ml-1" />
              </button>

              {/* Secondary Navigation Actions (Preserved for tests & deep workflows) */}
              <div className="pt-1 flex items-center gap-2">
                <button
                  type="button"
                  id="btn-open-inspections"
                  onClick={() => setShowInspectionModal(true)}
                  className="flex-1 py-1.5 px-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium text-[11px] border border-slate-200 transition-colors flex items-center justify-center gap-1 cursor-pointer"
                  title={t('registry.viewRecordInspections', 'View & Record Inspections')}
                >
                  <ClipboardList className="w-3 h-3 text-emerald-700" />
                  <span>{t('registry.inspectionHistoryAndVerification', 'Inspection History & Verification')}</span>
                </button>
                <button
                  type="button"
                  onClick={() => onNavigate && onNavigate('heartbeat')}
                  className="py-1.5 px-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium text-[11px] border border-slate-200 transition-colors flex items-center gap-1 cursor-pointer"
                  title={t('registry.openFullHeartbeat', 'Open Full Heartbeat')}
                >
                  <Activity className="w-3 h-3 text-emerald-700" />
                  <span className="hidden sm:inline">{t('registry.openFullHeartbeat', 'Heartbeat')}</span>
                </button>
                <button
                  type="button"
                  onClick={() => onNavigate && onNavigate('map')}
                  className="py-1.5 px-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium text-[11px] border border-slate-200 transition-colors flex items-center gap-1 cursor-pointer"
                  title={t('registry.locateOnMapTooltip', 'Locate on GIS Map')}
                >
                  <MapPin className="w-3 h-3 text-emerald-700" />
                  <span>{t('registry.map', 'Map')}</span>
                </button>
              </div>
            </>
          ) : (
            <div className="p-8 text-center space-y-2">
              <Layers className="w-8 h-8 text-slate-300 mx-auto" />
              <p className="text-xs font-semibold text-slate-600">No Asset Selected</p>
              <p className="text-[11px] text-slate-400">
                Select an infrastructure asset from the table to preview its intelligence profile.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* 6. Asset Registration Modal (Admin / Demo Protected) */}
      {showRegisterModal && (isAdmin || isDemo) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-2xl w-full p-6 shadow-2xl space-y-4 my-8 relative">
            {/* Modal Header */}
            <div className="flex items-start justify-between border-b border-slate-200 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700">
                  <PlusCircle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    {isDemo
                      ? t('registry.registerModalTitleDemo', 'Register Infrastructure Asset (Demo)')
                      : t('registry.registerModalTitle', 'Register Infrastructure Asset')}
                  </h3>
                  <p className="text-xs text-slate-500">
                    {t(
                      'registry.registerModalDesc',
                      'Add a verified public infrastructure entity to the AAYAM intelligence registry.'
                    )}
                  </p>
                </div>
              </div>
              <button
                id="btn-close-modal"
                type="button"
                onClick={() => {
                  if (!submitting) {
                    setShowRegisterModal(false);
                    setFormError(null);
                    setFormSuccess(null);
                  }
                }}
                disabled={submitting}
                className="text-slate-400 hover:text-slate-700 p-1 rounded-md hover:bg-slate-100 transition-colors disabled:opacity-50 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Success Alert */}
            {formSuccess && (
              <div
                id="banner-registration-success"
                className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2.5 animate-fadeIn"
              >
                <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
                <span className="font-medium">{formSuccess}</span>
              </div>
            )}

            {/* Error Alert */}
            {formError && (
              <div
                id="banner-registration-error"
                className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs flex items-center gap-2.5 animate-fadeIn"
              >
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                <span className="font-medium">{formError}</span>
              </div>
            )}

            {/* Registration Form */}
            <form onSubmit={handleRegisterSubmit} className="space-y-4 text-xs">
              {/* Row 1: Asset ID & Name */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-700 font-semibold block mb-1">
                    {t('registry.assetId', 'Asset ID')} <span className="text-red-600">*</span>
                  </label>
                  <input
                    id="input-asset-id"
                    type="text"
                    required
                    disabled={submitting}
                    value={formData.id}
                    onChange={(e) => handleInputChange('id', e.target.value)}
                    placeholder={t('registry.assetIdPlaceholder', 'e.g. ASSET-BRG-010')}
                    className="w-full bg-white border border-slate-300 rounded-lg p-2.5 text-slate-900 font-mono placeholder-slate-400 focus:outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-500 transition-colors disabled:opacity-50"
                  />
                  <span className="text-[10px] text-slate-500 mt-0.5 block">
                    {t('registry.assetIdHint', 'Unique official identifier (e.g. ASSET-BRG-010)')}
                  </span>
                </div>
                <div>
                  <label className="text-slate-700 font-semibold block mb-1">
                    {t('dashboard.assetName', 'Asset Name')} <span className="text-red-600">*</span>
                  </label>
                  <input
                    id="input-asset-name"
                    type="text"
                    required
                    disabled={submitting}
                    value={formData.name}
                    onChange={(e) => handleInputChange('name', e.target.value)}
                    placeholder={t('registry.assetNamePlaceholder', 'e.g. Narmada Cable-Stayed Bridge')}
                    className="w-full bg-white border border-slate-300 rounded-lg p-2.5 text-slate-900 placeholder-slate-400 focus:outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-500 transition-colors disabled:opacity-50"
                  />
                  <span className="text-[10px] text-slate-500 mt-0.5 block">
                    {t('registry.assetNameHint', 'Full descriptive name of structural facility')}
                  </span>
                </div>
              </div>

              {/* Row 2: Category & Operating Status */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-700 font-semibold block mb-1">
                    {t('common.category', 'Category')} <span className="text-red-600">*</span>
                  </label>
                  <select
                    id="select-asset-category"
                    required
                    disabled={submitting}
                    value={formData.category}
                    onChange={(e) => handleInputChange('category', e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-lg p-2.5 text-slate-900 focus:outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-500 transition-colors cursor-pointer disabled:opacity-50"
                  >
                    {[
                      'Bridge',
                      'Water Treatment Plant',
                      'Culvert',
                      'Canal',
                      'Power Substation',
                      'Drainage',
                      'Health Infrastructure',
                      'Flyover',
                      'Highways & Expressways',
                    ].map((cat) => (
                      <option key={cat} value={cat} className="bg-white text-slate-900">
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-slate-700 font-semibold block mb-1">
                    {t('registry.operationalStatus', 'Operational Status')} <span className="text-red-600">*</span>
                  </label>
                  <select
                    id="select-asset-status"
                    required
                    disabled={submitting}
                    value={formData.status}
                    onChange={(e) => handleInputChange('status', e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-lg p-2.5 text-slate-900 focus:outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-500 transition-colors cursor-pointer disabled:opacity-50"
                  >
                    <option value="Operational" className="bg-white text-slate-900">
                      {t('registry.statusOperationalNormal', 'Operational (Normal)')}
                    </option>
                    <option value="Requires Inspection" className="bg-white text-slate-900">
                      {t('status.requiresInspection', 'Requires Inspection')}
                    </option>
                    <option value="Critical Attention" className="bg-white text-slate-900">
                      {t('status.criticalAttention', 'Critical Attention')}
                    </option>
                  </select>
                </div>
              </div>

              {/* Row 3: District & State */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-700 font-semibold block mb-1">
                    {t('common.district', 'District')} <span className="text-red-600">*</span>
                  </label>
                  <input
                    id="input-asset-district"
                    type="text"
                    required
                    disabled={submitting}
                    value={formData.district}
                    onChange={(e) => handleInputChange('district', e.target.value)}
                    placeholder={t('registry.districtPlaceholder', 'e.g. Bharuch')}
                    className="w-full bg-white border border-slate-300 rounded-lg p-2.5 text-slate-900 placeholder-slate-400 focus:outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-500 transition-colors disabled:opacity-50"
                  />
                </div>
                <div>
                  <label className="text-slate-700 font-semibold block mb-1">
                    {t('common.state', 'State')} <span className="text-red-600">*</span>
                  </label>
                  <input
                    id="input-asset-state"
                    type="text"
                    required
                    disabled={submitting}
                    value={formData.state}
                    onChange={(e) => handleInputChange('state', e.target.value)}
                    placeholder={t('registry.statePlaceholder', 'e.g. Gujarat')}
                    className="w-full bg-white border border-slate-300 rounded-lg p-2.5 text-slate-900 placeholder-slate-400 focus:outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-500 transition-colors disabled:opacity-50"
                  />
                </div>
              </div>

              {/* Row 4: Latitude & Longitude */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-700 font-semibold block mb-1">
                    {t('registry.latitude', 'Latitude (°N)')} <span className="text-red-600">*</span>
                  </label>
                  <input
                    id="input-asset-latitude"
                    type="number"
                    step="any"
                    required
                    disabled={submitting}
                    value={formData.latitude}
                    onChange={(e) => handleInputChange('latitude', e.target.value)}
                    placeholder={t('registry.latPlaceholder', 'e.g. 21.7051')}
                    className="w-full bg-white border border-slate-300 rounded-lg p-2.5 text-slate-900 font-mono placeholder-slate-400 focus:outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-500 transition-colors disabled:opacity-50"
                  />
                  <span className="text-[10px] text-slate-500 mt-0.5 block">
                    {t('registry.latHint', 'Decimal degrees (-90.0 to 90.0)')}
                  </span>
                </div>
                <div>
                  <label className="text-slate-700 font-semibold block mb-1">
                    {t('registry.longitude', 'Longitude (°E)')} <span className="text-red-600">*</span>
                  </label>
                  <input
                    id="input-asset-longitude"
                    type="number"
                    step="any"
                    required
                    disabled={submitting}
                    value={formData.longitude}
                    onChange={(e) => handleInputChange('longitude', e.target.value)}
                    placeholder={t('registry.lngPlaceholder', 'e.g. 72.9959')}
                    className="w-full bg-white border border-slate-300 rounded-lg p-2.5 text-slate-900 font-mono placeholder-slate-400 focus:outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-500 transition-colors disabled:opacity-50"
                  />
                  <span className="text-[10px] text-slate-500 mt-0.5 block">
                    {t('registry.lngHint', 'Decimal degrees (-180.0 to 180.0)')}
                  </span>
                </div>
              </div>

              {/* Row 5: Construction Year & Last Inspection Date */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-700 font-semibold block mb-1">
                    {t('registry.constructionYearOptional', 'Construction Year (Optional)')}
                  </label>
                  <input
                    id="input-asset-year"
                    type="number"
                    disabled={submitting}
                    value={formData.construction_year}
                    onChange={(e) => handleInputChange('construction_year', e.target.value)}
                    placeholder={t('registry.yearPlaceholder', 'e.g. 2017')}
                    className="w-full bg-white border border-slate-300 rounded-lg p-2.5 text-slate-900 font-mono placeholder-slate-400 focus:outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-500 transition-colors disabled:opacity-50"
                  />
                </div>
                <div>
                  <label className="text-slate-700 font-semibold block mb-1">
                    {t('registry.lastInspectionDateOptional', 'Last Inspection Date (Optional)')}
                  </label>
                  <input
                    id="input-asset-last-inspection"
                    type="date"
                    disabled={submitting}
                    value={formData.last_inspection_date}
                    onChange={(e) => handleInputChange('last_inspection_date', e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-lg p-2.5 text-slate-900 font-mono focus:outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-500 transition-colors disabled:opacity-50"
                  />
                </div>
              </div>

              {/* Row 6: Risk Score & Health Index */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-slate-700 font-semibold">
                      {t('registry.initialRiskScore', 'Initial Risk Score (0 - 100)')}
                    </label>
                    <span className="font-mono text-emerald-700 font-bold">
                      {formData.risk_score} ({formData.risk_level})
                    </span>
                  </div>
                  <input
                    id="input-asset-risk-score"
                    type="number"
                    min="0"
                    max="100"
                    step="0.5"
                    disabled={submitting}
                    value={formData.risk_score}
                    onChange={(e) => handleInputChange('risk_score', e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-lg p-2.5 text-slate-900 font-mono focus:outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-500 transition-colors disabled:opacity-50"
                  />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-slate-700 font-semibold">
                      {t('registry.structuralHealthIndex', 'Structural Health Index (0 - 100%)')}
                    </label>
                    <span className="font-mono text-emerald-700 font-bold">
                      {formData.health_index}%
                    </span>
                  </div>
                  <input
                    id="input-asset-health-index"
                    type="number"
                    min="0"
                    max="100"
                    step="0.5"
                    disabled={submitting}
                    value={formData.health_index}
                    onChange={(e) => handleInputChange('health_index', e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-lg p-2.5 text-slate-900 font-mono focus:outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-500 transition-colors disabled:opacity-50"
                  />
                </div>
              </div>

              {/* Row 7: Flagged Risk Triggers */}
              <div>
                <label className="text-slate-700 font-semibold block mb-1">
                  {t('registry.identifiedRiskTriggers', 'Identified Risk Triggers & Defect Flags')}
                </label>
                <textarea
                  id="textarea-asset-flagged-reasons"
                  rows="2"
                  disabled={submitting}
                  value={formData.flagged_reasons}
                  onChange={(e) => handleInputChange('flagged_reasons', e.target.value)}
                  placeholder={t(
                    'registry.flaggedReasonsPlaceholder',
                    'e.g. Sub-surface scour detected; Bearing pad wear; High vibration anomaly (separate multiple flags with semicolons or newlines)'
                  )}
                  className="w-full bg-white border border-slate-300 rounded-lg p-2.5 text-slate-900 placeholder-slate-400 focus:outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-500 transition-colors disabled:opacity-50"
                />
              </div>

              {/* Row 8: Description */}
              <div>
                <label className="text-slate-700 font-semibold block mb-1">
                  {t('registry.engineeringContextDesc', 'Engineering Context & Physical Description')}
                </label>
                <textarea
                  id="textarea-asset-description"
                  rows="2"
                  disabled={submitting}
                  value={formData.description}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  placeholder={t(
                    'registry.descriptionPlaceholder',
                    'e.g. Major arterial transit crossing with heavy container traffic. Sub-surface foundations exposed to seasonal monsoon scour.'
                  )}
                  className="w-full bg-white border border-slate-300 rounded-lg p-2.5 text-slate-900 placeholder-slate-400 focus:outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-500 transition-colors disabled:opacity-50"
                />
              </div>

              {/* Modal Actions */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
                <button
                  id="btn-cancel-registration"
                  type="button"
                  disabled={submitting}
                  onClick={() => {
                    setShowRegisterModal(false);
                    setFormError(null);
                    setFormSuccess(null);
                  }}
                  className="px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs transition-colors disabled:opacity-50 cursor-pointer"
                >
                  {t('common.cancel', 'Cancel')}
                </button>
                <button
                  id="btn-submit-registration"
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 rounded-lg bg-[#087F4F] hover:bg-[#06653E] text-white font-semibold text-xs flex items-center gap-2 transition-colors shadow-2xs disabled:opacity-50 cursor-pointer"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>{t('registry.registeringAsset', 'Registering Asset...')}</span>
                    </>
                  ) : (
                    <>
                      <PlusCircle className="w-3.5 h-3.5" />
                      <span>{t('registry.registerAsset', 'Register Asset')}</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 7. Inspection History & Verification Modal */}
      {(selectedAsset || activeAsset) && (
        <InspectionHistoryModal
          isOpen={showInspectionModal}
          onClose={() => setShowInspectionModal(false)}
          asset={selectedAsset || activeAsset}
          isAdmin={isAdmin}
          isDemo={isDemo}
          onAssetUpdated={(updatedAsset) => {
            if (typeof onSelectAsset === 'function') {
              onSelectAsset(updatedAsset);
            }
          }}
          onRefreshGlobal={() => {
            if (onRefresh) onRefresh();
          }}
        />
      )}
    </div>
  );
}
