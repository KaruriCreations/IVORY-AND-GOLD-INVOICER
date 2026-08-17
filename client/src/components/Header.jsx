import { Link, useLocation } from 'react-router-dom';
import { useState } from 'react';
import logo from '../assets/logo.png';
import SpotlightText from './ui/SpotlightText';
import CommandPalette from './ui/CommandPalette';

export default function Header({ onExportPdf, onExportXlsx, onAddSection, onResetInvoice, lastSaved }) {
  const location = useLocation();
  const currentPath = location.pathname;
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const getNavLinkClass = (path) => {
    const isActive = currentPath === path;
    if (isActive) {
      return 'px-sm py-xs transition-all bg-primary-container text-white font-semibold rounded-xl shadow-sm border border-white/10';
    }
    return 'px-sm py-xs text-on-surface-variant hover:text-primary transition-colors font-label-md text-label-md hover:bg-surface-container-low/60 rounded-xl';
  };

  return (
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

        <button
          onClick={() => setIsMenuOpen(!isMenuOpen)}
          className="md:hidden p-2 rounded-lg hover:bg-surface-container-low transition-colors"
          aria-label="Open navigation menu"
        >
          <span className="material-symbols-outlined text-[18px]">
            menu
          </span>
        </button>

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
          </div>
        )}

        <div className="flex items-center gap-base">
          <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center shadow-xs">
            <span className="material-symbols-outlined text-on-primary text-[18px]">
              person
            </span>
          </div>
        </div>
      </div>
    </header>
  );
}
