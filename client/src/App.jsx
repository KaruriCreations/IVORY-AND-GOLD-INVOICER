import Header from './components/Header';
import ClientDetails from './components/ClientDetails';
import LineItemsTable from './components/LineItemsTable';
import ActionBar from './components/ActionBar';
import Footer from './components/Footer';
import { useInvoice } from './hooks/useInvoice';

export default function App() {
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
  } = useInvoice();

  return (
    <>
      <Header />

      <main className="w-full pt-16 bg-surface min-h-screen">
        <div className="flex flex-col w-full max-w-[1440px] mx-auto px-gutter md:px-lg py-xl gap-xl relative">
          {/* Background decorative blobs */}
          <div className="absolute top-0 right-0 w-[800px] h-[600px] bg-gradient-to-bl from-primary-fixed-dim/20 to-transparent blur-[120px] rounded-full pointer-events-none -z-10"></div>
          <div className="absolute bottom-20 left-10 w-[500px] h-[500px] bg-gradient-to-tr from-secondary-fixed-dim/10 to-transparent blur-[100px] rounded-full pointer-events-none -z-10"></div>

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