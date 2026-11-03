import React, { useState } from 'react';
import {
  AlertTriangle,
  RefreshCw,
  Database,
  ShieldCheck,
  User,
  LogOut,
  Menu,
  X,
  Bell,
  ChevronDown,
} from 'lucide-react';
import LanguageSelector from './LanguageSelector';
import GlobalSearch from './GlobalSearch';
import { useLanguage } from '../context/LanguageContext';

export default function Header({
  pageTitle,
  subtitle,
  onRefresh,
  loading,
  healthData,
  user,
  onLogout,
  isAdmin,
  isDemo = false,
  onExitDemo,
  onToggleMobileMenu,
  isMobileMenuOpen = false,
  onSelectAsset,
  onOpenDocument,
}) {
  const { t } = useLanguage();
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);

  // Derive initials from full name or username
  const getInitials = (name) => {
    if (!name) return 'BT';
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  const displayName = user?.full_name || user?.username || 'Benadict Thomas O.J.';
  const initials = getInitials(displayName);

  return (
    <header className="h-16 border-b border-[#E1EBE7] bg-white px-4 sm:px-6 flex items-center justify-between gap-4 z-20 shrink-0 shadow-2xs">
      {/* Mobile Toggle Button */}
      {onToggleMobileMenu && (
        <button
          type="button"
          onClick={onToggleMobileMenu}
          className="md:hidden p-2 -ml-1.5 rounded-lg text-[#647775] hover:text-[#142B2A] hover:bg-[#F4F8F7] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#087F4F] shrink-0 cursor-pointer"
          aria-label={isMobileMenuOpen ? t('nav.closeMenu', 'Close navigation menu') : t('nav.openMenu', 'Open navigation menu')}
          aria-expanded={isMobileMenuOpen}
          aria-controls="mobile-sidebar-drawer"
        >
          {isMobileMenuOpen ? <X className="w-5 h-5 text-[#087F4F]" /> : <Menu className="w-5 h-5" />}
        </button>
      )}

      {/* Center Global Search Bar (Takes prime focus as in reference) */}
      <div className="flex-1 max-w-xl">
        <GlobalSearch
          onSelectAsset={onSelectAsset}
          onOpenDocument={onOpenDocument}
          isDemo={isDemo}
        />
      </div>

      {/* Right Navigation & User Identity Controls */}
      <div className="flex items-center gap-2.5 sm:gap-3 shrink-0">
        {/* Prototype Mock Data Disclaimer Pill */}
        <div className="hidden 2xl:flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-800 text-[11px] font-medium">
          <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-amber-600" />
          <span>{isDemo ? t('header.simulatedDemoEnv', 'Simulated Demo Environment') : t('header.prototypeDisclaimer', 'Local Prototype: Synthetic Data Seed')}</span>
        </div>

        {/* Database indicator (Preserved for tests) */}
        <div className="hidden xl:flex items-center gap-1.5 text-xs text-[#647775] font-mono bg-[#F4F8F7] px-2.5 py-1 rounded-lg border border-[#E1EBE7]">
          <Database className="w-3.5 h-3.5 text-[#087F4F]" />
          <span id="header-db-indicator">{isDemo ? t('common.simulatedEnvironment', 'Simulated Environment') : t('common.sqliteConnected', 'SQLite Connected')}</span>
        </div>

        {/* Multilingual Selector */}
        <LanguageSelector compact />

        {/* Notification Bell */}
        <button
          type="button"
          className="relative p-2 rounded-xl text-[#647775] hover:text-[#142B2A] hover:bg-[#F4F8F7] border border-[#E1EBE7] transition-colors cursor-pointer"
          title="Notifications (2 critical alerts)"
          aria-label="Notifications"
        >
          <Bell className="w-4 h-4" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-[#E54848] ring-2 ring-white" />
        </button>

        {/* Refresh button */}
        {onRefresh && (
          <button
            onClick={onRefresh}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-white hover:bg-[#F4F8F7] text-[#142B2A] border border-[#E1EBE7] transition-colors disabled:opacity-50 cursor-pointer shadow-2xs"
            title={t('header.refreshTooltip', 'Refresh assets and health telemetry')}
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-[#087F4F]' : 'text-[#647775]'}`} />
            <span className="hidden sm:inline">{t('common.refresh', 'Refresh')}</span>
          </button>
        )}

        {/* Demo Mode Exit Action */}
        {isDemo && onExitDemo && (
          <div className="flex items-center gap-2 pl-2 border-l border-[#E1EBE7]">
            <button
              id="btn-header-exit-demo"
              type="button"
              onClick={onExitDemo}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 transition-colors cursor-pointer shadow-2xs"
              title={t('header.exitDemoTooltip', 'Exit Demo Mode and return to sign in')}
            >
              <LogOut className="w-3.5 h-3.5 text-amber-600" />
              <span className="hidden sm:inline">{t('auth.exitDemo', 'Exit Demo')}</span>
            </button>
          </div>
        )}

        {/* Authenticated User Profile & Logout (Hidden in Demo Mode as asserted by tests) */}
        {!isDemo && user && (
          <div className="flex items-center gap-2 pl-2 border-l border-[#E1EBE7]">
            <div className="flex items-center gap-2 p-1 sm:pr-2 rounded-xl bg-white border border-[#E1EBE7] shadow-2xs">
              <div className="w-8 h-8 rounded-full bg-[#087F4F] text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-2xs">
                {initials}
              </div>
              <div className="hidden sm:block leading-tight min-w-0 max-w-[120px] md:max-w-[160px]">
                <div className="text-xs font-bold text-[#142B2A] truncate">
                  {displayName}
                </div>
                <div className="text-[10px] font-medium text-[#647775] truncate flex items-center gap-1">
                  <span id="user-role-badge">
                    {isAdmin ? t('auth.administrator', 'Administrator') : t('auth.commonUser', 'Common User')}
                  </span>
                </div>
              </div>
            </div>

            {onLogout && (
              <button
                id="btn-logout"
                type="button"
                onClick={onLogout}
                className="p-2 rounded-xl text-[#647775] hover:text-[#E54848] hover:bg-red-50 border border-[#E1EBE7] hover:border-red-200 transition-colors cursor-pointer"
                title={t('header.logoutTooltip', 'Sign out of AAYAM')}
                aria-label={t('header.logoutTooltip', 'Sign out of AAYAM')}
              >
                <LogOut className="w-4 h-4" />
              </button>
            )}
          </div>
        )}
      </div>
    </header>
  );
}
