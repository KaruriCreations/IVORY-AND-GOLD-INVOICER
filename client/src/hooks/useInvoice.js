import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { recordWorkspaceActivity, getUserDisplayLabel } from '../services/workspaceCollabStore';
import { getWorkspaceId, getClientId } from '../services/historyStore';
import {
  broadcastLiveDraftUpdate,
  broadcastPresenceHeartbeat,
  subscribeToLiveWorkspaceSync,
  subscribeToLiveWorkspaceFiles,
  subscribeToWorkspacePresence,
  fetchRemoteWorkspaceFileDraft,
  shouldApplyRemoteDraft,
} from '../services/workspaceLiveSync';
import {
  getWorkspaceFiles,
  getActiveFileId,
  setActiveFileId as storeSetActiveFileId,
  getActiveWorkspaceFile,
  createWorkspaceFile,
  updateWorkspaceFileDraft,
  duplicateWorkspaceFile as storeDuplicateWorkspaceFile,
  renameWorkspaceFile as storeRenameWorkspaceFile,
  deleteWorkspaceFile as storeDeleteWorkspaceFile,
  subscribeToWorkspaceFiles,
  syncWorkspaceFilesWithServer,
} from '../services/workspaceFilesStore';

let nextSectionId = 2;
let nextItemId = 2;

const DEFAULT_SECTIONS = [
  {
    id: 1,
    title: 'CATERING',
    items: [
      {
        id: 1,
        description: '',
        quantity: 0,
        unitPrice: 0,
      },
    ],
  },
];

const DEFAULT_HEADER = {
  clientName: '',
  invoiceNum: '',
  preparedBy: '',
  date: new Date().toISOString().split('T')[0],
  dueDate: '',
};

const DEFAULT_EVENT_DETAILS = {
  noOfGuests: '',
  colors: '',
  dateOfFunction: '',
  eventType: '',
  venue: '',
  attn: '',
  sectionTitle: '',
};

function hasMeaningfulData(draft) {
  if (!draft) return false;
  const hasHeader = Boolean(
    draft.header?.clientName?.trim() ||
    draft.header?.invoiceNum?.trim() ||
    draft.header?.preparedBy?.trim()
  );
  const hasEvent = Boolean(
    draft.eventDetails?.venue?.trim() ||
    draft.eventDetails?.eventType?.trim() ||
    draft.eventDetails?.colors?.trim() ||
    draft.eventDetails?.noOfGuests?.trim() ||
    draft.eventDetails?.attn?.trim()
  );
  const hasItems = (draft.sections || []).some((sec) =>
    (sec.items || []).some(
      (item) => item.description?.trim() || Number(item.quantity) > 0 || Number(item.unitPrice) > 0
    )
  );
  const hasNotes = Boolean(draft.notes?.trim());
  return hasHeader || hasEvent || hasItems || hasNotes;
}

export function useInvoice() {
  const [activeWorkspaceId, setActiveWorkspaceId] = useState(() => getWorkspaceId());
  const myClientId = getClientId();
  const isSharedWorkspace = activeWorkspaceId !== myClientId && !activeWorkspaceId.startsWith('user_');

  // Multi-file state
  const [workspaceFiles, setWorkspaceFiles] = useState(() => getWorkspaceFiles(activeWorkspaceId));
  const [activeFileId, setActiveFileIdState] = useState(() => getActiveFileId(activeWorkspaceId));
  const [presenceList, setPresenceList] = useState([]);

  const activeFile = useMemo(() => {
    return workspaceFiles.find((f) => f.id === activeFileId) || workspaceFiles[0] || null;
  }, [workspaceFiles, activeFileId]);

  const initialDraft = activeFile?.draft;

  const [header, setHeader] = useState(() => initialDraft?.header || DEFAULT_HEADER);
  const [eventDetails, setEventDetails] = useState(() => initialDraft?.eventDetails || DEFAULT_EVENT_DETAILS);
  const [sections, setSections] = useState(() => {
    if (initialDraft?.sections && initialDraft.sections.length > 0) {
      let maxSecId = 1;
      let maxItemId = 1;
      const loaded = initialDraft.sections.map((sec, sIdx) => {
        const secId = Number(sec.id) || sIdx + 1;
        if (secId > maxSecId) maxSecId = secId;
        const items = (sec.items || []).map((item, iIdx) => {
          const itemId = Number(item.id) || (sIdx + 1) * 100 + iIdx + 1;
          if (itemId > maxItemId) maxItemId = itemId;
          return {
            id: itemId,
            description: item.description || '',
            quantity: Number(item.quantity) || 0,
            unitPrice: Number(item.unitPrice) || 0,
          };
        });
        return {
          id: secId,
          title: sec.title || 'CATEGORY',
          items: items.length > 0 ? items : [{ id: ++maxItemId, description: '', quantity: 0, unitPrice: 0 }],
        };
      });
      nextSectionId = maxSecId + 1;
      nextItemId = maxItemId + 1;
      return loaded;
    }
    return DEFAULT_SECTIONS;
  });
  const [taxRate, setTaxRate] = useState(() => (initialDraft ? Number(initialDraft.taxRate) || 0 : 0));
  const [notes, setNotes] = useState(() => initialDraft?.notes || '');
  const [lastSaved, setLastSaved] = useState(() => initialDraft?.updatedAt ? new Date(initialDraft.updatedAt) : null);
  const [isRestoredFromDraft, setIsRestoredFromDraft] = useState(() => Boolean(initialDraft && hasMeaningfulData(initialDraft)));
  const [lastRemoteEditor, setLastRemoteEditor] = useState(null);

  const isIncomingRemoteUpdate = useRef(false);
  const lastSavedRef = useRef(lastSaved);
  lastSavedRef.current = lastSaved;

  // Bulk-load saved invoice data into form
  const loadInvoice = useCallback((data) => {
    if (!data) return;

    setHeader({
      clientName: data.header?.clientName || '',
      invoiceNum: data.header?.invoiceNum || '',
      preparedBy: data.header?.preparedBy || '',
      date: data.header?.date || new Date().toISOString().split('T')[0],
      dueDate: data.header?.dueDate || '',
    });

    setEventDetails({
      noOfGuests: data.eventDetails?.noOfGuests || '',
      colors: data.eventDetails?.colors || '',
      dateOfFunction: data.eventDetails?.dateOfFunction || '',
      eventType: data.eventDetails?.eventType || '',
      venue: data.eventDetails?.venue || '',
      attn: data.eventDetails?.attn || '',
      sectionTitle: data.eventDetails?.sectionTitle || '',
    });

    if (data.sections && data.sections.length > 0) {
      let secId = nextSectionId;
      let itmId = nextItemId;
      const loadedSections = data.sections.map((sec) => {
        const sectionId = secId++;
        return {
          id: sectionId,
          title: sec.title || 'CATEGORY',
          items: (sec.items || []).map((item) => ({
            id: itmId++,
            description: item.description || '',
            quantity: Number(item.quantity) || 0,
            unitPrice: Number(item.unitPrice) || 0,
          })),
        };
      });
      nextSectionId = secId;
      nextItemId = itmId;
      setSections(loadedSections);
    } else {
      setSections(DEFAULT_SECTIONS);
    }

    setTaxRate(Number(data.taxRate) || 0);
    setNotes(data.notes || '');
    setIsRestoredFromDraft(false);
  }, []);

  // Reset current invoice form
  const resetInvoice = useCallback(() => {
    setHeader(DEFAULT_HEADER);
    setEventDetails(DEFAULT_EVENT_DETAILS);
    setSections(DEFAULT_SECTIONS);
    setTaxRate(0);
    setNotes('');
    setLastSaved(null);
    setIsRestoredFromDraft(false);

    updateWorkspaceFileDraft(activeWorkspaceId, activeFileId, null, getUserDisplayLabel(myClientId));
  }, [activeWorkspaceId, activeFileId, myClientId]);

  // Listen to workspace switches from Header / WorkspaceModal
  useEffect(() => {
    const handleWsChanged = (e) => {
      const nextWs = e?.detail?.workspaceId || getWorkspaceId();
      setActiveWorkspaceId(nextWs);
      const wsFiles = getWorkspaceFiles(nextWs);
      const wsActiveId = getActiveFileId(nextWs);
      setWorkspaceFiles(wsFiles);
      setActiveFileIdState(wsActiveId);
      const activeF = wsFiles.find((f) => f.id === wsActiveId) || wsFiles[0];
      if (activeF?.draft) {
        loadInvoice(activeF.draft);
        setLastSaved(activeF.draft.updatedAt ? new Date(activeF.draft.updatedAt) : null);
        setIsRestoredFromDraft(true);
      } else {
        setHeader(DEFAULT_HEADER);
        setEventDetails(DEFAULT_EVENT_DETAILS);
        setSections(DEFAULT_SECTIONS);
        setTaxRate(0);
        setNotes('');
        setLastSaved(null);
        setIsRestoredFromDraft(false);
      }
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('workspace-changed', handleWsChanged);
      return () => window.removeEventListener('workspace-changed', handleWsChanged);
    }
  }, [loadInvoice]);

  // Listen to external workspace file list changes and server sync
  useEffect(() => {
    const unsubLocal = subscribeToWorkspaceFiles(activeWorkspaceId, ({ files, activeFileId: newActiveId }) => {
      setWorkspaceFiles(files);
      if (newActiveId && newActiveId !== activeFileId) {
        setActiveFileIdState(newActiveId);
        const target = files.find((f) => f.id === newActiveId);
        if (target && target.draft) {
          loadInvoice(target.draft);
          setLastSaved(target.draft.updatedAt ? new Date(target.draft.updatedAt) : new Date());
          setIsRestoredFromDraft(true);
        }
      }
    });

    const unsubLive = subscribeToLiveWorkspaceFiles(activeWorkspaceId, (files) => {
      setWorkspaceFiles(getWorkspaceFiles(activeWorkspaceId));
    });

    return () => {
      unsubLocal();
      unsubLive();
    };
  }, [activeWorkspaceId, activeFileId, loadInvoice]);

  // Switch to another file in the workspace
  const switchFile = useCallback((targetFileId) => {
    if (!targetFileId || targetFileId === activeFileId) return;

    // 1. Save current active file draft first
    const now = new Date();
    const currentDraft = {
      header,
      eventDetails,
      sections,
      taxRate,
      notes,
      updatedAt: now.toISOString(),
    };
    updateWorkspaceFileDraft(activeWorkspaceId, activeFileId, currentDraft, getUserDisplayLabel(myClientId));

    // 2. Set new active file in store
    storeSetActiveFileId(activeWorkspaceId, targetFileId);
    setActiveFileIdState(targetFileId);

    // 3. Load target file draft
    const files = getWorkspaceFiles(activeWorkspaceId);
    const target = files.find((f) => f.id === targetFileId);
    if (target && target.draft) {
      loadInvoice(target.draft);
      setLastSaved(target.draft.updatedAt ? new Date(target.draft.updatedAt) : new Date());
      setIsRestoredFromDraft(true);
    } else {
      // Blank default for this file
      setHeader(DEFAULT_HEADER);
      setEventDetails(DEFAULT_EVENT_DETAILS);
      setSections(DEFAULT_SECTIONS);
      setTaxRate(0);
      setNotes('');
      setLastSaved(null);
      setIsRestoredFromDraft(false);
    }

    // Always fetch latest authoritative draft from server in shared workspace to ensure 100% freshness
    if (isSharedWorkspace) {
      fetchRemoteWorkspaceFileDraft(activeWorkspaceId, targetFileId).then((remoteData) => {
        if (remoteData && remoteData.draft) {
          if (getActiveFileId(activeWorkspaceId) === targetFileId) {
            loadInvoice(remoteData.draft);
            setLastSaved(remoteData.updatedAt ? new Date(remoteData.updatedAt) : new Date());
            setIsRestoredFromDraft(true);
          }
        }
      }).catch(() => {});
    }

    setLastRemoteEditor(null);

    // Record switch in workspace activity
    recordWorkspaceActivity({
      workspaceId: activeWorkspaceId,
      userId: myClientId,
      action: 'SWITCH_FILE',
      details: `Switched to file "${target?.name || 'Invoice'}"`,
      fileId: targetFileId,
      fileName: target?.name,
    });

    // Broadcast presence change immediately
    broadcastPresenceHeartbeat({
      workspaceId: activeWorkspaceId,
      fileId: targetFileId,
      userId: myClientId,
      userLabel: getUserDisplayLabel(myClientId),
    });
  }, [activeFileId, activeWorkspaceId, header, eventDetails, sections, taxRate, notes, myClientId, loadInvoice]);

  // Create a new file in workspace
  const createNewFile = useCallback((draftData = null, customName = '') => {
    const newFile = createWorkspaceFile(activeWorkspaceId, draftData, customName, getUserDisplayLabel(myClientId));
    setWorkspaceFiles(getWorkspaceFiles(activeWorkspaceId));
    setActiveFileIdState(newFile.id);

    if (draftData) {
      loadInvoice(draftData);
    } else {
      setHeader(DEFAULT_HEADER);
      setEventDetails(DEFAULT_EVENT_DETAILS);
      setSections(DEFAULT_SECTIONS);
      setTaxRate(0);
      setNotes('');
      setLastSaved(null);
      setIsRestoredFromDraft(false);
    }

    recordWorkspaceActivity({
      workspaceId: activeWorkspaceId,
      userId: myClientId,
      action: 'CREATE_FILE',
      details: `Created new invoice file "${newFile.name}"`,
      fileId: newFile.id,
      fileName: newFile.name,
    });

    return newFile;
  }, [activeWorkspaceId, myClientId, loadInvoice]);

  // Duplicate current active file
  const duplicateCurrentFile = useCallback(() => {
    const newFile = storeDuplicateWorkspaceFile(activeWorkspaceId, activeFileId, getUserDisplayLabel(myClientId));
    if (newFile) {
      setWorkspaceFiles(getWorkspaceFiles(activeWorkspaceId));
      setActiveFileIdState(newFile.id);
      if (newFile.draft) {
        loadInvoice(newFile.draft);
      }
      recordWorkspaceActivity({
        workspaceId: activeWorkspaceId,
        userId: myClientId,
        action: 'DUPLICATE_FILE',
        details: `Duplicated file to create "${newFile.name}"`,
        fileId: newFile.id,
        fileName: newFile.name,
      });
    }
    return newFile;
  }, [activeWorkspaceId, activeFileId, myClientId, loadInvoice]);

  // Rename a workspace file
  const renameFile = useCallback((fileId, newName) => {
    storeRenameWorkspaceFile(activeWorkspaceId, fileId, newName, getUserDisplayLabel(myClientId));
    setWorkspaceFiles(getWorkspaceFiles(activeWorkspaceId));
  }, [activeWorkspaceId, myClientId]);

  // Delete a workspace file
  const deleteFile = useCallback((fileId) => {
    const files = getWorkspaceFiles(activeWorkspaceId);
    const target = files.find((f) => f.id === fileId);
    storeDeleteWorkspaceFile(activeWorkspaceId, fileId);

    const updatedFiles = getWorkspaceFiles(activeWorkspaceId);
    setWorkspaceFiles(updatedFiles);

    if (activeFileId === fileId) {
      const nextActiveId = getActiveFileId(activeWorkspaceId);
      setActiveFileIdState(nextActiveId);
      const nextActive = updatedFiles.find((f) => f.id === nextActiveId);
      if (nextActive && nextActive.draft) {
        loadInvoice(nextActive.draft);
      } else {
        setHeader(DEFAULT_HEADER);
        setEventDetails(DEFAULT_EVENT_DETAILS);
        setSections(DEFAULT_SECTIONS);
        setTaxRate(0);
        setNotes('');
        setLastSaved(null);
        setIsRestoredFromDraft(false);
      }
    }

    recordWorkspaceActivity({
      workspaceId: activeWorkspaceId,
      userId: myClientId,
      action: 'DELETE_FILE',
      details: `Deleted file "${target?.name || 'Invoice'}"`,
      fileId,
    });
  }, [activeWorkspaceId, activeFileId, myClientId, loadInvoice]);

  // Auto-save & live broadcast for active file
  useEffect(() => {
    if (isIncomingRemoteUpdate.current) {
      isIncomingRemoteUpdate.current = false;
      return;
    }

    try {
      const now = new Date();
      const draftData = {
        header,
        eventDetails,
        sections,
        taxRate,
        notes,
        updatedAt: now.toISOString(),
      };

      if (hasMeaningfulData(draftData)) {
        updateWorkspaceFileDraft(activeWorkspaceId, activeFileId, draftData, getUserDisplayLabel(myClientId));
        setLastSaved(now);

        // Broadcast to peers working on this same file in shared workspace
        if (isSharedWorkspace) {
          broadcastLiveDraftUpdate({
            workspaceId: activeWorkspaceId,
            fileId: activeFileId,
            userId: myClientId,
            userLabel: getUserDisplayLabel(myClientId),
            draft: draftData,
            timestamp: now.toISOString(),
          });
        }
      }
    } catch (e) {
      console.warn('Auto-save failed:', e);
    }
  }, [header, eventDetails, sections, taxRate, notes, isSharedWorkspace, activeWorkspaceId, activeFileId, myClientId]);

  // Subscribe to real-time live remote draft updates for the active file
  useEffect(() => {
    if (!isSharedWorkspace) {
      setLastRemoteEditor(null);
      return;
    }

    const unsubscribe = subscribeToLiveWorkspaceSync(
      activeWorkspaceId,
      activeFileId,
      (remoteUpdate) => {
        if (shouldApplyRemoteDraft(remoteUpdate, lastSavedRef.current?.toISOString(), myClientId, activeFileId)) {
          isIncomingRemoteUpdate.current = true;
          loadInvoice(remoteUpdate.draft);
          setLastRemoteEditor(remoteUpdate.userLabel || 'Team Member');
          if (remoteUpdate.timestamp) {
            setLastSaved(new Date(remoteUpdate.timestamp));
          }
        }
      },
      myClientId
    );

    return () => unsubscribe();
  }, [activeWorkspaceId, activeFileId, isSharedWorkspace, myClientId, loadInvoice]);

  // Heartbeat presence in active file
  useEffect(() => {
    if (!isSharedWorkspace) return;

    broadcastPresenceHeartbeat({
      workspaceId: activeWorkspaceId,
      fileId: activeFileId,
      userId: myClientId,
      userLabel: getUserDisplayLabel(myClientId),
    });

    const interval = setInterval(() => {
      broadcastPresenceHeartbeat({
        workspaceId: activeWorkspaceId,
        fileId: activeFileId,
        userId: myClientId,
        userLabel: getUserDisplayLabel(myClientId),
      });
    }, 6000);

    const unsubPresence = subscribeToWorkspacePresence(
      activeWorkspaceId,
      (presence) => {
        setPresenceList((prev) => {
          const filtered = prev.filter((p) => p.userId !== presence.userId);
          return [...filtered, presence];
        });
      },
      myClientId
    );

    return () => {
      clearInterval(interval);
      unsubPresence();
    };
  }, [activeWorkspaceId, activeFileId, isSharedWorkspace, myClientId]);

  const clearDraft = useCallback(() => {
    resetInvoice();
  }, [resetInvoice]);

  const updateHeader = useCallback((field, value) => {
    setHeader((prev) => ({ ...prev, [field]: value }));
  }, []);

  const updateEventDetails = useCallback((field, value) => {
    setEventDetails((prev) => ({ ...prev, [field]: value }));
  }, []);

  // Section management
  const addSection = useCallback((title = 'NEW CATEGORY') => {
    const formattedTitle = title.toUpperCase();
    setSections((prev) => [
      ...prev,
      {
        id: nextSectionId++,
        title: formattedTitle,
        items: [
          {
            id: nextItemId++,
            description: '',
            quantity: 1,
            unitPrice: 0,
          },
        ],
      },
    ]);

    recordWorkspaceActivity({
      workspaceId: getWorkspaceId(),
      userId: getClientId(),
      action: 'ADD_SECTION',
      details: `Added new section "${formattedTitle}"`,
      fileId: activeFileId,
    });
  }, [activeFileId]);

  const removeSection = useCallback((sectionId) => {
    setSections((prev) => {
      if (prev.length <= 1) return prev;
      const target = prev.find((s) => s.id === sectionId);
      recordWorkspaceActivity({
        workspaceId: getWorkspaceId(),
        userId: getClientId(),
        action: 'REMOVE_SECTION',
        details: `Removed section "${target?.title || 'Section'}"`,
        fileId: activeFileId,
      });
      return prev.filter((s) => s.id !== sectionId);
    });
  }, [activeFileId]);

  const updateSectionTitle = useCallback((sectionId, title) => {
    setSections((prev) =>
      prev.map((s) => (s.id === sectionId ? { ...s, title } : s))
    );
  }, []);

  // Item management within sections
  const addItem = useCallback((sectionId) => {
    setSections((prev) =>
      prev.map((s) => {
        if (s.id === sectionId) {
          recordWorkspaceActivity({
            workspaceId: getWorkspaceId(),
            userId: getClientId(),
            action: 'ADD_ITEM',
            details: `Added a new line item to "${s.title}"`,
            fileId: activeFileId,
          });
          return {
            ...s,
            items: [
              ...s.items,
              { id: nextItemId++, description: '', quantity: 1, unitPrice: 0 },
            ],
          };
        }
        return s;
      })
    );
  }, [activeFileId]);

  const removeItem = useCallback((sectionId, itemId) => {
    setSections((prev) =>
      prev.map((s) => {
        if (s.id === sectionId) {
          const newItems = s.items.filter((item) => item.id !== itemId);
          recordWorkspaceActivity({
            workspaceId: getWorkspaceId(),
            userId: getClientId(),
            action: 'REMOVE_ITEM',
            details: `Removed a line item from "${s.title}"`,
            fileId: activeFileId,
          });
          return {
            ...s,
            items: newItems.length > 0 ? newItems : s.items,
          };
        }
        return s;
      })
    );
  }, [activeFileId]);

  const updateItem = useCallback((sectionId, itemId, field, value) => {
    setSections((prev) =>
      prev.map((s) => {
        if (s.id === sectionId) {
          return {
            ...s,
            items: s.items.map((item) =>
              item.id === itemId ? { ...item, [field]: value } : item
            ),
          };
        }
        return s;
      })
    );
  }, []);

  // Flatten all items for calculations
  const allItems = useMemo(
    () => sections.flatMap((s) => s.items || []),
    [sections]
  );

  const subtotal = useMemo(
    () =>
      Math.round(
        allItems.reduce(
          (sum, item) =>
            sum + (Number(item.quantity) || 0) * (Number(item.unitPrice) || 0),
          0
        ) * 100
      ) / 100,
    [allItems]
  );

  const taxAmount = useMemo(
    () =>
      Math.round(subtotal * ((Number(taxRate) || 0) / 100) * 100) / 100,
    [subtotal, taxRate]
  );

  const grandTotal = useMemo(
    () => Math.round((subtotal + taxAmount) * 100) / 100,
    [subtotal, taxAmount]
  );

  // Build the payload for the API
  const getPayload = useCallback(
    (format) => ({
      header: {
        ...header,
        clientName: header.clientName.trim(),
        invoiceNum:
          header.invoiceNum.trim() || `QUO-${new Date().getFullYear()}-001`,
        date: header.date || new Date().toISOString().split('T')[0],
      },
      eventDetails: {
        ...eventDetails,
        noOfGuests: eventDetails.noOfGuests.trim(),
        colors: eventDetails.colors.trim(),
        dateOfFunction: eventDetails.dateOfFunction.trim(),
        eventType: eventDetails.eventType.trim(),
        venue: eventDetails.venue.trim(),
        attn: eventDetails.attn.trim(),
      },
      sections: sections.map((sec) => ({
        title: sec.title.trim() || 'CATEGORY',
        items: sec.items.map(({ description, quantity, unitPrice }) => ({
          description: description.trim(),
          quantity: Number(quantity) || 0,
          unitPrice: Number(unitPrice) || 0,
        })),
      })),
      items: allItems.map(({ description, quantity, unitPrice }) => ({
        description: description.trim(),
        quantity: Number(quantity) || 0,
        unitPrice: Number(unitPrice) || 0,
      })),
      taxRate: Math.max(0, Number(taxRate) || 0),
      notes: notes.trim(),
      format,
    }),
    [header, eventDetails, sections, allItems, taxRate, notes]
  );

  return {
    header,
    updateHeader,
    eventDetails,
    updateEventDetails,
    sections,
    addSection,
    removeSection,
    updateSectionTitle,
    addItem,
    removeItem,
    updateItem,
    taxRate,
    setTaxRate,
    notes,
    setNotes,
    subtotal,
    taxAmount,
    grandTotal,
    getPayload,
    loadInvoice,
    resetInvoice,
    clearDraft,
    lastSaved,
    isRestoredFromDraft,
    setIsRestoredFromDraft,
    lastRemoteEditor,
    isSharedWorkspace,
    // Multi-file workspace capabilities
    activeFile,
    activeFileId,
    workspaceFiles,
    presenceList,
    switchFile,
    createNewFile,
    duplicateCurrentFile,
    renameFile,
    deleteFile,
  };
}
