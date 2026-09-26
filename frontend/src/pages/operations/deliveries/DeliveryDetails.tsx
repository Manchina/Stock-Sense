import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import { CheckCircle2, Box, PackageCheck, Truck, Ban } from 'lucide-react';
import { PageHeader } from '../../../components/ui/PageHeader';
import { StatusBadge } from '../../../components/ui/StatusBadge';
import { INITIAL_OPERATIONS } from '../../../lib/constants';

export const DeliveryDetails: React.FC = () => {
  const { deliveryId } = useParams<{ deliveryId: string }>();

  const [operation, setOperation] = useState(
    INITIAL_OPERATIONS.find((o) => o.id === deliveryId) || INITIAL_OPERATIONS[1]
  );

  const handleStepAction = (nextStatus: 'waiting' | 'ready' | 'done') => {
    setOperation({
      ...operation,
      status: nextStatus,
      validatedAt: nextStatus === 'done' ? new Date().toISOString() : operation.validatedAt,
      validatedBy: nextStatus === 'done' ? 'Alex Miller (Warehouse Staff)' : operation.validatedBy,
    });
  };

  const handleCancel = () => {
    setOperation({
      ...operation,
      status: 'canceled',
    });
  };

  return (
    <div className="w-full space-y-6">
      <PageHeader
        title={`Delivery Order ${operation.documentNumber}`}
        subtitle={`Outbound customer delivery to ${operation.partner || 'Customer'}`}
        backUrl="/operations/deliveries"
      >
        {operation.status !== 'done' && operation.status !== 'canceled' && (
          <button onClick={handleCancel} className="btn btn-ghost btn-sm text-error rounded-xl font-bold hover:bg-error/10">
            <Ban className="w-4 h-4 mr-1" /> Cancel Order
          </button>
        )}
      </PageHeader>

      {/* 3-Step Outbound Workflow Wizard */}
      <div className="bg-white p-6 rounded-2xl border-2 border-slate-200 shadow-xs space-y-6">
        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
          Warehouse Fulfillment Workflow (Pick → Pack → Validate)
        </h3>

        <ul className="steps steps-vertical sm:steps-horizontal w-full text-xs font-semibold">
          <li className={`step ${operation.status !== 'draft' ? 'step-primary' : ''}`}>
            1. Pick Items from Shelf
          </li>
          <li
            className={`step ${
              operation.status === 'ready' || operation.status === 'done' ? 'step-primary' : ''
            }`}
          >
            2. Pack & Label Box
          </li>
          <li className={`step ${operation.status === 'done' ? 'step-success' : ''}`}>
            3. Validate & Deduct Stock
          </li>
        </ul>

        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100">
          <div className="flex items-center gap-2">
            <StatusBadge status={operation.status} size="md" />
            {operation.status === 'done' && (
              <span className="text-xs font-bold text-emerald-700 flex items-center gap-1">
                <CheckCircle2 className="w-4 h-4" /> Stock decreased automatically
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {operation.status === 'draft' && (
              <button
                onClick={() => handleStepAction('waiting')}
                className="btn btn-sm btn-primary rounded-xl text-white font-bold"
              >
                <Box className="w-4 h-4 mr-1" /> Start Picking
              </button>
            )}
            {operation.status === 'waiting' && (
              <button
                onClick={() => handleStepAction('ready')}
                className="btn btn-sm btn-info rounded-xl text-white font-bold"
              >
                <PackageCheck className="w-4 h-4 mr-1" /> Mark as Packed (Ready)
              </button>
            )}
            {operation.status === 'ready' && (
              <button
                onClick={() => handleStepAction('done')}
                className="btn btn-sm btn-success rounded-xl text-white shadow-xs font-bold flex items-center gap-1.5"
              >
                <Truck className="w-4 h-4" /> Validate Dispatch & Reduce Stock
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Overview Card */}
      <div className="bg-white p-6 rounded-2xl border-2 border-slate-200 shadow-xs space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
          <div>
            <span className="text-slate-500 font-medium block mb-0.5">Customer / Recipient:</span>
            <span className="text-sm font-bold text-slate-900">{operation.partner}</span>
          </div>
          <div>
            <span className="text-slate-500 font-medium block mb-0.5">Source Dispatch Location:</span>
            <span className="text-sm font-bold text-slate-900">{operation.sourceLocation}</span>
          </div>
          <div>
            <span className="text-slate-500 font-medium block mb-0.5">Scheduled Delivery:</span>
            <span className="text-sm font-bold text-slate-900">{operation.scheduledDate || 'Immediate'}</span>
          </div>
        </div>

        {operation.notes && (
          <div className="p-3 bg-slate-50 rounded-xl text-xs text-slate-700 border border-slate-200 mt-2 font-medium">
            <span className="font-bold text-slate-900">Order Notes: </span>
            {operation.notes}
          </div>
        )}
      </div>

      {/* Items Table */}
      <div className="bg-white rounded-2xl border-2 border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 border-b-2 border-slate-200 font-bold text-sm text-slate-900 bg-slate-50">
          Outbound Line Items
        </div>
        <table className="table w-full text-xs">
          <thead>
            <tr className="bg-slate-100 border-b border-slate-200">
              <th>Product Name</th>
              <th>SKU</th>
              <th className="text-right">Quantity Deducted</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {operation.items.map((item, idx) => (
              <tr key={idx}>
                <td className="font-bold text-slate-900">{item.productName}</td>
                <td className="font-mono text-slate-500 font-medium">{item.sku}</td>
                <td className="text-right font-black text-rose-700 text-sm">
                  -{item.quantity} {item.unitOfMeasure}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
