import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate, useLocation } from 'react-router-dom';

/**
 * CommandPalette (Cmd+K / Ctrl+K)
 * Quick search and action launcher across the entire application
 */
export default function CommandPalette({ onExportPdf, onExportXlsx, onAddSection }) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef(null);
  const navigate = useNavigate();
  const location = useLocation();

  // Keyboard shortcut listener (Cmd+K / Ctrl+K / Escape)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsOpen((prev) => !prev);
      }
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      setSearch('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  const commands = [
    {
      id: 'nav-generator',
      category: 'Navigation',
      label: 'Go to Invoice Generator',
      desc: 'Create or edit event quotation',
      icon: 'edit_document',
      action: () => {
        navigate('/');
        setIsOpen(false);
      },
    },
    {
      id: 'nav-history',
      category: 'Navigation',
      label: 'Go to Document History',
      desc: 'Browse, re-edit, or re-download past files',
      icon: 'history',
      action: () => {
        navigate('/history');
        setIsOpen(false);
      },
    },
    {
      id: 'act-pdf',
      category: 'Actions',
      label: 'Generate PDF Document',
      desc: 'Render and download official PDF invoice',
      icon: 'picture_as_pdf',
      action: () => {
        if (onExportPdf) onExportPdf();
        setIsOpen(false);
      },
    },
    {
      id: 'act-xlsx',
      category: 'Actions',
      label: 'Export Excel Spreadsheet (.xlsx)',
      desc: 'Download spreadsheet with master branding',
      icon: 'table_view',
      action: () => {
        if (onExportXlsx) onExportXlsx();
        setIsOpen(false);
      },
    },
    {
      id: 'act-add-section',
      category: 'Actions',
      label: 'Add Category Section',
      desc: 'Create new section (e.g. CATERING, DECOR)',
      icon: 'create_new_folder',
      action: () => {
        if (onAddSection) onAddSection();
        setIsOpen(false);
      },
    },
  ];

  const filtered = commands.filter(
    (c) =>
      c.label.toLowerCase().includes(search.toLowerCase()) ||
      c.desc.toLowerCase().includes(search.toLowerCase()) ||
      c.category.toLowerCase().includes(search.toLowerCase())
  );

  const handleKeyDownList = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % Math.max(1, filtered.length));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + filtered.length) % Math.max(1, filtered.length));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filtered[selectedIndex]) {
        filtered[selectedIndex].action();
      }
    }
  };

  return (
    <>
      {/* Floating Header Shortcut Button */}
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-surface-container-low/80 hover:bg-surface-container-high/80 border border-outline-variant/30 text-on-surface-variant text-xs font-medium transition-all shadow-xs"
        title="Open Command Palette (Ctrl+K)"
      >
        <span className="material-symbols-outlined text-[16px] text-primary">search</span>
        <span className="text-on-surface-variant/70">Quick Action...</span>
        <kbd className="px-1.5 py-0.5 rounded bg-surface border border-outline-variant/40 font-mono text-[10px] text-on-surface-variant/80">
          ⌘K
        </kbd>
      </button>

      {/* Modal Backdrop & Palette */}
      <AnimatePresence>
        {isOpen && (
          <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              className="fixed inset-0 bg-[#041627]/60 backdrop-blur-md"
            />

            {/* Dialog Panel */}
            <motion.div
              initial={{ opacity: 0, y: -20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -15, scale: 0.95 }}
              transition={{ type: 'spring', damping: 25, stiffness: 350 }}
              className="relative w-full max-w-xl bg-surface-container-lowest/95 backdrop-blur-2xl border border-outline-variant/40 rounded-2xl shadow-[0_20px_50px_rgba(4,22,39,0.3)] overflow-hidden flex flex-col z-10"
            >
              {/* Top Search Input */}
              <div className="flex items-center gap-3 px-4 py-3.5 border-b border-outline-variant/30 bg-surface-container-low/30">
                <span className="material-symbols-outlined text-primary text-[22px]">search</span>
                <input
                  ref={inputRef}
                  type="text"
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setSelectedIndex(0);
                  }}
                  onKeyDown={handleKeyDownList}
                  placeholder="Type a command or search actions..."
                  className="w-full bg-transparent font-body-md text-body-md text-on-surface focus:outline-none placeholder:text-on-surface-variant/50"
                />
                <kbd className="hidden sm:inline-block px-1.5 py-0.5 text-[10px] font-mono bg-surface rounded border border-outline-variant/30 text-on-surface-variant/60">
                  ESC
                </kbd>
              </div>

              {/* Commands List */}
              <div className="max-h-80 overflow-y-auto p-2 flex flex-col gap-1">
                {filtered.length > 0 ? (
                  filtered.map((cmd, idx) => {
                    const isSel = idx === selectedIndex;
                    return (
                      <button
                        key={cmd.id}
                        type="button"
                        onClick={cmd.action}
                        onMouseEnter={() => setSelectedIndex(idx)}
                        className={`w-full flex items-center justify-between p-3 rounded-xl text-left transition-colors ${
                          isSel
                            ? 'bg-primary/10 border border-primary/20 text-primary'
                            : 'text-on-surface hover:bg-surface-container-low'
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div
                            className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                              isSel ? 'bg-primary text-white' : 'bg-surface-container text-primary'
                            }`}
                          >
                            <span className="material-symbols-outlined text-[18px]">
                              {cmd.icon}
                            </span>
                          </div>
                          <div className="min-w-0">
                            <p className="font-headline-md text-[14px] font-semibold leading-tight truncate">
                              {cmd.label}
                            </p>
                            <p className="font-body-sm text-[12px] text-on-surface-variant/70 truncate">
                              {cmd.desc}
                            </p>
                          </div>
                        </div>

                        <span className="text-[11px] font-label-sm font-semibold uppercase px-2 py-0.5 rounded-full bg-surface-container-low text-on-surface-variant/60">
                          {cmd.category}
                        </span>
                      </button>
                    );
                  })
                ) : (
                  <div className="p-8 text-center text-on-surface-variant">
                    <span className="material-symbols-outlined text-[32px] mb-2 opacity-50">
                      manage_search
                    </span>
                    <p className="font-body-md text-sm">No commands found for "{search}"</p>
                  </div>
                )}
              </div>

              {/* Footer navigation hint */}
              <div className="px-4 py-2 border-t border-outline-variant/20 bg-surface-container-low/40 flex items-center justify-between text-[11px] text-on-surface-variant/60 font-mono">
                <span className="flex items-center gap-1.5">
                  <kbd className="px-1 bg-surface rounded border border-outline-variant/30">↑</kbd>
                  <kbd className="px-1 bg-surface rounded border border-outline-variant/30">↓</kbd>
                  to navigate
                </span>
                <span className="flex items-center gap-1.5">
                  <kbd className="px-1 bg-surface rounded border border-outline-variant/30">↵</kbd>
                  to select
                </span>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
