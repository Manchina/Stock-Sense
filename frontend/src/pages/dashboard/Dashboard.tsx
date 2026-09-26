import React, { useState, useEffect, useCallback, useTransition } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Boxes,
  AlertTriangle,
  ArrowDownLeft,
  ArrowUpRight,
  ArrowLeftRight,
  Plus,
  ArrowRight,
  RefreshCw,
  Loader2,
  X,
} from 'lucide-react';
import { PageHeader } from '../../components/ui/PageHeader';
import { KpiCard } from '../../features/dashboard/components/KpiCard';
import { InventoryChart } from '../../features/dashboard/components/InventoryChart';
import { DataTable, Column } from '../../components/ui/DataTable';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { DashboardStats } from '../../features/dashboard/types';
import { dashboardApi } from '../../features/dashboard/api';
import { useNotificationStore } from '../../store/notificationStore';
import { DOCUMENT_TYPE_CONFIG } from '../../lib/constants';
import { OperationDocument } from '../../types/common';
import { formatDate } from '../../lib/utils';

export const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const [, startTransition] = useTransition();

  const {
    fetchNotifications,
    getCriticalAlerts,
    dismissNotification,
  } = useNotificationStore();

  const criticalAlerts = getCriticalAlerts();

  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [operations, setOperations] = useState<OperationDocument[]>([]);

  const [isLoadingStats, setIsLoadingStats] = useState(true);
  const [isLoadingOps, setIsLoadingOps] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastRefreshedAt, setLastRefreshedAt] = useState<Date>(new Date());

  // Fetch KPI Stats
  const loadStats = useCallback(async () => {
    try {
      const data = await dashboardApi.getStats();
      setStats(data);
    } catch (err) {
      console.warn('Could not load dashboard stats:', err);
    } finally {
      setIsLoadingStats(false);
    }
  }, []);

  // Fetch Top 4 Recent Operations
  const loadOperations = useCallback(async () => {
    setIsLoadingOps(true);
    try {
      const ops = await dashboardApi.getOperations(undefined, 4);
      startTransition(() => {
        setOperations(ops.slice(0, 4));
      });
    } catch (err) {
      console.warn('Could not load dashboard operations:', err);
    } finally {
      setIsLoadingOps(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    loadStats();
    loadOperations();
    fetchNotifications();
  }, [loadStats, loadOperations, fetchNotifications]);

  // Full Refresh handler
  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    await Promise.all([loadStats(), loadOperations(), fetchNotifications()]);
    setLastRefreshedAt(new Date());
    setIsRefreshing(false);
  };

  const columns: Column<OperationDocument>[] = [
    {
      header: 'Reference',
      cell: (op) => {
        const typeInfo = DOCUMENT_TYPE_CONFIG[op.type] || {
          label: op.type.toUpperCase(),
          color: 'text-slate-600',
        };
        return (
          <div>
            <div className="font-bold text-slate-900 font-mono text-xs hover:text-primary transition-colors">
              {op.documentNumber}
            </div>
            <div className={`text-[11px] font-semibold ${typeInfo.color}`}>
              {typeInfo.label}
            </div>
          </div>
        );
      },
    },
    {
      header: 'Source / Destination',
      cell: (op) => (
        <div className="text-xs space-y-0.5 max-w-xs">
          {op.partner && (
            <div>
              <span className="text-slate-400 font-medium">Partner:</span>{' '}
              <span className="font-semibold text-slate-800">{op.partner}</span>
            </div>
          )}
          {op.sourceLocation && (
            <div className="truncate">
              <span className="text-slate-400 font-medium">From:</span>{' '}
              <span className="font-semibold text-slate-800">{op.sourceLocation}</span>
            </div>
          )}
          {op.destinationLocation && (
            <div className="truncate">
              <span className="text-slate-400 font-medium">To:</span>{' '}
              <span className="font-semibold text-slate-800">{op.destinationLocation}</span>
            </div>
          )}
        </div>
      ),
    },
    {
      header: 'Items',
      cell: (op) => (
        <div className="text-xs space-y-0.5">
          {op.items && op.items.length > 0 ? (
            op.items.slice(0, 2).map((i, idx) => (
              <div key={idx} className="font-medium text-slate-900">
                <span className="font-bold text-slate-700">
                  {i.quantity > 0 ? `+${i.quantity}` : i.quantity} {i.unitOfMeasure}
                </span>{' '}
                × {i.productName}
              </div>
            ))
          ) : (
            <span className="text-slate-400 italic">No line items</span>
          )}
          {op.items && op.items.length > 2 && (
            <span className="text-[10px] text-slate-400 font-semibold">
              +{op.items.length - 2} more item{op.items.length - 2 > 1 ? 's' : ''}
            </span>
          )}
        </div>
      ),
    },
    {
      header: 'Status',
      cell: (op) => <StatusBadge status={op.status} />,
    },
    {
      header: 'Date',
      cell: (op) => (
        <span className="text-xs font-medium text-slate-600">
          {formatDate(op.createdAt)}
        </span>
      ),
    },
  ];

  const handleRowClick = (op: OperationDocument) => {
    if (op.type === 'receipt') navigate(`/operations/receipts/${op.id}`);
    else if (op.type === 'delivery') navigate(`/operations/deliveries/${op.id}`);
    else if (op.type === 'internal') navigate(`/operations/transfers/${op.id}`);
    else navigate(`/operations/adjustments/${op.id}`);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Inventory Operations Dashboard"
        subtitle="Live snapshot of inventory movements, warehouse capacity, and stock alerts."
      >
        <button
          onClick={handleManualRefresh}
          disabled={isRefreshing}
          className="btn btn-outline border-2 border-slate-300 btn-sm rounded-xl font-bold bg-white text-slate-700 hover:bg-slate-50 gap-1.5"
          title="Refresh real-time data from database"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-primary' : ''}`} />
          <span>{isRefreshing ? 'Syncing...' : 'Sync Live Data'}</span>
        </button>
        <button
          onClick={() => navigate('/operations/receipts/new')}
          className="btn btn-primary btn-sm rounded-xl text-white font-bold shadow-xs gap-1"
        >
          <Plus className="w-4 h-4" />
          New Receipt
        </button>
        <button
          onClick={() => navigate('/operations/deliveries/new')}
          className="btn btn-outline border-2 border-slate-300 btn-sm rounded-xl font-bold bg-white gap-1"
        >
          <Plus className="w-4 h-4" />
          New Delivery
        </button>
      </PageHeader>

      {/* Live sync status banner */}
      <div className="flex items-center justify-between text-xs px-1 text-slate-500 font-medium">
        <div className="flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          <span>PostgreSQL Live Ledger Connected</span>
        </div>
        <span>Last synced: {lastRefreshedAt.toLocaleTimeString()}</span>
      </div>

      {/* Critical Out-of-Stock Alert Banner */}
      {criticalAlerts.length > 0 && (
        <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 shadow-xs animate-in fade-in duration-200">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-xl bg-rose-100 text-rose-600 shrink-0 mt-0.5 sm:mt-0">
                <AlertTriangle className="w-5 h-5 text-rose-600 animate-pulse" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="text-sm font-bold text-rose-900">
                    Critical Stock Attention Required ({criticalAlerts.length} item{criticalAlerts.length > 1 ? 's' : ''})
                  </h4>
                  <span className="badge badge-error badge-xs text-white uppercase text-[10px] font-bold">
                    Depleted
                  </span>
                </div>
                <p className="text-xs text-rose-700 mt-0.5 leading-relaxed">
                  {criticalAlerts[0].message}
                  {criticalAlerts.length > 1 && (
                    <span className="font-semibold ml-1">
                      (+{criticalAlerts.length - 1} other critical item{criticalAlerts.length - 1 > 1 ? 's' : ''})
                    </span>
                  )}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 self-end sm:self-center">
              {criticalAlerts[0].link && (
                <button
                  type="button"
                  onClick={() => navigate(criticalAlerts[0].link!)}
                  className="btn btn-xs sm:btn-sm bg-rose-600 hover:bg-rose-700 text-white border-none rounded-xl font-bold shadow-xs gap-1"
                >
                  <span>{criticalAlerts[0].actionLabel || 'View Product'}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              )}
              <button
                type="button"
                onClick={() => dismissNotification(criticalAlerts[0].id)}
                className="btn btn-ghost btn-xs text-rose-600 hover:bg-rose-100 rounded-lg p-1.5"
                title="Dismiss alert"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 5 Real-Time KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
        <KpiCard
          title="Products in Stock"
          value={isLoadingStats ? '...' : (stats?.totalProducts ?? 0)}
          subtitle="Active items catalog"
          icon={Boxes}
          variant="primary"
          onClick={() => navigate('/products')}
        />
        <KpiCard
          title="Low Stock Alerts"
          value={isLoadingStats ? '...' : (stats?.lowStockCount ?? 0)}
          subtitle="Below safety threshold"
          icon={AlertTriangle}
          variant="warning"
          onClick={() => navigate('/products?status=low_stock')}
        />
        <KpiCard
          title="Pending Receipts"
          value={isLoadingStats ? '...' : (stats?.pendingReceipts ?? 0)}
          subtitle="Awaiting vendor intake"
          icon={ArrowDownLeft}
          variant="success"
          onClick={() => navigate('/operations/receipts')}
        />
        <KpiCard
          title="Pending Deliveries"
          value={isLoadingStats ? '...' : (stats?.pendingDeliveries ?? 0)}
          subtitle="Awaiting dispatch"
          icon={ArrowUpRight}
          variant="info"
          onClick={() => navigate('/operations/deliveries')}
        />
        <KpiCard
          title="Transfers Sched."
          value={isLoadingStats ? '...' : (stats?.scheduledTransfers ?? 0)}
          subtitle="Internal moves"
          icon={ArrowLeftRight}
          variant="teal"
          onClick={() => navigate('/operations/transfers')}
        />
      </div>

      {/* Activity Overview */}
      <InventoryChart
        breakdown={stats?.activityBreakdown}
        monthLabel={stats?.monthLabel}
        totalOperations={stats?.totalOperations}
        loading={isLoadingStats}
      />

      {/* Recent Inventory Operations Table (Top 4) */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Recent Inventory Operations (Top {Math.min(operations.length, 4)})
              </h3>
              <p className="text-xs text-slate-500 font-medium">
                Latest movements across receipts, dispatches, transfers, and adjustments
              </p>
            </div>
            {isLoadingOps && (
              <Loader2 className="w-4 h-4 text-primary animate-spin" />
            )}
          </div>
          <button
            onClick={() => navigate('/operations/move-history')}
            className="btn btn-ghost btn-xs text-primary font-bold gap-1 hover:bg-primary/10"
          >
            <span>View Ledger Move History</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <DataTable
          columns={columns}
          data={operations.slice(0, 4)}
          keyExtractor={(op) => op.id}
          emptyTitle="No recent operations recorded"
          emptyDescription="Create a new receipt, delivery, or transfer to start tracking stock movements."
          onRowClick={handleRowClick}
        />
      </div>
    </div>
  );
};
