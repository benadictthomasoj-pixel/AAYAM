import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import DemoBanner from './components/DemoBanner';
import LoginScreen from './components/LoginScreen';
import DashboardOverview from './pages/DashboardOverview';
import AssetRegistry from './pages/AssetRegistry';
import MapViewPlaceholder from './pages/MapViewPlaceholder';
import DigitalHeartbeatPlaceholder from './pages/DigitalHeartbeatPlaceholder';
import InspectionsInterventionsPage from './pages/InspectionsInterventionsPage';
import EvidenceLibraryPage from './pages/EvidenceLibraryPage';
import CopilotPlaceholder from './pages/CopilotPlaceholder';
import ReportsHistoryPage from './pages/ReportsHistoryPage';
import AssetIntelligenceProfile from './components/AssetIntelligenceProfile';
import EvidenceViewerModal from './components/EvidenceViewerModal';
import { AuthProvider, useAuth } from './context/AuthContext';
import { LanguageProvider } from './context/LanguageContext';
import { fetchHealth, fetchAssets, fetchAssetStats } from './services/api';
import {
  getDemoAssets,
  getDemoAssetStats,
  getDemoAssetCategories,
} from './demo/demoService';
import { AlertCircle, RefreshCw, Loader2 } from 'lucide-react';

export function DashboardView({ isDemo = false, onExitDemo }) {
  const { user, logout, isAdmin } = useAuth();
  const [currentRoute, setCurrentRoute] = useState('overview');
  const [assets, setAssets] = useState([]);
  const [stats, setStats] = useState(null);
  const [categories, setCategories] = useState([]);
  const [selectedAsset, setSelectedAsset] = useState(null);
  const [healthData, setHealthData] = useState(null);
  const [systemStatus, setSystemStatus] = useState(isDemo ? 'demo' : 'connecting');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [profileAssetId, setProfileAssetId] = useState(null);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [viewerDocName, setViewerDocName] = useState(null);
  const [isViewerOpen, setIsViewerOpen] = useState(false);

  const handleOpenProfile = (assetOrId) => {
    const id = typeof assetOrId === 'object' && assetOrId !== null ? assetOrId.id : assetOrId;
    setProfileAssetId(id);
    setIsProfileOpen(true);
    const matched = assets.find((a) => a.id === id);
    if (matched) setSelectedAsset(matched);
  };

  const handleOpenDocument = (docName) => {
    setViewerDocName(docName);
    setIsViewerOpen(true);
  };

  // Close mobile drawer on Escape key press
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isMobileMenuOpen) {
        setIsMobileMenuOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isMobileMenuOpen]);

  // Automatically close mobile drawer when window is resized to desktop
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768 && isMobileMenuOpen) {
        setIsMobileMenuOpen(false);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [isMobileMenuOpen]);

  const loadData = async () => {
    setLoading(true);
    setError(null);

    if (isDemo) {
      try {
        const [demoAssetsData, demoStatsData, demoCats] = await Promise.all([
          getDemoAssets(),
          getDemoAssetStats(),
          getDemoAssetCategories(),
        ]);
        setAssets(demoAssetsData.items || []);
        setCategories(demoCats || []);
        setStats(demoStatsData);
        if (!selectedAsset && demoAssetsData.items && demoAssetsData.items.length > 0) {
          const highRisk = demoAssetsData.items.find(
            (a) => a.status === 'Critical Attention' || a.risk_level === 'Critical'
          );
          setSelectedAsset(highRisk || demoAssetsData.items[0]);
        }
        setSystemStatus('demo');
      } catch (err) {
        console.error('Demo data initialization failed:', err);
        setError('Failed to load simulated demo assets.');
      } finally {
        setLoading(false);
      }
      return;
    }

    try {
      // 1. Check backend health
      const health = await fetchHealth();
      setHealthData(health);
      setSystemStatus(health.status === 'healthy' ? 'healthy' : 'degraded');

      // 2. Fetch assets list
      const assetsData = await fetchAssets();
      setAssets(assetsData.items || []);
      setCategories(assetsData.categories || []);

      // 3. Fetch summary stats
      try {
        const statsData = await fetchAssetStats();
        setStats(statsData);
      } catch (statsErr) {
        console.warn('Could not load summary stats:', statsErr);
      }

      // If no asset is selected, pick the first flagged or first asset
      if (assetsData.items && assetsData.items.length > 0 && !selectedAsset) {
        const highRisk = assetsData.items.find(
          (a) => a.status === 'Critical Attention' || a.risk_level === 'Critical'
        );
        setSelectedAsset(highRisk || assetsData.items[0]);
      }
    } catch (err) {
      console.error('Data initialization failed:', err);
      setError(
        err.message || 'Unable to connect to AAYAM FastAPI backend on port 8000.'
      );
      setSystemStatus('error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [isDemo]);

  // Route titles and subtitles for header
  const routeMeta = {
    overview: {
      title: 'Intelligence Overview',
      subtitle: 'Real-time telemetry overview, condition health index, and priority investigations',
    },
    map: {
      title: 'Explore Infrastructure',
      subtitle: 'Spatial distribution of monitored assets with risk-coded location pins and GIS telemetry',
    },
    registry: {
      title: 'Public Infrastructure Asset Registry',
      subtitle: 'Searchable master inventory with technical specifications, district mapping, and audit records',
    },
    heartbeat: {
      title: 'Digital Heartbeat Diagnostics',
      subtitle: 'Explainable risk breakdown, degradation indicators, and engineering audit history',
    },
    inspections: {
      title: 'Inspections & Interventions',
      subtitle: 'Field evaluations, civil maintenance tracking, and closed-loop engineering verification',
    },
    evidence: {
      title: 'Evidence & Grounded Research Library',
      subtitle: 'Verified engineering documents, sonar bathymetry surveys, and diagnostic audits',
    },
    copilot: {
      title: 'AI Intelligence Copilot',
      subtitle: 'Grounding conversational queries in verified infrastructure records and citations',
    },
    reports: {
      title: 'Reports & History',
      subtitle: 'Exportable, evidence-grounded reports with verified telemetry and defect citations',
    },
  };

  const currentMeta = routeMeta[currentRoute] || routeMeta.overview;

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-[#F4F8F7] text-[#142B2A] font-sans">
      {/* Persistent Demo Mode Banner */}
      {isDemo && <DemoBanner onExitDemo={onExitDemo} />}

      <div className="flex-1 flex overflow-hidden relative">
        {/* Mobile Navigation Drawer Backdrop */}
        {isMobileMenuOpen && (
          <div
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-40 md:hidden transition-opacity"
            onClick={() => setIsMobileMenuOpen(false)}
            aria-hidden="true"
          />
        )}

        {/* Mobile Navigation Drawer */}
        {isMobileMenuOpen && (
          <div
            id="mobile-sidebar-drawer"
            role="dialog"
            aria-modal="true"
            aria-label="Navigation drawer"
            className="fixed inset-y-0 left-0 z-50 w-72 max-w-[85vw] bg-white border-r border-slate-200 flex flex-col shadow-2xl md:hidden transition-transform duration-200"
          >
            <Sidebar
              currentRoute={currentRoute}
              onRouteChange={(route) => {
                setCurrentRoute(route);
                setIsMobileMenuOpen(false);
              }}
              systemStatus={isDemo ? 'demo' : systemStatus}
              assetCount={assets.length}
              isDemo={isDemo}
              isMobile={true}
              onClose={() => setIsMobileMenuOpen(false)}
            />
          </div>
        )}

        {/* Desktop Fixed Left Navigation Sidebar */}
        <div className="hidden md:flex w-64 h-full shrink-0">
          <Sidebar
            currentRoute={currentRoute}
            onRouteChange={(route) => setCurrentRoute(route)}
            systemStatus={isDemo ? 'demo' : systemStatus}
            assetCount={assets.length}
            isDemo={isDemo}
          />
        </div>

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col h-full overflow-hidden min-w-0">
          {/* Top Header */}
          <Header
            pageTitle={currentMeta.title}
            subtitle={currentMeta.subtitle}
            onRefresh={!isDemo ? loadData : undefined}
            loading={loading}
            healthData={isDemo ? null : healthData}
            user={isDemo ? null : user}
            onLogout={!isDemo ? logout : undefined}
            isAdmin={isDemo ? false : isAdmin}
            isDemo={isDemo}
            onExitDemo={onExitDemo}
            onToggleMobileMenu={() => setIsMobileMenuOpen((prev) => !prev)}
            isMobileMenuOpen={isMobileMenuOpen}
            onSelectAsset={(id) => handleOpenProfile(id)}
            onOpenDocument={handleOpenDocument}
          />

        {/* Scrollable Viewport */}
        <main className="flex-1 overflow-y-auto overflow-x-hidden p-4 sm:p-6 bg-[#F4F8F7] min-w-0">
          {/* Backend Offline Warning Banner if connection failed */}
          {error && (
            <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 flex items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <h4 className="text-sm font-bold text-red-800">
                    Backend Connection Required
                  </h4>
                  <p className="text-xs text-red-700">
                    {error}
                  </p>
                  <p className="text-xs text-slate-500">
                    Run <code className="text-green-700 bg-slate-100 px-1.5 py-0.5 rounded font-mono">cd backend && source venv/bin/activate && uvicorn app.main:app --port 8000</code> to start the FastAPI server.
                  </p>
                </div>
              </div>
              <button
                onClick={loadData}
                disabled={loading}
                className="px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shadow-sm"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                <span>Retry Connection</span>
              </button>
            </div>
          )}

          {/* Render Active Route */}
          {currentRoute === 'overview' && (
            <DashboardOverview
              stats={stats}
              assets={assets}
              loading={loading}
              error={error}
              onNavigate={(route) => setCurrentRoute(route)}
              onSelectAsset={(asset) => handleOpenProfile(asset)}
              isDemo={isDemo}
            />
          )}

          {currentRoute === 'map' && (
            <MapViewPlaceholder
              assets={assets}
              selectedAsset={selectedAsset}
              onSelectAsset={(asset) => handleOpenProfile(asset)}
              onNavigate={(route) => setCurrentRoute(route)}
              isDemo={isDemo}
            />
          )}

          {currentRoute === 'registry' && (
            <AssetRegistry
              assets={assets}
              categories={categories}
              loading={loading}
              error={error}
              selectedAsset={selectedAsset}
              onSelectAsset={(asset) => handleOpenProfile(asset)}
              onNavigate={(route) => setCurrentRoute(route)}
              onRefresh={loadData}
              isAdmin={isAdmin}
              isDemo={isDemo}
            />
          )}

          {currentRoute === 'heartbeat' && (
            <DigitalHeartbeatPlaceholder
              assets={assets}
              selectedAsset={selectedAsset}
              onSelectAsset={(asset) => handleOpenProfile(asset)}
              onNavigate={(route) => setCurrentRoute(route)}
              onRefresh={loadData}
              isAdmin={isAdmin}
              isDemo={isDemo}
            />
          )}

          {currentRoute === 'inspections' && (
            <InspectionsInterventionsPage
              assets={assets}
              selectedAsset={selectedAsset}
              onSelectAsset={(asset) => setSelectedAsset(asset)}
              onOpenProfile={(id) => handleOpenProfile(id)}
              onRefresh={loadData}
              isAdmin={isAdmin}
              isDemo={isDemo}
            />
          )}

          {currentRoute === 'evidence' && (
            <EvidenceLibraryPage
              assets={assets}
              onOpenProfile={(id) => handleOpenProfile(id)}
              onNavigate={(route) => setCurrentRoute(route)}
              isDemo={isDemo}
            />
          )}

          {currentRoute === 'copilot' && (
            <CopilotPlaceholder
              assets={assets}
              onNavigate={(route) => setCurrentRoute(route)}
              onOpenProfile={(id) => handleOpenProfile(id)}
              isDemo={isDemo}
            />
          )}

          {currentRoute === 'reports' && (
            <ReportsHistoryPage
              assets={assets}
              selectedAsset={selectedAsset}
              onSelectAsset={(asset) => setSelectedAsset(asset)}
              onOpenProfile={(id) => handleOpenProfile(id)}
              onOpenDocument={handleOpenDocument}
              isDemo={isDemo}
            />
          )}
        </main>
      </div>

      {/* Complete Infrastructure Intelligence Profile Modal */}
      {isProfileOpen && profileAssetId && (
        <AssetIntelligenceProfile
          assetId={profileAssetId}
          initialAsset={assets.find((a) => a.id === profileAssetId) || selectedAsset}
          isOpen={isProfileOpen}
          onClose={() => setIsProfileOpen(false)}
          onOpenDocument={handleOpenDocument}
          onNavigate={(route) => {
            setCurrentRoute(route);
            setIsProfileOpen(false);
          }}
          isDemo={isDemo}
          isAdmin={isAdmin}
        />
      )}

      {/* Global Grounded Evidence Document Viewer */}
      {isViewerOpen && viewerDocName && (
        <EvidenceViewerModal
          isOpen={isViewerOpen}
          onClose={() => setIsViewerOpen(false)}
          selectedCitationLabel={viewerDocName}
          citations={[viewerDocName]}
          evidence={[
            {
              citation_label: viewerDocName,
              source: viewerDocName,
              document_name: viewerDocName,
              filename: viewerDocName,
              section_title: 'Full Engineering Document Audit',
              page_number: 1,
              excerpt: 'Inspecting primary engineering document.',
              relevance_score: 100,
            },
          ]}
          onNavigate={(route) => {
            setCurrentRoute(route);
            setIsViewerOpen(false);
          }}
          isDemo={isDemo}
        />
      )}
    </div>
  </div>
  );
}

function getIsDemoFromHash() {
  if (typeof window === 'undefined') return false;
  return window.location.hash.toLowerCase() === '#demo';
}

function AppRoot() {
  const { isAuthenticated, loading } = useAuth();
  const [isDemoMode, setIsDemoMode] = useState(() => getIsDemoFromHash());

  useEffect(() => {
    const handleHashChange = () => {
      setIsDemoMode(getIsDemoFromHash());
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const handleEnterDemo = () => {
    setIsDemoMode(true);
    if (window.location.hash !== '#demo') {
      window.location.hash = '#demo';
    }
  };

  const handleExitDemo = () => {
    setIsDemoMode(false);
    if (window.location.hash === '#demo') {
      if (window.history && window.history.replaceState) {
        window.history.replaceState(null, '', window.location.pathname + window.location.search);
      } else {
        window.location.hash = '';
      }
    }
  };

  // Direct access to demo mode does not require waiting for auth session verification
  if (isDemoMode) {
    return <DashboardView isDemo={true} onExitDemo={handleExitDemo} />;
  }

  if (loading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-slate-50 text-slate-600 font-sans">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-2 border-green-600 border-t-transparent rounded-full animate-spin" />
          <span className="text-xs uppercase tracking-widest text-slate-500 font-medium">
            Verifying AAYAM Session...
          </span>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LoginScreen onEnterDemo={handleEnterDemo} />;
  }

  return <DashboardView isDemo={false} />;
}

export default function App() {
  return (
    <LanguageProvider>
      <AuthProvider>
        <AppRoot />
      </AuthProvider>
    </LanguageProvider>
  );
}
