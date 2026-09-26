import React from 'react';
import { Menu, Bell, ShieldCheck } from 'lucide-react';
import { useUiStore } from '../../store/uiStore';
import { useAuthStore } from '../../store/authStore';

export const Header: React.FC = () => {
  const { toggleSidebar } = useUiStore();
  const { user } = useAuthStore();

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between h-14 px-4 sm:px-6 bg-white border-b border-slate-200 shadow-xs">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={toggleSidebar}
          className="btn btn-ghost btn-square btn-sm lg:hidden border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 rounded-lg"
          aria-label="Toggle sidebar"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="hidden sm:flex items-center gap-2 px-3 py-1 bg-blue-50 rounded-full border border-blue-200">
          <ShieldCheck className="w-3.5 h-3.5 text-primary" />
          <span className="text-xs font-bold text-primary">
            {user?.role === 'inventory_manager' ? 'Inventory Manager Portal' : 'Warehouse Staff Ops'}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-3">
        {/* Notifications */}
        <div className="dropdown dropdown-end">
          <div
            tabIndex={0}
            role="button"
            className="btn btn-ghost btn-circle btn-sm bg-white border border-slate-300 hover:bg-slate-100 hover:border-slate-400 text-slate-700"
            title="Notifications"
          >
            <div className="indicator">
              <Bell className="w-4 h-4 text-slate-700" />
              <span className="badge badge-xs bg-blue-600 border-none indicator-item"></span>
            </div>
          </div>
          <div
            tabIndex={0}
            className="dropdown-content z-[1] menu p-3 shadow-xl bg-white rounded-2xl w-72 border border-slate-200 mt-2"
          >
            <div className="font-bold text-sm px-2 pb-2 border-b border-slate-200 text-slate-900">
              Inventory Notifications
            </div>
            <div className="py-2 space-y-2 text-xs">
              <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900">
                <span className="font-bold block">⚠️ Low Stock Alert</span>
                Corrugated Shipping Box (L) is below minimum safety threshold (5 units remaining).
              </div>
              <div className="p-2.5 rounded-xl bg-blue-50 border border-blue-200 text-blue-900">
                <span className="font-bold block">📦 New Delivery Scheduled</span>
                Order #DEL-2026-0112 is ready for picking and packing.
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
