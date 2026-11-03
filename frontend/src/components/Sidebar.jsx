import React from 'react';
import {
  LayoutDashboard,
  Layers,
  MapPin,
  Activity,
  ClipboardCheck,
  Library,
  Bot,
  FileBarChart,
  ExternalLink,
  X,
} from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import aayamHeroLandscape from '../assets/aayam-hero-landscape.png';
import bandraWorliThumbnail from '../assets/bandra-worli-thumbnail.jpg';

export default function Sidebar({
  currentRoute,
  onRouteChange,
  systemStatus,
  assetCount = 0,
  isDemo = false,
  isMobile = false,
  onClose,
}) {
  const { t } = useLanguage();

  const navItems = [
    {
      id: 'overview',
      label: t('nav.overview', 'Dashboard Overview'),
      ariaLabel: 'Intelligence Overview — Dashboard Overview',
      icon: LayoutDashboard,
      badge: null,
    },
    {
      id: 'map',
      label: t('nav.map', 'Geospatial Map'),
      ariaLabel: 'Explore Infrastructure — Geospatial Map',
      icon: MapPin,
      badge: 'GIS',
    },
    {
      id: 'registry',
      label: t('nav.registry', 'Asset Registry'),
      ariaLabel: 'Asset Registry',
      icon: Layers,
      badge: assetCount > 0 ? `${assetCount}` : null,
    },
    {
      id: 'heartbeat',
      label: t('nav.heartbeat', 'Digital Heartbeat'),
      ariaLabel: 'Digital Heartbeat',
      icon: Activity,
      badge: 'Core',
    },
    {
      id: 'inspections',
      label: t('nav.inspections', 'Inspections & Interventions'),
      ariaLabel: 'Inspections & Interventions',
      icon: ClipboardCheck,
      badge: null,
    },
    {
      id: 'evidence',
      label: t('nav.evidence', 'Evidence Library'),
      ariaLabel: 'Evidence Library',
      icon: Library,
      badge: null,
    },
    {
      id: 'copilot',
      label: t('nav.copilot', 'AI Decision Copilot'),
      ariaLabel: 'AI Intelligence Copilot — AI Decision Copilot',
      icon: Bot,
      badge: 'AI',
    },
    {
      id: 'reports',
      label: t('nav.reports', 'Reports & History'),
      ariaLabel: 'Reports & History',
      icon: FileBarChart,
      badge: null,
    },
  ];

  return (
    <aside className="w-full h-full bg-white border-r border-[#E1EBE7] flex flex-col select-none">
      {/* Brand Header */}
      <div className="p-5 border-b border-[#E1EBE7] flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#087F4F] to-[#0F9F91] flex items-center justify-center shadow-md shadow-[#087F4F]/20 shrink-0">
            <Activity className="w-6 h-6 text-white stroke-[2.5]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xl font-black tracking-wider text-[#142B2A]">
                AAYAM
              </span>
              <span className="text-[10px] uppercase font-bold tracking-widest px-1.5 py-0.5 rounded bg-[#E7F8EF] text-[#087F4F] border border-[#087F4F]/20">
                v0.1
              </span>
            </div>
            <p className="text-[11px] font-medium text-[#647775]">
              {t('sidebar.brandTagline', 'Infrastructure Intelligence')}
            </p>
          </div>
        </div>
        {isMobile && onClose && (
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#647775] hover:text-[#142B2A] hover:bg-[#F4F8F7] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#087F4F] cursor-pointer"
            aria-label="Close navigation menu"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 p-3 space-y-1.5 overflow-y-auto">
        <div className="px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-[#647775]">
          {t('sidebar.intelligenceModules', 'Intelligence Modules')}
        </div>
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentRoute === item.id;
          return (
            <button
              key={item.id}
              aria-label={item.ariaLabel || item.label}
              onClick={() => {
                onRouteChange(item.id);
                if (onClose) onClose();
              }}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all cursor-pointer group ${
                isActive
                  ? 'bg-[#E7F8EF] text-[#087F4F] font-semibold shadow-2xs'
                  : 'text-[#647775] hover:text-[#142B2A] hover:bg-[#F4F8F7]'
              }`}
            >
              <div className="flex items-center gap-3">
                <Icon
                  className={`w-4 h-4 transition-colors ${
                    isActive ? 'text-[#087F4F]' : 'text-[#647775] group-hover:text-[#142B2A]'
                  }`}
                />
                <span className="truncate">{item.label}</span>
              </div>
              {item.badge && (
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${
                    isActive
                      ? 'bg-[#087F4F]/15 text-[#087F4F]'
                      : 'bg-slate-100 text-[#647775]'
                  }`}
                >
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}

        {/* Lower Scenic Bridge Card (Matches Reference Image) */}
        <div className="pt-3 px-1">
          <div
            onClick={() => onRouteChange('overview')}
            className="relative overflow-hidden rounded-2xl p-4 text-white cursor-pointer group transition-transform hover:scale-[1.02] shadow-sm min-h-[110px] flex flex-col justify-end bg-cover"
            style={{
              backgroundImage: `url(${bandraWorliThumbnail || aayamHeroLandscape})`,
              backgroundPosition: 'center 45%',
              backgroundSize: 'cover',
            }}
          >
            {/* Gradient overlay for text legibility */}
            <div className="absolute inset-0 bg-gradient-to-t from-[#075E43]/90 via-[#075E43]/40 to-transparent pointer-events-none" />
            <div className="relative z-10 space-y-0.5">
              <p className="text-xs font-bold leading-tight drop-shadow-md">
                Safer Infrastructure
              </p>
              <p className="text-[11px] font-medium opacity-95 flex items-center gap-1 drop-shadow-md">
                Stronger Communities <span className="group-hover:translate-x-1 transition-transform">→</span>
              </p>
            </div>
          </div>
        </div>

        <div className="pt-3 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-[#647775]">
          {t('sidebar.environment', 'Environment')}
        </div>
        <div className="mx-1 p-3 rounded-xl bg-[#F4F8F7] border border-[#E1EBE7] text-xs space-y-1.5">
          <div className="flex items-center justify-between text-[#647775]">
            <span>{t('sidebar.database', 'Database')}</span>
            <span className="font-mono text-[11px] text-[#087F4F] font-semibold">
              {isDemo ? t('common.simulated', 'Simulated') : 'SQLite'}
            </span>
          </div>
          <div className="flex items-center justify-between text-[#647775]">
            <span>{t('sidebar.datasetMode', 'Dataset Mode')}</span>
            <span className="font-semibold text-amber-700 text-[11px]">
              {isDemo ? t('sidebar.demoSpecimen', 'Demo Specimen') : t('sidebar.syntheticMock', 'Synthetic Mock')}
            </span>
          </div>
          <div className="flex items-center justify-between text-[#647775]">
            <span>{t('sidebar.apiDocs', 'API Docs')}</span>
            <a
              href="http://localhost:8000/docs"
              target="_blank"
              rel="noreferrer"
              className="text-[#087F4F] hover:underline inline-flex items-center gap-1 text-[11px] font-medium"
            >
              Swagger <ExternalLink className="w-2.5 h-2.5" />
            </a>
          </div>
        </div>
      </nav>

      {/* Footer System Status */}
      <div className="p-4 border-t border-[#E1EBE7] bg-[#F4F8F7]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span
              className={`w-2.5 h-2.5 rounded-full ${
                isDemo
                  ? 'bg-amber-500 shadow-xs shadow-amber-500/50'
                  : systemStatus === 'healthy'
                  ? 'bg-[#169B62] shadow-xs shadow-[#169B62]/50 animate-pulse'
                  : 'bg-[#E54848] shadow-xs shadow-red-500/50'
              }`}
            />
            <span className="text-xs font-semibold text-[#142B2A]">
              {isDemo
                ? t('common.demoSandbox', 'Demo Sandbox')
                : systemStatus === 'healthy'
                ? t('common.online', 'API Online')
                : t('common.connecting', 'Connecting API...')}
            </span>
          </div>
          <span className="text-[11px] font-mono text-[#647775]">
            {isDemo ? t('common.isolated', 'Isolated') : 'Port 8000'}
          </span>
        </div>
      </div>
    </aside>
  );
}
