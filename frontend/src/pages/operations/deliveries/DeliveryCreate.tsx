import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Trash2, CheckCircle2, Save, PackageCheck, Box, AlertCircle } from 'lucide-react';
import { PageHeader } from '../../../components/ui/PageHeader';
import { ProductSelect } from '../../../components/inventory/ProductSelect';
import { WarehouseSelect } from '../../../components/inventory/WarehouseSelect';
import { QuantityInput } from '../../../components/inventory/QuantityInput';
import { INITIAL_PRODUCTS, UNITS_OF_MEASURE } from '../../../lib/constants';
import { OperationItem, Product } from '../../../types/common';
import { productsApi } from '../../../features/products/api';
import { deliveriesApi } from '../../../features/deliveries/api';

export const DeliveryCreate: React.FC = () => {
  const navigate = useNavigate();
  const [partner, setPartner] = useState('');
  const [customerRef, setCustomerRef] = useState('');
  const [sourceLocation, setSourceLocation] = useState('WH-MAIN / Packing Zone');
  const [notes, setNotes] = useState('');
  const [scheduledDate, setScheduledDate] = useState(
    new Date().toISOString().slice(0, 10)
  );
  const [availableProducts, setAvailableProducts] = useState<Product[]>(INITIAL_PRODUCTS);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    productsApi.getAll().then((loaded) => {
      if (loaded && loaded.length > 0) {
        setAvailableProducts(loaded);
      }
    });
  }, []);

  const [items, setItems] = useState<OperationItem[]>([
    {
      productId: availableProducts[0]?.id || 'prod-1',
      productName: availableProducts[0]?.name || 'Industrial Steel Flange',
      sku: availableProducts[0]?.sku || 'STL-FLANGE-01',
      quantity: 5,
      unitOfMeasure: availableProducts[0]?.unitOfMeasure || 'Units (pcs)',
    },
  ]);

  const handleAddItem = () => {
    const defaultProd = availableProducts[0] || INITIAL_PRODUCTS[0];
    setItems([
      ...items,
      {
        productId: defaultProd.id,
        productName: defaultProd.name,
        sku: defaultProd.sku,
        quantity: 5,
        unitOfMeasure: defaultProd.unitOfMeasure || 'Units (pcs)',
      },
    ]);
  };

  const handleRemoveItem = (index: number) => {
    setItems(items.filter((_, idx) => idx !== index));
  };

  const handleProductChange = (index: number, productId: string, product?: Product) => {
    const prod =
      product ||
      availableProducts.find((p) => p.id === productId) ||
      INITIAL_PRODUCTS.find((p) => p.id === productId);
    if (!prod) return;
    const updated = [...items];
    updated[index] = {
      ...updated[index],
      productId: prod.id,
      productName: prod.name,
      sku: prod.sku,
      unitOfMeasure: prod.unitOfMeasure || 'Units (pcs)',
    };
    setItems(updated);
  };

  const handleUnitChange = (index: number, unit: string) => {
    const updated = [...items];
    updated[index] = {
      ...updated[index],
      unitOfMeasure: unit,
    };
    setItems(updated);
  };

  const handleQuantityChange = (index: number, quantity: number) => {
    const updated = [...items];
    updated[index].quantity = Math.max(1, quantity);
    setItems(updated);
  };

  const handleSubmit = async (status: 'draft' | 'waiting' | 'ready' | 'done') => {
    setErrorMessage(null);

    if (!partner.trim()) {
      setErrorMessage('Please enter the customer / recipient name.');
      return;
    }

    if (items.length === 0) {
      setErrorMessage('Please add at least one line item to deliver.');
      return;
    }

    for (const item of items) {
      if (!item.productId) {
        setErrorMessage('Please select a valid product for all line items.');
        return;
      }
      if (!item.quantity || item.quantity <= 0) {
        setErrorMessage('Line item quantity must be greater than 0.');
        return;
      }
    }

    setIsSubmitting(true);

    try {
      const payload = {
        customerName: partner.trim(),
        partner: partner.trim(),
        customerRef: customerRef.trim() || undefined,
        sourceLocation,
        scheduledDate: scheduledDate || undefined,
        notes: notes.trim() || undefined,
        status,
        items: items.map((i) => ({
          productId: i.productId,
          productName: i.productName,
          sku: i.sku,
          quantity: Number(i.quantity) || 1,
          qtyOrdered: Number(i.quantity) || 1,
          qtyPicked: status === 'ready' ? Number(i.quantity) || 1 : 0,
          qtyDelivered: 0,
          unitOfMeasure: i.unitOfMeasure,
        })),
      };

      const result = await deliveriesApi.create(payload);
      if (result && result.data) {
        navigate(`/operations/deliveries/${result.data.id}`);
      }
    } catch (err: any) {
      console.error('Failed to create delivery:', err);
      setErrorMessage(err?.message || 'Failed to create delivery order.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const totalQty = items.reduce((acc, i) => acc + (Number(i.quantity) || 0), 0);

  return (
    <div className="w-full space-y-4">
      <PageHeader
        title="Create Outbound Delivery"
        subtitle="Schedule customer order dispatch. Stock deduction occurs upon final inspection & validation."
        backUrl="/operations/deliveries"
      >
        <button
          type="button"
          disabled={isSubmitting}
          onClick={() => handleSubmit('draft')}
          className="btn btn-outline border-slate-300 btn-xs sm:btn-sm rounded-lg font-bold bg-white"
        >
          <Save className="w-3.5 h-3.5 mr-1" />
          Save Draft
        </button>
        <button
          type="button"
          disabled={isSubmitting}
          onClick={() => handleSubmit('waiting')}
          className="btn btn-outline border-slate-300 btn-xs sm:btn-sm rounded-lg font-bold bg-white"
        >
          <Box className="w-3.5 h-3.5 mr-1" />
          Mark for Picking
        </button>
        <button
          type="button"
          disabled={isSubmitting}
          onClick={() => handleSubmit('ready')}
          className="btn btn-primary btn-xs sm:btn-sm rounded-lg text-white font-bold shadow-xs flex items-center gap-1.5 px-3.5"
        >
          <PackageCheck className="w-3.5 h-3.5" />
          {isSubmitting ? 'Creating...' : `Create Order (${totalQty} Items)`}
        </button>
      </PageHeader>

      {errorMessage && (
        <div className="alert alert-error rounded-xl shadow-xs py-2 px-4 flex items-center gap-2 text-xs font-semibold text-white">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      <div className="space-y-4">
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 border-b border-slate-100 pb-2">
            Customer & Origin Warehouse
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="form-control sm:col-span-2">
              <label className="label py-0.5 mb-0.5">
                <span className="label-text font-bold text-xs text-slate-700">
                  Customer / Recipient <span className="text-error">*</span>
                </span>
              </label>
              <input
                type="text"
                required
                value={partner}
                onChange={(e) => setPartner(e.target.value)}
                placeholder="e.g. Modern Workspaces Corp"
                className="input input-sm input-bordered bg-white border border-slate-300 rounded-lg text-xs font-medium"
              />
            </div>

            <div className="sm:col-span-2">
              <WarehouseSelect
                value={sourceLocation}
                onChange={setSourceLocation}
                label="Source Warehouse / Location"
                required
              />
            </div>

            <div className="form-control sm:col-span-2">
              <label className="label py-0.5 mb-0.5">
                <span className="label-text font-bold text-xs text-slate-700">
                  Scheduled Delivery Date
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
                <span className="label-text font-bold text-xs text-slate-700">Sales Order / Customer Ref</span>
              </label>
              <input
                type="text"
                value={customerRef}
                onChange={(e) => setCustomerRef(e.target.value)}
                placeholder="e.g. SO-8842 / PO-MW-882"
                className="input input-sm input-bordered bg-white border border-slate-300 rounded-lg text-xs font-medium"
              />
            </div>

            <div className="form-control col-span-full">
              <label className="label py-0.5 mb-0.5">
                <span className="label-text font-bold text-xs text-slate-700">Notes & Dispatch Instructions</span>
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add special packaging, carrier or delivery notes..."
                rows={2}
                className="textarea textarea-sm textarea-bordered bg-white border border-slate-300 rounded-lg text-xs font-medium"
              />
            </div>
          </div>
        </div>

        {/* Line Items */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">Items to Deliver</h3>
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
                    products={availableProducts}
                    onChange={(id, prod) => handleProductChange(idx, id, prod)}
                    label={`Product Item #${idx + 1}`}
                  />
                </div>

                <div className="w-full sm:w-auto">
                  <QuantityInput
                    label="Quantity to Ship"
                    value={item.quantity}
                    onChange={(q) => handleQuantityChange(idx, q)}
                  />
                </div>

                <div className="w-full sm:w-32">
                  <label className="label py-0.5 mb-0.5">
                    <span className="label-text font-bold text-xs text-slate-700">Unit of Measure</span>
                  </label>
                  <div className="h-8 min-h-8 px-3 flex items-center bg-slate-100 border border-slate-200 text-slate-700 text-xs font-semibold rounded-lg">
                    {item.unitOfMeasure || 'Units (pcs)'}
                  </div>
                </div>

                {items.length > 1 && (
                  <button
                    type="button"
                    onClick={() => handleRemoveItem(idx)}
                    className="btn btn-ghost btn-sm btn-square text-rose-600 hover:bg-rose-50 rounded-xl self-end sm:self-auto mb-1 sm:mb-0"
                    title="Remove item"
                  >
                    <Trash2 className="w-4 h-4" />
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
