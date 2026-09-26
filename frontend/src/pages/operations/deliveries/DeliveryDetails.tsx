import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Box, PackageCheck, Truck, Ban, ArrowRight, RefreshCw, AlertCircle } from 'lucide-react';
import { PageHeader } from '../../../components/ui/PageHeader';
import { OperationStatusBar } from '../../../components/ui/OperationStatusBar';
import { OperationDocument, OperationStatus } from '../../../types/common';
import { deliveriesApi } from '../../../features/deliveries/api';
import { formatDate } from '../../../lib/utils';
import { toast } from '../../../context/ToastContext';

export const DeliveryDetails: React.FC = () => {
  const { deliveryId } = useParams<{ deliveryId: string }>();
  const navigate = useNavigate();

  const [operation, setOperation] = useState<OperationDocument | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isUpdating, setIsUpdating] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const fetchDelivery = useCallback(async () => {
    if (!deliveryId) return;
    try {
      setErrorMessage(null);
      const res = await deliveriesApi.getById(deliveryId);
      if (res && res.data) {
        setOperation(res.data);
      }
    } catch (err: any) {
      console.error('Failed to fetch delivery:', err);
      setErrorMessage(err?.message || 'Could not load delivery order details.');
    } finally {
      setIsLoading(false);
    }
  }, [deliveryId]);

  useEffect(() => {
    fetchDelivery();
  }, [fetchDelivery]);

  const handleStepAction = async (nextStatus: OperationStatus) => {
    if (!deliveryId || !operation) return;
    setIsUpdating(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      if (nextStatus === 'done') {
        const res = await deliveriesApi.validate(deliveryId);
        if (res && res.data) {
          setOperation(res.data);
          const msg = 'Delivery order validated! Stock deducted and recorded in move history ledger.';
          setSuccessMessage(msg);
          toast.success(msg, 'Stock Deducted (-Out)');
        }
      } else {
        const res = await deliveriesApi.update(deliveryId, { status: nextStatus });
        if (res && res.data) {
          setOperation(res.data);
          const msg = `Delivery order status updated to '${nextStatus}'.`;
          setSuccessMessage(msg);
          toast.success(msg, 'Status Updated');
        }
      }
    } catch (err: any) {
      console.error('Failed to update status:', err);
      toast.zod(err, 'Failed to update order status');
      setErrorMessage(err?.message || 'Failed to update order status.');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleCancel = async () => {
    if (!deliveryId || !operation) return;
    if (!window.confirm('Are you sure you want to cancel this delivery order?')) return;

    setIsUpdating(true);
    setErrorMessage(null);

    try {
      const res = await deliveriesApi.cancel(deliveryId);
      if (res && res.data) {
        setOperation(res.data);
        const msg = 'Delivery order marked as canceled.';
        setSuccessMessage(msg);
        toast.info(msg, 'Order Canceled');
      }
    } catch (err: any) {
      console.error('Failed to cancel delivery:', err);
      toast.zod(err, 'Failed to cancel delivery order');
      setErrorMessage(err?.message || 'Failed to cancel delivery order.');
    } finally {
      setIsUpdating(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[350px] space-y-3">
        <RefreshCw className="w-8 h-8 text-primary animate-spin" />
        <span className="text-xs font-semibold text-slate-500">Loading delivery order details...</span>
      </div>
    );
  }

  if (!operation) {
    return (
      <div className="bg-white p-8 rounded-2xl border border-slate-200 text-center space-y-4">
        <AlertCircle className="w-12 h-12 text-error mx-auto" />
        <h3 className="text-base font-bold text-slate-900">Delivery Order Not Found</h3>
        <p className="text-xs text-slate-500">
          The requested delivery order with identifier '{deliveryId}' could not be located.
        </p>
        <button
          onClick={() => navigate('/operations/deliveries')}
          className="btn btn-primary btn-sm rounded-xl font-bold text-white"
        >
          Return to Deliveries
        </button>
      </div>
    );
  }

  return (
    <div className="w-full space-y-6">
      <PageHeader
        title={`Delivery Order ${operation.documentNumber}`}
        subtitle={`Outbound customer delivery to ${operation.partner || operation.customerName || 'Direct Customer'}`}
        backUrl="/operations/deliveries"
      >
        <button
          onClick={fetchDelivery}
          disabled={isUpdating}
          className="btn btn-outline border-slate-300 btn-xs sm:btn-sm rounded-xl font-bold bg-white text-slate-700 shadow-xs hover:bg-slate-50"
          title="Refresh"
        >
          <RefreshCw className={`w-3.5 h-3.5 mr-1 ${isUpdating ? 'animate-spin' : ''}`} />
          Refresh
        </button>
        {operation.status !== 'done' && operation.status !== 'canceled' && (
          <button
            onClick={handleCancel}
            disabled={isUpdating}
            className="btn btn-ghost btn-xs sm:btn-sm text-error rounded-xl font-bold hover:bg-error/10"
          >
            <Ban className="w-3.5 h-3.5 mr-1" /> Cancel Order
          </button>
        )}
      </PageHeader>

      {errorMessage && (
        <div className="alert alert-error rounded-xl shadow-xs py-2 px-4 flex items-center gap-2 text-xs font-semibold text-white">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {successMessage && (
        <div className="alert alert-success rounded-xl shadow-xs py-2 px-4 flex items-center gap-2 text-xs font-semibold text-white">
          <span>{successMessage}</span>
        </div>
      )}

      {/* Order Status Tracker */}
      <OperationStatusBar
        status={operation.status}
        type="delivery"
        documentNumber={operation.documentNumber}
        createdAt={operation.createdAt}
        scheduledDate={operation.scheduledDate}
        validatedAt={operation.validatedAt}
        validatedBy={operation.validatedBy}
        partner={operation.partner || operation.customerName}
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
                disabled={isUpdating}
                onClick={() => handleStepAction('waiting')}
                className="btn btn-sm btn-primary rounded-xl text-white font-bold"
              >
                <Box className="w-4 h-4 mr-1" /> Start Picking
              </button>
            )}
            {operation.status === 'waiting' && (
              <button
                disabled={isUpdating}
                onClick={() => handleStepAction('ready')}
                className="btn btn-sm btn-info rounded-xl text-white font-bold"
              >
                <PackageCheck className="w-4 h-4 mr-1" /> Mark as Packed (Ready)
              </button>
            )}
            {operation.status === 'ready' && (
              <button
                disabled={isUpdating}
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
            <span className="text-sm font-bold text-slate-900">{operation.partner || operation.customerName || 'Direct Customer'}</span>
          </div>
          <div>
            <span className="text-slate-500 font-medium block mb-0.5">Source Warehouse:</span>
            <span className="text-sm font-bold text-slate-900">{operation.sourceLocation || 'Main Warehouse'}</span>
          </div>
          <div>
            <span className="text-slate-500 font-medium block mb-0.5">Scheduled Delivery Date:</span>
            <span className="text-sm font-bold text-slate-900">{formatDate(operation.scheduledDate || operation.createdAt)}</span>
          </div>
          {operation.customerRef && (
            <div>
              <span className="text-slate-500 font-medium block mb-0.5">Customer Reference:</span>
              <span className="text-sm font-bold text-slate-900">{operation.customerRef}</span>
            </div>
          )}
          {operation.notes && (
            <div className="col-span-full">
              <span className="text-slate-500 font-medium block mb-0.5">Dispatch Instructions / Notes:</span>
              <span className="text-xs font-semibold text-slate-700 bg-slate-50 p-2.5 rounded-lg border border-slate-200 block">
                {operation.notes}
              </span>
            </div>
          )}
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
        <div className="p-4 border-b-2 border-slate-200 font-bold text-sm text-slate-900 bg-slate-50 flex items-center justify-between">
          <span>Packed Line Items</span>
          <span className="text-xs font-semibold text-slate-500">
            {operation.items?.length || 0} line item{operation.items?.length === 1 ? '' : 's'}
          </span>
        </div>
        <table className="table w-full text-xs">
          <thead>
            <tr className="bg-slate-100 border-b border-slate-200">
              <th>Product Name</th>
              <th>SKU</th>
              <th className="text-right">Ordered</th>
              <th className="text-right">Delivered / Deducted</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {(operation.items || []).map((item, idx) => (
              <tr key={idx} className="hover:bg-slate-50/70 transition-colors">
                <td className="font-bold text-slate-900">{item.productName}</td>
                <td className="font-mono text-slate-500 font-medium">{item.sku || '-'}</td>
                <td className="text-right font-bold text-slate-700 text-xs">
                  {item.quantity} {item.unitOfMeasure || 'pcs'}
                </td>
                <td className="text-right font-black text-rose-700 text-sm">
                  {operation.status === 'done'
                    ? `-${item.quantity} ${item.unitOfMeasure || 'pcs'}`
                    : `${item.quantity} ${item.unitOfMeasure || 'pcs'} (Pending)`}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
