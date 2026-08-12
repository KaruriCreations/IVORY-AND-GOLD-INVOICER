import React, { useState } from 'react';
import LineItemRow from './LineItemRow';
import TotalsSummary from './TotalsSummary';
import InteractiveGlowCard from './ui/InteractiveGlowCard';
import MagneticHoverButton from './ui/MagneticHoverButton';
import useSparkleBurst from './ui/SparkleBurst';
import { useToast } from './ui/Toast';

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
  const { trigger: triggerSparkle, SparkleOverlay } = useSparkleBurst();
  const toast = useToast();

  const handleAddSection = (e) => {
    triggerSparkle(e);
    addSection('NEW CATEGORY');
    toast.gold('Category Section Added', 'Customize the title and add event line items.');
  };

  const handleRemoveSection = (sectionId, title) => {
    removeSection(sectionId);
    toast.info('Category Removed', `Deleted section "${title || 'Category'}".`);
  };

  const handleAddItem = (sectionId, sectionTitle) => {
    addItem(sectionId);
    toast.success('Line Item Added', `Added item to ${sectionTitle || 'category'}.`);
  };

  const handleRemoveItem = (sectionId, itemId) => {
    removeItem(sectionId, itemId);
    toast.info('Item Removed', 'Deleted line item from table.');
  };

  return (
    <InteractiveGlowCard
      enableTilt={false}
      glowColor="rgba(200, 210, 248, 0.3)"
      className="bg-surface-container-lowest/90 backdrop-blur-sm border border-outline-variant/30 shadow-[0_4px_20px_-2px_rgba(26,43,60,0.06)] rounded-xl overflow-hidden flex flex-col"
    >
      <SparkleOverlay />
      <div className="p-md md:p-lg border-b border-outline-variant/30 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-sm bg-surface-container-low/50">
        <div className="flex items-center gap-sm">
          <span className="material-symbols-outlined text-primary text-[28px]">
            receipt_long
          </span>
          <div>
            <h2 className="font-headline-md text-headline-md text-on-surface">
              Line Items &amp; Categories
            </h2>
            <p className="font-body-sm text-xs text-on-surface-variant">
              Group your quotation into clear sections. Click any category to expand or collapse.
            </p>
          </div>
        </div>

        {/* Add Category Section Button */}
        <MagneticHoverButton
          onClick={handleAddSection}
          variant="outline"
          className="px-md py-sm rounded-xl font-label-md text-label-md text-primary bg-primary/5 hover:bg-primary/10 border-primary/20"
        >
          <span className="material-symbols-outlined text-[18px]">
            create_new_folder
          </span>
          <span>Add Category Section</span>
        </MagneticHoverButton>
      </div>

      {/* Table Container */}
      <div className="w-full overflow-x-auto overflow-y-hidden">
        <table className="w-full min-w-[900px] text-left border-collapse">
          <thead>
            <tr className="bg-[#C8D2F8] text-[#041627] font-label-md text-label-md border-b-2 border-black">
              <th className="py-sm px-md w-12 text-center font-bold"></th>
              <th className="py-sm px-md min-w-[280px] font-bold">DESCRIPTION</th>
              <th className="py-sm px-md w-28 text-center font-bold">QUANTITY</th>
              <th className="py-sm px-md w-36 text-right font-bold">UNIT PRICE (KES)</th>
              <th className="py-sm px-md w-40 text-right font-bold">TOTAL (KES)</th>
              <th className="py-sm px-md w-16 text-center font-bold"></th>
            </tr>
          </thead>
          <tbody>
            {sections.map((section, secIdx) => (
              <SectionBlock
                key={section.id}
                section={section}
                secIdx={secIdx}
                totalSections={sections.length}
                updateSectionTitle={updateSectionTitle}
                removeSection={() => handleRemoveSection(section.id, section.title)}
                addItem={() => handleAddItem(section.id, section.title)}
                removeItem={(itemId) => handleRemoveItem(section.id, itemId)}
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
            💡 <strong>Tip:</strong> Click on any category banner to rename it. You can collapse/expand sections to focus on specific deliverables.
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
    </InteractiveGlowCard>
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
  const [isCollapsed, setIsCollapsed] = useState(false);

  // Compute section subtotal
  const sectionTotal = section.items.reduce((sum, item) => {
    const qty = parseFloat(item.quantity) || 0;
    const price = parseFloat(item.unitPrice) || 0;
    return sum + qty * price;
  }, 0);

  return (
    <>
      {/* Category Section Header Row */}
      <tr className="bg-[#E0E7FD] border-y-2 border-black group">
        <td colSpan={5} className="py-2 px-md">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-sm flex-1 mr-4">
              {/* Accordion Collapse Toggle */}
              <button
                type="button"
                onClick={() => setIsCollapsed(!isCollapsed)}
                className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-black/10 text-primary transition-colors shrink-0"
                title={isCollapsed ? 'Expand section' : 'Collapse section'}
              >
                <span className="material-symbols-outlined text-[20px] transition-transform duration-200" style={{ transform: isCollapsed ? 'rotate(-90deg)' : 'rotate(0deg)' }}>
                  expand_more
                </span>
              </button>

              <input
                type="text"
                value={section.title}
                onChange={(e) => updateSectionTitle(section.id, e.target.value.toUpperCase())}
                placeholder="e.g. CATERING, DECOR, ENTERTAINMENT"
                className="bg-transparent font-bold text-left sm:text-center text-primary text-sm tracking-wider w-full max-w-md uppercase focus:outline-none focus:bg-white/60 px-2 py-1 rounded transition-colors"
              />

              {/* Collapsed Pill Preview */}
              {isCollapsed && (
                <span className="hidden sm:inline-flex items-center gap-2 px-3 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-semibold">
                  <span>{section.items.length} {section.items.length === 1 ? 'Item' : 'Items'}</span>
                  <span>•</span>
                  <span>KES {sectionTotal.toLocaleString('en-US')}</span>
                </span>
              )}
            </div>

            <div className="flex items-center gap-xs shrink-0">
              <button
                type="button"
                onClick={addItem}
                title="Add Item to this Category"
                className="flex items-center gap-1 text-xs font-semibold text-primary bg-primary/10 hover:bg-primary/20 px-2.5 py-1 rounded-md transition-colors"
              >
                <span className="material-symbols-outlined text-[15px]">add</span>
                <span>Add Item</span>
              </button>
              {totalSections > 1 && (
                <button
                  type="button"
                  onClick={removeSection}
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

      {/* Line Items for this Category (Collapsible) */}
      {!isCollapsed &&
        section.items.map((item) => (
          <LineItemRow
            key={item.id}
            item={item}
            onUpdate={(itemId, field, val) =>
              updateItem(section.id, itemId, field, val)
            }
            onDelete={(itemId) => removeItem(itemId)}
            canDelete={section.items.length > 1 || totalSections > 1}
          />
        ))}
    </>
  );
}
