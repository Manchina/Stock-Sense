import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Package,
  ArrowDownLeft,
  ArrowUpRight,
  ArrowLeftRight,
  SlidersHorizontal,
  History,
  Warehouse,
  LogOut,
  Boxes,
} from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { useUiStore } from '../../store/uiStore';
import { cn } from '../../lib/utils';

export const Sidebar: React.FC = () => {
  const { user, logout } = useAuthStore();
  const { sidebarOpen } = useUiStore();

  const getNavClass = ({ isActive }: { isActive: boolean }) =>
    cn(
      'flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-bold transition-all duration-150 border',
      isActive
        ? 'bg-primary text-white border-primary shadow-xs'
        : 'text-slate-700 border-transparent hover:bg-slate-100 hover:text-slate-900'
    );

  return (
    <aside
      className={cn(
        'fixed inset-y-0 left-0 z-40 flex flex-col w-60 bg-white border-r border-slate-200 transition-transform duration-300 ease-in-out lg:translate-x-0',
        sidebarOpen ? 'translate-x-0' : '-translate-x-full'
      )}
    >
      {/* Brand Logo */}
      <div className="flex items-center gap-2.5 px-5 h-14 border-b border-slate-200 bg-white">
        <div className="p-1.5 bg-primary text-white rounded-lg flex items-center justify-center shadow-xs">
          <Boxes className="w-4 h-4" />
        </div>
        <div>
          <span className="text-lg font-black tracking-tight text-slate-900 leading-none block">
            StockSense
          </span>
          <span className="block text-[9px] uppercase tracking-wider text-slate-500 font-bold mt-0.5">
            Inventory System
          </span>
        </div>
      </div>

      {/* Navigation Links */}
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-4">
        {/* Main Section */}
        <div>
          <div className="px-2 mb-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Overview
          </div>
          <div className="space-y-0.5">
            <NavLink to="/dashboard" className={getNavClass}>
              {({ isActive }) => (
                <>
                  <LayoutDashboard className={cn('w-4 h-4 shrink-0', isActive ? 'text-white' : 'text-slate-600')} />
                  <span>Dashboard</span>
                </>
              )}
            </NavLink>
            <NavLink to="/products" className={getNavClass}>
              {({ isActive }) => (
                <>
                  <Package className={cn('w-4 h-4 shrink-0', isActive ? 'text-white' : 'text-slate-600')} />
                  <span>Products</span>
                </>
              )}
            </NavLink>
          </div>
        </div>

        {/* Operations Section */}
        <div>
          <div className="px-2 mb-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Operations
          </div>
          <div className="space-y-0.5">
            <NavLink to="/operations/receipts" className={getNavClass}>
              {({ isActive }) => (
                <>
                  <ArrowDownLeft className={cn('w-4 h-4 shrink-0', isActive ? 'text-white' : 'text-emerald-600')} />
                  <span>Receipts (In)</span>
                </>
              )}
            </NavLink>
            <NavLink to="/operations/deliveries" className={getNavClass}>
              {({ isActive }) => (
                <>
                  <ArrowUpRight className={cn('w-4 h-4 shrink-0', isActive ? 'text-white' : 'text-blue-600')} />
                  <span>Deliveries (Out)</span>
                </>
              )}
            </NavLink>
            <NavLink to="/operations/transfers" className={getNavClass}>
              {({ isActive }) => (
                <>
                  <ArrowLeftRight className={cn('w-4 h-4 shrink-0', isActive ? 'text-white' : 'text-teal-600')} />
                  <span>Internal Transfers</span>
                </>
              )}
            </NavLink>
            <NavLink to="/operations/adjustments" className={getNavClass}>
              {({ isActive }) => (
                <>
                  <SlidersHorizontal className={cn('w-4 h-4 shrink-0', isActive ? 'text-white' : 'text-amber-600')} />
                  <span>Stock Adjustments</span>
                </>
              )}
            </NavLink>
            <NavLink to="/operations/move-history" className={getNavClass}>
              {({ isActive }) => (
                <>
                  <History className={cn('w-4 h-4 shrink-0', isActive ? 'text-white' : 'text-slate-600')} />
                  <span>Move History</span>
                </>
              )}
            </NavLink>
          </div>
        </div>

        {/* Settings Section */}
        <div>
          <div className="px-2 mb-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Settings
          </div>
          <div className="space-y-0.5">
            <NavLink to="/settings/warehouses" className={getNavClass}>
              {({ isActive }) => (
                <>
                  <Warehouse className={cn('w-4 h-4 shrink-0', isActive ? 'text-white' : 'text-slate-600')} />
                  <span>Warehouses</span>
                </>
              )}
            </NavLink>
          </div>
        </div>
      </div>

      {/* User Profile & Footer */}
      <div className="p-3 border-t border-slate-200 bg-slate-50">
        <NavLink
          to="/profile"
          className="flex items-center gap-2.5 p-2 rounded-xl hover:bg-slate-200/70 transition-colors group"
        >
          <div className="avatar">
            <div className="w-8 h-8 rounded-full ring-2 ring-primary overflow-hidden">
              {user?.avatar ? (
                <img src={user.avatar} alt={user.name} className="w-full h-full object-cover" />
              ) : (
                <div className="bg-primary text-white flex items-center justify-center font-bold text-xs w-full h-full">
                  {user?.name?.[0] || 'U'}
                </div>
              )}
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold text-slate-900 truncate group-hover:text-primary">
              {user?.name || 'Sarah Connor'}
            </p>
            <p className="text-[10px] text-slate-500 capitalize truncate font-medium">
              {user?.role?.replace('_', ' ') || 'Manager'}
            </p>
          </div>
        </NavLink>
        <button
          onClick={logout}
          className="btn btn-xs btn-outline border-slate-300 w-full mt-2 justify-start gap-2 text-rose-700 hover:bg-rose-600 hover:text-white font-bold rounded-lg py-1"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span className="text-xs">Sign Out</span>
        </button>
      </div>
    </aside>
  );
};
