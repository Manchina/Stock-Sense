import React from 'react';
import { ArrowDownLeft, ArrowUpRight, ArrowLeftRight, SlidersHorizontal } from 'lucide-react';

export const InventoryChart: React.FC = () => {
  const operationsBreakdown = [
    { label: 'Receipts (In)', count: 48, percentage: 40, color: 'bg-emerald-600', icon: ArrowDownLeft },
    { label: 'Deliveries (Out)', count: 32, percentage: 27, color: 'bg-blue-600', icon: ArrowUpRight },
    { label: 'Transfers', count: 25, percentage: 21, color: 'bg-teal-600', icon: ArrowLeftRight },
    { label: 'Adjustments', count: 14, percentage: 12, color: 'bg-amber-600', icon: SlidersHorizontal },
  ];

  return (
    <div className="bg-white p-6 rounded-2xl border-2 border-slate-200 shadow-xs space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-bold text-slate-900">Monthly Inventory Activity Breakdown</h3>
          <p className="text-xs text-slate-500 mt-0.5">Real-time distribution across inbound, outbound, transfers, and adjustments</p>
        </div>
        <span className="badge badge-primary font-bold text-xs text-white">September 2026</span>
      </div>

      {/* Segmented Bar */}
      <div className="w-full h-4 bg-slate-100 rounded-full overflow-hidden flex gap-1 p-0.5 border border-slate-200">
        {operationsBreakdown.map((item) => (
          <div
            key={item.label}
            className={`${item.color} h-full rounded-full transition-all duration-300`}
            style={{ width: `${item.percentage}%` }}
            title={`${item.label}: ${item.count} items (${item.percentage}%)`}
          />
        ))}
      </div>

      {/* Legend & Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-2">
        {operationsBreakdown.map((item) => (
          <div key={item.label} className="p-3 bg-slate-50 rounded-xl border border-slate-200">
            <div className="flex items-center gap-2 mb-1">
              <span className={`w-2.5 h-2.5 rounded-full ${item.color}`} />
              <span className="text-xs font-bold text-slate-700 truncate">{item.label}</span>
            </div>
            <div className="flex items-baseline justify-between">
              <span className="text-lg font-black text-slate-900">{item.count}</span>
              <span className="text-xs font-bold text-slate-500">{item.percentage}%</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
