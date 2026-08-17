import { useState, useCallback, useMemo, useEffect, useRef } from 'react';

const DRAFT_STORAGE_KEY = 'ivory_gold_invoice_draft_v1';

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

function loadInitialDraft() {
  try {
    const raw = typeof window !== 'undefined' ? localStorage.getItem(DRAFT_STORAGE_KEY) : null;
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object' && hasMeaningfulData(parsed)) {
      return parsed;
    }
  } catch (e) {
    console.warn('Failed to load draft from localStorage:', e);
  }
  return null;
}

export function useInvoice() {
  const initialDraftRef = useRef(loadInitialDraft());
  const initialDraft = initialDraftRef.current;

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
  const [isRestoredFromDraft, setIsRestoredFromDraft] = useState(() => Boolean(initialDraft));

  // Auto-save to localStorage on state changes
  useEffect(() => {
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
        localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(draftData));
        setLastSaved(now);
      }
    } catch (e) {
      console.warn('Auto-save to localStorage failed:', e);
    }
  }, [header, eventDetails, sections, taxRate, notes]);

  // Bulk-load saved invoice data (e.g. from History or Template)
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
    }

    setTaxRate(Number(data.taxRate) || 0);
    setNotes(data.notes || '');
    setIsRestoredFromDraft(false);
  }, []);

  // Reset form to blank defaults and clear saved draft
  const resetInvoice = useCallback(() => {
    try {
      localStorage.removeItem(DRAFT_STORAGE_KEY);
    } catch (e) {
      console.warn('Failed to clear draft:', e);
    }
    setHeader(DEFAULT_HEADER);
    setEventDetails(DEFAULT_EVENT_DETAILS);
    setSections(DEFAULT_SECTIONS);
    setTaxRate(0);
    setNotes('');
    setLastSaved(null);
    setIsRestoredFromDraft(false);
  }, []);

  const clearDraft = useCallback(() => {
    try {
      localStorage.removeItem(DRAFT_STORAGE_KEY);
      setLastSaved(null);
    } catch (e) {
      console.warn('Failed to clear draft:', e);
    }
  }, []);

  const updateHeader = useCallback((field, value) => {
    setHeader((prev) => ({ ...prev, [field]: value }));
  }, []);

  const updateEventDetails = useCallback((field, value) => {
    setEventDetails((prev) => ({ ...prev, [field]: value }));
  }, []);

  // Section management
  const addSection = useCallback((title = 'NEW CATEGORY') => {
    setSections((prev) => [
      ...prev,
      {
        id: nextSectionId++,
        title: title.toUpperCase(),
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
  }, []);

  const removeSection = useCallback((sectionId) => {
    setSections((prev) => {
      if (prev.length <= 1) return prev;
      return prev.filter((s) => s.id !== sectionId);
    });
  }, []);

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
  }, []);

  const removeItem = useCallback((sectionId, itemId) => {
    setSections((prev) =>
      prev.map((s) => {
        if (s.id === sectionId) {
          const newItems = s.items.filter((item) => item.id !== itemId);
          return {
            ...s,
            items: newItems.length > 0 ? newItems : s.items,
          };
        }
        return s;
      })
    );
  }, []);

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
  };
}
