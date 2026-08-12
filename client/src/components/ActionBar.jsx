import { useState } from 'react';
import { generateDocument } from '../services/api';
import MagneticHoverButton from './ui/MagneticHoverButton';
import useSparkleBurst from './ui/SparkleBurst';
import { useToast } from './ui/Toast';

export default function ActionBar({ getPayload }) {
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

  return (
    <section className="mt-4 md:mt-xl flex flex-col md:flex-row justify-between items-center gap-4 py-4 border-t border-outline-variant/30 relative z-10">
      <SparkleOverlay />
      <div className="flex items-center gap-2">
        <span className="material-symbols-outlined text-[#ffd700] text-lg animate-pulse">
          verified
        </span>
        <p className="font-body-sm text-body-sm text-on-surface-variant">
          {error ? (
            <span className="text-error font-medium">{error}</span>
          ) : (
            'Document auto-saves to History. Ready to export & download?'
          )}
        </p>
      </div>

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

