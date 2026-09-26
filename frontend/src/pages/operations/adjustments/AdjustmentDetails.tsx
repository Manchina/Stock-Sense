import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import { CheckCircle2, SlidersHorizontal, Ban } from 'lucide-react';
import { PageHeader } from '../../../components/ui/PageHeader';
import { StatusBadge } from '../../../components/ui/StatusBadge';
import { INITIAL_OPERATIONS } from '../../../lib/constants';
import { formatDate } from '../../../lib/utils';

export const AdjustmentDetails: React.FC = () => {
  const { adjustmentId } = useParams<{ adjustmentId: string }>();

  const [operation, setOperation] = useState(
    INITIAL_OPERATIONS.find((o) => o.id === adjustmentId) || INITIAL_OPERATIONS[3]
  );

  const handleApply = () => {
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
        title={`Stock Adjustment ${operation.documentNumber}`}
        subtitle={`Inventory discrepancy correction at ${operation.sourceLocation || 'Warehouse'}`}
        backUrl="/operations/adjustments"
      >
        {operation.status === 'draft' && (
          <>
            <button onClick={handleCancel} className="btn btn-ghost btn-sm text-error rounded-xl font-bold hover:bg-error/10">
              <Ban className="w-4 h-4 mr-1" /> Cancel
            </button>
            <button
              onClick={handleApply}
              className="btn btn-primary btn-sm text-white rounded-xl shadow-xs font-bold flex items-center gap-1.5"
            >
              <CheckCircle2 className="w-4 h-4" /> Apply to Ledger
            </button>
          </>
        )}
      </PageHeader>

      <div className="bg-white p-6 rounded-2xl border-2 border-slate-200 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-amber-50 text-amber-700 rounded-xl border border-amber-200">
              <SlidersHorizontal className="w-6 h-6" />
            </div>
            <div>
              <div className="text-xs text-slate-500 font-bold uppercase">Adjustment Status</div>
              <div className="mt-1 flex items-center gap-2">
                <StatusBadge status={operation.status} size="md" />
                {operation.status === 'done' && (
                  <span className="text-xs font-bold text-emerald-700">
                    ✓ Applied to inventory ledger
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="text-right text-xs text-slate-600 font-medium">
            <div>Created: {formatDate(operation.createdAt)}</div>
            {operation.validatedAt && (
              <div className="text-emerald-700 font-bold mt-0.5">
                Applied: {formatDate(operation.validatedAt)} by {operation.validatedBy}
              </div>
            )}
          </div>
        </div>

        <div className="text-xs space-y-2">
          <div>
            <span className="text-slate-500 font-medium">Location: </span>
            <span className="font-bold text-slate-900">{operation.sourceLocation}</span>
          </div>
          {operation.notes && (
            <div>
              <span className="text-slate-500 font-medium">Reason: </span>
              <span className="text-slate-800 font-medium">{operation.notes}</span>
            </div>
          )}
        </div>
      </div>

      <div className="bg-white rounded-2xl border-2 border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 border-b-2 border-slate-200 font-bold text-sm text-slate-900 bg-slate-50">
          Adjusted Line Items
        </div>
        <table className="table w-full text-xs">
          <thead>
            <tr className="bg-slate-100 border-b border-slate-200">
              <th>Product</th>
              <th>SKU</th>
              <th className="text-right">Stock Adjustment (Delta)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {operation.items.map((item, idx) => (
              <tr key={idx}>
                <td className="font-bold text-slate-900">{item.productName}</td>
                <td className="font-mono text-slate-500 font-medium">{item.sku}</td>
                <td className={`text-right font-black text-sm ${item.quantity >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                  {item.quantity > 0 ? `+${item.quantity}` : item.quantity} {item.unitOfMeasure}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
