import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle2 } from 'lucide-react';
import { PageHeader } from '../../../components/ui/PageHeader';
import { ProductSelect } from '../../../components/inventory/ProductSelect';
import { WarehouseSelect } from '../../../components/inventory/WarehouseSelect';
import { INITIAL_PRODUCTS, INITIAL_OPERATIONS } from '../../../lib/constants';
import { OperationDocument, OperationItem } from '../../../types/common';

export const AdjustmentCreate: React.FC = () => {
  const navigate = useNavigate();
  const [selectedProductId, setSelectedProductId] = useState(INITIAL_PRODUCTS[0].id);
  const [location, setLocation] = useState('WH-MAIN / Rack A');
  const [physicalCount, setPhysicalCount] = useState<number>(INITIAL_PRODUCTS[0].currentStock);
  const [reason, setReason] = useState('Damaged stock write-off');

  const selectedProduct =
    INITIAL_PRODUCTS.find((p) => p.id === selectedProductId) || INITIAL_PRODUCTS[0];

  const recordedStock = selectedProduct.currentStock;
  const difference = physicalCount - recordedStock;

  const handleProductSelect = (id: string) => {
    setSelectedProductId(id);
    const p = INITIAL_PRODUCTS.find((item) => item.id === id);
    if (p) {
      setPhysicalCount(p.currentStock);
    }
  };

  const handleSubmit = (validateImmediately: boolean) => {
    const docNumber = `ADJ-${new Date().getFullYear()}-${String(
      Math.floor(Math.random() * 9000) + 1000
    )}`;

    const items: OperationItem[] = [
      {
        productId: selectedProduct.id,
        productName: selectedProduct.name,
        sku: selectedProduct.sku,
        quantity: difference,
        unitOfMeasure: selectedProduct.unitOfMeasure,
      },
    ];

    const newAdjustment: OperationDocument = {
      id: `op-adj-${Date.now()}`,
      documentNumber: docNumber,
      type: 'adjustment',
      status: validateImmediately ? 'done' : 'draft',
      sourceLocation: location,
      items,
      notes: reason,
      createdAt: new Date().toISOString(),
      validatedAt: validateImmediately ? new Date().toISOString() : undefined,
      validatedBy: validateImmediately ? 'Sarah Connor (Inventory Manager)' : undefined,
    };

    INITIAL_OPERATIONS.unshift(newAdjustment);
    navigate(`/operations/adjustments/${newAdjustment.id}`);
  };

  return (
    <div className="w-full space-y-4">
      <PageHeader
        title="Physical Stock Adjustment"
        subtitle="Fix discrepancies between recorded stock and physical count."
        backUrl="/operations/adjustments"
      >
        <button
          type="button"
          onClick={() => handleSubmit(false)}
          className="btn btn-outline border-slate-300 btn-xs sm:btn-sm rounded-lg font-bold bg-white"
        >
          Save Draft
        </button>
        <button
          type="button"
          onClick={() => handleSubmit(true)}
          className="btn btn-primary btn-xs sm:btn-sm rounded-lg text-white font-bold shadow-xs flex items-center gap-1.5 px-3.5"
        >
          <CheckCircle2 className="w-3.5 h-3.5" />
          Apply ({difference >= 0 ? `+${difference}` : difference})
        </button>
      </PageHeader>

      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <ProductSelect
            value={selectedProductId}
            onChange={(id) => handleProductSelect(id)}
            label="1. Select Product to Adjust"
            required
          />

          <WarehouseSelect
            value={location}
            onChange={setLocation}
            label="2. Target Location"
            required
          />
        </div>

        {/* Count Comparison Box */}
        <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 grid grid-cols-1 sm:grid-cols-3 gap-3 text-center">
          <div className="p-2.5 bg-white rounded-lg border border-slate-200">
            <span className="text-[11px] text-slate-500 font-bold block mb-0.5">
              System Recorded Stock
            </span>
            <span className="text-xl font-black text-slate-900">
              {recordedStock}
            </span>{' '}
            <span className="text-xs text-slate-500 font-semibold">{selectedProduct.unitOfMeasure}</span>
          </div>

          <div className="p-2.5 bg-white rounded-lg border border-slate-200">
            <span className="text-[11px] text-slate-500 font-bold block mb-0.5">
              Physical Counted Qty
            </span>
            <input
              type="number"
              min="0"
              value={physicalCount}
              onChange={(e) => setPhysicalCount(Number(e.target.value))}
              className="input input-sm input-bordered w-20 text-center text-base font-bold bg-slate-50 border border-slate-300 rounded-lg mx-auto"
            />
          </div>

          <div className="p-2.5 bg-white rounded-lg border border-slate-200">
            <span className="text-[11px] text-slate-500 font-bold block mb-0.5">
              Adjustment Delta
            </span>
            <span
              className={`text-xl font-black ${
                difference > 0
                  ? 'text-emerald-700'
                  : difference < 0
                  ? 'text-rose-700'
                  : 'text-slate-500'
              }`}
            >
              {difference > 0 ? `+${difference}` : difference}
            </span>{' '}
            <span className="text-xs text-slate-500 font-semibold">{selectedProduct.unitOfMeasure}</span>
          </div>
        </div>

        {/* Reason / Notes */}
        <div className="form-control">
          <label className="label py-0.5 mb-0.5">
            <span className="label-text font-bold text-xs text-slate-700">
              3. Adjustment Reason / Notes
            </span>
          </label>
          <input
            type="text"
            required
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="e.g. 3 units damaged during handling"
            className="input input-sm input-bordered bg-white border border-slate-300 rounded-lg text-xs font-medium"
          />
        </div>
      </div>
    </div>
  );
};
