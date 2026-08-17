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
import {
  getLocalHistory,
  removeLocalHistoryEntry,
  mergeServerAndLocalHistory,
  getWorkspaceId,
  setWorkspaceId,
  getClientId,
} from '../services/historyStore';
import { generateDocument } from '../services/api';

const API_BASE_URL = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');

export default function HistoryPage() {
  const [activeWorkspace, setActiveWorkspace] = useState(() => getWorkspaceId());
  const [isWorkspaceModalOpen, setIsWorkspaceModalOpen] = useState(false);
  const [workspaceInput, setWorkspaceInput] = useState('');
  const [files, setFiles] = useState(() => getLocalHistory(getWorkspaceId()));
  const [loading, setLoading] = useState(() => getLocalHistory(getWorkspaceId()).length === 0);
  const [downloadingFile, setDownloadingFile] = useState(null);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [filterFormat, setFilterFormat] = useState('all');
  const [deletingFile, setDeletingFile] = useState(null);
  const [loadingEdit, setLoadingEdit] = useState(null);
  const navigate = useNavigate();
  const { trigger: triggerSparkle, SparkleOverlay } = useSparkleBurst();
  const toast = useToast();

  const currentWorkspaceId = getWorkspaceId();
  const isIndividual = currentWorkspaceId === getClientId();

  const fetchHistory = async () => {
    try {
      const currentLocal = getLocalHistory(currentWorkspaceId);
      if (currentLocal.length === 0) {
        setLoading(true);
      }
      setError('');
      const res = await fetch(`${API_BASE_URL}/api/history`, {
        headers: {
          'X-Client-Id': currentWorkspaceId,
        },
      });
      if (res.ok) {
        const data = await res.json();
        const serverFiles = data.files || [];
        const merged = mergeServerAndLocalHistory(serverFiles, currentLocal);
        setFiles(merged);
      } else {
        // If server is not ready or fails, preserve existing local files
        const localOnly = getLocalHistory(currentWorkspaceId);
        setFiles(localOnly);
      }
    } catch (err) {
      console.warn('Server history sync notice:', err);
      // Seamlessly keep local files so history never blanks out on refresh
      const localOnly = getLocalHistory(currentWorkspaceId);
      setFiles(localOnly);
      if (localOnly.length === 0) {
        setError('Server is spinning up. Retrying connection...');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, [activeWorkspace]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSaveWorkspace = (e) => {
    e.preventDefault();
    const clean = workspaceInput.trim();
    setWorkspaceId(clean);
    const newWs = getWorkspaceId();
    setActiveWorkspace(newWs);
    setFiles(getLocalHistory(newWs));
    setIsWorkspaceModalOpen(false);
    toast.gold(
      clean ? 'Shared Workspace Connected' : 'Individual Space Active',
      clean
        ? `Syncing invoice history for team workspace "${clean}".`
        : 'Reverted to private individual browser history.'
    );
  };

  const handleDelete = async (filename, e) => {
    if (e) e.stopPropagation();
    if (!window.confirm(`Are you sure you want to delete "${filename}"?`)) return;
    try {
      setDeletingFile(filename);
      // Remove from local persistent store immediately
      removeLocalHistoryEntry(filename);
      setFiles((prev) => prev.filter((f) => f.name !== filename));
      toast.info('Document Deleted', `Permanently removed "${filename}" from history.`);

      // Also request server cleanup in background
      await fetch(`${API_BASE_URL}/api/history/${encodeURIComponent(filename)}`, {
        method: 'DELETE',
        headers: {
          'X-Client-Id': currentWorkspaceId,
        },
      }).catch(() => {});
    } catch (err) {
      toast.error('Delete Failed', err.message || 'Error deleting file');
    } finally {
      setDeletingFile(null);
    }
  };

  const handleReEdit = async (file, e) => {
    triggerSparkle(e);
    try {
      setLoadingEdit(file.name);
      // If invoiceData is already stored locally, re-edit instantly!
      if (file.invoiceData) {
        navigate('/', { state: { invoiceData: file.invoiceData } });
        return;
      }

      // Fallback: fetch metadata from server
      const res = await fetch(
        `${API_BASE_URL}/api/history/metadata?filename=${encodeURIComponent(file.name)}`,
        {
          headers: {
            'X-Client-Id': currentWorkspaceId,
          },
        }
      );
      if (!res.ok) throw new Error('Could not load invoice data from server');
      const json = await res.json();
      navigate('/', { state: { invoiceData: json.data } });
    } catch (err) {
      alert(err.message || 'Failed to load invoice for editing');
    } finally {
      setLoadingEdit(null);
    }
  };

  const handleDownload = async (file, e) => {
    triggerSparkle(e);
    setDownloadingFile(file.name);
    try {
      // 1. Try downloading from server directly
      const downloadUrl = `${API_BASE_URL}/api/history/download?filename=${encodeURIComponent(file.name)}`;
      const res = await fetch(downloadUrl, {
        headers: {
          'X-Client-Id': currentWorkspaceId,
        },
      });
      
      if (res.ok) {
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = file.name;
        document.body.appendChild(a);
        a.click();
        setTimeout(() => {
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
        }, 1000);
        return;
      }

      // 2. If server file was wiped (e.g. server restarted on free tier) but we have invoiceData:
      if (file.invoiceData) {
        toast.info('Regenerating Document', 'Server storage was refreshed; generating fresh copy from your saved data...');
        await generateDocument(file.invoiceData, file.format);
        return;
      }

      throw new Error(`File not found on server (status: ${res.status})`);
    } catch (err) {
      // If client has invoiceData, try generating directly as fallback
      if (file.invoiceData) {
        try {
          await generateDocument(file.invoiceData, file.format);
          return;
        } catch (genErr) {
          toast.error('Download Failed', genErr.message || 'Could not generate document');
          return;
        }
      }
      toast.error('Download Failed', err.message || 'Error downloading file');
    } finally {
      setDownloadingFile(null);
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
                <div className="flex items-center gap-2 mb-xs">
                  <h1 className="font-display-lg text-display-lg text-on-surface">
                    <SpotlightText
                      text="Document History"
                      spotlightColor="rgba(212, 175, 55, 0.9)"
                      baseClassName="text-on-surface"
                    />
                  </h1>
                </div>
                <p className="font-body-md text-body-md text-on-surface-variant">
                  Access, re-edit, re-download, or manage all generated invoices and spreadsheets.
                </p>
              </div>

              <div className="flex items-center gap-sm flex-wrap">
                {/* Workspace / Individual Mode Badge */}
                <button
                  type="button"
                  onClick={() => {
                    setWorkspaceInput(isIndividual ? '' : currentWorkspaceId);
                    setIsWorkspaceModalOpen(true);
                  }}
                  className="bg-surface-container-low hover:bg-surface-container-high text-on-surface border border-outline-variant/40 px-md py-sm rounded-full flex items-center gap-xs text-xs font-semibold transition-all shadow-xs"
                  title="Configure private or shared team workspace history"
                >
                  <span className="material-symbols-outlined text-[16px] text-primary">
                    {isIndividual ? 'person' : 'group'}
                  </span>
                  <span>{isIndividual ? 'Private History' : `Team: ${currentWorkspaceId}`}</span>
                  <span className="material-symbols-outlined text-[14px] opacity-60">settings</span>
                </button>

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
                          onClick={(e) => handleReEdit(file, e)}
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
                      <button
                        type="button"
                        onClick={(e) => handleDownload(file, e)}
                        disabled={downloadingFile === file.name}
                        className={`flex-1 flex items-center justify-center gap-1 font-label-md text-xs font-semibold py-2 rounded-xl transition-all shadow-sm active:scale-[0.98] ${
                          isPdf
                            ? 'bg-primary text-white hover:bg-primary-container'
                            : 'bg-secondary text-white hover:bg-secondary/90'
                        }`}
                      >
                        <span className="material-symbols-outlined text-[16px]">
                          {downloadingFile === file.name ? 'hourglass_empty' : 'download'}
                        </span>
                        <span>{downloadingFile === file.name ? 'Downloading...' : `Download ${isPdf ? '.pdf' : '.xlsx'}`}</span>
                      </button>
                    </div>
                  </InteractiveGlowCard>
                );
              })}
            </section>
          )}

          {/* Workspace Settings Modal */}
          {isWorkspaceModalOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <div
                className="fixed inset-0 bg-[#041627]/60 backdrop-blur-md"
                onClick={() => setIsWorkspaceModalOpen(false)}
              />
              <div className="relative w-full max-w-md bg-surface-container-lowest border border-outline-variant/40 rounded-2xl shadow-2xl p-6 z-10">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-primary text-[24px]">group_work</span>
                    <h3 className="font-headline-md text-[18px] text-on-surface font-semibold">
                      Session & History Mode
                    </h3>
                  </div>
                  <button
                    onClick={() => setIsWorkspaceModalOpen(false)}
                    className="text-on-surface-variant/60 hover:text-on-surface"
                  >
                    <span className="material-symbols-outlined text-[20px]">close</span>
                  </button>
                </div>

                <p className="text-body-sm text-on-surface-variant/80 mb-4">
                  By default, your generated invoices are private and individual to your session. If you want to sync and share invoice history across devices or team members, enter a shared Workspace Code.
                </p>

                <form onSubmit={handleSaveWorkspace} className="flex flex-col gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-on-surface mb-1">
                      Workspace Code (Leave blank for Private Individual History)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. ivory-team-ke or leave blank"
                      value={workspaceInput}
                      onChange={(e) => setWorkspaceInput(e.target.value)}
                      className="w-full bg-surface border border-outline-variant rounded-xl py-2 px-3 text-sm text-on-surface focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                    />
                  </div>

                  <div className="bg-surface-container-low/60 rounded-xl p-3 text-xs text-on-surface-variant flex items-start gap-2">
                    <span className="material-symbols-outlined text-primary text-[16px] mt-0.5">info</span>
                    <span className="break-all">
                      Current Device ID: <code className="font-mono font-bold text-primary">{getClientId()}</code>
                    </span>
                  </div>

                  <div className="flex items-center gap-2 justify-end pt-2">
                    <button
                      type="button"
                      onClick={() => setIsWorkspaceModalOpen(false)}
                      className="px-4 py-2 text-xs font-semibold text-on-surface-variant hover:text-on-surface rounded-xl"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-5 py-2 text-xs font-semibold text-white bg-primary hover:bg-primary-container rounded-xl shadow-sm"
                    >
                      Save Settings
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      </main>

      <Footer />
    </>
  );
}