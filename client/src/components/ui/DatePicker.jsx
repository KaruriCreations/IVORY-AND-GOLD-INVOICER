import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * DatePicker
 * Sleek popover calendar date picker with quick presets and luxury styling
 */
export default function DatePicker({
  value = '',
  onChange,
  placeholder = 'Select date...',
  label,
  icon = 'calendar_today',
  id,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  // Parse initial date or default to today
  const initialDate = value && !isNaN(new Date(value)) ? new Date(value) : new Date();
  const [currentMonth, setCurrentMonth] = useState(initialDate);

  // Close on outside click
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ];

  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();

  // Calculate days in month
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const handlePrevMonth = () => {
    setCurrentMonth(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentMonth(new Date(year, month + 1, 1));
  };

  const handleSelectDay = (day) => {
    const selected = new Date(year, month, day);
    const yyyy = selected.getFullYear();
    const mm = String(selected.getMonth() + 1).padStart(2, '0');
    const dd = String(selected.getDate()).padStart(2, '0');
    const formatted = `${yyyy}-${mm}-${dd}`;
    onChange(formatted);
    setIsOpen(false);
  };

  const applyPreset = (offsetDays) => {
    const d = new Date();
    d.setDate(d.getDate() + offsetDays);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    onChange(`${yyyy}-${mm}-${dd}`);
    setCurrentMonth(d);
    setIsOpen(false);
  };

  // Format display text
  const getDisplayText = () => {
    if (!value) return '';
    const parsed = new Date(value);
    if (isNaN(parsed)) return value;
    return parsed.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const isSelected = (day) => {
    if (!value) return false;
    const selected = new Date(value);
    return (
      !isNaN(selected) &&
      selected.getDate() === day &&
      selected.getMonth() === month &&
      selected.getFullYear() === year
    );
  };

  const isToday = (day) => {
    const today = new Date();
    return (
      today.getDate() === day &&
      today.getMonth() === month &&
      today.getFullYear() === year
    );
  };

  return (
    <div ref={containerRef} className="relative w-full">
      <div
        onClick={() => setIsOpen(!isOpen)}
        className="relative group cursor-pointer"
      >
        <span className="material-symbols-outlined absolute left-sm top-1/2 -translate-y-1/2 text-on-surface-variant/50 group-focus-within:text-primary group-hover:text-primary transition-colors">
          {icon}
        </span>
        <input
          id={id}
          type="text"
          readOnly
          value={getDisplayText() || value}
          placeholder={placeholder}
          className="w-full bg-surface-bright border border-outline-variant rounded-lg py-sm pl-xl pr-sm font-body-md text-body-md text-on-surface cursor-pointer focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
        />
        <span className="material-symbols-outlined absolute right-sm top-1/2 -translate-y-1/2 text-on-surface-variant/40 text-[18px]">
          arrow_drop_down
        </span>
      </div>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.96, transition: { duration: 0.15 } }}
            className="absolute left-0 top-full mt-2 z-50 w-72 sm:w-80 bg-surface-container-lowest/95 backdrop-blur-xl border border-outline-variant/50 rounded-2xl shadow-[0_12px_36px_rgba(26,43,60,0.18)] p-4"
          >
            {/* Header: Month / Year Controls */}
            <div className="flex items-center justify-between mb-3 pb-2 border-b border-outline-variant/30">
              <button
                type="button"
                onClick={handlePrevMonth}
                className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-surface-container-low text-on-surface transition-colors"
              >
                <span className="material-symbols-outlined text-[18px]">chevron_left</span>
              </button>

              <span className="font-headline-md text-sm font-semibold text-primary">
                {monthNames[month]} {year}
              </span>

              <button
                type="button"
                onClick={handleNextMonth}
                className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-surface-container-low text-on-surface transition-colors"
              >
                <span className="material-symbols-outlined text-[18px]">chevron_right</span>
              </button>
            </div>

            {/* Quick Presets */}
            <div className="grid grid-cols-4 gap-1 mb-3">
              {[
                { label: 'Today', days: 0 },
                { label: 'Tmrw', days: 1 },
                { label: '+1 Wk', days: 7 },
                { label: '+1 Mo', days: 30 },
              ].map((p) => (
                <button
                  key={p.label}
                  type="button"
                  onClick={() => applyPreset(p.days)}
                  className="py-1 px-1.5 text-[11px] font-semibold rounded-md bg-surface-container-low/70 hover:bg-primary/10 hover:text-primary transition-colors text-center text-on-surface-variant"
                >
                  {p.label}
                </button>
              ))}
            </div>

            {/* Days of Week */}
            <div className="grid grid-cols-7 gap-1 text-center font-label-sm text-[11px] text-on-surface-variant/60 font-semibold mb-1">
              <span>Su</span>
              <span>Mo</span>
              <span>Tu</span>
              <span>We</span>
              <span>Th</span>
              <span>Fr</span>
              <span>Sa</span>
            </div>

            {/* Days Grid */}
            <div className="grid grid-cols-7 gap-1">
              {/* Empty leading days */}
              {Array.from({ length: firstDay }).map((_, idx) => (
                <div key={`empty-${idx}`} className="h-8" />
              ))}

              {/* Month days */}
              {Array.from({ length: daysInMonth }).map((_, idx) => {
                const day = idx + 1;
                const active = isSelected(day);
                const current = isToday(day);

                return (
                  <button
                    key={day}
                    type="button"
                    onClick={() => handleSelectDay(day)}
                    className={`h-8 w-8 mx-auto flex items-center justify-center rounded-lg text-xs font-medium transition-all ${
                      active
                        ? 'bg-primary text-white font-bold shadow-sm scale-105'
                        : current
                        ? 'border border-primary text-primary font-semibold hover:bg-primary/10'
                        : 'text-on-surface hover:bg-surface-container-low'
                    }`}
                  >
                    {day}
                  </button>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
