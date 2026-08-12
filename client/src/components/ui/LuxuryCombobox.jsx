import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * LuxuryCombobox
 * Searchable autocomplete select with rich option badges and custom write-in support.
 */
export default function LuxuryCombobox({
  value = '',
  onChange,
  options = [],
  placeholder = 'Select or type...',
  icon = 'palette',
  id,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState(value);
  const containerRef = useRef(null);

  useEffect(() => {
    setQuery(value || '');
  }, [value]);

  useEffect(() => {
    const handleOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, []);

  const filtered = options.filter((opt) => {
    const label = typeof opt === 'string' ? opt : opt.label;
    return label.toLowerCase().includes((query || '').toLowerCase());
  });

  const handleSelect = (item) => {
    const val = typeof item === 'string' ? item : item.label;
    onChange(val);
    setQuery(val);
    setIsOpen(false);
  };

  const handleInputChange = (e) => {
    const val = e.target.value;
    setQuery(val);
    onChange(val);
    if (!isOpen) setIsOpen(true);
  };

  return (
    <div ref={containerRef} className="relative w-full">
      <div className="relative group">
        <span className="material-symbols-outlined absolute left-sm top-1/2 -translate-y-1/2 text-on-surface-variant/50 group-focus-within:text-primary transition-colors">
          {icon}
        </span>
        <input
          id={id}
          type="text"
          value={query}
          onChange={handleInputChange}
          onFocus={() => setIsOpen(true)}
          placeholder={placeholder}
          className="w-full bg-surface-bright border border-outline-variant rounded-lg py-sm pl-xl pr-10 font-body-md text-body-md text-on-surface focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
        />
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="absolute right-sm top-1/2 -translate-y-1/2 text-on-surface-variant/40 hover:text-on-surface p-1 rounded transition-colors"
        >
          <span className="material-symbols-outlined text-[20px]">
            {isOpen ? 'arrow_drop_up' : 'arrow_drop_down'}
          </span>
        </button>
      </div>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 6, scale: 0.98, transition: { duration: 0.15 } }}
            className="absolute left-0 top-full mt-2 z-50 w-full max-h-64 overflow-y-auto bg-surface-container-lowest/95 backdrop-blur-xl border border-outline-variant/50 rounded-xl shadow-[0_12px_36px_rgba(26,43,60,0.16)] p-2"
          >
            {filtered.length > 0 ? (
              <div className="flex flex-col gap-1">
                {filtered.map((opt, idx) => {
                  const label = typeof opt === 'string' ? opt : opt.label;
                  const desc = typeof opt === 'object' ? opt.desc : null;
                  const colors = typeof opt === 'object' ? opt.colors : null;
                  const isSelected = value === label;

                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleSelect(opt)}
                      className={`w-full flex items-center justify-between p-2.5 rounded-lg text-left transition-colors font-body-sm text-[13px] ${
                        isSelected
                          ? 'bg-primary/10 text-primary font-semibold'
                          : 'text-on-surface hover:bg-surface-container-low'
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        {colors && (
                          <div className="flex items-center -space-x-1 shrink-0">
                            {colors.map((c, i) => (
                              <span
                                key={i}
                                className="w-3.5 h-3.5 rounded-full border border-white shadow-xs inline-block"
                                style={{ backgroundColor: c }}
                              />
                            ))}
                          </div>
                        )}
                        <span className="truncate">{label}</span>
                      </div>
                      {desc && (
                        <span className="text-[11px] text-on-surface-variant/60 ml-2 shrink-0">
                          {desc}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="p-3 text-center text-on-surface-variant text-xs">
                Press Enter to use custom: <strong className="text-primary">"{query}"</strong>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
