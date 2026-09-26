import React from 'react';
import { OperationStatus } from '../../types/common';
import { cn } from '../../lib/utils';

interface StatusBadgeProps {
  status: OperationStatus;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const STATUS_CONFIG: Record<
  OperationStatus,
  { label: string; bg: string; text: string; border: string; dot: string }
> = {
  draft: {
    label: 'Draft',
    bg: 'bg-slate-100',
    text: 'text-slate-800',
    border: 'border-slate-300',
    dot: 'bg-slate-600',
  },
  waiting: {
    label: 'Waiting',
    bg: 'bg-amber-100',
    text: 'text-amber-900',
    border: 'border-amber-300',
    dot: 'bg-amber-600',
  },
  ready: {
    label: 'Ready',
    bg: 'bg-blue-100',
    text: 'text-blue-900',
    border: 'border-blue-300',
    dot: 'bg-blue-600',
  },
  done: {
    label: 'Done',
    bg: 'bg-emerald-100',
    text: 'text-emerald-900',
    border: 'border-emerald-300',
    dot: 'bg-emerald-600',
  },
  canceled: {
    label: 'Canceled',
    bg: 'bg-rose-100',
    text: 'text-rose-900',
    border: 'border-rose-300',
    dot: 'bg-rose-600',
  },
};

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, size = 'sm', className }) => {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.draft;

  const sizeClass = {
    sm: 'text-[11px] py-0.5 px-2 font-bold',
    md: 'text-xs py-1 px-2.5 font-bold',
    lg: 'text-sm py-1.5 px-3 font-bold',
  }[size];

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-lg border shadow-xs transition-colors shrink-0',
        config.bg,
        config.text,
        config.border,
        sizeClass,
        className
      )}
    >
      <span className={cn('w-1.5 h-1.5 rounded-full shrink-0', config.dot)} />
      <span>{config.label}</span>
    </span>
  );
};
