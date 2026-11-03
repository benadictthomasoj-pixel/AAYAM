import React, { useState, useEffect, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import {
  MapPin,
  Info,
  Activity,
  Layers,
  Search,
  ExternalLink,
  ChevronRight,
  Filter,
  AlertOctagon,
  ClipboardCheck,
  CheckCircle2,
  ArrowRight,
  RotateCcw,
  X,
  ShieldAlert,
} from 'lucide-react';
import StatusBadge from '../components/StatusBadge';
import { useLanguage } from '../context/LanguageContext';
import {
  getAssetHeroImage,
  getAssetThumbnail,
} from '../utils/assetImages';

// Helper to create clean custom HTML pin markers for Leaflet with exact theme colors
function createMarkerIcon(status, isSelected = false) {
  let color = '#169B62'; // Operational: Green
  let glowColor = 'rgba(22, 155, 98, 0.45)';

  if (status === 'Critical Attention' || status === 'Critical') {
    color = '#E54848'; // Critical Attention: Red
    glowColor = 'rgba(229, 72, 72, 0.65)';
  } else if (
    status === 'Requires Inspection' ||
    status === 'High Risk' ||
    status === 'Moderate' ||
    status === 'Inspection Due'
  ) {
    color = '#E9A23B'; // Requires Inspection: Amber
    glowColor = 'rgba(233, 162, 59, 0.55)';
  }

  const size = isSelected ? 30 : 22;
  const innerDot = isSelected ? 10 : 7;
  const borderWidth = isSelected ? 3.5 : 2;

  return L.divIcon({
    className: 'custom-pin-marker',
    html: `
      <div style="
        width: ${size}px;
        height: ${size}px;
        background-color: ${color};
        border: ${borderWidth}px solid #ffffff;
        border-radius: 50%;
        box-shadow: 0 0 ${isSelected ? '16px 3px' : '8px 1px'} ${glowColor}, 0 2px 6px rgba(0,0,0,0.45);
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
        transform: ${isSelected ? 'scale(1.15)' : 'scale(1)'};
      ">
        <div style="width: ${innerDot}px; height: ${innerDot}px; background-color: #ffffff; border-radius: 50%;"></div>
      </div>
    `,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    popupAnchor: [0, -size / 2 - 4],
  });
}

// Controller component to smoothly center or fit bounds
function MapController({ assets, selectedAsset, resetCounter }) {
  const map = useMap();

  useEffect(() => {
    // Invalidate map size to handle container resizes correctly
    const timer1 = setTimeout(() => {
      map.invalidateSize();
    }, 150);
    const timer2 = setTimeout(() => {
      map.invalidateSize();
    }, 450);

    const handleWindowResize = () => {
      map.invalidateSize();
    };
    window.addEventListener('resize', handleWindowResize);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      window.removeEventListener('resize', handleWindowResize);
    };
  }, [map]);

  // Handle fitBounds on reset button click or initial mount
  useEffect(() => {
    if (assets && assets.length > 0) {
      const validPoints = assets
        .filter((a) => typeof a.latitude === 'number' && typeof a.longitude === 'number')
        .map((a) => [a.latitude, a.longitude]);
      if (validPoints.length > 0) {
        const bounds = L.latLngBounds(validPoints);
        map.fitBounds(bounds, { padding: [45, 45], maxZoom: 8 });
      }
    }
  }, [resetCounter, map]);

  // Smoothly pan to the selected asset when it changes
  useEffect(() => {
    if (
      selectedAsset &&
      typeof selectedAsset.latitude === 'number' &&
      typeof selectedAsset.longitude === 'number'
    ) {
      map.flyTo([selectedAsset.latitude, selectedAsset.longitude], 9, {
        duration: 1.0,
      });
    }
  }, [selectedAsset, map]);

  return null;
}

export default function MapViewPlaceholder({
  assets = [],
  loading = false,
  error = null,
  selectedAsset,
  onSelectAsset,
  onNavigate,
  isDemo = false,
}) {
  const { t } = useLanguage();
  const [statusFilter, setStatusFilter] = useState('All');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [tileError, setTileError] = useState(false);
  const [resetCounter, setResetCounter] = useState(0);

  // Default center roughly on central India
  const defaultCenter = [21.5, 78.9629];
  const defaultZoom = 5;

  // Derive unique categories from assets
  const availableCategories = useMemo(() => {
    const set = new Set();
    assets.forEach((a) => {
      if (a.category) set.add(a.category);
    });
    return ['All', ...Array.from(set)];
  }, [assets]);

  // Real-time filtering
  const filteredAssets = useMemo(() => {
    return assets.filter((asset) => {
      const matchesStatus =
        statusFilter === 'All'
          ? true
          : statusFilter === 'Critical'
          ? asset.status === 'Critical Attention' || asset.risk_level === 'Critical'
          : statusFilter === 'Inspection'
          ? asset.status === 'Requires Inspection' ||
            asset.risk_level === 'High' ||
            asset.risk_level === 'Moderate'
          : statusFilter === 'Operational'
          ? asset.status === 'Operational' || asset.risk_level === 'Low'
          : true;

      const matchesCategory =
        categoryFilter === 'All' ? true : asset.category === categoryFilter;

      const q = searchQuery.trim().toLowerCase();
      const matchesSearch =
        !q ||
        (asset.name && asset.name.toLowerCase().includes(q)) ||
        (asset.id && asset.id.toLowerCase().includes(q)) ||
        (asset.district && asset.district.toLowerCase().includes(q)) ||
        (asset.state && asset.state.toLowerCase().includes(q)) ||
        (asset.category && asset.category.toLowerCase().includes(q));

      return matchesStatus && matchesCategory && matchesSearch;
    });
  }, [assets, statusFilter, categoryFilter, searchQuery]);

  // Local active asset selection (updates on pin click or external prop change)
  const [activeAssetId, setActiveAssetId] = useState(
    selectedAsset?.id || (assets[0] ? assets[0].id : null)
  );

  useEffect(() => {
    if (selectedAsset?.id) {
      setActiveAssetId(selectedAsset.id);
    }
  }, [selectedAsset]);

  // Determine active asset object
  const activeAsset = useMemo(() => {
    if (activeAssetId) {
      const foundInFiltered = filteredAssets.find((a) => a.id === activeAssetId);
      if (foundInFiltered) return foundInFiltered;
      const foundInAll = assets.find((a) => a.id === activeAssetId);
      if (foundInAll) return foundInAll;
    }
    // Default to first high-risk asset or first visible asset
    const highRisk = filteredAssets.find(
      (a) => a.status === 'Critical Attention' || a.risk_level === 'Critical'
    );
    return highRisk || filteredAssets[0] || null;
  }, [activeAssetId, filteredAssets, assets]);

  // Aggregate counts
  const totalCount = assets.length;
  const criticalCount = assets.filter(
    (a) => a.status === 'Critical Attention' || a.risk_level === 'Critical'
  ).length;
  const inspectionCount = assets.filter(
    (a) =>
      a.status === 'Requires Inspection' ||
      a.risk_level === 'High' ||
      a.risk_level === 'Moderate'
  ).length;
  const operationalCount = assets.filter(
    (a) => a.status === 'Operational' || a.risk_level === 'Low'
  ).length;

  // Filtered dataset counts for quick summary
  const filteredCriticalCount = filteredAssets.filter(
    (a) => a.status === 'Critical Attention' || a.risk_level === 'Critical'
  ).length;
  const filteredInspectionCount = filteredAssets.filter(
    (a) =>
      a.status === 'Requires Inspection' ||
      a.risk_level === 'High' ||
      a.risk_level === 'Moderate'
  ).length;
  const filteredOperationalCount = filteredAssets.filter(
    (a) => a.status === 'Operational' || a.risk_level === 'Low'
  ).length;

  const hasActiveFilters =
    statusFilter !== 'All' || categoryFilter !== 'All' || searchQuery.trim() !== '';

  const handleResetFilters = () => {
    setStatusFilter('All');
    setCategoryFilter('All');
    setSearchQuery('');
  };

  const handleResetMapView = () => {
    setResetCounter((prev) => prev + 1);
  };

  return (
    <div className="space-y-4 flex flex-col pb-6">
      {/* 1. Compact Page Heading and Summary Bar */}
      <div className="p-3.5 sm:p-4 rounded-xl bg-white border border-slate-200/90 shadow-xs flex flex-col lg:flex-row items-start lg:items-center justify-between gap-3 shrink-0">
        <div className="space-y-0.5">
          <div className="flex items-center gap-2 flex-wrap">
            <div className="p-1 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200/80">
              <MapPin className="w-4 h-4" />
            </div>
            <h1 className="text-sm sm:text-base font-bold text-slate-900 tracking-tight">
              Geospatial Intelligence
            </h1>
            <span className="text-xs text-slate-300 font-mono hidden sm:inline">|</span>
            <span className="text-xs font-semibold text-slate-700">
              {t('map.mapTitle', 'Geospatial Infrastructure Intelligence Map')}
            </span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200/80 font-semibold">
              {t('map.osmBasemap', 'OpenStreetMap Basemap')}
            </span>
          </div>
          <p className="text-xs text-slate-500">
            Explore infrastructure assets, location-based risks, and inspection priorities. &bull;{' '}
            {t('map.monitoringCount', 'Monitoring {count} registered public infrastructure assets across Indian states', { count: totalCount })}
          </p>
        </div>

        {/* Dynamic Summary Counters */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 w-full lg:w-auto shrink-0">
          <div className="px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200/90 shadow-xs flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-slate-400 shrink-0" />
            <div>
              <p className="text-[10px] text-slate-500 font-medium uppercase tracking-wider">Visible</p>
              <p className="text-xs font-bold text-slate-800">{filteredAssets.length} / {totalCount}</p>
            </div>
          </div>
          <div className="px-3 py-1.5 rounded-lg bg-red-50/70 border border-red-200/80 shadow-xs flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#E54848] shrink-0" />
            <div>
              <p className="text-[10px] text-red-600 font-medium uppercase tracking-wider">Critical</p>
              <p className="text-xs font-bold text-red-700">{filteredCriticalCount}</p>
            </div>
          </div>
          <div className="px-3 py-1.5 rounded-lg bg-amber-50/70 border border-amber-200/80 shadow-xs flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#E9A23B] shrink-0" />
            <div>
              <p className="text-[10px] text-amber-700 font-medium uppercase tracking-wider">Inspect Due</p>
              <p className="text-xs font-bold text-amber-800">{filteredInspectionCount}</p>
            </div>
          </div>
          <div className="px-3 py-1.5 rounded-lg bg-emerald-50/70 border border-emerald-200/80 shadow-xs flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#169B62] shrink-0" />
            <div>
              <p className="text-[10px] text-emerald-700 font-medium uppercase tracking-wider">Operational</p>
              <p className="text-xs font-bold text-emerald-800">{filteredOperationalCount}</p>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Compact Filter Toolbar */}
      <div className="p-3 rounded-xl bg-white border border-slate-200/90 shadow-xs flex flex-wrap items-center justify-between gap-2.5 shrink-0">
        <div className="flex flex-wrap items-center gap-2 flex-1 min-w-[280px]">
          {/* Quick Search */}
          <div className="relative flex-1 sm:w-60 min-w-[180px]">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t('map.searchMapPlaceholder', 'Search map assets...')}
              className="w-full pl-8 pr-7 py-1.5 bg-white border border-slate-300 rounded-lg text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-500"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
                title="Clear search"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          {/* Category Dropdown */}
          <div className="flex items-center gap-1.5">
            <Filter className="w-3.5 h-3.5 text-slate-400 hidden sm:inline" />
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="py-1.5 px-2.5 bg-white border border-slate-300 rounded-lg text-xs text-slate-700 font-medium focus:outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-500"
            >
              {availableCategories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat === 'All' ? 'All Categories' : cat}
                </option>
              ))}
            </select>
          </div>

          {/* Risk Status Filter Pills */}
          <div className="flex items-center gap-1 bg-slate-50 p-1 rounded-lg border border-slate-300/80 text-xs flex-wrap">
            <button
              type="button"
              onClick={() => setStatusFilter('All')}
              className={`px-2.5 py-1 rounded text-[11px] font-medium transition-colors cursor-pointer ${
                statusFilter === 'All'
                  ? 'bg-white text-slate-900 font-bold shadow-xs border border-slate-200'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {t('map.filterAll', 'All ({count})', { count: assets.length })}
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('Critical')}
              className={`px-2.5 py-1 rounded text-[11px] font-medium flex items-center gap-1 transition-colors cursor-pointer ${
                statusFilter === 'Critical'
                  ? 'bg-red-50 text-red-700 border border-red-200 font-bold'
                  : 'text-red-700 hover:bg-red-50/50'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-[#E54848]" />
              <span>{t('map.filterCritical', 'Critical ({count})', { count: criticalCount })}</span>
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('Inspection')}
              className={`px-2.5 py-1 rounded text-[11px] font-medium flex items-center gap-1 transition-colors cursor-pointer ${
                statusFilter === 'Inspection'
                  ? 'bg-amber-50 text-amber-800 border border-amber-200 font-bold'
                  : 'text-amber-800 hover:bg-amber-50/50'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-[#E9A23B]" />
              <span>{t('map.filterInspection', 'Inspection ({count})', { count: inspectionCount })}</span>
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('Operational')}
              className={`px-2.5 py-1 rounded text-[11px] font-medium flex items-center gap-1 transition-colors cursor-pointer ${
                statusFilter === 'Operational'
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold'
                  : 'text-emerald-700 hover:bg-emerald-50/50'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-[#169B62]" />
              <span>{t('map.filterOperational', 'Operational ({count})', { count: operationalCount })}</span>
            </button>
          </div>
        </div>

        {/* Action Controls & Reset View */}
        <div className="flex items-center gap-2">
          {hasActiveFilters && (
            <button
              type="button"
              onClick={handleResetFilters}
              className="text-xs text-slate-500 hover:text-slate-800 underline flex items-center gap-1 cursor-pointer"
            >
              <X className="w-3 h-3" />
              <span>Reset Filters</span>
            </button>
          )}

          <button
            type="button"
            onClick={handleResetMapView}
            className="px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300/80 font-medium text-xs transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
            title="Fit view to visible assets"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset View</span>
          </button>
        </div>
      </div>

      {/* 3. Main Split View: Map (68%) & Asset Info Panel (32%) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 flex-1 items-start">
        {/* Interactive Infrastructure Map (Desktop ~68%) */}
        <div className="lg:col-span-8 flex flex-col rounded-xl overflow-hidden border border-slate-200/90 shadow-xs relative min-h-[460px] sm:min-h-[520px] lg:min-h-[640px] xl:min-h-[700px] h-[520px] sm:h-[580px] lg:h-[660px] xl:h-[720px] bg-slate-100">
          {loading ? (
            <div className="absolute inset-0 bg-slate-50 flex flex-col items-center justify-center space-y-3 z-[1000]">
              <div className="w-10 h-10 border-3 border-emerald-600 border-t-transparent rounded-full animate-spin" />
              <p className="text-xs text-slate-500">
                {t('map.loadingTelemetry', 'Loading geospatial asset telemetry...')}
              </p>
            </div>
          ) : error ? (
            <div className="absolute inset-0 bg-slate-50 flex flex-col items-center justify-center p-6 text-center space-y-2 z-[1000]">
              <p className="text-sm font-bold text-red-600">
                {t('map.errorTitle', 'Map Loading Error')}
              </p>
              <p className="text-xs text-slate-500 font-mono">{error}</p>
            </div>
          ) : (
            <MapContainer
              center={defaultCenter}
              zoom={defaultZoom}
              scrollWheelZoom={true}
              style={{ height: '100%', width: '100%', background: '#F8FAFC' }}
            >
              {/* Standard OpenStreetMap Tile Layer (Free, Permitted, No API Key Required) */}
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a> contributors'
                url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
                maxZoom={19}
                eventHandlers={{
                  tileerror: () => setTileError(true),
                }}
              />

              {/* Offline / Tile Error Banner */}
              {tileError && (
                <div
                  data-testid="tile-fallback-notice"
                  className="absolute top-4 right-4 z-[1000] p-3 rounded-lg bg-white/95 border border-amber-300 text-amber-900 text-xs flex items-center gap-2 max-w-sm shadow-xl backdrop-blur"
                >
                  <AlertOctagon className="w-4 h-4 shrink-0 text-amber-600" />
                  <span>
                    {t(
                      'map.tileFallbackNotice',
                      'Map tile service is currently unreachable. Displaying plotted demo asset coordinates on the vector grid fallback.'
                    )}
                  </span>
                </div>
              )}

              {/* Controller for smooth recentering and bounds fitting */}
              <MapController
                assets={filteredAssets}
                selectedAsset={activeAsset}
                resetCounter={resetCounter}
              />

              {/* Plotted Asset Markers */}
              {filteredAssets.map((asset) => {
                const isSelected = activeAsset?.id === asset.id;
                return (
                  <Marker
                    key={asset.id}
                    position={[asset.latitude, asset.longitude]}
                    icon={createMarkerIcon(asset.status, isSelected)}
                    eventHandlers={{
                      click: () => {
                        setActiveAssetId(asset.id);
                      },
                    }}
                  >
                    <Popup className="custom-popup" closeButton={true}>
                      <div className="p-1 space-y-2 text-xs min-w-[240px]">
                        {/* Popup Header */}
                        <div className="flex items-start justify-between gap-2 border-b border-slate-200 pb-1.5">
                          <div>
                            <span className="font-mono text-[10px] text-emerald-700 font-bold uppercase block">
                              {asset.id}
                            </span>
                            <h4 className="font-bold text-slate-900 text-sm leading-tight mt-0.5">
                              {asset.name}
                            </h4>
                          </div>
                          <StatusBadge status={asset.status} size="xs" />
                        </div>

                        {/* Location & Metadata */}
                        <div className="space-y-1 text-slate-600 text-[11px]">
                          <p>
                            <strong className="text-slate-500 font-medium">
                              {t('common.category', 'Category')}:
                            </strong>{' '}
                            <span className="text-slate-800">{asset.category}</span>
                          </p>
                          <p>
                            <strong className="text-slate-500 font-medium">
                              {t('common.location', 'Location')}:
                            </strong>{' '}
                            <span className="text-slate-800">
                              {asset.district}, {asset.state}
                            </span>
                          </p>
                          <p>
                            <strong className="text-slate-500 font-medium">
                              {t('map.gps', 'GPS:')}
                            </strong>{' '}
                            <span className="font-mono text-slate-800">
                              {asset.latitude.toFixed(4)}°N, {asset.longitude.toFixed(4)}°E
                            </span>
                          </p>
                          <p>
                            <strong className="text-slate-500 font-medium">
                              {t('dashboard.riskScore', 'Risk Score')}:
                            </strong>{' '}
                            <span
                              className={`font-mono font-bold ${
                                asset.risk_score >= 80
                                  ? 'text-red-700'
                                  : asset.risk_score >= 50
                                  ? 'text-amber-700'
                                  : 'text-emerald-700'
                              }`}
                            >
                              {asset.risk_score} / 100
                            </span>{' '}
                            &bull; <span className="text-slate-500">{t('map.health', 'Health:')}</span>{' '}
                            <span className="font-mono text-slate-800">{asset.health_index}%</span>
                          </p>
                        </div>

                        {/* Flagged Triggers Preview */}
                        {asset.flagged_reasons && asset.flagged_reasons.length > 0 && (
                          <div className="p-1.5 rounded bg-red-50 border border-red-200 text-[10px] text-red-800 leading-tight">
                            <strong className="text-red-900">{t('map.activeFlag', 'Active Flag:')}</strong>{' '}
                            {asset.flagged_reasons[0]}
                          </div>
                        )}

                        {/* Action Links */}
                        <div className="pt-2 flex items-center gap-1.5 border-t border-slate-200">
                          <button
                            type="button"
                            onClick={() => {
                              setActiveAssetId(asset.id);
                              if (onNavigate) onNavigate('heartbeat');
                            }}
                            className="flex-1 py-1.5 px-2 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white font-semibold text-[11px] transition-colors flex items-center justify-center gap-1 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 shadow-xs"
                          >
                            <Activity className="w-3 h-3" />
                            <span>{t('map.heartbeat', 'Heartbeat')}</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setActiveAssetId(asset.id);
                              if (onSelectAsset) onSelectAsset(asset);
                            }}
                            className="py-1.5 px-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 font-semibold text-[11px] transition-colors flex items-center gap-1 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
                            title={t('map.viewInRegistry', 'View Asset in Registry')}
                          >
                            <span>{t('map.registry', 'Registry')}</span>
                            <ExternalLink className="w-2.5 h-2.5" />
                          </button>
                        </div>
                      </div>
                    </Popup>
                  </Marker>
                );
              })}
            </MapContainer>
          )}

          {/* Informative Legend & Synthetic Disclaimer Floating Card */}
          <div className="absolute bottom-4 left-4 z-[1000] max-w-sm p-3 rounded-lg bg-white/95 border border-slate-200/90 backdrop-blur text-xs space-y-1.5 shadow-lg">
            <div className="flex items-center justify-between text-emerald-800 font-bold text-[11px]">
              <span className="flex items-center gap-1">
                <Info className="w-3.5 h-3.5 text-emerald-700" />
                <span>
                  {isDemo
                    ? t('demo.gisNotice', 'Simulated Demo GIS Telemetry')
                    : t('map.legendTitle', 'GIS Asset Telemetry Layer')}
                </span>
              </span>
              <span className="text-[10px] font-mono text-slate-500">
                {isDemo
                  ? t('demo.visibleCount', '{count} Demo Visible', { count: filteredAssets.length })
                  : t('map.visibleCount', '{count} Visible', { count: filteredAssets.length })}
              </span>
            </div>
            <p className="text-[11px] text-slate-600 leading-snug">
              {isDemo
                ? t(
                    'map.legendDescDemo',
                    'Displaying 3 synthetic demo assets with isolated simulated coordinates. No live database connection.'
                  )
                : t(
                    'map.legendDescLive',
                    'All markers represent prototype assets plotted on real coordinates across India. Tile service powered by standard OpenStreetMap.'
                  )}
            </p>
            <div className="flex items-center gap-3 pt-1 border-t border-slate-200 text-[10px]">
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-[#E54848]" />
                <span className="text-slate-700">{t('status.critical', 'Critical')}</span>
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-[#E9A23B]" />
                <span className="text-slate-700">{t('dashboard.inspectionDue', 'Inspection Due')}</span>
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-[#169B62]" />
                <span className="text-slate-700">{t('status.operational', 'Operational')}</span>
              </span>
            </div>
          </div>
        </div>

        {/* Compact Asset Information Panel (Desktop ~32%) */}
        <div className="lg:col-span-4 flex flex-col rounded-xl border border-slate-200/90 shadow-xs bg-white overflow-hidden min-h-[460px] lg:h-[660px] xl:h-[720px]">
          {/* Panel Header */}
          <div className="px-4 py-3 border-b border-slate-200 bg-slate-50/70 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-emerald-700" />
              <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                Asset Intelligence Panel
              </h2>
            </div>
            {activeAsset && (
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-100/70 text-emerald-800 font-bold">
                {activeAsset.id}
              </span>
            )}
          </div>

          {activeAsset ? (
            <div className="p-4 flex-1 flex flex-col justify-between overflow-y-auto space-y-4">
              <div className="space-y-4">
                {/* Asset Image Preview Card */}
                <div className="relative rounded-lg overflow-hidden border border-slate-200 bg-slate-100 aspect-video w-full group shadow-2xs">
                  <img
                    src={getAssetHeroImage(activeAsset)}
                    alt={activeAsset.name}
                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                    onError={(e) => {
                      e.target.onerror = null;
                      e.target.src = getAssetHeroImage(activeAsset);
                    }}
                  />
                  <div className="absolute top-2.5 right-2.5">
                    <StatusBadge status={activeAsset.status} size="xs" />
                  </div>
                  <div className="absolute bottom-2.5 left-2.5 px-2 py-0.5 rounded bg-black/65 backdrop-blur text-[10px] font-mono text-white font-medium">
                    {activeAsset.category || 'Infrastructure'}
                  </div>
                </div>

                {/* Name, Category and Location */}
                <div className="space-y-1">
                  <h3 className="font-bold text-slate-900 text-sm sm:text-base leading-snug">
                    {activeAsset.name}
                  </h3>
                  <div className="flex items-center gap-1.5 text-xs text-slate-600">
                    <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span>
                      {activeAsset.district || 'Not available'}, {activeAsset.state || 'Not available'}
                    </span>
                  </div>
                </div>

                {/* GPS Coordinates */}
                <div className="flex items-center justify-between text-xs py-1.5 px-2.5 rounded-lg bg-slate-50 border border-slate-200/90 font-mono">
                  <span className="text-slate-500 font-medium">{t('map.gps', 'GPS:')}</span>
                  <span className="text-slate-800 font-semibold">
                    {typeof activeAsset.latitude === 'number' &&
                    typeof activeAsset.longitude === 'number'
                      ? `${activeAsset.latitude.toFixed(4)}°N, ${activeAsset.longitude.toFixed(4)}°E`
                      : 'Not available'}
                  </span>
                </div>

                {/* Risk Score Indicator */}
                <div className="space-y-1.5 p-3 rounded-lg bg-slate-50/70 border border-slate-200/90">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-600 font-medium">
                      {t('dashboard.riskScore', 'Risk Score')}
                    </span>
                    <span
                      className={`font-mono font-bold ${
                        activeAsset.risk_score >= 80
                          ? 'text-red-700'
                          : activeAsset.risk_score >= 50
                          ? 'text-amber-700'
                          : 'text-emerald-700'
                      }`}
                    >
                      {activeAsset.risk_score ?? 'Not available'}{' '}
                      <span className="text-slate-400 text-[10px]">/ 100</span>
                    </span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-slate-200 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        activeAsset.risk_score >= 80
                          ? 'bg-[#E54848]'
                          : activeAsset.risk_score >= 50
                          ? 'bg-[#E9A23B]'
                          : 'bg-[#169B62]'
                      }`}
                      style={{
                        width: `${Math.min(100, Math.max(5, activeAsset.risk_score || 0))}%`,
                      }}
                    />
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1">
                    <span>
                      Health Index:{' '}
                      <strong className="font-mono text-slate-800">
                        {activeAsset.health_index != null
                          ? `${activeAsset.health_index}%`
                          : 'Not available'}
                      </strong>
                    </span>
                    <span>
                      Level:{' '}
                      <strong className="font-medium text-slate-800">
                        {activeAsset.risk_level || 'Not available'}
                      </strong>
                    </span>
                  </div>
                </div>

                {/* Last Inspection Date */}
                <div className="flex items-center justify-between text-xs text-slate-600 px-1">
                  <span className="text-slate-500 flex items-center gap-1.5">
                    <ClipboardCheck className="w-3.5 h-3.5 text-slate-400" />
                    Last Inspection:
                  </span>
                  <span className="font-medium text-slate-800">
                    {activeAsset.last_inspection_date || 'Not available'}
                  </span>
                </div>

                {/* Main Identified Risk / Flagged Reasons */}
                {activeAsset.flagged_reasons && activeAsset.flagged_reasons.length > 0 ? (
                  <div className="p-2.5 rounded-lg bg-red-50 border border-red-200 text-xs space-y-1">
                    <div className="flex items-center gap-1.5 text-red-800 font-bold text-[11px]">
                      <AlertOctagon className="w-3.5 h-3.5 text-red-600 shrink-0" />
                      <span>{t('map.activeFlag', 'Active Flag:')}</span>
                    </div>
                    <p className="text-red-900 text-[11px] leading-relaxed">
                      {activeAsset.flagged_reasons[0]}
                    </p>
                    {activeAsset.flagged_reasons.length > 1 && (
                      <p className="text-[10px] text-red-600 italic">
                        +{activeAsset.flagged_reasons.length - 1} additional flagged defect(s)
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="p-2.5 rounded-lg bg-emerald-50/70 border border-emerald-200 text-xs flex items-center gap-2 text-emerald-800">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span className="text-[11px]">
                      No active risk triggers flagged. Structural telemetry operating within nominal envelope.
                    </span>
                  </div>
                )}

                {/* Engineering Description Excerpt */}
                {activeAsset.description && (
                  <p className="text-[11px] text-slate-500 leading-relaxed line-clamp-2 px-1">
                    {activeAsset.description}
                  </p>
                )}
              </div>

              {/* Action Buttons */}
              <div className="space-y-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  aria-label="Inspect Asset Heartbeat"
                  onClick={() => {
                    if (onSelectAsset) onSelectAsset(activeAsset);
                    if (onNavigate) onNavigate('heartbeat');
                  }}
                  className="w-full py-2 px-3 rounded-lg bg-[#087F4F] hover:bg-[#06653E] text-white font-semibold text-xs transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-xs focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
                >
                  <Activity className="w-3.5 h-3.5" />
                  <span>Inspect Heartbeat</span>
                  <ArrowRight className="w-3.5 h-3.5 ml-auto" />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (onSelectAsset) onSelectAsset(activeAsset);
                  }}
                  className="w-full py-2 px-3 rounded-lg bg-white hover:bg-emerald-50/50 text-[#087F4F] border border-emerald-600/40 font-semibold text-xs transition-colors flex items-center justify-center gap-2 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
                >
                  <Layers className="w-3.5 h-3.5" />
                  <span>Open Full Intelligence Profile</span>
                  <ExternalLink className="w-3.5 h-3.5 ml-auto" />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (onSelectAsset) onSelectAsset(activeAsset);
                    if (onNavigate) onNavigate('registry');
                  }}
                  className="w-full py-2 px-3 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300/80 font-medium text-xs transition-colors flex items-center justify-center gap-2 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
                >
                  <span>View in Asset Registry</span>
                  <ChevronRight className="w-3.5 h-3.5 ml-auto" />
                </button>
              </div>
            </div>
          ) : (
            <div className="p-8 flex-1 flex flex-col items-center justify-center text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
                <MapPin className="w-6 h-6" />
              </div>
              <p className="text-xs font-semibold text-slate-700">No matching assets found</p>
              <p className="text-[11px] text-slate-500 max-w-xs">
                Try adjusting your search criteria, category selection, or status filters.
              </p>
              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={handleResetFilters}
                  className="text-xs text-emerald-700 font-semibold hover:underline cursor-pointer"
                >
                  Clear Filters
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
