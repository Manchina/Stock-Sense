import React, { useState } from 'react';
import {
  Check,
  CheckCircle2,
  Clock,
  FileText,
  Truck,
  PackageCheck,
  Warehouse,
  Ban,
  ChevronDown,
  ChevronUp,
  MapPin,
  Calendar,
  User,
  ShieldCheck,
  Sparkles,
  ArrowRight,
  Boxes,
  Play,
  RotateCcw,
} from 'lucide-react';
import { OperationStatus, DocumentType } from '../../types/common';
import { formatDate } from '../../lib/utils';
import { cn } from '../../lib/utils';

export interface OperationStatusBarProps {
  status: OperationStatus;
  type?: DocumentType;
  documentNumber?: string;
  createdAt?: string;
  scheduledDate?: string;
  validatedAt?: string;
  validatedBy?: string;
  partner?: string;
  sourceLocation?: string;
  destinationLocation?: string;
  onAdvanceStatus?: (nextStatus: OperationStatus) => void;
  isUpdating?: boolean;
  className?: string;
}

interface StepConfig {
  id: OperationStatus;
  title: string;
  subtitle: string;
  icon: React.ElementType;
  amazonLabel: string;
  description: string;
  actionPrompt?: string;
}

const RECEIPTS_STEPS: StepConfig[] = [
  {
    id: 'draft',
    title: 'Order Placed',
    subtitle: 'Vendor PO registered',
    amazonLabel: 'Ordered',
    description: 'Purchase order registered in system and waiting for supplier dispatch.',
    actionPrompt: 'Mark Dispatched (In Transit)',
    icon: FileText,
  },
  {
    id: 'waiting',
    title: 'In Transit',
    subtitle: 'Dispatched by supplier',
    amazonLabel: 'Dispatched',
    description: 'Carrier has picked up items from supplier and shipment is en route.',
    actionPrompt: 'Mark Arrived (At Intake Bay)',
    icon: Truck,
  },
  {
    id: 'ready',
    title: 'At Intake Bay',
    subtitle: 'Arrived at dock',
    amazonLabel: 'Arrived at Facility',
    description: 'Shipment arrived at warehouse dock and staged for physical inspection.',
    actionPrompt: 'Validate & Restock (Delivered & Stored)',
    icon: PackageCheck,
  },
  {
    id: 'done',
    title: 'Delivered & Stored',
    subtitle: 'Stock credited in ledger',
    amazonLabel: 'Delivered',
    description: 'Quality verification passed. Stock credited directly to active inventory ledger.',
    icon: Warehouse,
  },
];

const DELIVERIES_STEPS: StepConfig[] = [
  {
    id: 'draft',
    title: 'Order Placed',
    subtitle: 'Customer order queued',
    amazonLabel: 'Ordered',
    description: 'Customer order received and queued for warehouse picking.',
    actionPrompt: 'Start Picking Items',
    icon: FileText,
  },
  {
    id: 'waiting',
    title: 'Picking from Shelf',
    subtitle: 'Stock item allocation',
    amazonLabel: 'Preparing',
    description: 'Warehouse staff picking items from assigned bin locations.',
    actionPrompt: 'Mark Packed & Staged',
    icon: PackageCheck,
  },
  {
    id: 'ready',
    title: 'Packed & Staged',
    subtitle: 'Awaiting carrier dispatch',
    amazonLabel: 'Out for Delivery',
    description: 'Order packed in shipping containers and ready at dispatch dock.',
    actionPrompt: 'Dispatch & Confirm Delivery',
    icon: Truck,
  },
  {
    id: 'done',
    title: 'Delivered to Customer',
    subtitle: 'Stock deducted from ledger',
    amazonLabel: 'Delivered',
    description: 'Handed over to recipient. Stock deducted from inventory records.',
    icon: CheckCircle2,
  },
];

const TRANSFERS_STEPS: StepConfig[] = [
  {
    id: 'draft',
    title: 'Transfer Drafted',
    subtitle: 'Route initialized',
    amazonLabel: 'Initiated',
    description: 'Internal transfer ticket created between storage zones.',
    actionPrompt: 'Stage at Origin Bay',
    icon: FileText,
  },
  {
    id: 'waiting',
    title: 'Item Staging',
    subtitle: 'Staged at origin bay',
    amazonLabel: 'Staged',
    description: 'Items gathered from source racks and placed on transfer pallet.',
    actionPrompt: 'Move to Destination Bay',
    icon: Boxes,
  },
  {
    id: 'ready',
    title: 'Moving to Destination',
    subtitle: 'In internal transit',
    amazonLabel: 'In Transit',
    description: 'Transfer vehicle or forklift relocating stock to destination bay.',
    actionPrompt: 'Confirm Restock at Destination',
    icon: Truck,
  },
  {
    id: 'done',
    title: 'Transfer Complete',
    subtitle: 'Restocked at destination',
    amazonLabel: 'Completed',
    description: 'Goods received and cataloged at destination warehouse location.',
    icon: Warehouse,
  },
];

const DEFAULT_STEPS: StepConfig[] = [
  {
    id: 'draft',
    title: 'Draft',
    subtitle: 'Draft initialized',
    amazonLabel: 'Draft',
    description: 'Document created and being configured.',
    actionPrompt: 'Advance to Waiting',
    icon: FileText,
  },
  {
    id: 'waiting',
    title: 'Waiting',
    subtitle: 'Pending fulfillment',
    amazonLabel: 'Waiting',
    description: 'Pending external input or fulfillment actions.',
    actionPrompt: 'Advance to Ready',
    icon: Clock,
  },
  {
    id: 'ready',
    title: 'Ready',
    subtitle: 'Ready for confirmation',
    amazonLabel: 'Ready',
    description: 'All prerequisites met, awaiting final confirmation.',
    actionPrompt: 'Validate & Complete',
    icon: PackageCheck,
  },
  {
    id: 'done',
    title: 'Completed',
    subtitle: 'Inventory ledger updated',
    amazonLabel: 'Completed',
    description: 'Operation verified and inventory ledgers committed.',
    icon: CheckCircle2,
  },
];

export const OperationStatusBar: React.FC<OperationStatusBarProps> = ({
  status,
  type = 'receipt',
  documentNumber,
  createdAt,
  scheduledDate,
  validatedAt,
  validatedBy,
  partner,
  sourceLocation,
  destinationLocation,
  onAdvanceStatus,
  isUpdating = false,
  className,
}) => {
  const [showUpdatesDrawer, setShowUpdatesDrawer] = useState(false);

  const steps =
    type === 'receipt'
      ? RECEIPTS_STEPS
      : type === 'delivery'
      ? DELIVERIES_STEPS
      : type === 'internal'
      ? TRANSFERS_STEPS
      : DEFAULT_STEPS;

  const isCanceled = status === 'canceled';

  const statusOrder: Record<OperationStatus, number> = {
    draft: 0,
    waiting: 1,
    ready: 2,
    done: 3,
    canceled: -1,
  };

  const currentStepIndex = statusOrder[status];

  // Next available step in workflow
  const nextStep: StepConfig | null =
    currentStepIndex >= 0 && currentStepIndex < steps.length - 1
      ? steps[currentStepIndex + 1]
      : null;

  // Amazon Header Headlines and Status Badges
  const getHeaderDetails = () => {
    if (isCanceled) {
      return {
        title: 'Order Canceled',
        subtitle: 'This transaction was canceled. No items were deducted or added.',
        badgeBg: 'bg-rose-100 text-rose-800 border-rose-300',
        heroColor: 'text-rose-700',
      };
    }

    if (status === 'done') {
      const completionText = validatedAt
        ? `Delivered & Verified on ${formatDate(validatedAt)}`
        : 'Delivered & Processed';
      return {
        title: type === 'receipt' ? 'Received & Stored in Inventory' : 'Delivered & Completed',
        subtitle: completionText,
        badgeBg: 'bg-emerald-100 text-emerald-800 border-emerald-300',
        heroColor: 'text-emerald-700',
      };
    }

    if (status === 'ready') {
      return {
        title:
          type === 'receipt'
            ? 'Arrived at Warehouse — Ready for Intake'
            : type === 'delivery'
            ? 'Out for Delivery / Staged for Dispatch'
            : 'Ready for Destination Receiving',
        subtitle: scheduledDate
          ? `Expected Intake: ${scheduledDate}`
          : 'Ready for final inspection and validation',
        badgeBg: 'bg-amber-100 text-amber-900 border-amber-300',
        heroColor: 'text-amber-800',
      };
    }

    if (status === 'waiting') {
      return {
        title:
          type === 'receipt'
            ? 'In Transit — Dispatched by Supplier'
            : type === 'delivery'
            ? 'Preparing & Picking Items'
            : 'Staged at Origin Bay',
        subtitle: scheduledDate
          ? `Estimated arrival: ${scheduledDate}`
          : 'Shipment is currently moving through carrier network',
        badgeBg: 'bg-sky-100 text-sky-900 border-sky-300',
        heroColor: 'text-sky-800',
      };
    }

    // draft
    return {
      title: 'Order Placed & Registered',
      subtitle: createdAt
        ? `Created on ${formatDate(createdAt)}`
        : 'Initial configuration created',
      badgeBg: 'bg-slate-100 text-slate-800 border-slate-300',
      heroColor: 'text-slate-800',
    };
  };

  const header = getHeaderDetails();

  return (
    <div
      className={cn(
        'bg-white rounded-2xl border-2 border-slate-200/90 shadow-sm overflow-hidden transition-all duration-300',
        isCanceled ? 'border-rose-200 bg-rose-50/20' : 'hover:border-slate-300',
        className
      )}
    >
      {/* 1. Amazon Top Headline & Status Banner */}
      <div className="p-5 sm:p-6 bg-gradient-to-b from-slate-50/70 to-white border-b border-slate-200/70">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span
                className={cn(
                  'inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold border uppercase tracking-wider',
                  header.badgeBg
                )}
              >
                {status === 'done' ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                ) : status === 'ready' ? (
                  <PackageCheck className="w-3.5 h-3.5 text-amber-600" />
                ) : status === 'waiting' ? (
                  <Truck className="w-3.5 h-3.5 text-sky-600" />
                ) : isCanceled ? (
                  <Ban className="w-3.5 h-3.5 text-rose-600" />
                ) : (
                  <FileText className="w-3.5 h-3.5 text-slate-500" />
                )}
                {isCanceled
                  ? 'Canceled'
                  : status === 'done'
                  ? 'Completed'
                  : status === 'ready'
                  ? 'Ready'
                  : status === 'waiting'
                  ? 'In Progress'
                  : 'Draft'}
              </span>

              {documentNumber && (
                <span className="text-xs font-mono font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200">
                  {documentNumber}
                </span>
              )}

              {type && (
                <span className="text-xs text-slate-400 font-medium">
                  • {type === 'receipt' ? 'Inbound PO' : type === 'delivery' ? 'Outbound SO' : 'Transfer'}
                </span>
              )}
            </div>

            <h3 className={cn('text-xl sm:text-2xl font-black tracking-tight mt-1', header.heroColor)}>
              {header.title}
            </h3>

            <p className="text-xs sm:text-sm font-medium text-slate-600 flex items-center gap-1.5 pt-0.5">
              <span>{header.subtitle}</span>
              {validatedBy && status === 'done' && (
                <span className="text-emerald-700 font-semibold inline-flex items-center gap-1">
                  • Verified by <span className="font-bold underline">{validatedBy}</span>
                </span>
              )}
            </p>
          </div>

          {/* Quick Tracking Info & Next Action CTA */}
          <div className="flex flex-col sm:items-end gap-2.5 text-xs font-medium text-slate-500">
            {partner && (
              <div className="flex items-center gap-1.5 bg-slate-100/80 px-3 py-1.5 rounded-lg border border-slate-200">
                <User className="w-3.5 h-3.5 text-slate-500" />
                <span className="text-slate-400">Partner:</span>
                <span className="font-bold text-slate-800">{partner}</span>
              </div>
            )}
            {(sourceLocation || destinationLocation) && (
              <div className="flex items-center gap-1.5 bg-slate-100/80 px-3 py-1.5 rounded-lg border border-slate-200">
                <MapPin className="w-3.5 h-3.5 text-primary" />
                <span className="font-bold text-slate-800">
                  {sourceLocation && destinationLocation
                    ? `${sourceLocation} → ${destinationLocation}`
                    : sourceLocation || destinationLocation}
                </span>
              </div>
            )}

            {/* Direct Next Step Action Button in Header */}
            {onAdvanceStatus && nextStep && !isCanceled && (
              <button
                type="button"
                onClick={() => onAdvanceStatus(nextStep.id)}
                disabled={isUpdating}
                className={cn(
                  'btn btn-sm text-white rounded-xl shadow-xs font-black flex items-center gap-1.5 mt-1 transition-all',
                  nextStep.id === 'done'
                    ? 'btn-success bg-emerald-600 hover:bg-emerald-700'
                    : nextStep.id === 'ready'
                    ? 'btn-warning bg-amber-600 hover:bg-amber-700'
                    : 'btn-primary bg-blue-600 hover:bg-blue-700'
                )}
              >
                {isUpdating ? (
                  <span className="loading loading-spinner loading-xs" />
                ) : (
                  <ArrowRight className="w-4 h-4 stroke-[2.5]" />
                )}
                <span>Update Level → {nextStep.title}</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 2. Signature Amazon Stepper Bar */}
      {!isCanceled ? (
        <div className="p-6 sm:p-8 bg-white">
          <div className="max-w-4xl mx-auto">
            {/* Stepper Container */}
            <div className="relative">
              {/* Amazon Segmented Progress Line */}
              <div className="absolute top-5 left-8 right-8 h-2 -translate-y-1/2 flex items-center gap-1 z-0">
                {steps.slice(0, steps.length - 1).map((_, idx) => {
                  const isSegmentFilled = currentStepIndex > idx;
                  const isSegmentCurrent = currentStepIndex === idx;

                  return (
                    <div
                      key={idx}
                      className="flex-1 h-2 rounded-full overflow-hidden bg-slate-100 border border-slate-200/60"
                    >
                      <div
                        className={cn(
                          'h-full transition-all duration-700 ease-out rounded-full',
                          isSegmentFilled
                            ? 'bg-[#067D62] w-full' // Authentic Amazon Dark Emerald Green
                            : isSegmentCurrent
                            ? 'bg-gradient-to-r from-[#067D62] to-sky-500 w-1/2 animate-pulse'
                            : 'w-0'
                        )}
                      />
                    </div>
                  );
                })}
              </div>

              {/* Milestone Step Nodes */}
              <div className="relative z-10 flex justify-between">
                {steps.map((step, idx) => {
                  const isCompleted = currentStepIndex > idx;
                  const isCurrent = currentStepIndex === idx;
                  const isUpcoming = currentStepIndex < idx;
                  const isDirectNext = currentStepIndex + 1 === idx;
                  const StepIcon = step.icon;

                  return (
                    <div
                      key={step.id}
                      className="flex flex-col items-center text-center group"
                      style={{ width: `${100 / steps.length}%` }}
                    >
                      {/* Milestone Icon Node / Button */}
                      <button
                        type="button"
                        disabled={!onAdvanceStatus || isUpdating || isCompleted || isCurrent}
                        onClick={() => onAdvanceStatus && onAdvanceStatus(step.id)}
                        title={
                          isDirectNext && onAdvanceStatus
                            ? `Click to advance status to ${step.title}`
                            : step.title
                        }
                        className={cn(
                          'relative rounded-full focus:outline-none transition-transform',
                          isDirectNext && onAdvanceStatus && 'hover:scale-110 cursor-pointer'
                        )}
                      >
                        <div
                          className={cn(
                            'w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 border-2 font-bold shadow-xs',
                            isCompleted
                              ? 'bg-[#067D62] border-[#067D62] text-white ring-4 ring-emerald-50 shadow-emerald-200'
                              : isCurrent
                              ? 'bg-white border-[#067D62] text-[#067D62] ring-4 ring-emerald-500/20 shadow-lg scale-110'
                              : isDirectNext && onAdvanceStatus
                              ? 'bg-white border-blue-400 text-blue-600 hover:border-blue-600 ring-2 ring-blue-100'
                              : 'bg-white border-slate-300 text-slate-400'
                          )}
                        >
                          {isCompleted ? (
                            <Check className="w-5 h-5 stroke-[3]" />
                          ) : isCurrent ? (
                            <StepIcon className="w-5 h-5 text-[#067D62] animate-pulse stroke-[2.5]" />
                          ) : (
                            <StepIcon className="w-4 h-4 text-slate-400 stroke-[2]" />
                          )}
                        </div>

                        {/* Active Glowing Pulse Ring */}
                        {isCurrent && (
                          <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#067D62] opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-[#067D62] border-2 border-white"></span>
                          </span>
                        )}
                      </button>

                      {/* Milestone Labels (Amazon typography) */}
                      <div className="mt-3 px-1 space-y-1 w-full">
                        <div
                          className={cn(
                            'text-xs sm:text-sm leading-tight transition-colors',
                            isCompleted
                              ? 'font-bold text-slate-900'
                              : isCurrent
                              ? 'font-extrabold text-[#067D62]'
                              : 'font-semibold text-slate-500'
                          )}
                        >
                          {step.title}
                        </div>

                        {/* Current Status Badge Pill */}
                        {isCurrent && (
                          <span className="inline-block bg-emerald-50 text-[#067D62] border border-emerald-200/80 text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full shadow-2xs">
                            Current Status
                          </span>
                        )}

                        {/* Direct advance pill button for next level */}
                        {isDirectNext && onAdvanceStatus && (
                          <button
                            type="button"
                            onClick={() => onAdvanceStatus(step.id)}
                            disabled={isUpdating}
                            className="inline-flex items-center gap-1 text-[10px] font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 px-2 py-0.5 rounded-full shadow-2xs transition-colors cursor-pointer"
                          >
                            <span>Move here</span> <ArrowRight className="w-2.5 h-2.5" />
                          </button>
                        )}

                        <div className="text-[11px] text-slate-400 leading-snug font-medium hidden sm:block">
                          {step.subtitle}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* Canceled Notice View */
        <div className="p-6 bg-rose-50/50 border-t border-rose-100">
          <div className="flex items-center gap-3 p-4 bg-white border border-rose-200 rounded-xl text-rose-900 shadow-2xs">
            <div className="w-10 h-10 rounded-full bg-rose-100 flex items-center justify-center shrink-0 text-rose-600">
              <Ban className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div>
              <h4 className="font-bold text-sm text-rose-950">Shipment / Receipt Voided</h4>
              <p className="text-xs text-rose-700 mt-0.5">
                This document was canceled and did not modify inventory stock balances or warehouse bins.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* 3. Amazon "See all tracking updates" Expandable Accordion Footer */}
      {!isCanceled && (
        <div className="border-t border-slate-200/80 bg-slate-50/60">
          <button
            type="button"
            onClick={() => setShowUpdatesDrawer(!showUpdatesDrawer)}
            className="w-full px-6 py-3 flex items-center justify-between text-xs font-bold text-slate-700 hover:text-slate-900 hover:bg-slate-100/70 transition-colors"
          >
            <span className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-primary" />
              <span>{showUpdatesDrawer ? 'Hide tracking history & details' : 'See all tracking updates & history'}</span>
            </span>
            {showUpdatesDrawer ? (
              <ChevronUp className="w-4 h-4 text-slate-500" />
            ) : (
              <ChevronDown className="w-4 h-4 text-slate-500" />
            )}
          </button>

          {showUpdatesDrawer && (
            <div className="px-6 py-4 border-t border-slate-200/80 bg-white space-y-4 animate-in fade-in slide-in-from-top-2 duration-200">
              <div className="relative pl-6 space-y-4 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
                {steps.map((step, idx) => {
                  const isDone = currentStepIndex >= idx;
                  const isCurrent = currentStepIndex === idx;
                  const isDirectNext = currentStepIndex + 1 === idx;

                  return (
                    <div key={step.id} className="relative group">
                      {/* Timeline Dot */}
                      <div
                        className={cn(
                          'absolute -left-6 top-1 w-4 h-4 rounded-full border-2 flex items-center justify-center transition-colors',
                          isDone
                            ? 'bg-[#067D62] border-white ring-2 ring-[#067D62]/40'
                            : 'bg-white border-slate-300'
                        )}
                      >
                        {isDone && <Check className="w-2.5 h-2.5 text-white stroke-[3]" />}
                      </div>

                      <div className="text-xs flex items-start justify-between gap-4">
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span
                              className={cn(
                                'font-bold',
                                isCurrent
                                  ? 'text-[#067D62] font-black'
                                  : isDone
                                  ? 'text-slate-900 font-bold'
                                  : 'text-slate-400 font-medium'
                              )}
                            >
                              {step.title} — {step.amazonLabel}
                            </span>
                            {isCurrent && (
                              <span className="badge badge-xs bg-emerald-100 text-[#067D62] border-emerald-300 font-bold">
                                ACTIVE STEP
                              </span>
                            )}
                          </div>
                          <p className="text-slate-500 text-[11px] mt-0.5 font-normal">
                            {step.description}
                          </p>
                        </div>

                        {/* Interactive Advance button in timeline */}
                        {isDirectNext && onAdvanceStatus && (
                          <button
                            type="button"
                            onClick={() => onAdvanceStatus(step.id)}
                            disabled={isUpdating}
                            className="btn btn-xs btn-primary font-bold shrink-0"
                          >
                            Advance to {step.title}
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Verified Badge Footer */}
              {status === 'done' && (
                <div className="mt-4 p-3 bg-emerald-50 rounded-xl border border-emerald-200 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2 text-emerald-900 font-semibold">
                    <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Ledger balance synchronized. This movement is locked and audited.</span>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
