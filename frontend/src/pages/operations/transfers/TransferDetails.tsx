import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import { CheckCircle2, ArrowLeftRight, Ban } from 'lucide-react';
import { PageHeader } from '../../../components/ui/PageHeader';
import { StatusBadge } from '../../../components/ui/StatusBadge';
import { INITIAL_OPERATIONS } from '../../../lib/constants';
import { formatDate } from '../../../lib/utils';

export const TransferDetails: React.FC = () => {
  const { transferId } = useParams<{ transferId: string }>();

  const [operation, setOperation] = useState(
    INITIAL_OPERATIONS.find((o) => o.id === transferId) || INITIAL_OPERATIONS[2]
  );

  const handleValidate = () => {
    setOperation({
      ...operation,
      status: 'done',
      validatedAt: new Date().toISOString(),
      validatedBy: 'Alex Miller (Warehouse Staff)',
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
        title={`Transfer ${operation.documentNumber}`}
        subtitle={`Internal location movement: ${operation.sourceLocation} → ${operation.destinationLocation}`}
        backUrl="/operations/transfers"
      >
        {operation.status !== 'done' && operation.status !== 'canceled' && (
          <>
            <button onClick={handleCancel} className="btn btn-ghost btn-sm text-error rounded-xl font-bold hover:bg-error/10">
              <Ban className="w-4 h-4 mr-1" /> Cancel
            </button>
            <button
              onClick={handleValidate}
              className="btn btn-primary btn-sm text-white rounded-xl shadow-xs font-bold flex items-center gap-1.5"
            >
              <CheckCircle2 className="w-4 h-4" /> Confirm Movement
            </button>
          </>
        )}
      </PageHeader>

      {/* Movement Path Card */}
      <div className="bg-white p-6 rounded-2xl border-2 border-slate-200 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-teal-50 text-teal-700 rounded-xl border border-teal-200">
              <ArrowLeftRight className="w-6 h-6" />
            </div>
            <div>
              <div className="text-xs text-slate-500 font-bold uppercase">Movement Status</div>
              <div className="mt-1 flex items-center gap-2">
                <StatusBadge status={operation.status} size="md" />
                {operation.status === 'done' && (
                  <span className="text-xs font-bold text-emerald-700">
                    ✓ Transferred to destination location ledger
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="text-right text-xs text-slate-600 font-medium">
            <div>Created: {formatDate(operation.createdAt)}</div>
            {operation.validatedAt && (
              <div className="text-emerald-700 font-bold mt-0.5">
                Completed: {formatDate(operation.validatedAt)} by {operation.validatedBy}
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 text-xs">
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
            <span className="text-slate-500 font-medium block mb-1">Source Location (From):</span>
            <span className="text-sm font-bold text-slate-900">{operation.sourceLocation}</span>
          </div>
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
            <span className="text-slate-500 font-medium block mb-1">Destination Location (To):</span>
            <span className="text-sm font-bold text-slate-900">{operation.destinationLocation}</span>
          </div>
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
            <span className="text-slate-500 font-medium block mb-1">Scheduled Date:</span>
            <span className="text-sm font-bold text-slate-900">{operation.scheduledDate || 'Immediate'}</span>
          </div>
        </div>

        {operation.notes && (
          <div className="p-3 bg-slate-50 rounded-xl text-xs text-slate-700 border border-slate-200 mt-2 font-medium">
            <span className="font-bold text-slate-900">Transfer Notes: </span>
            {operation.notes}
          </div>
        )}
      </div>

      {/* Items Table */}
      <div className="bg-white rounded-2xl border-2 border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 border-b-2 border-slate-200 font-bold text-sm text-slate-900 bg-slate-50">
          Items Transferred
        </div>
        <table className="table w-full text-xs">
          <thead>
            <tr className="bg-slate-100 border-b border-slate-200">
              <th>Product Name</th>
              <th>SKU</th>
              <th className="text-right">Quantity Transferred</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {operation.items.map((item, idx) => (
              <tr key={idx}>
                <td className="font-bold text-slate-900">{item.productName}</td>
                <td className="font-mono text-slate-500 font-medium">{item.sku}</td>
                <td className="text-right font-black text-teal-700 text-sm">
                  {item.quantity} {item.unitOfMeasure}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
