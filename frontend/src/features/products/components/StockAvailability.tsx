import React from 'react';
import { MapPin, Boxes } from 'lucide-react';
import { Product } from '../../../types/common';

interface StockAvailabilityProps {
  product: Product;
}

export const StockAvailability: React.FC<StockAvailabilityProps> = ({ product }) => {
  const locations = product.locationStock || {};
  const entries = Object.entries(locations);

  return (
    <div className="bg-base-100 p-5 rounded-2xl border border-base-300 shadow-sm space-y-4">
      <div className="flex items-center justify-between border-b border-base-200 pb-3">
        <div className="flex items-center gap-2">
          <MapPin className="w-4 h-4 text-primary" />
          <h3 className="text-sm font-bold text-base-content">Stock Availability by Location</h3>
        </div>
        <span className="badge badge-sm badge-neutral font-mono">
          Total: {product.currentStock} {product.unitOfMeasure}
        </span>
      </div>

      {entries.length === 0 ? (
        <div className="text-xs text-base-content/60 italic py-2 text-center">
          No location breakdown configured yet.
        </div>
      ) : (
        <div className="divide-y divide-base-200">
          {entries.map(([loc, qty]) => {
            const percentage = product.currentStock > 0 ? Math.round((qty / product.currentStock) * 100) : 0;
            return (
              <div key={loc} className="py-2.5 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <Boxes className="w-3.5 h-3.5 text-base-content/40" />
                  <span className="font-medium text-base-content">{loc}</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-20 bg-base-200 rounded-full h-1.5 hidden sm:block overflow-hidden">
                    <div className="bg-primary h-full rounded-full" style={{ width: `${percentage}%` }} />
                  </div>
                  <span className="font-bold text-base-content min-w-[60px] text-right">
                    {qty} {product.unitOfMeasure}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
