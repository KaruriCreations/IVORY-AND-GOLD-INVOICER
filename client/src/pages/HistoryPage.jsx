import { useEffect, useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import Footer from '../components/Footer';
import AmbientLuxuryBackground from '../components/ui/AmbientLuxuryBackground';
import InteractiveGlowCard from '../components/ui/InteractiveGlowCard';
import MagneticHoverButton from '../components/ui/MagneticHoverButton';
import SpotlightText from '../components/ui/SpotlightText';
import useSparkleBurst from '../components/ui/SparkleBurst';
import { useToast } from '../components/ui/Toast';

const API_BASE_URL = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');

export default function HistoryPage() {
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [filterFormat, setFilterFormat] = useState('all');
  const [deletingFile, setDeletingFile] = useState(null);
  const [loadingEdit, setLoadingEdit] = useState(null);
  const navigate = useNavigate();
  const { trigger: triggerSparkle, SparkleOverlay } = useSparkleBurst();
  const toast = useToast();

  const fetchHistory = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await fetch(`${API_BASE_URL}/api/history`);
      if (!res.ok) throw new Error('Failed to fetch invoice history');
      const data = await res.json();
      setFiles(data.files || []);
    } catch (err) {
      console.error('History fetch error:', err);
      setError(err.message || 'Could not load history');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  const handleDelete = async (filename, e) => {
    if (e) e.stopPropagation();
    if (!window.confirm(`Are you sure you want to delete "${filename}"?`)) return;
    try {
      setDeletingFile(filename);
      const res = await fetch(`${API_BASE_URL}/api/history/${encodeURIComponent(filename)}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('Failed to delete file');
      setFiles((prev) => prev.filter((f) => f.name !== filename));
      toast.info('Document Deleted', `Permanently removed "${filename}" from history.`);
    } catch (err) {
      toast.error('Delete Failed', err.message || 'Error deleting file');
    } finally {
      setDeletingFile(null);
    }
  };

  const handleReEdit = async (filename, e) => {
    triggerSparkle(e);
    try {
      setLoadingEdit(filename);
      const res = await fetch(
        `${API_BASE_URL}/api/history/metadata?filename=${encodeURIComponent(filename)}`
      );
      if (!res.ok) throw new Error('Could not load invoice data');
      const json = await res.json();
      navigate('/', { state: { invoiceData: json.data } });
    } catch (err) {
      alert(err.message || 'Failed to load invoice for editing');
    } finally {
      setLoadingEdit(null);
    }
  };

  const filteredFiles = useMemo(() => {
    return files.filter((file) => {
      const matchesSearch = file.name.toLowerCase().includes(search.toLowerCase());
      const matchesFormat =
        filterFormat === 'all' ? true : file.format === filterFormat;
      return matchesSearch && matchesFormat;
    });
  }, [files, search, filterFormat]);

  const stats = useMemo(() => {
    const pdfCount = files.filter((f) => f.format === 'pdf').length;
    const xlsxCount = files.filter((f) => f.format === 'xlsx').length;
    return { total: files.length, pdfCount, xlsxCount };
  }, [files]);

  const formatFileSize = (bytes) => {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
  };

  const formatDate = (isoString) => {
    if (!isoString) return '—';
    try {
      const date = new Date(isoString);
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return isoString;
    }
  };

  return (
    <>
      <Header />
      <AmbientLuxuryBackground />
      <SparkleOverlay />

      <main className="w-full pt-16 bg-surface/50 min-h-screen relative z-10">
        <div className="flex flex-col w-full max-w-[1440px] mx-auto px-gutter md:px-lg py-xl gap-lg relative">
          {/* Header Card */}
          <InteractiveGlowCard
            enableTilt={false}
            glowColor="rgba(212, 175, 55, 0.25)"
            className="bg-surface-container-lowest/90 backdrop-blur-sm border border-outline-variant/30 shadow-[0_4px_20px_-2px_rgba(26,43,60,0.06)] rounded-xl p-md md:p-lg"
          >
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-md">
              <div>
                <h1 className="font-display-lg text-display-lg text-on-surface mb-xs">
                  <SpotlightText
                    text="Document History"
                    spotlightColor="rgba(212, 175, 55, 0.9)"
                    baseClassName="text-on-surface"
                  />
                </h1>
                <p className="font-body-md text-body-md text-on-surface-variant">
                  Access, re-edit, re-download, or manage all generated invoices and spreadsheets.
                </p>
              </div>

              <div className="flex items-center gap-sm flex-wrap">
                <div className="bg-primary-container text-white px-md py-sm rounded-full flex items-center gap-xs shadow-sm font-label-md text-label-md border border-white/10">
                  <span className="material-symbols-outlined text-[18px] text-[#ffd700]">folder</span>
                  <span>{stats.total} Total</span>
                </div>
                <div className="bg-primary/10 text-primary px-md py-sm rounded-full flex items-center gap-xs font-label-md text-label-md border border-primary/20">
                  <span className="material-symbols-outlined text-[18px]">picture_as_pdf</span>
                  <span>{stats.pdfCount} PDFs</span>
                </div>
                <div className="bg-secondary/10 text-secondary px-md py-sm rounded-full flex items-center gap-xs font-label-md text-label-md border border-secondary/20">
                  <span className="material-symbols-outlined text-[18px]">table_view</span>
                  <span>{stats.xlsxCount} Excel</span>
                </div>
              </div>
            </div>

            {/* Controls: Search and Filter */}
            <div className="mt-lg pt-md border-t border-outline-variant/30 flex flex-col md:flex-row gap-md justify-between items-stretch md:items-center">
              {/* Search Box */}
              <div className="relative flex-1 max-w-md">
                <span className="material-symbols-outlined absolute left-sm top-1/2 -translate-y-1/2 text-on-surface-variant/50">
                  search
                </span>
                <input
                  type="text"
                  placeholder="Search by invoice # or filename..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full bg-surface-bright border border-outline-variant rounded-lg py-sm pl-xl pr-sm font-body-md text-body-md text-on-surface focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
                />
                {search && (
                  <button
                    onClick={() => setSearch('')}
                    className="absolute right-sm top-1/2 -translate-y-1/2 text-on-surface-variant/50 hover:text-on-surface"
                  >
                    <span className="material-symbols-outlined text-[18px]">close</span>
                  </button>
                )}
              </div>

              {/* Format Filter Tabs */}
              <div className="flex items-center gap-xs bg-surface-container-low p-1 rounded-xl">
                {[
                  { id: 'all', label: 'All Files' },
                  { id: 'pdf', label: 'PDF Only' },
                  { id: 'xlsx', label: 'Excel Only' },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setFilterFormat(tab.id)}
                    className={`px-md py-xs rounded-lg font-label-md text-label-md transition-all ${
                      filterFormat === tab.id
                        ? 'bg-surface-container-lowest text-primary shadow-sm font-semibold'
                        : 'text-on-surface-variant hover:text-on-surface'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>
          </InteractiveGlowCard>

          {/* Error Message */}
          {error && (
            <div className="bg-error-container/40 border border-error/30 text-error rounded-xl p-md flex items-center justify-between">
              <div className="flex items-center gap-sm">
                <span className="material-symbols-outlined">error</span>
                <span>{error}</span>
              </div>
              <button
                onClick={fetchHistory}
                className="font-label-md text-label-md underline hover:opacity-80"
              >
                Retry
              </button>
            </div>
          )}

          {/* Loading State */}
          {loading && (
            <div className="bg-surface-container-lowest rounded-xl p-xl flex flex-col items-center justify-center gap-md text-center shadow-sm">
              <span className="material-symbols-outlined text-primary text-[48px] animate-spin">
                progress_activity
              </span>
              <p className="font-body-md text-body-md text-on-surface-variant">
                Loading saved documents...
              </p>
            </div>
          )}

          {/* Empty State */}
          {!loading && filteredFiles.length === 0 && (
            <section className="bg-surface-container-lowest rounded-xl p-xl flex flex-col items-center justify-center text-center shadow-sm py-20 border border-outline-variant/30">
              <div className="w-16 h-16 rounded-full bg-primary/5 flex items-center justify-center text-primary mb-md">
                <span className="material-symbols-outlined text-[36px]">
                  {search || filterFormat !== 'all' ? 'search_off' : 'receipt_long'}
                </span>
              </div>
              <h2 className="font-headline-md text-headline-md text-on-surface mb-xs">
                {search || filterFormat !== 'all'
                  ? 'No matching documents found'
                  : 'No invoices generated yet'}
              </h2>
              <p className="font-body-md text-body-md text-on-surface-variant max-w-md mb-lg">
                {search || filterFormat !== 'all'
                  ? 'Try adjusting your search query or format filter above.'
                  : 'When you export an Excel sheet or generate a PDF invoice, it will automatically appear here for instant download.'}
              </p>
              <Link
                to="/"
                className="flex items-center gap-sm font-label-md text-label-md text-on-primary bg-primary hover:bg-primary-container hover:text-on-primary-container px-lg py-md rounded-xl transition-all shadow-md active:scale-[0.98]"
              >
                <span className="material-symbols-outlined text-[18px]">add_circle</span>
                <span>Create New Invoice</span>
              </Link>
            </section>
          )}

          {/* Document Cards Grid */}
          {!loading && filteredFiles.length > 0 && (
            <section className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-md">
              {filteredFiles.map((file) => {
                const isPdf = file.format === 'pdf';
                const isDeleting = deletingFile === file.name;

                return (
                  <InteractiveGlowCard
                    key={file.name}
                    enableTilt={true}
                    glowColor={isPdf ? 'rgba(212, 175, 55, 0.35)' : 'rgba(111, 251, 190, 0.35)'}
                    className={`bg-surface-container-lowest/90 backdrop-blur-sm rounded-xl p-md border border-outline-variant/30 shadow-[0_4px_16px_rgba(26,43,60,0.05)] hover:shadow-[0_12px_28px_rgba(26,43,60,0.1)] transition-all flex flex-col justify-between group relative overflow-hidden ${
                      isDeleting ? 'opacity-40 pointer-events-none' : ''
                    }`}
                  >
                    {/* Top status bar accent */}
                    <div
                      className={`absolute top-0 left-0 right-0 h-1.5 ${
                        isPdf ? 'bg-gradient-to-r from-primary to-[#b89738]' : 'bg-gradient-to-r from-secondary to-[#6ffbbe]'
                      }`}
                    />

                    <div>
                      {/* Card Header: Icon + Badge + Delete */}
                      <div className="flex items-center justify-between mb-sm pt-xs">
                        <div className="flex items-center gap-xs">
                          <span
                            className={`material-symbols-outlined text-[24px] ${
                              isPdf ? 'text-primary' : 'text-secondary'
                            }`}
                          >
                            {isPdf ? 'picture_as_pdf' : 'table_view'}
                          </span>
                          <span
                            className={`font-label-sm text-[11px] px-sm py-0.5 rounded-full uppercase tracking-wider font-bold ${
                              isPdf
                                ? 'bg-primary/10 text-primary border border-primary/20'
                                : 'bg-secondary/10 text-secondary border border-secondary/20'
                            }`}
                          >
                            {isPdf ? 'PDF Document' : 'Excel Sheet'}
                          </span>
                        </div>

                        <button
                          onClick={(e) => handleDelete(file.name, e)}
                          aria-label="Delete document"
                          title="Delete file"
                          className="text-on-surface-variant/40 hover:text-error transition-colors p-xs rounded-full hover:bg-error-container/20 opacity-0 group-hover:opacity-100"
                        >
                          <span className="material-symbols-outlined text-[18px]">delete</span>
                        </button>
                      </div>

                      {/* File Name */}
                      <h3
                        className="font-headline-md text-[16px] text-on-surface font-semibold truncate mb-xs group-hover:text-primary transition-colors"
                        title={file.name}
                      >
                        {file.name}
                      </h3>

                      {/* Metadata: Size & Date */}
                      <div className="flex items-center gap-md text-on-surface-variant/70 text-body-sm text-[13px] mb-md font-mono">
                        <span className="flex items-center gap-1">
                          <span className="material-symbols-outlined text-[14px]">data_usage</span>
                          {formatFileSize(file.size)}
                        </span>
                        <span className="flex items-center gap-1">
                          <span className="material-symbols-outlined text-[14px]">calendar_today</span>
                          {formatDate(file.createdAt)}
                        </span>
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div className="pt-sm border-t border-outline-variant/20 flex items-center gap-2">
                      {file.hasMetadata && (
                        <MagneticHoverButton
                          onClick={(e) => handleReEdit(file.name, e)}
                          disabled={loadingEdit === file.name}
                          variant="outline"
                          className="flex-1 py-2 text-xs font-semibold"
                        >
                          <span className="material-symbols-outlined text-[16px]">
                            {loadingEdit === file.name ? 'hourglass_empty' : 'edit_document'}
                          </span>
                          <span>{loadingEdit === file.name ? 'Loading...' : 'Re-Edit'}</span>
                        </MagneticHoverButton>
                      )}
                      <a
                        href={`${API_BASE_URL}/api/history/download?filename=${encodeURIComponent(file.name)}`}
                        download={file.name}
                        onClick={(e) => triggerSparkle(e)}
                        className={`flex-1 flex items-center justify-center gap-1 font-label-md text-xs font-semibold py-2 rounded-xl transition-all shadow-sm active:scale-[0.98] ${
                          isPdf
                            ? 'bg-primary text-white hover:bg-primary-container'
                            : 'bg-secondary text-white hover:bg-secondary/90'
                        }`}
                      >
                        <span className="material-symbols-outlined text-[16px]">download</span>
                        <span>Download {isPdf ? '.pdf' : '.xlsx'}</span>
                      </a>
                    </div>
                  </InteractiveGlowCard>
                );
              })}
            </section>
          )}
        </div>
      </main>

      <Footer />
    </>
  );
}