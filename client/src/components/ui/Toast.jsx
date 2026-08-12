import React, { createContext, useContext, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback(({ title, description, type = 'info', duration = 4000 }) => {
    const id = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const newToast = { id, title, description, type };

    setToasts((prev) => [...prev, newToast]);

    if (duration > 0) {
      setTimeout(() => {
        removeToast(id);
      }, duration);
    }
  }, []);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = {
    success: (title, description) => addToast({ title, description, type: 'success' }),
    error: (title, description) => addToast({ title, description, type: 'error' }),
    info: (title, description) => addToast({ title, description, type: 'info' }),
    gold: (title, description) => addToast({ title, description, type: 'gold' }),
  };

  const getIcon = (type) => {
    switch (type) {
      case 'success':
        return { icon: 'check_circle', color: 'text-[#00895d] bg-[#6ffbbe]/20 border-[#6ffbbe]/40' };
      case 'error':
        return { icon: 'error', color: 'text-error bg-error-container/40 border-error/30' };
      case 'gold':
      case 'info':
      default:
        return { icon: 'verified', color: 'text-[#b89738] bg-[#ffd700]/15 border-[#ffd700]/30' };
    }
  };

  return (
    <ToastContext.Provider value={toast}>
      {children}
      {/* Toast Notification Container */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-3 max-w-sm w-full pointer-events-none px-4 sm:px-0">
        <AnimatePresence>
          {toasts.map((t) => {
            const iconMeta = getIcon(t.type);
            return (
              <motion.div
                key={t.id}
                initial={{ opacity: 0, y: 20, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -15, scale: 0.9, transition: { duration: 0.2 } }}
                transition={{ type: 'spring', damping: 20, stiffness: 300 }}
                className="pointer-events-auto flex items-start gap-3 p-4 rounded-xl bg-surface-container-lowest/95 backdrop-blur-xl border border-outline-variant/40 shadow-[0_8px_30px_rgba(26,43,60,0.12)] relative overflow-hidden group"
              >
                {/* Left accent bar */}
                <div
                  className={`absolute left-0 top-0 bottom-0 w-1 ${
                    t.type === 'success'
                      ? 'bg-secondary'
                      : t.type === 'error'
                      ? 'bg-error'
                      : 'bg-gradient-to-b from-[#ffd700] to-[#b89738]'
                  }`}
                />

                {/* Icon Badge */}
                <div
                  className={`w-9 h-9 rounded-lg flex items-center justify-center border shrink-0 ${iconMeta.color}`}
                >
                  <span className="material-symbols-outlined text-[20px]">
                    {iconMeta.icon}
                  </span>
                </div>

                {/* Text Details */}
                <div className="flex-1 min-w-0 pr-2">
                  <h4 className="font-headline-md text-[14px] text-on-surface font-semibold leading-tight mb-0.5">
                    {t.title}
                  </h4>
                  {t.description && (
                    <p className="font-body-sm text-[13px] text-on-surface-variant leading-snug">
                      {t.description}
                    </p>
                  )}
                </div>

                {/* Close Button */}
                <button
                  onClick={() => removeToast(t.id)}
                  className="text-on-surface-variant/40 hover:text-on-surface p-1 rounded-md transition-colors"
                  aria-label="Dismiss notification"
                >
                  <span className="material-symbols-outlined text-[16px]">close</span>
                </button>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}
