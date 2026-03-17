import React from 'react';

export default function DiscountBanner({ discountPercent, standardPrice }) {
  if (!discountPercent || discountPercent <= 0) return null;

  return (
    <div className="bg-green flex items-center gap-4 px-8 py-4" style={{ printColorAdjust: 'exact', WebkitPrintColorAdjust: 'exact' }}>
      <span className="bg-white/20 text-white text-xs font-semibold rounded-full px-3 py-1">
        {discountPercent}% discount
      </span>
      <p className="text-white text-sm font-medium">
        Custom rate applied — standard price is £{standardPrice}/mo
      </p>
    </div>
  );
}