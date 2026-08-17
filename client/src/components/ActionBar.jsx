import { useState } from 'react';
import { generateDocument } from '../services/api';
import MagneticHoverButton from './ui/MagneticHoverButton';
import useSparkleBurst from './ui/SparkleBurst';
import { useToast } from './ui/Toast';

export default function ActionBar({ getPayload, lastSaved, onResetInvoice }) {
  const [loading, setLoading] = useState(null); // 'xlsx' | 'pdf' | null
  const [error, setError] = useState('');
  const { trigger: triggerSparkle, SparkleOverlay } = useSparkleBurst();
  const toast = useToast();

  const handleExport = async (format, e) => {
    setError('');
    setLoading(format);
    triggerSparkle(e);
    try {
      await generateDocument(getPayload, format);
      if (format === 'pdf') {
        toast.gold('PDF Generated Successfully', 'Your invoice PDF has been downloaded & archived to History.');
      } else {
        toast.success('Excel Spreadsheet Exported', 'Your branded .xlsx file is downloaded & ready.');
      }
    } catch (err) {
      const msg = err.message || 'Generation failed. Please try again.';
      setError(msg);
      toast.error('Export Failed', msg);
    } finally {
      setLoading(null);
    }
  };

  const handleReset = (e) => {
    if (e) e.preventDefault();
    if (window.confirm('Start a fresh invoice? This will reset all form fields and clear your current draft.')) {
      if (onResetInvoice) onResetInvoice();
      toast.info('Form Reset', 'Cleared current draft and started a fresh invoice.');
    }
  };

  const formatSavedTime = (date) => {
    if (!date) return null;
    try {
      const d = new Date(date);
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    } catch {
      return null;
    }
  };

  const savedTimeStr = formatSavedTime(lastSaved);

  return (
    <section className="mt-4 md:mt-xl flex flex-col md:flex-row justify-between items-center gap-4 py-4 border-t border-outline-variant/30 relative z-10">
      <SparkleOverlay />
      
      {/* Auto-save & status information */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#ffd700] opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#ffd700]"></span>
          </span>
          <p className="font-body-sm text-body-sm text-on-surface-variant flex items-center gap-1.5">
            {error ? (
              <span className="text-error font-medium">{error}</span>
            ) : savedTimeStr ? (
              <span>
                <strong className="text-on-surface font-medium">Draft auto-saved</strong> ({savedTimeStr})
              </span>
            ) : (
              'Auto-saves locally as you type.'
            )}
          </p>
        </div>

        {onResetInvoice && (
          <button
            type="button"
            onClick={handleReset}
            className="text-xs text-on-surface-variant/70 hover:text-error transition-colors px-2 py-1 rounded-md hover:bg-error/10 border border-transparent hover:border-error/20 flex items-center gap-1 font-medium"
            title="Clear all fields and start a new blank invoice"
          >
            <span className="material-symbols-outlined text-[15px]">restart_alt</span>
            <span>Start Fresh</span>
          </button>
        )}
      </div>

      {/* Export actions */}
      <div className="flex flex-col sm:flex-row w-full md:w-auto gap-3">
        {/* Excel Button */}
        <MagneticHoverButton
          onClick={(e) => handleExport('xlsx', e)}
          disabled={loading !== null}
          variant="secondary"
          glowColor="rgba(111, 251, 190, 0.4)"
          className="px-6 py-2.5 min-w-[160px] font-label-md text-label-md"
        >
          <span className="material-symbols-outlined text-lg">
            {loading === 'xlsx' ? 'hourglass_empty' : 'table_view'}
          </span>
          <span>{loading === 'xlsx' ? 'Generating...' : 'Export .xlsx'}</span>
        </MagneticHoverButton>

        {/* PDF Button */}
        <MagneticHoverButton
          onClick={(e) => handleExport('pdf', e)}
          disabled={loading !== null}
          variant="primary"
          glowColor="rgba(212, 175, 55, 0.5)"
          className="px-6 py-2.5 min-w-[160px] font-label-md text-label-md"
        >
          <span className="material-symbols-outlined text-lg text-[#ffd700]">
            {loading === 'pdf' ? 'hourglass_empty' : 'picture_as_pdf'}
          </span>
          <span>{loading === 'pdf' ? 'Rendering...' : 'Generate PDF'}</span>
        </MagneticHoverButton>
      </div>
    </section>
  );
}

