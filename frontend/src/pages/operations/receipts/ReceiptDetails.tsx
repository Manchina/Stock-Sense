import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { CheckCircle2, Ban, Loader2, ArrowRight } from 'lucide-react';
import { PageHeader } from '../../../components/ui/PageHeader';
import { OperationStatusBar } from '../../../components/ui/OperationStatusBar';
import { INITIAL_OPERATIONS } from '../../../lib/constants';
import { formatDate } from '../../../lib/utils';
import { OperationDocument, OperationStatus } from '../../../types/common';
import { receiptsApi } from '../../../features/receipts/api';
import { toast } from '../../../context/ToastContext';

export const ReceiptDetails: React.FC = () => {
  const { receiptId } = useParams<{ receiptId: string }>();
  const navigate = useNavigate();

  const [operation, setOperation] = useState<OperationDocument | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadReceipt() {
      if (!receiptId) return;

      try {
        const res = await receiptsApi.getReceiptById(receiptId);
        if (res && res.data && isMounted) {
          setOperation(res.data);
          setIsLoading(false);
          return;
        }
      } catch (err) {
        console.warn('API fetch by ID failed, falling back to local dataset:', err);
      }

      // Fallback
      const fallback = INITIAL_OPERATIONS.find((o) => o.id === receiptId || o.documentNumber === receiptId);
      if (fallback && isMounted) {
        setOperation(fallback);
      }
      if (isMounted) setIsLoading(false);
    }

    loadReceipt();
    return () => {
      isMounted = false;
    };
  }, [receiptId]);

  const handleAdvanceStatus = async (nextStatus: OperationStatus) => {
    if (!receiptId || !operation) return;
    setIsProcessing(true);
    setActionMessage(null);

    try {
      if (nextStatus === 'done') {
        const res = await receiptsApi.validateReceipt(receiptId);
        if (res && res.data) {
          setOperation(res.data);
          const msg = 'Receipt validated! Stock credited and appended to move history ledger.';
          setActionMessage(msg);
          toast.success(msg, 'Stock Credited (+In)');
        }
      } else if (nextStatus === 'canceled') {
        const res = await receiptsApi.cancelReceipt(receiptId);
        if (res && res.data) {
          setOperation(res.data);
          const msg = 'Receipt order has been marked as canceled.';
          setActionMessage(msg);
          toast.info(msg, 'Order Canceled');
        }
      } else {
        const res = await receiptsApi.updateReceipt(receiptId, { status: nextStatus });
        if (res && res.data) {
          setOperation(res.data);
          const label =
            nextStatus === 'waiting'
              ? 'In Transit (Dispatched by supplier)'
              : nextStatus === 'ready'
              ? 'At Intake Bay (Arrived at warehouse dock)'
              : 'Order Placed (Draft)';
          setActionMessage(`Receipt status advanced to: ${label}`);
          toast.success(`Receipt status updated to '${nextStatus}'.`, 'Status Updated');
        }
      }
    } catch (err: any) {
      console.error('API status transition failed:', err);
      toast.zod(err, 'Failed to update receipt status');
      setActionMessage(err?.message || 'Failed to update receipt status.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleValidate = async () => {
    await handleAdvanceStatus('done');
  };

  const handleCancel = async () => {
    await handleAdvanceStatus('canceled');
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-16 bg-white rounded-2xl border-2 border-slate-200">
        <Loader2 className="w-8 h-8 animate-spin text-primary mr-3" />
        <span className="text-sm font-semibold text-slate-700">Loading receipt details...</span>
      </div>
    );
  }

  if (!operation) {
    return (
      <div className="bg-white p-8 rounded-2xl border-2 border-slate-200 text-center space-y-3">
        <h3 className="text-base font-bold text-slate-900">Receipt Not Found</h3>
        <p className="text-xs text-slate-500">The requested receipt record could not be found.</p>
        <button
          onClick={() => navigate('/operations/receipts')}
          className="btn btn-primary btn-sm rounded-xl font-bold"
        >
          Back to Receipts
        </button>
      </div>
    );
  }

  return (
    <div className="w-full space-y-6">
      <PageHeader
        title={`Receipt ${operation.documentNumber}`}
        subtitle={`Inbound stock receipt from ${operation.partner || 'Vendor'}`}
        backUrl="/operations/receipts"
      >
        {operation.status !== 'done' && operation.status !== 'canceled' && (
          <>
            <button
              onClick={handleCancel}
              disabled={isProcessing}
              className="btn btn-ghost btn-sm text-error rounded-xl font-bold hover:bg-error/10"
            >
              <Ban className="w-4 h-4 mr-1" /> Cancel
            </button>
            <button
              onClick={handleValidate}
              disabled={isProcessing}
              className="btn btn-success btn-sm text-white rounded-xl shadow-xs font-bold flex items-center gap-1.5"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Validating...
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" /> Validate & Restock
                </>
              )}
            </button>
          </>
        )}
      </PageHeader>

      {actionMessage && (
        <div className="alert alert-success text-xs flex items-center justify-between rounded-xl shadow-xs">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{actionMessage}</span>
          </div>
          <Link
            to="/operations/move-history"
            className="btn btn-xs bg-white text-emerald-800 border-none font-bold hover:bg-emerald-50 gap-1"
          >
            View in Move History <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
      )}

      {/* Amazon-Style Order Status Tracker Bar with Step Progression */}
      <OperationStatusBar
        status={operation.status}
        type="receipt"
        documentNumber={operation.documentNumber}
        createdAt={operation.createdAt}
        scheduledDate={operation.scheduledDate}
        validatedAt={operation.validatedAt}
        validatedBy={operation.validatedBy}
        partner={operation.partner}
        destinationLocation={operation.destinationLocation}
        onAdvanceStatus={handleAdvanceStatus}
        isUpdating={isProcessing}
      />

      {/* Document Details Card */}
      <div className="bg-white p-6 rounded-2xl border-2 border-slate-200 shadow-xs space-y-4">
        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider border-b border-slate-100 pb-2">
          Facility & Vendor Intake Summary
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-1 text-xs">
          <div>
            <span className="text-slate-500 font-medium block mb-0.5">Supplier / Vendor:</span>
            <span className="text-sm font-bold text-slate-900">{operation.partner || 'Direct Supplier'}</span>
          </div>
          <div>
            <span className="text-slate-500 font-medium block mb-0.5">Destination Warehouse & Location:</span>
            <span className="text-sm font-bold text-slate-900">{operation.destinationLocation || 'Main Warehouse'}</span>
          </div>
          <div>
            <span className="text-slate-500 font-medium block mb-0.5">Scheduled Arrival Date:</span>
            <span className="text-sm font-bold text-slate-900">{operation.scheduledDate || 'Immediate'}</span>
          </div>
        </div>

        {operation.notes && (
          <div className="p-3 bg-slate-50 rounded-xl text-xs text-slate-700 border border-slate-200 mt-2 font-medium">
            <span className="font-bold text-slate-900">Notes / PO Reference: </span>
            {operation.notes}
          </div>
        )}

        {operation.status === 'done' && (
          <div className="pt-2 flex justify-end">
            <Link
              to="/operations/move-history"
              className="inline-flex items-center gap-1 text-xs font-bold text-primary hover:underline"
            >
              See this movement in Stock Move History <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        )}
      </div>

      {/* Received Items Table */}
      <div className="bg-white rounded-2xl border-2 border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 border-b-2 border-slate-200 font-bold text-sm text-slate-900 bg-slate-50 flex items-center justify-between">
          <span>Received Product Line Items</span>
          <span className="text-xs font-medium text-slate-500">
            {operation.items?.length || 0} product line{operation.items?.length === 1 ? '' : 's'}
          </span>
        </div>
        <table className="table w-full text-xs">
          <thead>
            <tr className="bg-slate-100 border-b border-slate-200">
              <th>Product Name</th>
              <th>SKU</th>
              <th className="text-right">Quantity Expected</th>
              <th className="text-right">Quantity Received</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {operation.items && operation.items.length > 0 ? (
              operation.items.map((item, idx) => (
                <tr key={idx} className="hover:bg-slate-50/70 transition-colors">
                  <td className="font-bold text-slate-900">{item.productName}</td>
                  <td className="font-mono text-slate-500 font-medium">{item.sku}</td>
                  <td className="text-right font-semibold text-slate-700">
                    {item.quantity} {item.unitOfMeasure}
                  </td>
                  <td className="text-right font-black text-emerald-700 text-sm">
                    +{item.quantity} {item.unitOfMeasure}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={4} className="text-center py-6 text-slate-400 italic">
                  No line items found on this receipt.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
