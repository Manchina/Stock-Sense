import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { CheckCircle2, ArrowLeftRight, Ban, Loader2, AlertCircle, Clock, ArrowRight } from 'lucide-react';
import { PageHeader } from '../../../components/ui/PageHeader';
import { OperationStatusBar } from '../../../components/ui/OperationStatusBar';
import { INITIAL_OPERATIONS } from '../../../lib/constants';
import { OperationDocument } from '../../../types/common';
import { formatDate } from '../../../lib/utils';
import { transfersApi } from '../../../features/transfers/api';

export const TransferDetails: React.FC = () => {
  const { transferId } = useParams<{ transferId: string }>();

  const [operation, setOperation] = useState<OperationDocument | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isActionPending, setIsActionPending] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!transferId) return;
    setIsLoading(true);
    setErrorMessage(null);

    transfersApi
      .getById(transferId)
      .then((data) => {
        if (data) {
          setOperation(data);
        } else {
          const fallback =
            INITIAL_OPERATIONS.find((o) => o.id === transferId) ||
            INITIAL_OPERATIONS[2];
          setOperation(fallback);
        }
      })
      .catch((err) => {
        console.warn('Failed to load transfer from API:', err);
        const fallback =
          INITIAL_OPERATIONS.find((o) => o.id === transferId) ||
          INITIAL_OPERATIONS[2];
        setOperation(fallback);
      })
      .finally(() => setIsLoading(false));
  }, [transferId]);

  const handleUpdateStatus = async (newStatus: 'ready' | 'done' | 'canceled') => {
    if (!operation) return;
    setErrorMessage(null);
    setIsActionPending(true);

    try {
      const updated = await transfersApi.update(operation.id, {
        status: newStatus,
      });
      setOperation(updated);
    } catch (err: any) {
      console.error(`Failed to update transfer status to ${newStatus}:`, err);
      setErrorMessage(err.message || `Failed to update transfer to ${newStatus}`);
    } finally {
      setIsActionPending(false);
    }
  };

  if (isLoading || !operation) {
    return (
      <div className="flex items-center justify-center p-16 bg-white rounded-2xl border-2 border-slate-200">
        <Loader2 className="w-8 h-8 animate-spin text-primary mr-3" />
        <span className="text-sm font-semibold text-slate-600">Loading transfer details...</span>
      </div>
    );
  }

  return (
    <div className="w-full space-y-6">
      <PageHeader
        title={`Transfer ${operation.documentNumber}`}
        subtitle={`Internal location movement: ${operation.sourceLocation} → ${operation.destinationLocation}`}
        backUrl="/operations/transfers"
      >
        {operation.status !== 'done' && operation.status !== 'canceled' && (
          <>
            <button
              onClick={() => handleUpdateStatus('canceled')}
              disabled={isActionPending}
              className="btn btn-ghost btn-sm text-error rounded-xl font-bold hover:bg-error/10"
            >
              <Ban className="w-4 h-4 mr-1" /> Cancel
            </button>
            {operation.status === 'draft' && (
              <button
                onClick={() => handleUpdateStatus('ready')}
                disabled={isActionPending}
                className="btn btn-outline border-slate-300 btn-sm rounded-xl font-bold bg-white text-slate-700 shadow-xs"
              >
                <Clock className="w-4 h-4 mr-1" /> Mark as Ready
              </button>
            )}
            <button
              onClick={() => handleUpdateStatus('done')}
              disabled={isActionPending}
              className="btn btn-primary btn-sm text-white rounded-xl shadow-xs font-bold flex items-center gap-1.5"
            >
              {isActionPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <CheckCircle2 className="w-4 h-4" />
              )}
              Confirm Movement
            </button>
          </>
        )}
      </PageHeader>

      {/* Order Status Tracker */}
      <OperationStatusBar
        status={operation.status}
        type="internal"
        documentNumber={operation.documentNumber}
        createdAt={operation.createdAt}
        scheduledDate={operation.scheduledDate}
        validatedAt={operation.validatedAt}
        validatedBy={operation.validatedBy}
        sourceLocation={operation.sourceLocation}
        destinationLocation={operation.destinationLocation}
        onAdvanceStatus={(next) => {
          if (next === 'ready' || next === 'done' || next === 'canceled') {
            handleUpdateStatus(next);
          }
        }}
      />

      {errorMessage && (
        <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs font-semibold flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Movement Path Card */}
      <div className="bg-white p-6 rounded-2xl border-2 border-slate-200 shadow-xs space-y-4">
        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider border-b border-slate-100 pb-2">
          Internal Transfer Route
        </h3>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 py-2">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-teal-50 text-teal-700 rounded-xl border border-teal-200 shrink-0">
              <ArrowLeftRight className="w-6 h-6" />
            </div>
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-6 text-xs">
              <div>
                <span className="text-slate-400 block font-medium">Source Bay:</span>
                <span className="text-sm font-bold text-slate-900">{operation.sourceLocation}</span>
              </div>
              <span className="text-slate-300 font-bold hidden sm:inline">→</span>
              <div>
                <span className="text-slate-400 block font-medium">Destination Bay:</span>
                <span className="text-sm font-bold text-teal-700">{operation.destinationLocation}</span>
              </div>
            </div>
          </div>

          <div className="text-right text-xs text-slate-600 font-medium">
            <div>Created: {formatDate(operation.createdAt)}</div>
            {operation.validatedAt && (
              <div className="text-emerald-700 font-bold mt-0.5">
                Completed: {formatDate(operation.validatedAt)} by {operation.validatedBy || 'Staff'}
              </div>
            )}
          </div>
        </div>

        {operation.status === 'done' && (
          <div className="pt-2 flex justify-end">
            <Link
              to="/operations/move-history"
              className="inline-flex items-center gap-1 text-xs font-bold text-primary hover:underline"
            >
              See this dual-entry movement in Stock Move History <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        )}
      </div>

      {/* Items Table */}
      <div className="bg-white rounded-2xl border-2 border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 border-b-2 border-slate-200 font-bold text-sm text-slate-900 bg-slate-50">
          Transferred Items
        </div>
        <table className="table w-full text-xs">
          <thead>
            <tr className="bg-slate-100 border-b border-slate-200">
              <th>Product Name</th>
              <th>SKU</th>
              <th className="text-right">Transfer Quantity</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {(operation.items || []).map((item, idx) => (
              <tr key={idx} className="hover:bg-slate-50/70 transition-colors">
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
