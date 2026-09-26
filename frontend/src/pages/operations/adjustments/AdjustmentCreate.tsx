import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle2, Loader2, AlertCircle } from 'lucide-react';
import { PageHeader } from '../../../components/ui/PageHeader';
import { ProductSelect } from '../../../components/inventory/ProductSelect';
import { WarehouseSelect } from '../../../components/inventory/WarehouseSelect';
import { INITIAL_PRODUCTS } from '../../../lib/constants';
import { Product, OperationItem } from '../../../types/common';
import { productsApi } from '../../../features/products/api';
import { adjustmentsApi } from '../../../features/adjustments/api';

import { toast } from '../../../context/ToastContext';

export const AdjustmentCreate: React.FC = () => {
  const navigate = useNavigate();
  const [selectedProductId, setSelectedProductId] = useState(INITIAL_PRODUCTS[0].id);
  const [selectedProduct, setSelectedProduct] = useState<Product>(INITIAL_PRODUCTS[0]);
  const [location, setLocation] = useState('WH-MAIN / Rack A');
  const [physicalCount, setPhysicalCount] = useState<number>(INITIAL_PRODUCTS[0].currentStock);
  const [reason, setReason] = useState('Physical count reconciliation');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    productsApi.getById(selectedProductId).then((p) => {
      if (p) {
        setSelectedProduct(p);
        // Calculate location-specific stock if available
        const locStock = p.locationStock?.[location] ?? p.currentStock;
        setPhysicalCount(locStock);
      }
    });
  }, [selectedProductId, location]);

  const recordedStock = selectedProduct.locationStock?.[location] ?? selectedProduct.currentStock;
  const difference = physicalCount - recordedStock;

  const handleProductSelect = (id: string, prod?: Product) => {
    setSelectedProductId(id);
    if (prod) {
      setSelectedProduct(prod);
      const locStock = prod.locationStock?.[location] ?? prod.currentStock;
      setPhysicalCount(locStock);
    }
  };

  const handleSubmit = async (validateImmediately: boolean) => {
    setErrorMessage(null);

    if (!selectedProductId || !location) {
      const msg = 'Please select both a product and target location.';
      setErrorMessage(msg);
      toast.error(msg, 'Validation Error');
      return;
    }

    if (!reason.trim()) {
      const msg = 'Please provide a reason or note for the adjustment.';
      setErrorMessage(msg);
      toast.error(msg, 'Validation Error');
      return;
    }

    const items: OperationItem[] = [
      {
        productId: selectedProduct.id,
        productName: selectedProduct.name,
        sku: selectedProduct.sku,
        quantity: difference,
        unitOfMeasure: selectedProduct.unitOfMeasure,
      },
    ];

    try {
      setIsSubmitting(true);
      const created = await adjustmentsApi.create({
        location,
        reason: reason.trim(),
        status: validateImmediately ? 'done' : 'draft',
        notes: reason.trim(),
        items,
      });

      toast.success(
        `Adjustment ${created.documentNumber} created (${difference >= 0 ? `+${difference}` : difference} units)`,
        validateImmediately ? 'Stock Reconciled & Applied' : 'Draft Saved'
      );
      navigate(`/operations/adjustments/${created.id}`);
    } catch (err: any) {
      console.error('Failed to create adjustment:', err);
      toast.zod(err, 'Failed to submit stock adjustment');
      setErrorMessage(err.message || 'Failed to submit stock adjustment');
    } finally {
      setIsSubmitting(false);
    }
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
          disabled={isSubmitting}
          onClick={() => handleSubmit(false)}
          className="btn btn-outline border-slate-300 btn-xs sm:btn-sm rounded-lg font-bold bg-white text-slate-800"
        >
          Save Draft
        </button>
        <button
          type="button"
          disabled={isSubmitting}
          onClick={() => handleSubmit(true)}
          className="btn btn-primary btn-xs sm:btn-sm rounded-lg text-white font-bold shadow-xs flex items-center gap-1.5 px-3.5"
        >
          {isSubmitting ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <CheckCircle2 className="w-3.5 h-3.5" />
          )}
          Apply ({difference >= 0 ? `+${difference}` : difference})
        </button>
      </PageHeader>

      {errorMessage && (
        <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs font-semibold flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
          <span>{errorMessage}</span>
        </div>
      )}

      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <ProductSelect
            value={selectedProductId}
            onChange={(id, prod) => handleProductSelect(id, prod)}
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
              className="input input-sm input-bordered w-24 text-center text-base font-bold bg-slate-50 border border-slate-300 rounded-lg mx-auto"
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
            placeholder="e.g. 3 units damaged during handling or count discrepancy"
            className="input input-sm input-bordered bg-white border border-slate-300 rounded-lg text-xs font-medium"
          />
        </div>
      </div>
    </div>
  );
};
