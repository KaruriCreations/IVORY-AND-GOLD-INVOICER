import { useState, useMemo } from 'react';
import { getClientId, getWorkspaceId, getLocalHistory } from '../../services/historyStore';
import { getUserDisplayLabel } from '../../services/workspaceCollabStore';
import { importInvoiceToWorkspace } from '../../services/workspaceFilesStore';
import { useToast } from './Toast';
import InteractiveGlowCard from './InteractiveGlowCard';
import MagneticHoverButton from './MagneticHoverButton';
import useSparkleBurst from './SparkleBurst';

export default function WorkspaceFileBar({
  workspaceFiles = [],
  activeFileId,
  activeFile,
  presenceList = [],
  onSwitchFile,
  onCreateNewFile,
  onDuplicateFile,
  onRenameFile,
  onDeleteFile,
}) {
  const [isFilesModalOpen, setIsFilesModalOpen] = useState(false);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [isNewFileModalOpen, setIsNewFileModalOpen] = useState(false);
  const [newFileNameInput, setNewFileNameInput] = useState('');
  const [renamingFileId, setRenamingFileId] = useState(null);
  const [renameInput, setRenameInput] = useState('');
  const [searchFiles, setSearchFiles] = useState('');
  const [historySearch, setHistorySearch] = useState('');

  const { trigger: triggerSparkle, SparkleOverlay } = useSparkleBurst();
  const toast = useToast();

  const workspaceId = getWorkspaceId();
  const myClientId = getClientId();
  const isShared = workspaceId && workspaceId !== myClientId && !workspaceId.startsWith('user_');

  // Group presence by fileId
  const presenceByFile = useMemo(() => {
    const map = new Map();
    presenceList.forEach((p) => {
      if (!p.fileId) return;
      if (!map.has(p.fileId)) {
        map.set(p.fileId, []);
      }
      map.get(p.fileId).push(p);
    });
    return map;
  }, [presenceList]);

  // Load history documents available for quick import
  const historyDocuments = useMemo(() => {
    const all = getLocalHistory(workspaceId);
    return all.filter((doc) => doc.hasMetadata || doc.invoiceData);
  }, [workspaceId, isHistoryModalOpen]);

  const filteredHistory = useMemo(() => {
    if (!historySearch.trim()) return historyDocuments;
    const q = historySearch.toLowerCase();
    return historyDocuments.filter(
      (d) =>
        (d.name && d.name.toLowerCase().includes(q)) ||
        (d.invoiceData?.header?.clientName && d.invoiceData.header.clientName.toLowerCase().includes(q)) ||
        (d.invoiceData?.header?.invoiceNum && d.invoiceData.header.invoiceNum.toLowerCase().includes(q))
    );
  }, [historyDocuments, historySearch]);

  const filteredFiles = useMemo(() => {
    if (!searchFiles.trim()) return workspaceFiles;
    const q = searchFiles.toLowerCase();
    return workspaceFiles.filter(
      (f) =>
        (f.name && f.name.toLowerCase().includes(q)) ||
        (f.clientName && f.clientName.toLowerCase().includes(q)) ||
        (f.invoiceNum && f.invoiceNum.toLowerCase().includes(q))
    );
  }, [workspaceFiles, searchFiles]);

  const handleCreateNew = (e) => {
    e.preventDefault();
    const cleanName = newFileNameInput.trim();
    const created = onCreateNewFile(null, cleanName);
    setNewFileNameInput('');
    setIsNewFileModalOpen(false);
    toast.gold('New File Created', `Created and opened "${created.name}" in workspace.`);
  };

  const handleStartRename = (file, e) => {
    if (e) e.stopPropagation();
    setRenamingFileId(file.id);
    setRenameInput(file.name || 'Invoice');
  };

  const handleSaveRename = (fileId, e) => {
    if (e) e.preventDefault();
    if (renameInput.trim()) {
      onRenameFile(fileId, renameInput.trim());
      toast.info('File Renamed', `Updated file title to "${renameInput.trim()}".`);
    }
    setRenamingFileId(null);
  };

  const handleImportHistoryDoc = (doc, e) => {
    triggerSparkle(e);
    if (!doc.invoiceData) {
      toast.error('Import Error', 'This history document does not contain reusable metadata.');
      return;
    }

    const imported = importInvoiceToWorkspace(
      workspaceId,
      doc.invoiceData,
      doc.name.replace(/\.(pdf|xlsx)$/i, '')
    );
    if (imported) {
      onSwitchFile(imported.id);
      setIsHistoryModalOpen(false);
      toast.gold('History Document Opened', `Imported "${imported.name}" into active workspace files.`);
    }
  };

  const getFileEstimatedTotal = (draft) => {
    if (!draft) return 0;
    const items = (draft.sections || []).flatMap((s) => s.items || []);
    const subtotal = items.reduce(
      (sum, item) => sum + (Number(item.quantity) || 0) * (Number(item.unitPrice) || 0),
      0
    );
    const taxRate = Number(draft.taxRate) || 0;
    return Math.round((subtotal + subtotal * (taxRate / 100)) * 100) / 100;
  };

  const formatRelativeTime = (isoString) => {
    if (!isoString) return 'Just now';
    try {
      const diff = Math.floor((Date.now() - new Date(isoString).getTime()) / 1000);
      if (diff < 60) return 'Just now';
      if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
      if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
      return new Date(isoString).toLocaleDateString();
    } catch {
      return 'Recently';
    }
  };

  return (
    <>
      <SparkleOverlay />
      <div className="w-full bg-surface-container-lowest/80 backdrop-blur-md border border-outline-variant/30 rounded-2xl p-2 md:p-2.5 shadow-sm mb-4 transition-all">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-2.5">
          {/* Left: Workspace & File Control Buttons */}
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-surface-container-low border border-outline-variant/30 text-xs">
              <span className="material-symbols-outlined text-[16px] text-primary">
                {isShared ? 'group' : 'person'}
              </span>
              <span className="font-semibold text-on-surface">
                {isShared ? `Workspace: ${workspaceId}` : 'Private Space'}
              </span>
            </div>

            {/* All Files in Workspace Modal trigger */}
            <button
              type="button"
              onClick={() => setIsFilesModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-primary/10 hover:bg-primary/20 text-primary border border-primary/25 text-xs font-bold transition-all shadow-xs"
              title="Open Workspace Files Manager"
            >
              <span className="material-symbols-outlined text-[16px]">folder_open</span>
              <span>All Files</span>
              <span className="bg-primary text-white text-[10px] px-1.5 py-0.2 rounded-full font-bold">
                {workspaceFiles.length}
              </span>
            </button>

            {/* Browse & Open Shared History Modal trigger */}
            <button
              type="button"
              onClick={() => setIsHistoryModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-surface-container-low hover:bg-surface-container-high text-on-surface border border-outline-variant/30 text-xs font-medium transition-all shadow-xs"
              title="Browse and load invoices from history into workspace"
            >
              <span className="material-symbols-outlined text-[16px] text-secondary">history_edu</span>
              <span className="hidden sm:inline">Open from</span> History
            </button>
          </div>

          {/* Center/Right: Interactive File Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto py-1 scrollbar-none max-w-full">
            {workspaceFiles.map((file) => {
              const isActive = file.id === activeFileId;
              const filePresence = presenceByFile.get(file.id) || [];
              const otherUsersOnThisFile = filePresence.filter((p) => p.userId !== myClientId);

              return (
                <button
                  key={file.id}
                  type="button"
                  onClick={() => onSwitchFile(file.id)}
                  className={`group relative flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-medium transition-all shrink-0 border ${
                    isActive
                      ? 'bg-primary text-white border-primary shadow-sm font-semibold'
                      : 'bg-surface-container-low/70 hover:bg-surface-container-high text-on-surface-variant hover:text-on-surface border-outline-variant/20'
                  }`}
                  title={`Switch to "${file.name}" (Last edited by ${file.lastEditedBy || 'Team'})`}
                >
                  {/* Presence indicator dot */}
                  {otherUsersOnThisFile.length > 0 && (
                    <span
                      className="relative flex h-2 w-2"
                      title={`${otherUsersOnThisFile.map((u) => u.userLabel).join(', ')} is also editing`}
                    >
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#6ffbbe] opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-[#6ffbbe]"></span>
                    </span>
                  )}

                  <span className="material-symbols-outlined text-[15px] opacity-80">
                    {isActive ? 'edit_document' : 'description'}
                  </span>

                  <span className="max-w-[130px] md:max-w-[180px] truncate text-left">
                    {file.name || 'Untitled Invoice'}
                  </span>

                  {/* Close / delete button if more than 1 file */}
                  {workspaceFiles.length > 1 && (
                    <span
                      onClick={(e) => {
                        e.stopPropagation();
                        if (window.confirm(`Close and delete "${file.name}" from workspace?`)) {
                          onDeleteFile(file.id);
                          toast.info('File Removed', `Deleted "${file.name}" from workspace.`);
                        }
                      }}
                      className={`material-symbols-outlined text-[13px] rounded-full p-0.5 transition-colors opacity-60 hover:opacity-100 ${
                        isActive ? 'hover:bg-black/20 text-white' : 'hover:bg-error/20 hover:text-error'
                      }`}
                      title="Close and delete file"
                    >
                      close
                    </span>
                  )}
                </button>
              );
            })}

            {/* Quick + New File Button */}
            <button
              type="button"
              onClick={() => setIsNewFileModalOpen(true)}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-surface-container-low hover:bg-primary/10 text-on-surface-variant hover:text-primary border border-dashed border-outline-variant hover:border-primary/40 text-xs font-semibold transition-all shrink-0"
              title="Create new invoice file in workspace"
            >
              <span className="material-symbols-outlined text-[15px]">add</span>
              <span className="hidden sm:inline">New File</span>
            </button>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 1. WORKSPACE FILES MANAGER MODAL                                          */}
      {/* ========================================================================= */}
      {isFilesModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-[#041627]/70 backdrop-blur-md"
            onClick={() => setIsFilesModalOpen(false)}
          />
          <div className="relative w-full max-w-2xl bg-surface-container-lowest border border-outline-variant/40 rounded-2xl shadow-2xl p-5 md:p-6 z-10 max-h-[85vh] flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-outline-variant/20 mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-primary/10 border border-primary/30 flex items-center justify-center text-primary">
                  <span className="material-symbols-outlined text-[20px]">folder_open</span>
                </div>
                <div>
                  <h3 className="font-headline-md text-[17px] text-on-surface font-bold">
                    Workspace Files & Quotations
                  </h3>
                  <p className="text-xs text-on-surface-variant">
                    {isShared ? `Collaborative Workspace "${workspaceId}"` : 'Private Session Files'} &bull;{' '}
                    {workspaceFiles.length} {workspaceFiles.length === 1 ? 'file' : 'files'}
                  </p>
                </div>
              </div>

              <button
                onClick={() => setIsFilesModalOpen(false)}
                className="text-on-surface-variant/60 hover:text-on-surface p-1 rounded-lg hover:bg-surface-container-low"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            {/* Search & Actions Bar */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 mb-4">
              <div className="relative flex-1">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant/50 text-[18px]">
                  search
                </span>
                <input
                  type="text"
                  placeholder="Search workspace files by client or invoice #..."
                  value={searchFiles}
                  onChange={(e) => setSearchFiles(e.target.value)}
                  className="w-full bg-surface border border-outline-variant/40 rounded-xl py-2 pl-9 pr-3 text-xs text-on-surface focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                />
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsFilesModalOpen(false);
                    setIsNewFileModalOpen(true);
                  }}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-primary hover:bg-primary-container text-white text-xs font-bold shadow-xs transition-all"
                >
                  <span className="material-symbols-outlined text-[16px]">add</span>
                  <span>New File</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsFilesModalOpen(false);
                    setIsHistoryModalOpen(true);
                  }}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-surface-container-low hover:bg-surface-container-high text-on-surface border border-outline-variant/30 text-xs font-semibold transition-all"
                >
                  <span className="material-symbols-outlined text-[16px] text-secondary">history_edu</span>
                  <span>Import History</span>
                </button>
              </div>
            </div>

            {/* Files List Grid */}
            <div className="overflow-y-auto space-y-2.5 pr-1 flex-1">
              {filteredFiles.length === 0 ? (
                <div className="text-center py-10 text-xs text-on-surface-variant/70">
                  <span className="material-symbols-outlined text-[32px] opacity-40 mb-2 block">
                    search_off
                  </span>
                  No matching files found.
                </div>
              ) : (
                filteredFiles.map((file) => {
                  const isActive = file.id === activeFileId;
                  const filePresence = presenceByFile.get(file.id) || [];
                  const otherUsers = filePresence.filter((p) => p.userId !== myClientId);
                  const isRenaming = renamingFileId === file.id;
                  const estimatedTotal = getFileEstimatedTotal(file.draft);

                  return (
                    <InteractiveGlowCard
                      key={file.id}
                      enableTilt={false}
                      glowColor={isActive ? 'rgba(212, 175, 55, 0.4)' : 'rgba(26, 43, 60, 0.15)'}
                      className={`p-3.5 rounded-xl border transition-all ${
                        isActive
                          ? 'bg-primary/5 border-primary/40 shadow-sm'
                          : 'bg-surface-container-lowest border-outline-variant/30 hover:border-outline-variant/60'
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                        <div className="flex items-start gap-3 flex-1 min-w-0">
                          <div
                            className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
                              isActive
                                ? 'bg-primary text-white'
                                : 'bg-surface-container-low text-on-surface-variant'
                            }`}
                          >
                            <span className="material-symbols-outlined text-[18px]">
                              {isActive ? 'edit_document' : 'description'}
                            </span>
                          </div>

                          <div className="min-w-0 flex-1">
                            {/* Title & Presence */}
                            <div className="flex items-center gap-2 flex-wrap mb-1">
                              {isRenaming ? (
                                <form
                                  onSubmit={(e) => handleSaveRename(file.id, e)}
                                  className="flex items-center gap-1.5"
                                >
                                  <input
                                    type="text"
                                    value={renameInput}
                                    onChange={(e) => setRenameInput(e.target.value)}
                                    className="bg-surface border border-primary rounded-lg px-2 py-0.5 text-xs text-on-surface font-bold focus:outline-none"
                                    autoFocus
                                  />
                                  <button
                                    type="submit"
                                    className="text-primary hover:underline text-[11px] font-bold"
                                  >
                                    Save
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setRenamingFileId(null)}
                                    className="text-on-surface-variant text-[11px]"
                                  >
                                    Cancel
                                  </button>
                                </form>
                              ) : (
                                <h4 className="font-bold text-on-surface text-[14px] truncate">
                                  {file.name || 'Untitled Invoice'}
                                </h4>
                              )}

                              {isActive && (
                                <span className="bg-primary text-white text-[10px] px-2 py-0.5 rounded-full font-bold">
                                  Active in Editor
                                </span>
                              )}

                              {otherUsers.length > 0 && (
                                <span className="bg-secondary/15 text-secondary text-[10px] px-2 py-0.5 rounded-full font-bold border border-secondary/25 flex items-center gap-1">
                                  <span className="relative flex h-1.5 w-1.5">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-secondary opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-secondary"></span>
                                  </span>
                                  <span>{otherUsers.map((u) => u.userLabel).join(', ')} currently here</span>
                                </span>
                              )}
                            </div>

                            {/* Metadata */}
                            <p className="text-[11px] text-on-surface-variant/80 flex items-center gap-2 flex-wrap">
                              {file.invoiceNum && (
                                <span className="font-mono font-semibold text-primary">
                                  {file.invoiceNum}
                                </span>
                              )}
                              {estimatedTotal > 0 && (
                                <span>&bull; Est: KES {estimatedTotal.toLocaleString()}</span>
                              )}
                              <span>&bull; Edited {formatRelativeTime(file.updatedAt)}</span>
                              {file.lastEditedBy && <span>by {file.lastEditedBy}</span>}
                            </p>
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-center">
                          {!isActive && (
                            <button
                              type="button"
                              onClick={(e) => {
                                triggerSparkle(e);
                                onSwitchFile(file.id);
                                setIsFilesModalOpen(false);
                                toast.gold('File Switched', `Now editing "${file.name}".`);
                              }}
                              className="px-3 py-1.5 rounded-xl bg-primary hover:bg-primary-container text-white text-xs font-semibold shadow-xs transition-all flex items-center gap-1"
                            >
                              <span className="material-symbols-outlined text-[15px]">open_in_new</span>
                              <span>Open</span>
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={(e) => handleStartRename(file, e)}
                            className="p-1.5 rounded-lg text-on-surface-variant/70 hover:text-on-surface hover:bg-surface-container-low transition-colors"
                            title="Rename file"
                          >
                            <span className="material-symbols-outlined text-[16px]">edit</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              onDuplicateFile();
                              toast.info('File Duplicated', `Created a duplicate copy of "${file.name}".`);
                            }}
                            className="p-1.5 rounded-lg text-on-surface-variant/70 hover:text-primary hover:bg-primary/10 transition-colors"
                            title="Duplicate file"
                          >
                            <span className="material-symbols-outlined text-[16px]">content_copy</span>
                          </button>

                          {workspaceFiles.length > 1 && (
                            <button
                              type="button"
                              onClick={() => {
                                if (window.confirm(`Delete "${file.name}" from workspace?`)) {
                                  onDeleteFile(file.id);
                                  toast.info('File Deleted', `Removed "${file.name}".`);
                                }
                              }}
                              className="p-1.5 rounded-lg text-on-surface-variant/70 hover:text-error hover:bg-error/10 transition-colors"
                              title="Delete file"
                            >
                              <span className="material-symbols-outlined text-[16px]">delete</span>
                            </button>
                          )}
                        </div>
                      </div>
                    </InteractiveGlowCard>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. OPEN FROM SHARED HISTORY MODAL                                         */}
      {/* ========================================================================= */}
      {isHistoryModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-[#041627]/70 backdrop-blur-md"
            onClick={() => setIsHistoryModalOpen(false)}
          />
          <div className="relative w-full max-w-2xl bg-surface-container-lowest border border-outline-variant/40 rounded-2xl shadow-2xl p-5 md:p-6 z-10 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-outline-variant/20 mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-secondary/15 border border-secondary/30 flex items-center justify-center text-secondary">
                  <span className="material-symbols-outlined text-[20px]">history_edu</span>
                </div>
                <div>
                  <h3 className="font-headline-md text-[17px] text-on-surface font-bold">
                    Open Saved Document from Shared History
                  </h3>
                  <p className="text-xs text-on-surface-variant">
                    Pick any previous invoice to import directly into your live workspace as a new working file.
                  </p>
                </div>
              </div>

              <button
                onClick={() => setIsHistoryModalOpen(false)}
                className="text-on-surface-variant/60 hover:text-on-surface p-1 rounded-lg hover:bg-surface-container-low"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            {/* Search */}
            <div className="relative mb-4">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant/50 text-[18px]">
                search
              </span>
              <input
                type="text"
                placeholder="Search history by document name or client..."
                value={historySearch}
                onChange={(e) => setHistorySearch(e.target.value)}
                className="w-full bg-surface border border-outline-variant/40 rounded-xl py-2 pl-9 pr-3 text-xs text-on-surface focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                autoFocus
              />
            </div>

            {/* History List */}
            <div className="overflow-y-auto space-y-2.5 pr-1 flex-1">
              {filteredHistory.length === 0 ? (
                <div className="text-center py-10 text-xs text-on-surface-variant/70">
                  <span className="material-symbols-outlined text-[32px] opacity-40 mb-2 block">
                    receipt_long
                  </span>
                  No reusable history documents found. Generate or export an invoice to add to history.
                </div>
              ) : (
                filteredHistory.map((doc) => {
                  const clientName = doc.invoiceData?.header?.clientName || 'Saved Client';
                  const invoiceNum = doc.invoiceData?.header?.invoiceNum || '';
                  const total = getFileEstimatedTotal(doc.invoiceData);

                  return (
                    <div
                      key={doc.name}
                      className="p-3 rounded-xl border border-outline-variant/30 bg-surface-container-lowest hover:border-primary/40 transition-all flex items-center justify-between gap-3"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="material-symbols-outlined text-[24px] text-primary">
                          {doc.format === 'pdf' ? 'picture_as_pdf' : 'table_view'}
                        </span>
                        <div className="min-w-0">
                          <h4 className="font-bold text-on-surface text-xs truncate">
                            {doc.name}
                          </h4>
                          <p className="text-[11px] text-on-surface-variant/80">
                            {clientName} &bull; {invoiceNum || 'Quotation'}
                            {total > 0 && ` • KES ${total.toLocaleString()}`}
                            {doc.createdAt && ` • ${new Date(doc.createdAt).toLocaleDateString()}`}
                          </p>
                        </div>
                      </div>

                      <MagneticHoverButton
                        onClick={(e) => handleImportHistoryDoc(doc, e)}
                        variant="primary"
                        glowColor="rgba(212, 175, 55, 0.4)"
                        className="px-3 py-1.5 text-xs font-bold shrink-0 flex items-center gap-1"
                      >
                        <span className="material-symbols-outlined text-[15px] text-[#ffd700]">
                          file_open
                        </span>
                        <span>Open as File</span>
                      </MagneticHoverButton>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. CREATE NEW FILE MODAL                                                  */}
      {/* ========================================================================= */}
      {isNewFileModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-[#041627]/70 backdrop-blur-md"
            onClick={() => setIsNewFileModalOpen(false)}
          />
          <div className="relative w-full max-w-md bg-surface-container-lowest border border-outline-variant/40 rounded-2xl shadow-2xl p-6 z-10">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-[22px]">note_add</span>
                <h3 className="font-headline-md text-[17px] text-on-surface font-bold">
                  Create New Workspace File
                </h3>
              </div>
              <button
                onClick={() => setIsNewFileModalOpen(false)}
                className="text-on-surface-variant/60 hover:text-on-surface"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            <p className="text-xs text-on-surface-variant mb-4">
              Start a fresh quotation or invoice in workspace <strong className="text-primary">{workspaceId}</strong>. You can switch between files anytime.
            </p>

            <form onSubmit={handleCreateNew} className="flex flex-col gap-4">
              <div>
                <label className="block text-xs font-semibold text-on-surface mb-1">
                  File Title / Description
                </label>
                <input
                  type="text"
                  placeholder="e.g. VIP Gala Dinner Quotation or Client Name"
                  value={newFileNameInput}
                  onChange={(e) => setNewFileNameInput(e.target.value)}
                  className="w-full bg-surface border border-outline-variant rounded-xl py-2 px-3 text-xs text-on-surface focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                  autoFocus
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsNewFileModalOpen(false)}
                  className="px-3.5 py-2 text-xs font-semibold text-on-surface-variant hover:text-on-surface"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-bold text-white bg-primary hover:bg-primary-container rounded-xl shadow-sm"
                >
                  Create & Open
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
