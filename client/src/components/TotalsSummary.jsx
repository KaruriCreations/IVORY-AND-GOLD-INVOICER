function formatKSh(num) {
  return `KSh${Number(num).toLocaleString('en-KE', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export default function TotalsSummary({
  subtotal,
  taxRate,
  setTaxRate,
  taxAmount,
  grandTotal,
}) {
  return (
    <div className="w-full lg:w-96 bg-surface-container-lowest rounded-xl p-md border border-outline-variant/30 shadow-sm">
      <div className="flex justify-between items-center py-xs mb-xs">
        <span className="font-body-md text-body-md text-on-surface-variant">
          Subtotal
        </span>
        <span
          className="font-mono text-on-surface font-label-md"
          style={{ transition: 'opacity 0.2s ease-in' }}
        >
          {formatKSh(subtotal)}
        </span>
      </div>

      <div className="flex justify-between items-center py-xs mb-sm group">
        <span className="font-body-md text-body-md text-on-surface-variant flex items-center gap-xs">
          Tax Rate{' '}
          <span
            className="material-symbols-outlined text-[14px] text-on-surface-variant/50 cursor-help"
            title="Applied to subtotal"
          >
            info
          </span>
        </span>
        <div className="flex items-center justify-end">
          <input
            type="number"
            value={taxRate}
            min="0"
            step="0.1"
            onChange={(e) => setTaxRate(parseFloat(e.target.value) || 0)}
            className="w-16 bg-surface-bright border border-outline-variant/50 rounded py-xs px-xs text-right font-mono text-on-surface focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all mr-xs"
          />
          <span className="text-on-surface-variant font-mono">%</span>
        </div>
      </div>

      <div className="flex justify-between items-center py-xs mb-md border-b border-outline-variant/20 pb-sm">
        <span className="font-body-md text-body-md text-on-surface-variant">
          Estimated Tax
        </span>
        <span
          className="font-mono text-on-surface-variant"
          style={{ transition: 'opacity 0.2s ease-in' }}
        >
          {formatKSh(taxAmount)}
        </span>
      </div>

      <div className="flex justify-between items-center pt-xs mt-xs">
        <span className="font-headline-md text-headline-md text-on-surface">
          Grand Total
        </span>
        <span
          className="font-display-lg text-[28px] leading-tight font-bold text-primary tracking-tight font-mono"
          style={{ transition: 'opacity 0.2s ease-in' }}
        >
          {formatKSh(grandTotal)}
        </span>
      </div>
    </div>
  );
}
