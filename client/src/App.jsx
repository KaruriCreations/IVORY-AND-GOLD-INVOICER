import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import Header from './components/Header';
import ClientDetails from './components/ClientDetails';
import LineItemsTable from './components/LineItemsTable';
import ActionBar from './components/ActionBar';
import Footer from './components/Footer';
import AmbientLuxuryBackground from './components/ui/AmbientLuxuryBackground';
import { useToast } from './components/ui/Toast';
import { generateDocument } from './services/api';
import { useInvoice } from './hooks/useInvoice';

export default function App() {
  const location = useLocation();
  const toast = useToast();

  const {
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
    subtotal,
    taxAmount,
    grandTotal,
    getPayload,
    loadInvoice,
  } = useInvoice();

  // Hydrate form when navigating from History with saved invoice data
  useEffect(() => {
    if (location.state?.invoiceData) {
      loadInvoice(location.state.invoiceData);
      toast.gold('Invoice Loaded for Re-Editing', 'Pre-filled all event details & line items from history.');
      // Clear the state so a browser refresh doesn't re-load stale data
      window.history.replaceState({}, '');
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleQuickExport = async (format) => {
    try {
      await generateDocument(getPayload, format);
      if (format === 'pdf') {
        toast.gold('PDF Generated Successfully', 'Your invoice PDF has been downloaded & archived to History.');
      } else {
        toast.success('Excel Spreadsheet Exported', 'Your branded .xlsx file is downloaded & ready.');
      }
    } catch (err) {
      toast.error('Export Failed', err.message || 'Could not generate document');
    }
  };

  return (
    <>
      <Header
        onExportPdf={() => handleQuickExport('pdf')}
        onExportXlsx={() => handleQuickExport('xlsx')}
        onAddSection={() => {
          addSection('NEW CATEGORY');
          toast.gold('Category Section Added', 'Added new section to line items table.');
        }}
      />
      <AmbientLuxuryBackground />

      <main className="w-full pt-16 bg-surface/50 min-h-screen relative z-10">
        <div className="flex flex-col w-full max-w-[1440px] mx-auto px-gutter md:px-lg py-xl gap-xl relative">
          <ClientDetails
            header={header}
            updateHeader={updateHeader}
            eventDetails={eventDetails}
            updateEventDetails={updateEventDetails}
          />

          <LineItemsTable
            sections={sections}
            addSection={addSection}
            removeSection={removeSection}
            updateSectionTitle={updateSectionTitle}
            addItem={addItem}
            removeItem={removeItem}
            updateItem={updateItem}
            taxRate={taxRate}
            setTaxRate={setTaxRate}
            subtotal={subtotal}
            taxAmount={taxAmount}
            grandTotal={grandTotal}
          />

          <ActionBar getPayload={getPayload} />
        </div>
      </main>

      <Footer />
    </>
  );
}