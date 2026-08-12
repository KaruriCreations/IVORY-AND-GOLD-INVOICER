import { useState, useCallback, useMemo } from 'react';

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

export function useInvoice() {
  const [header, setHeader] = useState(DEFAULT_HEADER);
  const [eventDetails, setEventDetails] = useState(DEFAULT_EVENT_DETAILS);
  const [sections, setSections] = useState(DEFAULT_SECTIONS);
  const [taxRate, setTaxRate] = useState(0); // Standard Kenyan quotation format
  const [notes, setNotes] = useState('');

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
  };
}
