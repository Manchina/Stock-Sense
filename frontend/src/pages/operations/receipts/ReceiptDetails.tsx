import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { CheckCircle2, Ban } from 'lucide-react';
import { PageHeader } from '../../../components/ui/PageHeader';
import { StatusBadge } from '../../../components/ui/StatusBadge';
import { INITIAL_OPERATIONS } from '../../../lib/constants';
import { formatDate } from '../../../lib/utils';

export const ReceiptDetails: React.FC = () => {
  const { receiptId } = useParams<{ receiptId: string }>();
  const navigate = useNavigate();

  const [operation, setOperation] = useState(
    INITIAL_OPERATIONS.find((o) => o.id === receiptId) || INITIAL_OPERATIONS[0]
  );

  const handleValidate = () => {
    setOperation({
      ...operation,
      status: 'done',
      validatedAt: new Date().toISOString(),
      validatedBy: 'Sarah Connor (Inventory Manager)',
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
        title={`Receipt ${operation.documentNumber}`}
        subtitle={`Inbound stock receipt from ${operation.partner || 'Vendor'}`}
        backUrl="/operations/receipts"
      >
        {operation.status !== 'done' && operation.status !== 'canceled' && (
          <>
            <button onClick={handleCancel} className="btn btn-ghost btn-sm text-error rounded-xl font-bold hover:bg-error/10">
              <Ban className="w-4 h-4 mr-1" /> Cancel
            </button>
            <button
              onClick={handleValidate}
              className="btn btn-success btn-sm text-white rounded-xl shadow-xs font-bold flex items-center gap-1.5"
            >
              <CheckCircle2 className="w-4 h-4" /> Validate Receipt
            </button>
          </>
        )}
      </PageHeader>

      {/* Overview Status Card */}
      <div className="bg-white p-6 rounded-2xl border-2 border-slate-200 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div>
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Document Status
            </span>
            <div className="mt-1 flex items-center gap-2">
              <StatusBadge status={operation.status} size="md" />
              {operation.status === 'done' && (
                <span className="text-xs font-bold text-emerald-700 flex items-center gap-1">
                  <CheckCircle2 className="w-4 h-4" /> Stock incremented in ledger
                </span>
              )}
            </div>
          </div>

          <div className="text-right text-xs text-slate-600 font-medium">
            <div>Created: {formatDate(operation.createdAt)}</div>
            {operation.validatedAt && (
              <div className="text-emerald-700 font-bold mt-0.5">
                Validated: {formatDate(operation.validatedAt)} by {operation.validatedBy}
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 text-xs">
          <div>
            <span className="text-slate-500 font-medium block mb-0.5">Supplier / Vendor:</span>
            <span className="text-sm font-bold text-slate-900">{operation.partner || 'Direct Supplier'}</span>
          </div>
          <div>
            <span className="text-slate-500 font-medium block mb-0.5">Destination Warehouse:</span>
            <span className="text-sm font-bold text-slate-900">{operation.destinationLocation}</span>
          </div>
          <div>
            <span className="text-slate-500 font-medium block mb-0.5">Scheduled Date:</span>
            <span className="text-sm font-bold text-slate-900">{operation.scheduledDate || 'Immediate'}</span>
          </div>
        </div>

        {operation.notes && (
          <div className="p-3 bg-slate-50 rounded-xl text-xs text-slate-700 border border-slate-200 mt-2 font-medium">
            <span className="font-bold text-slate-900">Notes: </span>
            {operation.notes}
          </div>
        )}
      </div>

      {/* Items Table */}
      <div className="bg-white rounded-2xl border-2 border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 border-b-2 border-slate-200 font-bold text-sm text-slate-900 bg-slate-50">
          Received Items & Quantities
        </div>
        <table className="table w-full text-xs">
          <thead>
            <tr className="bg-slate-100 border-b border-slate-200">
              <th>Product Name</th>
              <th>SKU</th>
              <th className="text-right">Quantity Received</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {operation.items.map((item, idx) => (
              <tr key={idx}>
                <td className="font-bold text-slate-900">{item.productName}</td>
                <td className="font-mono text-slate-500 font-medium">{item.sku}</td>
                <td className="text-right font-black text-emerald-700 text-sm">
                  +{item.quantity} {item.unitOfMeasure}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
