import LineItemRow from './LineItemRow';
import TotalsSummary from './TotalsSummary';

export default function LineItemsTable({
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
}) {
  return (
    <section className="bg-surface-container-lowest shadow-[0_4px_6px_-1px_rgba(26,43,60,0.05),0_2px_4px_-1px_rgba(26,43,60,0.03)] rounded-xl overflow-hidden flex flex-col transition-transform duration-300 hover:-translate-y-[2px] hover:shadow-[0_12px_24px_-4px_rgba(26,43,60,0.08)]">
      <div className="p-md md:p-lg border-b border-outline-variant/30 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-sm bg-surface-container-low/50">
        <h2 className="font-headline-md text-headline-md text-on-surface flex items-center gap-sm">
          <span className="material-symbols-outlined text-primary">
            receipt_long
          </span>
          Line Items &amp; Categories
        </h2>

        {/* Add Category Section Button */}
        <button
          onClick={() => addSection('NEW CATEGORY')}
          className="flex items-center gap-xs font-label-md text-label-md text-primary hover:text-primary-container bg-primary/10 hover:bg-primary/20 px-md py-sm rounded-lg transition-all active:scale-[0.98] shadow-sm"
        >
          <span className="material-symbols-outlined text-[18px]">
            create_new_folder
          </span>
          <span>Add Category Section</span>
        </button>
      </div>

      {/* Table Container */}
      <div className="w-full overflow-x-auto overflow-y-hidden">
        <table className="w-full min-w-[900px] text-left border-collapse">
          <thead>
            <tr className="bg-[#C8D2F8] text-[#041627] font-label-md text-label-md border-b-2 border-black">
              <th className="py-sm px-md w-12 text-center font-bold"></th>
              <th className="py-sm px-md min-w-[260px] font-bold">DESCRIPTION</th>
              <th className="py-sm px-md w-32 min-w-[100px] text-right font-bold">QUANTITY</th>
              <th className="py-sm px-md w-48 min-w-[170px] text-right font-bold whitespace-nowrap">UNIT PRICE</th>
              <th className="py-sm px-md w-44 min-w-[130px] text-right font-bold">TOTAL</th>
              <th className="py-sm px-md w-16 text-center font-bold">ACT</th>
            </tr>
          </thead>
          <tbody className="font-body-md text-body-md text-on-surface">
            {sections.map((section, secIdx) => (
              <SectionBlock
                key={section.id}
                section={section}
                secIdx={secIdx}
                totalSections={sections.length}
                updateSectionTitle={updateSectionTitle}
                removeSection={removeSection}
                addItem={addItem}
                removeItem={removeItem}
                updateItem={updateItem}
              />
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile scroll hint */}
      <div className="flex md:hidden items-center justify-center gap-xs py-2 text-on-surface-variant/50">
        <span className="material-symbols-outlined text-[14px] animate-pulse">swipe</span>
        <span className="font-label-sm text-label-sm">Swipe to see all columns</span>
      </div>

      {/* Actions & Totals Area */}
      <div className="flex flex-col lg:flex-row justify-between items-start p-md md:p-lg bg-surface-container-low/30 gap-lg border-t border-outline-variant/30">
        <div className="flex flex-col gap-sm">
          <p className="font-body-sm text-body-sm text-on-surface-variant max-w-sm">
            💡 <strong>Tip:</strong> Click on any category banner to rename it (e.g. <em>CATERING</em>, <em>DECOR</em>, <em>ENTERTAINMENT</em>). You can add as many sections and rows as needed.
          </p>
        </div>

        {/* Summary Card */}
        <TotalsSummary
          subtotal={subtotal}
          taxRate={taxRate}
          setTaxRate={setTaxRate}
          taxAmount={taxAmount}
          grandTotal={grandTotal}
        />
      </div>
    </section>
  );
}

function SectionBlock({
  section,
  secIdx,
  totalSections,
  updateSectionTitle,
  removeSection,
  addItem,
  removeItem,
  updateItem,
}) {
  return (
    <>
      {/* Category Section Header Row */}
      <tr className="bg-[#E0E7FD] border-y-2 border-black group">
        <td colSpan={5} className="py-2 px-md">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-sm flex-1">
              <span className="material-symbols-outlined text-primary text-[20px]">
                folder_open
              </span>
              <input
                type="text"
                value={section.title}
                onChange={(e) => updateSectionTitle(section.id, e.target.value.toUpperCase())}
                placeholder="e.g. CATERING, DECOR, ENTERTAINMENT"
                className="bg-transparent font-bold text-center text-primary text-sm tracking-wider w-full uppercase focus:outline-none focus:bg-white/60 px-2 py-1 rounded transition-colors"
              />
            </div>
            <div className="flex items-center gap-xs">
              <button
                onClick={() => addItem(section.id)}
                title="Add Item to this Category"
                className="flex items-center gap-1 text-xs font-semibold text-primary bg-primary/10 hover:bg-primary/20 px-2.5 py-1 rounded-md transition-colors"
              >
                <span className="material-symbols-outlined text-[15px]">add</span>
                <span>Add Item</span>
              </button>
              {totalSections > 1 && (
                <button
                  onClick={() => removeSection(section.id)}
                  title="Delete this Category Section"
                  className="text-on-surface-variant/50 hover:text-error transition-colors p-1 rounded-full hover:bg-error-container/20"
                >
                  <span className="material-symbols-outlined text-[18px]">
                    delete_sweep
                  </span>
                </button>
              )}
            </div>
          </div>
        </td>
        <td className="text-center py-2 px-md"></td>
      </tr>

      {/* Line Items for this Category */}
      {section.items.map((item) => (
        <LineItemRow
          key={item.id}
          item={item}
          onUpdate={(itemId, field, val) =>
            updateItem(section.id, itemId, field, val)
          }
          onDelete={(itemId) => removeItem(section.id, itemId)}
          canDelete={section.items.length > 1 || totalSections > 1}
        />
      ))}
    </>
  );
}
