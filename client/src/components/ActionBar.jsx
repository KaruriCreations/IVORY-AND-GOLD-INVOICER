import { useState } from 'react';
import { generateDocument } from '../services/api';

export default function ActionBar({ getPayload }) {
  const [loading, setLoading] = useState(null); // 'xlsx' | 'pdf' | null
  const [error, setError] = useState('');

  const handleExport = async (format) => {
    setError('');
    setLoading(format);
    try {
      await generateDocument(getPayload, format);
    } catch (err) {
      setError(err.message || 'Generation failed. Please try again.');
    } finally {
      setLoading(null);
    }
  };

  return (
    <section className="mt-4 md:mt-xl flex flex-col md:flex-row justify-between items-center gap-4 py-4 border-t border-outline-variant/30 relative z-10">
      <div className="flex items-center gap-2">
        <span className="material-symbols-outlined text-primary-fixed-dim text-base">
          info
        </span>
        <p className="font-body-sm text-body-sm text-on-surface-variant">
          {error ? (
            <span className="text-error">{error}</span>
          ) : (
            'Document auto-saves to Drafts. Ready to generate?'
          )}
        </p>
      </div>

      <div className="flex flex-col sm:flex-row w-full md:w-auto gap-2">
        {/* Excel Button */}
        <button
          onClick={() => handleExport('xlsx')}
          disabled={loading !== null}
          className="flex items-center justify-center gap-2 font-label-md text-label-md text-on-primary bg-secondary hover:bg-secondary/90 px-4 py-2 rounded-xl transition-all shadow-sm hover:shadow-md active:scale-[0.98] group relative overflow-hidden disabled:opacity-60 disabled:cursor-not-allowed min-w-[140px]"
        >
          <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out"></div>
          <span className="material-symbols-outlined relative z-10 text-base">
            {loading === 'xlsx' ? 'hourglass_empty' : 'table_view'}
          </span>
          <span className="relative z-10 text-base">
            {loading === 'xlsx' ? 'Generating...' : 'Export .xlsx'}
          </span>
        </button>

        {/* PDF Button */}
        <button
          onClick={() => handleExport('pdf')}
          disabled={loading !== null}
          className="flex items-center justify-center gap-2 font-label-md text-label-md text-on-primary bg-primary hover:bg-primary-container hover:text-on-primary-container px-4 py-2 rounded-xl transition-all shadow-sm hover:shadow-md active:scale-[0.98] group relative overflow-hidden disabled:opacity-60 disabled:cursor-not-allowed min-w-[140px]"
        >
          <div className="absolute inset-0 bg-primary-fixed/10 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out"></div>
          <span className="material-symbols-outlined relative z-10 text-base">
            {loading === 'pdf' ? 'hourglass_empty' : 'picture_as_pdf'}
          </span>
          <span className="relative z-10 text-base">
            {loading === 'pdf' ? 'Rendering...' : 'Generate PDF'}
          </span>
        </button>
      </div>
    </section>
  );
}
