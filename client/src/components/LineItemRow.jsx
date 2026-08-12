import { useState } from 'react';

function formatKSh(num) {
  return `KSh${Number(num).toLocaleString('en-KE', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export default function LineItemRow({ item, onUpdate, onDelete, canDelete }) {
  const [removing, setRemoving] = useState(false);

  const lineTotal = item.quantity * item.unitPrice;

  const handleDelete = () => {
    if (!canDelete) return;
    setRemoving(true);
    setTimeout(() => onDelete(item.id), 300);
  };

  return (
    <tr
      className={`border-b border-outline-variant/20 hover:bg-surface-container-lowest/50 transition-all duration-300 group ${
        removing ? 'opacity-0 -translate-y-2' : ''
      }`}
    >
      <td className="py-sm px-md text-on-surface-variant/40">
        <span className="material-symbols-outlined text-[18px] cursor-grab">
          drag_indicator
        </span>
      </td>
      <td className="py-sm px-md">
        <input
          type="text"
          value={item.description}
          placeholder="e.g. Buffet Catering & Service Staff"
          onChange={(e) => onUpdate(item.id, 'description', e.target.value)}
          className="w-full bg-transparent border-b border-transparent focus:border-primary focus:outline-none transition-colors py-xs"
        />
      </td>
      <td className="py-sm px-md text-right">
        <input
          type="number"
          value={item.quantity || ''}
          min="0"
          placeholder="e.g. 400"
          onChange={(e) =>
            onUpdate(item.id, 'quantity', parseFloat(e.target.value) || 0)
          }
          className="w-full bg-transparent border-b border-transparent focus:border-primary focus:outline-none transition-colors py-xs text-right qty-input font-mono"
        />
      </td>
      <td className="py-sm px-md text-right relative">
        <span className="absolute left-md top-1/2 -translate-y-1/2 text-on-surface-variant/50">
          KSh
        </span>
        <input
          type="number"
          value={item.unitPrice || ''}
          min="0"
          step="0.01"
          placeholder="e.g. 1200"
          onChange={(e) =>
            onUpdate(item.id, 'unitPrice', parseFloat(e.target.value) || 0)
          }
          className="w-full bg-transparent border-b border-transparent focus:border-primary focus:outline-none transition-colors py-xs pl-6 text-right price-input font-mono md:min-w-[120px]"
        />
      </td>
      <td className="py-sm px-md text-right font-label-md text-on-surface row-total font-mono">
        {formatKSh(lineTotal)}
      </td>
      <td className="py-sm px-md text-center">
        <button
          aria-label="Delete row"
          onClick={handleDelete}
          disabled={!canDelete}
          className={`transition-colors p-xs rounded-full group-hover:opacity-100 opacity-0 ${
            canDelete
              ? 'text-on-surface-variant/40 hover:text-error hover:bg-error-container/20'
              : 'text-on-surface-variant/20 cursor-not-allowed'
          }`}
        >
          <span className="material-symbols-outlined text-[18px]">delete</span>
        </button>
      </td>
    </tr>
  );
}
