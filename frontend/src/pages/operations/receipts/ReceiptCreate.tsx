import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Plus,
  Trash2,
  CheckCircle2,
  Loader2,
  AlertCircle,
  FileText,
  Truck,
  PackageCheck,
  Warehouse,
  ArrowRight,
  Sparkles,
} from 'lucide-react';
import { PageHeader } from '../../../components/ui/PageHeader';
import { ProductSelect } from '../../../components/inventory/ProductSelect';
import { WarehouseSelect } from '../../../components/inventory/WarehouseSelect';
import { QuantityInput } from '../../../components/inventory/QuantityInput';
import { INITIAL_PRODUCTS, INITIAL_OPERATIONS, UNITS_OF_MEASURE } from '../../../lib/constants';
import { OperationDocument, OperationItem, OperationStatus, Product } from '../../../types/common';
import { receiptsApi } from '../../../features/receipts/api';
import { productsApi } from '../../../features/products/api';
import { cn } from '../../../lib/utils';
import { toast } from '../../../context/ToastContext';

interface CreationStage {
  id: OperationStatus;
  title: string;
  subtitle: string;
  icon: React.ElementType;
  badge: string;
}

const CREATION_STAGES: CreationStage[] = [
  {
    id: 'draft',
    title: 'Order Placed',
    subtitle: 'Vendor PO registered in system',
    icon: FileText,
    badge: 'Stage 1 (Recommended)',
  },
  {
    id: 'waiting',
    title: 'In Transit',
    subtitle: 'Dispatched by supplier / en route',
    icon: Truck,
    badge: 'Stage 2',
  },
  {
    id: 'ready',
    title: 'At Intake Bay',
    subtitle: 'Arrived at dock for inspection & verification',
    icon: PackageCheck,
    badge: 'Stage 3 (Ready for Check-in)',
  },
];

export const ReceiptCreate: React.FC = () => {
  const navigate = useNavigate();
  const [partner, setPartner] = useState('');
  const [destinationLocation, setDestinationLocation] = useState('WH-MAIN / Rack A');
  const [notes, setNotes] = useState('');
  const [scheduledDate, setScheduledDate] = useState(
    new Date().toISOString().slice(0, 10)
  );
  const [initialStatus, setInitialStatus] = useState<OperationStatus>('draft');
  const [availableProducts, setAvailableProducts] = useState<Product[]>(INITIAL_PRODUCTS);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  React.useEffect(() => {
    productsApi.getAll().then((loaded) => {
      if (loaded && loaded.length > 0) {
        setAvailableProducts(loaded);
        setItems((prev) => {
          if (prev.length > 0 && prev[0].productId) {
            const match = loaded.find((p) => p.id === prev[0].productId);
            if (match) {
              return prev.map((it, idx) =>
                idx === 0
                  ? {
                      ...it,
                      productName: match.name,
                      sku: match.sku,
                      unitOfMeasure: match.unitOfMeasure || 'Units (pcs)',
                    }
                  : it
              );
            }
          }
          return prev;
        });
      }
    });
  }, []);

  const [items, setItems] = useState<OperationItem[]>([
    {
      productId: INITIAL_PRODUCTS[0]?.id || 'prod-1',
      productName: INITIAL_PRODUCTS[0]?.name || 'Steel Rods (12mm)',
      sku: INITIAL_PRODUCTS[0]?.sku || 'RAW-STL-12MM',
      quantity: 50,
      unitOfMeasure: INITIAL_PRODUCTS[0]?.unitOfMeasure || 'Kilograms (kg)',
    },
  ]);

  const handleAddItem = () => {
    const defaultProd = availableProducts[0] || INITIAL_PRODUCTS[0];
    setItems([
      ...items,
      {
        productId: defaultProd?.id || 'prod-1',
        productName: defaultProd?.name || 'Item',
        sku: defaultProd?.sku || 'SKU-NEW',
        quantity: 10,
        unitOfMeasure: defaultProd?.unitOfMeasure || 'Units (pcs)',
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

    const updated = [...items];
    updated[index] = {
      ...updated[index],
      productId: productId,
      productName: prod ? prod.name : updated[index].productName,
      sku: prod ? prod.sku : updated[index].sku,
      unitOfMeasure: prod ? prod.unitOfMeasure : updated[index].unitOfMeasure || 'Units (pcs)',
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
    updated[index].quantity = quantity;
    setItems(updated);
  };

  const handleSubmit = async (overrideStatus?: OperationStatus) => {
    if (!partner.trim()) {
      const msg = 'Please specify a supplier / vendor name.';
      setErrorMsg(msg);
      toast.error(msg, 'Supplier Required');
      return;
    }

    if (items.length === 0) {
      const msg = 'Please add at least one product row.';
      setErrorMsg(msg);
      toast.error(msg, 'Line Items Required');
      return;
    }

    const targetStatus = overrideStatus || initialStatus;

    setIsSubmitting(true);
    setErrorMsg(null);

    const payload = {
      supplierName: partner.trim(),
      partner: partner.trim(),
      destinationLocation: destinationLocation.trim(),
      scheduledDate,
      expectedDate: scheduledDate,
      notes: notes.trim() || undefined,
      status: targetStatus,
      items: items.map((i) => ({
        productId: i.productId,
        productName: i.productName,
        sku: i.sku,
        quantity: i.quantity,
        qtyExpected: i.quantity,
        qtyReceived: 0,
        unitOfMeasure: i.unitOfMeasure,
      })),
    };

    try {
      const res = await receiptsApi.createReceipt(payload);
      if (res && res.data) {
        INITIAL_OPERATIONS.unshift(res.data);
        toast.success(`Receipt ${res.data.documentNumber} created in status '${res.data.status}'.`, 'Receipt Created');
        navigate(`/operations/receipts/${res.data.id}`);
        return;
      }
    } catch (err: any) {
      console.warn('API creation error:', err);
      toast.zod(err, 'Failed to create receipt');
      setErrorMsg(err?.message || 'Failed to create receipt.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const totalQty = items.reduce((acc, i) => acc + i.quantity, 0);

  const getSubmitButtonLabel = () => {
    switch (initialStatus) {
      case 'draft':
        return 'Create Receipt (Order Placed)';
      case 'waiting':
        return 'Create Receipt (In Transit)';
      case 'ready':
        return 'Create Receipt (At Intake Bay)';
      default:
        return 'Create Receipt';
    }
  };

  return (
    <div className="w-full space-y-5">
      <PageHeader
        title="Create Inbound Stock Receipt"
        subtitle="Initialize incoming shipment from vendor. Step through Order Placed ➔ In Transit ➔ At Intake Bay ➔ Validate & Restock."
        backUrl="/operations/receipts"
      >
        <button
          type="button"
          disabled={isSubmitting}
          onClick={() => handleSubmit('draft')}
          className="btn btn-outline border-slate-300 btn-sm rounded-xl font-bold bg-white hover:bg-slate-50 text-slate-700 shadow-2xs"
        >
          <FileText className="w-4 h-4 mr-1 text-slate-500" />
          <span>Save as Draft</span>
        </button>

        <button
          type="button"
          disabled={isSubmitting}
          onClick={() => handleSubmit()}
          className="btn btn-primary btn-sm rounded-xl font-black text-white shadow-xs flex items-center gap-2 px-4 transition-all bg-blue-600 hover:bg-blue-700 border-blue-600"
        >
          {isSubmitting ? (
            <span className="loading loading-spinner loading-xs" />
          ) : (
            <CheckCircle2 className="w-4 h-4" />
          )}
          <span>{getSubmitButtonLabel()}</span>
        </button>
      </PageHeader>

      {errorMsg && (
        <div className="alert alert-error text-xs flex items-center gap-2 rounded-xl shadow-xs">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* 1. Amazon-Style Workflow Stage Selection Card */}
      <div className="bg-white p-5 rounded-2xl border-2 border-slate-200/90 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
          <div>
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-700">
              Select Initial Workflow Stage
            </h3>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Choose the starting point in the Amazon tracking pipeline for this receipt.
            </p>
          </div>
          <span className="text-[11px] font-bold text-primary bg-primary/10 px-2.5 py-1 rounded-lg border border-primary/20 self-start sm:self-auto">
            Order Placed ➔ In Transit ➔ At Intake Bay ➔ Delivered & Stored
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {CREATION_STAGES.map((st, idx) => {
            const isSelected = initialStatus === st.id;
            const Icon = st.icon;

            return (
              <button
                key={st.id}
                type="button"
                onClick={() => setInitialStatus(st.id)}
                className={cn(
                  'p-4 rounded-xl border-2 text-left transition-all duration-200 flex flex-col justify-between space-y-3 cursor-pointer relative group',
                  isSelected
                    ? 'border-[#067D62] bg-emerald-50/50 ring-4 ring-emerald-500/10 shadow-sm'
                    : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/50'
                )}
              >
                <div className="flex items-center justify-between">
                  <div
                    className={cn(
                      'w-9 h-9 rounded-full flex items-center justify-center border font-bold text-xs',
                      isSelected
                        ? 'bg-[#067D62] border-[#067D62] text-white shadow-xs'
                        : 'bg-slate-100 border-slate-200 text-slate-500 group-hover:border-slate-300'
                    )}
                  >
                    <Icon className="w-4 h-4" />
                  </div>
                  <span
                    className={cn(
                      'text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full border',
                      isSelected
                        ? 'bg-emerald-100 text-[#067D62] border-emerald-300'
                        : 'bg-slate-100 text-slate-500 border-slate-200'
                    )}
                  >
                    {st.badge}
                  </span>
                </div>

                <div>
                  <h4
                    className={cn(
                      'text-sm font-extrabold',
                      isSelected ? 'text-[#067D62]' : 'text-slate-900'
                    )}
                  >
                    {st.title}
                  </h4>
                  <p className="text-[11px] text-slate-500 font-medium leading-tight mt-0.5">
                    {st.subtitle}
                  </p>
                </div>

                {isSelected && (
                  <div className="flex items-center gap-1 text-[11px] font-bold text-[#067D62] pt-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Selected Starting Level</span>
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      <div className="space-y-4">
        {/* 2. Document Details Form */}
        <div className="bg-white p-5 rounded-2xl border-2 border-slate-200/90 shadow-xs space-y-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 border-b border-slate-100 pb-2">
            Vendor & Receiving Facility
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
            <div className="form-control sm:col-span-2">
              <label className="label py-0.5 mb-0.5">
                <span className="label-text font-bold text-xs text-slate-700">
                  Supplier / Vendor Name <span className="text-error">*</span>
                </span>
              </label>
              <input
                type="text"
                required
                value={partner}
                onChange={(e) => setPartner(e.target.value)}
                placeholder="e.g. Apex Global Suppliers"
                className="input input-sm input-bordered bg-white border border-slate-300 rounded-xl text-xs font-medium focus:border-primary"
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
                className="input input-sm input-bordered bg-white border border-slate-300 rounded-xl text-xs font-medium focus:border-primary"
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
                placeholder="e.g. Purchase order PO-9923 for construction batch"
                className="input input-sm input-bordered bg-white border border-slate-300 rounded-xl text-xs font-medium focus:border-primary"
              />
            </div>
          </div>
        </div>

        {/* 3. Line Items Card */}
        <div className="bg-white p-5 rounded-2xl border-2 border-slate-200/90 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                Incoming Product Items
              </h3>
              <p className="text-[11px] text-slate-500 font-medium">
                Add the quantities and SKUs to be credited to the warehouse ledger.
              </p>
            </div>
            <button
              type="button"
              onClick={handleAddItem}
              className="btn btn-xs btn-outline border-slate-300 rounded-xl font-bold bg-white hover:bg-slate-50"
            >
              <Plus className="w-3.5 h-3.5 mr-1" /> Add Product Row
            </button>
          </div>

          <div className="space-y-3">
            {items.map((item, idx) => (
              <div
                key={idx}
                className="p-3.5 bg-slate-50/80 rounded-xl border border-slate-200 flex flex-col sm:flex-row sm:items-end gap-3"
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
                    label="Quantity Incoming"
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
                    title="Remove row"
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

