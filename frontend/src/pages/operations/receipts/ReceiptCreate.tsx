import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Trash2, CheckCircle2 } from 'lucide-react';
import { PageHeader } from '../../../components/ui/PageHeader';
import { ProductSelect } from '../../../components/inventory/ProductSelect';
import { WarehouseSelect } from '../../../components/inventory/WarehouseSelect';
import { QuantityInput } from '../../../components/inventory/QuantityInput';
import { INITIAL_PRODUCTS, INITIAL_OPERATIONS } from '../../../lib/constants';
import { OperationDocument, OperationItem } from '../../../types/common';

export const ReceiptCreate: React.FC = () => {
  const navigate = useNavigate();
  const [partner, setPartner] = useState('');
  const [destinationLocation, setDestinationLocation] = useState('WH-MAIN / Rack A');
  const [notes, setNotes] = useState('');
  const [scheduledDate, setScheduledDate] = useState(
    new Date().toISOString().slice(0, 10)
  );

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

  const handleProductChange = (index: number, productId: string) => {
    const prod = INITIAL_PRODUCTS.find((p) => p.id === productId);
    if (!prod) return;
    const updated = [...items];
    updated[index] = {
      ...updated[index],
      productId: prod.id,
      productName: prod.name,
      sku: prod.sku,
      unitOfMeasure: prod.unitOfMeasure,
    };
    setItems(updated);
  };

  const handleQuantityChange = (index: number, quantity: number) => {
    const updated = [...items];
    updated[index].quantity = quantity;
    setItems(updated);
  };

  const handleSubmit = (validateImmediately: boolean) => {
    const docNumber = `REC-${new Date().getFullYear()}-${String(
      Math.floor(Math.random() * 9000) + 1000
    )}`;

    const newReceipt: OperationDocument = {
      id: `op-rec-${Date.now()}`,
      documentNumber: docNumber,
      type: 'receipt',
      status: validateImmediately ? 'done' : 'ready',
      partner,
      destinationLocation,
      items,
      notes,
      createdAt: new Date().toISOString(),
      scheduledDate,
      validatedAt: validateImmediately ? new Date().toISOString() : undefined,
      validatedBy: validateImmediately ? 'Sarah Connor (Inventory Manager)' : undefined,
    };

    INITIAL_OPERATIONS.unshift(newReceipt);
    navigate(`/operations/receipts/${newReceipt.id}`);
  };

  const totalQty = items.reduce((acc, i) => acc + i.quantity, 0);

  return (
    <div className="w-full space-y-4">
      <PageHeader
        title="Create Goods Receipt"
        subtitle="Record incoming goods from vendor. Validating increases inventory stock levels."
        backUrl="/operations/receipts"
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
          Validate (+{totalQty})
        </button>
      </PageHeader>

      <div className="space-y-4">
        {/* Document Details */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 border-b border-slate-100 pb-2">
            Vendor & Receiving Facility
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="form-control sm:col-span-2">
              <label className="label py-0.5 mb-0.5">
                <span className="label-text font-bold text-xs text-slate-700">
                  Supplier / Vendor <span className="text-error">*</span>
                </span>
              </label>
              <input
                type="text"
                required
                value={partner}
                onChange={(e) => setPartner(e.target.value)}
                placeholder="e.g. Apex Steel Industries"
                className="input input-sm input-bordered bg-white border border-slate-300 rounded-lg text-xs font-medium"
              />
            </div>

            <div className="sm:col-span-2">
              <WarehouseSelect
                value={destinationLocation}
                onChange={setDestinationLocation}
                label="Receiving Warehouse / Location"
                required
              />
            </div>

            <div className="form-control sm:col-span-2">
              <label className="label py-0.5 mb-0.5">
                <span className="label-text font-bold text-xs text-slate-700">
                  Scheduled Arrival Date
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
                <span className="label-text font-bold text-xs text-slate-700">PO / Reference Notes</span>
              </label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g. Purchase order PO-9923"
                className="input input-sm input-bordered bg-white border border-slate-300 rounded-lg text-xs font-medium"
              />
            </div>
          </div>
        </div>

        {/* Line Items */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">Received Product Line Items</h3>
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
                    onChange={(id) => handleProductChange(idx, id)}
                    label={`Product Item #${idx + 1}`}
                  />
                </div>

                <div className="w-full sm:w-auto">
                  <QuantityInput
                    label="Quantity Received"
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
                    title="Remove row"
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
