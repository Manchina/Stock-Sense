import React from 'react';
import { AlertCircle, CheckCircle2, AlertTriangle } from 'lucide-react';

interface StockStatusProps {
  currentStock: number;
  minStockAlert: number;
  unitOfMeasure?: string;
  showIcon?: boolean;
}

export const StockStatus: React.FC<StockStatusProps> = ({
  currentStock,
  minStockAlert,
  unitOfMeasure = 'units',
  showIcon = true,
}) => {
  const isOutOfStock = currentStock <= 0;
  const isLowStock = currentStock > 0 && currentStock <= minStockAlert;

  if (isOutOfStock) {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-semibold text-error bg-error/10 px-2 py-0.5 rounded-full">
        {showIcon && <AlertCircle className="w-3.5 h-3.5" />}
        Out of Stock (0 {unitOfMeasure})
      </span>
    );
  }

  if (isLowStock) {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-semibold text-warning bg-warning/10 px-2 py-0.5 rounded-full">
        {showIcon && <AlertTriangle className="w-3.5 h-3.5" />}
        Low Stock ({currentStock} / min {minStockAlert} {unitOfMeasure})
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1 text-xs font-medium text-success bg-success/10 px-2 py-0.5 rounded-full">
      {showIcon && <CheckCircle2 className="w-3.5 h-3.5" />}
      In Stock ({currentStock} {unitOfMeasure})
    </span>
  );
};
