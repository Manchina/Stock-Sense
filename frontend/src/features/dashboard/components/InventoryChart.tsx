import React from 'react';
import { ArrowDownLeft, ArrowUpRight, ArrowLeftRight, SlidersHorizontal } from 'lucide-react';
import { ActivityBreakdownItem } from '../types';

interface InventoryChartProps {
  breakdown?: ActivityBreakdownItem[];
  monthLabel?: string;
  totalOperations?: number;
  loading?: boolean;
}

const DEFAULT_BREAKDOWN: ActivityBreakdownItem[] = [
  { label: 'Receipts (In)', type: 'receipt', count: 0, percentage: 0, color: 'bg-emerald-600' },
  { label: 'Deliveries (Out)', type: 'delivery', count: 0, percentage: 0, color: 'bg-blue-600' },
  { label: 'Transfers', type: 'internal', count: 0, percentage: 0, color: 'bg-teal-600' },
  { label: 'Adjustments', type: 'adjustment', count: 0, percentage: 0, color: 'bg-amber-600' },
];

export const InventoryChart: React.FC<InventoryChartProps> = ({
  breakdown = DEFAULT_BREAKDOWN,
  monthLabel = 'Current Period',
  totalOperations,
  loading = false,
}) => {
  const getIcon = (type: string) => {
    switch (type) {
      case 'receipt':
        return ArrowDownLeft;
      case 'delivery':
        return ArrowUpRight;
      case 'internal':
        return ArrowLeftRight;
      case 'adjustment':
      default:
        return SlidersHorizontal;
    }
  };

  const total = totalOperations ?? breakdown.reduce((acc, item) => acc + item.count, 0);

  return (
    <div className="bg-white p-6 rounded-2xl border-2 border-slate-200 shadow-xs space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-base font-bold text-slate-900">Monthly Inventory Activity Breakdown</h3>
            {loading && <span className="loading loading-spinner loading-xs text-primary" />}
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Real-time distribution across inbound, outbound, transfers, and adjustments ({total} total movements)
          </p>
        </div>
        <span className="badge badge-primary font-bold text-xs text-white">
          {monthLabel}
        </span>
      </div>

      {/* Segmented Bar */}
      <div className="w-full h-4 bg-slate-100 rounded-full overflow-hidden flex gap-1 p-0.5 border border-slate-200">
        {total === 0 ? (
          <div className="w-full h-full bg-slate-200 rounded-full flex items-center justify-center text-[10px] text-slate-500 font-bold">
            No movements recorded yet
          </div>
        ) : (
          breakdown.map((item) => {
            if (item.percentage <= 0) return null;
            return (
              <div
                key={item.label}
                className={`${item.color} h-full rounded-full transition-all duration-500`}
                style={{ width: `${item.percentage}%` }}
                title={`${item.label}: ${item.count} operations (${item.percentage}%)`}
              />
            );
          })
        )}
      </div>

      {/* Legend & Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-2">
        {breakdown.map((item) => {
          const Icon = getIcon(item.type);
          return (
            <div key={item.label} className="p-3 bg-slate-50 rounded-xl border border-slate-200 hover:border-slate-300 transition-colors">
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-1.5">
                  <span className={`w-2.5 h-2.5 rounded-full ${item.color}`} />
                  <span className="text-xs font-bold text-slate-700 truncate">{item.label}</span>
                </div>
                <Icon className="w-3.5 h-3.5 text-slate-400" />
              </div>
              <div className="flex items-baseline justify-between">
                <span className="text-lg font-black text-slate-900">
                  {loading ? '...' : item.count}
                </span>
                <span className="text-xs font-bold text-slate-500">
                  {item.percentage}%
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
