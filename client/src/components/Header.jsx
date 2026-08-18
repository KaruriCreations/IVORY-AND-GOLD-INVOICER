import { Link, useLocation } from 'react-router-dom';
import { useState, useEffect } from 'react';
import logo from '../assets/logo.png';
import SpotlightText from './ui/SpotlightText';
import CommandPalette from './ui/CommandPalette';
import { getWorkspaceId, setWorkspaceId, getClientId } from '../services/historyStore';
import { useToast } from './ui/Toast';

import WorkspaceActivityFeed from './ui/WorkspaceActivityFeed';

export default function Header({
  onExportPdf,
  onExportXlsx,
  onAddSection,
  onResetInvoice,
  lastSaved,
  activeFileName,
}) {
  const location = useLocation();
  const currentPath = location.pathname;
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isWsModalOpen, setIsWsModalOpen] = useState(false);
  const [currentWs, setCurrentWs] = useState(() => getWorkspaceId());
  const [wsInput, setWsInput] = useState('');
  const toast = useToast();

  const isIndividual = currentWs === getClientId();

  useEffect(() => {
    setCurrentWs(getWorkspaceId());
  }, [location.pathname]);

  const handleSaveWs = (e) => {
    e.preventDefault();
    const clean = wsInput.trim();
    setWorkspaceId(clean);
    const updated = getWorkspaceId();
    setCurrentWs(updated);
    setIsWsModalOpen(false);
    toast.gold(
      clean ? 'Team Workspace Active' : 'Private Session Active',
      clean
        ? `Invoices will sync to team workspace "${clean}".`
        : 'Reverted to private individual browser session.'
    );
  };

  const getNavLinkClass = (path) => {
    const isActive = currentPath === path;
    if (isActive) {
      return 'px-sm py-xs transition-all bg-primary-container text-white font-semibold rounded-xl shadow-sm border border-white/10';
    }
    return 'px-sm py-xs text-on-surface-variant hover:text-primary transition-colors font-label-md text-label-md hover:bg-surface-container-low/60 rounded-xl';
  };

  return (
    <>
      <header className="fixed top-0 w-full z-50 bg-surface/85 backdrop-blur-xl border-b border-outline-variant/20 shadow-[0_1px_12px_rgba(26,43,60,0.06)]">
        <div className="h-16 max-w-7xl mx-auto px-gutter flex items-center justify-between">
          <Link to="/" className="flex items-center gap-sm group">
            <img
              alt="Ivory & Gold Events Logo"
              className="h-8 w-auto object-contain transition-transform duration-300 group-hover:scale-105"
              src={logo}
            />
            <div className="hidden sm:block">
              <SpotlightText
                text="IVORY AND GOLD EVENTS"
                spotlightColor="rgba(212, 175, 55, 0.95)"
                baseClassName="font-headline-md text-headline-md text-primary tracking-tight"
              />
            </div>
            <div className="sm:hidden">
              <SpotlightText
                text="I&G EVENTS"
                spotlightColor="rgba(212, 175, 55, 0.95)"
                baseClassName="font-headline-md text-headline-md text-primary tracking-tight"
              />
            </div>
          </Link>

          {/* Center Nav & Quick Action */}
          <div className="flex items-center gap-md">
            <nav className="hidden md:flex items-center gap-base">
              <Link to="/" className={getNavLinkClass('/')}>
                Generator
              </Link>
              <Link to="/history" className={getNavLinkClass('/history')}>
                History
              </Link>
            </nav>

            <CommandPalette
              onExportPdf={onExportPdf}
              onExportXlsx={onExportXlsx}
              onAddSection={onAddSection}
              onResetInvoice={onResetInvoice}
            />
          </div>

          <div className="flex items-center gap-sm">
            {/* Live Shared Workspace Activity Feed */}
            <WorkspaceActivityFeed />

            {/* Workspace Switcher */}
            <button
              type="button"
              onClick={() => {
                setWsInput(isIndividual ? '' : currentWs);
                setIsWsModalOpen(true);
              }}
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-surface-container-low hover:bg-surface-container-high border border-outline-variant/30 text-xs text-on-surface transition-all shadow-xs"
              title="Configure private or shared team workspace"
            >
              <span className="material-symbols-outlined text-[15px] text-primary">
                {isIndividual ? 'person' : 'group'}
              </span>
              <span className="font-medium max-w-[110px] truncate">
                {isIndividual ? 'Private' : currentWs}
              </span>
              <span className="material-symbols-outlined text-[12px] opacity-60">tune</span>
            </button>

            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="md:hidden p-2 rounded-lg hover:bg-surface-container-low transition-colors"
              aria-label="Open navigation menu"
            >
              <span className="material-symbols-outlined text-[18px]">
                menu
              </span>
            </button>
          </div>

          {isMenuOpen && (
            <div className="fixed top-16 right-2 w-64 max-w-full bg-surface/95 backdrop-blur-xl rounded-xl shadow-xl p-4 flex flex-col gap-2 z-40 border border-outline-variant/30">
              <Link
                to="/"
                className="flex items-center gap-sm text-primary font-medium transition-colors p-2 rounded-lg hover:bg-surface-container-low"
                onClick={() => setIsMenuOpen(false)}
              >
                <span className="material-symbols-outlined text-[18px]">edit_document</span>
                Generator
              </Link>
              <Link
                to="/history"
                className="flex items-center gap-sm text-on-surface hover:text-primary transition-colors p-2 rounded-lg hover:bg-surface-container-low"
                onClick={() => setIsMenuOpen(false)}
              >
                <span className="material-symbols-outlined text-[18px]">history</span>
                History
              </Link>
              <button
                type="button"
                onClick={() => {
                  setIsMenuOpen(false);
                  setWsInput(isIndividual ? '' : currentWs);
                  setIsWsModalOpen(true);
                }}
                className="flex items-center gap-sm text-on-surface hover:text-primary transition-colors p-2 rounded-lg hover:bg-surface-container-low text-left"
              >
                <span className="material-symbols-outlined text-[18px] text-primary">
                  {isIndividual ? 'person' : 'group'}
                </span>
                <span>Workspace: {isIndividual ? 'Private' : currentWs}</span>
              </button>
            </div>
          )}
        </div>
      </header>

      {/* Global Workspace Modal */}
      {isWsModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-[#041627]/60 backdrop-blur-md"
            onClick={() => setIsWsModalOpen(false)}
          />
          <div className="relative w-full max-w-md bg-surface-container-lowest border border-outline-variant/40 rounded-2xl shadow-2xl p-6 z-10">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-[24px]">group_work</span>
                <h3 className="font-headline-md text-[18px] text-on-surface font-semibold">
                  Workspace & Session Mode
                </h3>
              </div>
              <button
                onClick={() => setIsWsModalOpen(false)}
                className="text-on-surface-variant/60 hover:text-on-surface"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            <p className="text-body-sm text-on-surface-variant/80 mb-4">
              Use a shared <strong>Workspace Code</strong> to collaborate and sync invoice history across devices with your team, or leave it blank to keep your history private to this browser.
            </p>

            <form onSubmit={handleSaveWs} className="flex flex-col gap-4">
              <div>
                <label className="block text-xs font-semibold text-on-surface mb-1">
                  Shared Team Workspace Code
                </label>
                <input
                  type="text"
                  placeholder="e.g. ivory-team-ke or leave blank for private"
                  value={wsInput}
                  onChange={(e) => setWsInput(e.target.value)}
                  className="w-full bg-surface border border-outline-variant rounded-xl py-2 px-3 text-sm text-on-surface focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                />
              </div>

              <div className="bg-surface-container-low/60 rounded-xl p-3 text-xs text-on-surface-variant flex items-start gap-2">
                <span className="material-symbols-outlined text-primary text-[16px] mt-0.5">info</span>
                <span className="break-all">
                  Device ID: <code className="font-mono font-bold text-primary">{getClientId()}</code>
                </span>
              </div>

              <div className="flex items-center gap-2 justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setIsWsModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-on-surface-variant hover:text-on-surface rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-semibold text-white bg-primary hover:bg-primary-container rounded-xl shadow-sm"
                >
                  Save Settings
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
