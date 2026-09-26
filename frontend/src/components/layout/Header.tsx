import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Menu,
  Bell,
  ShieldCheck,
  AlertTriangle,
  Truck,
  ArrowDownLeft,
  ArrowLeftRight,
  CheckCheck,
  X,
  ExternalLink,
  CheckCircle2,
} from 'lucide-react';
import { useUiStore } from '../../store/uiStore';
import { useAuthStore } from '../../store/authStore';
import { useNotificationStore } from '../../store/notificationStore';
import { InventoryNotification } from '../../features/notifications/types';
import { cn } from '../../lib/utils';

function formatRelativeTime(dateString: string): string {
  try {
    const date = new Date(dateString);
    const now = new Date();
    const diffSec = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (isNaN(diffSec) || diffSec < 60) return 'Just now';
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffHour = Math.floor(diffMin / 60);
    if (diffHour < 24) return `${diffHour}h ago`;
    const diffDays = Math.floor(diffHour / 24);
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  } catch {
    return 'Recently';
  }
}

export const Header: React.FC = () => {
  const navigate = useNavigate();
  const { toggleSidebar } = useUiStore();
  const { user } = useAuthStore();
  const dropdownRef = useRef<HTMLDetailsElement | null>(null);

  const {
    fetchNotifications,
    markAsRead,
    markAllAsRead,
    dismissNotification,
    clearAll,
    getVisibleNotifications,
    getUnreadCount,
    isLoading,
  } = useNotificationStore();

  const notifications = getVisibleNotifications();
  const unreadCount = getUnreadCount();

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const handleNotificationClick = (item: InventoryNotification) => {
    markAsRead(item.id);
    if (item.link) {
      navigate(item.link);
      if (dropdownRef.current) {
        dropdownRef.current.removeAttribute('open');
      }
    }
  };

  const getCategoryIcon = (category: InventoryNotification['category'], type: InventoryNotification['type']) => {
    switch (category) {
      case 'low_stock':
        return (
          <AlertTriangle
            className={`w-4 h-4 shrink-0 ${
              type === 'error' ? 'text-rose-600' : 'text-amber-600'
            }`}
          />
        );
      case 'delivery':
        return <Truck className="w-4 h-4 shrink-0 text-blue-600" />;
      case 'receipt':
        return <ArrowDownLeft className="w-4 h-4 shrink-0 text-emerald-600" />;
      case 'transfer':
        return <ArrowLeftRight className="w-4 h-4 shrink-0 text-teal-600" />;
      default:
        return <Bell className="w-4 h-4 shrink-0 text-slate-600" />;
    }
  };

  const getCardClasses = (type: InventoryNotification['type'], isRead?: boolean) => {
    const base = 'relative p-3 rounded-xl border transition-all text-xs flex gap-2.5 items-start';
    const readTint = isRead ? 'bg-slate-50/70 border-slate-200 text-slate-600 opacity-80' : 'shadow-xs';

    if (isRead) return `${base} ${readTint}`;

    switch (type) {
      case 'error':
        return `${base} bg-rose-50/80 border-rose-200 text-rose-950`;
      case 'warning':
        return `${base} bg-amber-50/80 border-amber-200 text-amber-950`;
      case 'info':
        return `${base} bg-blue-50/80 border-blue-200 text-blue-950`;
      case 'success':
        return `${base} bg-emerald-50/80 border-emerald-200 text-emerald-950`;
      default:
        return `${base} bg-slate-50 border-slate-200 text-slate-800`;
    }
  };

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

        <div
          className={cn(
            'hidden sm:flex items-center gap-2 px-3 py-1 rounded-full border',
            user?.role === 'super_admin'
              ? 'bg-purple-50 text-purple-700 border-purple-200'
              : user?.role === 'inventory_manager'
              ? 'bg-blue-50 text-primary border-blue-200'
              : 'bg-emerald-50 text-emerald-700 border-emerald-200'
          )}
        >
          <ShieldCheck className="w-3.5 h-3.5" />
          <span className="text-xs font-bold">
            {user?.role === 'super_admin'
              ? 'Super Admin (Full Access)'
              : user?.role === 'inventory_manager'
              ? 'Inventory Manager Portal'
              : 'Warehouse Staff Ops'}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-3">
        {/* Dynamic Notifications Dropdown */}
        <details ref={dropdownRef} className="dropdown dropdown-end">
          <summary
            className="btn btn-ghost btn-circle btn-sm bg-white border border-slate-300 hover:bg-slate-100 hover:border-slate-400 text-slate-700 list-none cursor-pointer"
            title="Notifications"
          >
            <div className="indicator">
              <Bell className="w-4 h-4 text-slate-700" />
              {unreadCount > 0 && (
                <span className="badge badge-xs bg-rose-600 text-white font-bold border-none indicator-item px-1 min-w-[16px] h-4">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </div>
          </summary>

          <div className="dropdown-content z-50 p-0 shadow-2xl bg-white rounded-2xl w-80 sm:w-96 border border-slate-200 mt-2 overflow-hidden animate-in fade-in slide-in-from-top-1 duration-150">
            {/* Dropdown Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 bg-slate-50/70">
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm text-slate-900">Notifications</span>
                {unreadCount > 0 && (
                  <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-blue-100 text-blue-700">
                    {unreadCount} unread
                  </span>
                )}
              </div>

              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={markAllAsRead}
                  className="flex items-center gap-1 text-[11px] font-semibold text-primary hover:text-primary-focus transition-colors"
                >
                  <CheckCheck className="w-3.5 h-3.5" />
                  Mark all read
                </button>
              )}
            </div>

            {/* Notification items list */}
            <div className="p-3 space-y-2 max-h-96 overflow-y-auto divide-y-0">
              {isLoading && notifications.length === 0 ? (
                <div className="py-8 text-center text-slate-400 text-xs">
                  Loading live notifications...
                </div>
              ) : notifications.length === 0 ? (
                <div className="py-8 text-center px-4">
                  <div className="w-10 h-10 mx-auto rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mb-2">
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                  <p className="text-xs font-bold text-slate-800">All caught up!</p>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    No active stock warnings or pending operations requiring attention.
                  </p>
                </div>
              ) : (
                notifications.map((item) => (
                  <div
                    key={item.id}
                    className={getCardClasses(item.type, item.read)}
                  >
                    <div className="mt-0.5">
                      {getCategoryIcon(item.category, item.type)}
                    </div>

                    <div
                      className="flex-1 cursor-pointer pr-4"
                      onClick={() => handleNotificationClick(item)}
                    >
                      <div className="flex items-center justify-between gap-1 mb-0.5">
                        <span className={`font-bold ${item.read ? 'text-slate-700' : 'text-slate-900'}`}>
                          {item.title}
                        </span>
                        <span className="text-[10px] text-slate-400 font-normal shrink-0">
                          {formatRelativeTime(item.timestamp)}
                        </span>
                      </div>
                      <p className={`line-clamp-2 leading-relaxed ${item.read ? 'text-slate-500' : 'text-slate-700 font-medium'}`}>
                        {item.message}
                      </p>

                      {item.actionLabel && (
                        <div className="mt-1.5 flex items-center gap-1 text-[11px] font-bold text-primary hover:underline">
                          <span>{item.actionLabel}</span>
                          <ExternalLink className="w-3 h-3" />
                        </div>
                      )}
                    </div>

                    {/* Quick dismiss button */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        dismissNotification(item.id);
                      }}
                      className="text-slate-400 hover:text-slate-600 p-0.5 rounded transition-colors"
                      title="Dismiss notification"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))
              )}
            </div>

            {/* Dropdown Footer */}
            {notifications.length > 0 && (
              <div className="flex items-center justify-between px-4 py-2.5 bg-slate-50/80 border-t border-slate-200 text-xs">
                <span className="text-[11px] text-slate-400">
                  Showing {notifications.length} alert{notifications.length > 1 ? 's' : ''}
                </span>
                <button
                  type="button"
                  onClick={clearAll}
                  className="text-[11px] font-semibold text-slate-500 hover:text-slate-800 transition-colors"
                >
                  Clear all
                </button>
              </div>
            )}
          </div>
        </details>
      </div>
    </header>
  );
};
