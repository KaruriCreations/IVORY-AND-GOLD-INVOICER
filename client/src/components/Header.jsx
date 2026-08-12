import { Link, useLocation } from 'react-router-dom';
import { useState } from 'react';
import logo from '../assets/logo.png';

export default function Header() {
  const location = useLocation();
  const currentPath = location.pathname;
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const getNavLinkClass = (path) => {
    const isActive = currentPath === path;
    if (isActive) {
      return 'px-sm py-xs transition-colors bg-primary-container text-on-primary-container font-semibold rounded-xl';
    }
    return 'px-sm py-xs text-on-surface-variant hover:text-on-surface transition-colors font-label-md text-label-md';
  };

  return (
    <header className="fixed top-0 w-full z-50 bg-surface/80 backdrop-blur-xl shadow-[0_1px_8px_rgba(26,43,60,0.05)]">
      <div className="h-16 max-w-7xl mx-auto px-gutter flex items-center justify-between">
        <Link to="/" className="flex items-center gap-sm group">
          <img
            alt="Ivory & Gold Events Logo"
            className="h-8 w-auto object-contain transition-transform group-hover:scale-105"
            src={logo}
          />
          <span className="font-headline-md text-headline-md text-primary tracking-tight hidden sm:inline">
            IVORY AND GOLD EVENTS
          </span>
          <span className="font-headline-md text-headline-md text-primary tracking-tight sm:hidden">
            I&G EVENTS
          </span>
        </Link>

        <nav className="hidden md:flex items-center gap-md">
          <Link
            to="/"
            className={getNavLinkClass('/')}
          >
            Generator
          </Link>
          <Link
            to="/history"
            className={getNavLinkClass('/history')}
          >
            History
          </Link>
        </nav>

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
          <div className="fixed top-16 right-2 w-64 max-w-full bg-surface/90 backdrop-blur-lg rounded-xl shadow-lg p-4 flex flex-col gap-2 z-40">
            <Link
              to="/"
              className="flex items-center gap-sm text-primary font-medium transition-colors"
              onClick={() => setIsMenuOpen(false)}
            >
              Generator
            </Link>
            <Link
              to="/history"
              className="flex items-center gap-sm text-on-surface hover:text-primary transition-colors"
              onClick={() => setIsMenuOpen(false)}
            >
              History
            </Link>
          </div>
        )}

        <div className="flex items-center gap-base">
          <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
            <span className="material-symbols-outlined text-on-primary text-[18px]">
              person
            </span>
          </div>
        </div>
      </div>
    </header>
  );
}
