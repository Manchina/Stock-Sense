import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Trash2, CheckCircle2, Loader2, AlertCircle } from 'lucide-react';
import { PageHeader } from '../../../components/ui/PageHeader';
import { ProductSelect } from '../../../components/inventory/ProductSelect';
import { WarehouseSelect } from '../../../components/inventory/WarehouseSelect';
import { QuantityInput } from '../../../components/inventory/QuantityInput';
import { INITIAL_PRODUCTS } from '../../../lib/constants';
import { OperationItem, Product } from '../../../types/common';
import { transfersApi } from '../../../features/transfers/api';

export const TransferCreate: React.FC = () => {
  const navigate = useNavigate();
  const [sourceLocation, setSourceLocation] = useState('WH-MAIN / Rack A');
  const [destinationLocation, setDestinationLocation] = useState('WH-PROD / Production Floor');
  const [notes, setNotes] = useState('');
  const [scheduledDate, setScheduledDate] = useState(
    new Date().toISOString().slice(0, 10)
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [items, setItems] = useState<OperationItem[]>([
    {
      productId: INITIAL_PRODUCTS[0].id,
      productName: INITIAL_PRODUCTS[0].name,
      sku: INITIAL_PRODUCTS[0].sku,
      quantity: 50,
      unitOfMeasure: INITIAL_PRODUCTS[0].unitOfMeasure,
    },
  ]);

  const handleAddItem = () => {
    const defaultProd = INITIAL_PRODUCTS[0];
    setItems([
      ...items,
      {
        productId: defaultProd.id,
        productName: defaultProd.name,
        sku: defaultProd.sku,
        quantity: 10,
        unitOfMeasure: defaultProd.unitOfMeasure,
      },
    ]);
  };

  const handleRemoveItem = (index: number) => {
    setItems(items.filter((_, idx) => idx !== index));
  };

  const handleProductChange = (index: number, productId: string, product?: Product) => {
    const prod = product || INITIAL_PRODUCTS.find((p) => p.id === productId);
    const updated = [...items];
    updated[index] = {
      ...updated[index],
      productId: productId,
      productName: prod?.name || 'Product',
      sku: prod?.sku || 'SKU',
      unitOfMeasure: prod?.unitOfMeasure || 'units',
    };
    setItems(updated);
  };

  const handleQuantityChange = (index: number, quantity: number) => {
    const updated = [...items];
    updated[index].quantity = quantity;
    setItems(updated);
  };

  const handleSubmit = async (status: 'draft' | 'waiting' | 'done') => {
    setErrorMessage(null);

    if (!sourceLocation || !destinationLocation) {
      setErrorMessage('Please select both source and destination locations.');
      return;
    }

    if (sourceLocation === destinationLocation) {
      setErrorMessage('Source and Destination locations cannot be identical.');
      return;
    }

    if (items.length === 0) {
      setErrorMessage('Please add at least one product to transfer.');
      return;
    }

    try {
      setIsSubmitting(true);
      const created = await transfersApi.create({
        sourceLocation,
        destinationLocation,
        status,
        notes,
        scheduledDate,
        items,
      });

      navigate(`/operations/transfers/${created.id}`);
    } catch (err: any) {
      console.error('Failed to create transfer:', err);
      setErrorMessage(err.message || 'Failed to create internal transfer');
    } finally {
      setIsSubmitting(false);
    }
  };

  const totalQty = items.reduce((acc, i) => acc + i.quantity, 0);

  return (
    <div className="w-full space-y-4">
      <PageHeader
        title="Create Internal Stock Transfer"
        subtitle="Move items between locations. Company total stock remains preserved."
        backUrl="/operations/transfers"
      >
        <button
          type="button"
          disabled={isSubmitting}
          onClick={() => handleSubmit('draft')}
          className="btn btn-ghost btn-xs sm:btn-sm rounded-lg font-bold text-slate-700"
        >
          Save Draft
        </button>
        <button
          type="button"
          disabled={isSubmitting}
          onClick={() => handleSubmit('waiting')}
          className="btn btn-outline border-slate-300 btn-xs sm:btn-sm rounded-lg font-bold bg-white text-slate-800"
        >
          Schedule Transfer
        </button>
        <button
          type="button"
          disabled={isSubmitting}
          onClick={() => handleSubmit('done')}
          className="btn btn-primary btn-xs sm:btn-sm rounded-lg text-white font-bold shadow-xs flex items-center gap-1.5 px-3.5"
        >
          {isSubmitting ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <CheckCircle2 className="w-3.5 h-3.5" />
          )}
          Validate & Move ({totalQty})
        </button>
      </PageHeader>

      {errorMessage && (
        <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs font-semibold flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
          <span>{errorMessage}</span>
        </div>
      )}

      <div className="space-y-4">
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 border-b border-slate-100 pb-2">
            Transfer Route & Schedule
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="sm:col-span-2">
              <WarehouseSelect
                value={sourceLocation}
                onChange={setSourceLocation}
                label="Source (From Location)"
                required
              />
            </div>

            <div className="sm:col-span-2">
              <WarehouseSelect
                value={destinationLocation}
                onChange={setDestinationLocation}
                label="Destination (To Location)"
                required
              />
            </div>

            <div className="form-control sm:col-span-2">
              <label className="label py-0.5 mb-0.5">
                <span className="label-text font-bold text-xs text-slate-700">
                  Scheduled Transfer Date
                </span>
              </label>
              <input
                type="date"
                value={scheduledDate}
                onChange={(e) => setScheduledDate(e.target.value)}
                className="input input-sm input-bordered bg-white border border-slate-300 rounded-lg text-xs font-medium"
              />
            </div>

            <div className="form-control sm:col-span-2">
              <label className="label py-0.5 mb-0.5">
                <span className="label-text font-bold text-xs text-slate-700">Transfer Reason / Batch</span>
              </label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g. Replenish assembly buffer"
                className="input input-sm input-bordered bg-white border border-slate-300 rounded-lg text-xs font-medium"
              />
            </div>
          </div>
        </div>

        {/* Line Items */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">Items to Move</h3>
            <button
              type="button"
              onClick={handleAddItem}
              className="btn btn-xs btn-outline border-slate-300 rounded-lg font-bold bg-white"
            >
              <Plus className="w-3.5 h-3.5 mr-1" /> Add Product Row
            </button>
          </div>

          <div className="space-y-2.5">
            {items.map((item, idx) => (
              <div
                key={idx}
                className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex flex-col sm:flex-row sm:items-end gap-3"
              >
                <div className="flex-1">
                  <ProductSelect
                    value={item.productId}
                    onChange={(id, prod) => handleProductChange(idx, id, prod)}
                    label={`Product Item #${idx + 1}`}
                  />
                </div>

                <div className="w-full sm:w-auto">
                  <QuantityInput
                    label="Transfer Quantity"
                    value={item.quantity}
                    onChange={(q) => handleQuantityChange(idx, q)}
                    unit={item.unitOfMeasure}
                  />
                </div>

                {items.length > 1 && (
                  <button
                    type="button"
                    onClick={() => handleRemoveItem(idx)}
                    className="btn btn-ghost btn-xs btn-square text-rose-600 hover:bg-rose-50"
                    title="Remove item"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
