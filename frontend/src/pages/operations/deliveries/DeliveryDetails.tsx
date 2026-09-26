import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Box, PackageCheck, Truck, Ban, ArrowRight } from 'lucide-react';
import { PageHeader } from '../../../components/ui/PageHeader';
import { OperationStatusBar } from '../../../components/ui/OperationStatusBar';
import { INITIAL_OPERATIONS } from '../../../lib/constants';
import { OperationStatus } from '../../../types/common';

export const DeliveryDetails: React.FC = () => {
  const { deliveryId } = useParams<{ deliveryId: string }>();

  const [operation, setOperation] = useState(
    INITIAL_OPERATIONS.find((o) => o.id === deliveryId) || INITIAL_OPERATIONS[1]
  );

  const handleStepAction = (nextStatus: OperationStatus) => {
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

      {/* Amazon-Style Order Status Tracker */}
      <OperationStatusBar
        status={operation.status}
        type="delivery"
        documentNumber={operation.documentNumber}
        createdAt={operation.createdAt}
        scheduledDate={operation.scheduledDate}
        validatedAt={operation.validatedAt}
        validatedBy={operation.validatedBy}
        partner={operation.partner}
        sourceLocation={operation.sourceLocation}
        onAdvanceStatus={handleStepAction}
      />

      {/* Fulfillment Actions Card */}
      {operation.status !== 'done' && operation.status !== 'canceled' && (
        <div className="bg-white p-5 rounded-2xl border-2 border-slate-200 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Next Step in Workflow</h4>
            <p className="text-sm font-bold text-slate-800 mt-0.5">
              {operation.status === 'draft' && 'Items need to be picked from warehouse shelf.'}
              {operation.status === 'waiting' && 'Items picked. Proceed to packing and box labeling.'}
              {operation.status === 'ready' && 'Ready for dispatch carrier. Confirm shipment to deduct inventory.'}
            </p>
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
      )}

      {/* Document Overview */}
      <div className="bg-white p-6 rounded-2xl border-2 border-slate-200 shadow-xs space-y-4">
        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider border-b border-slate-100 pb-2">
          Customer & Shipment Info
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
          <div>
            <span className="text-slate-500 font-medium block mb-0.5">Customer / Recipient:</span>
            <span className="text-sm font-bold text-slate-900">{operation.partner || 'Direct Customer'}</span>
          </div>
          <div>
            <span className="text-slate-500 font-medium block mb-0.5">Source Warehouse:</span>
            <span className="text-sm font-bold text-slate-900">{operation.sourceLocation || 'Main Warehouse'}</span>
          </div>
          <div>
            <span className="text-slate-500 font-medium block mb-0.5">Target Delivery Date:</span>
            <span className="text-sm font-bold text-slate-900">{operation.scheduledDate || 'Immediate'}</span>
          </div>
        </div>

        {operation.status === 'done' && (
          <div className="pt-2 flex justify-end">
            <Link
              to="/operations/move-history"
              className="inline-flex items-center gap-1 text-xs font-bold text-primary hover:underline"
            >
              See this deduction in Stock Move History <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        )}
      </div>

      {/* Outbound Items */}
      <div className="bg-white rounded-2xl border-2 border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 border-b-2 border-slate-200 font-bold text-sm text-slate-900 bg-slate-50">
          Packed Line Items
        </div>
        <table className="table w-full text-xs">
          <thead>
            <tr className="bg-slate-100 border-b border-slate-200">
              <th>Product Name</th>
              <th>SKU</th>
              <th className="text-right">Quantity Outbound</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {operation.items.map((item, idx) => (
              <tr key={idx} className="hover:bg-slate-50/70 transition-colors">
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
