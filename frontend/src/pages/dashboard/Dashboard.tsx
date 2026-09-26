import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Boxes,
  AlertTriangle,
  ArrowDownLeft,
  ArrowUpRight,
  ArrowLeftRight,
  Plus,
  ArrowRight,
} from 'lucide-react';
import { PageHeader } from '../../components/ui/PageHeader';
import { KpiCard } from '../../features/dashboard/components/KpiCard';
import { OperationFilters } from '../../features/dashboard/components/OperationFilters';
import { InventoryChart } from '../../features/dashboard/components/InventoryChart';
import { DataTable, Column } from '../../components/ui/DataTable';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { DashboardFilterState } from '../../features/dashboard/types';
import {
  INITIAL_PRODUCTS,
  INITIAL_OPERATIONS,
  DOCUMENT_TYPE_CONFIG,
} from '../../lib/constants';
import { OperationDocument } from '../../types/common';
import { formatDate } from '../../lib/utils';

export const Dashboard: React.FC = () => {
  const navigate = useNavigate();

  const [filters, setFilters] = useState<DashboardFilterState>({
    documentType: 'all',
    status: 'all',
    warehouseId: 'all',
    category: 'all',
  });

  const handleResetFilters = () => {
    setFilters({
      documentType: 'all',
      status: 'all',
      warehouseId: 'all',
      category: 'all',
    });
  };

  // KPIs
  const totalProducts = INITIAL_PRODUCTS.length;
  const lowStockCount = INITIAL_PRODUCTS.filter(
    (p) => p.currentStock <= p.minStockAlert
  ).length;
  const pendingReceipts = INITIAL_OPERATIONS.filter(
    (o) => o.type === 'receipt' && o.status !== 'done' && o.status !== 'canceled'
  ).length;
  const pendingDeliveries = INITIAL_OPERATIONS.filter(
    (o) => o.type === 'delivery' && o.status !== 'done' && o.status !== 'canceled'
  ).length;
  const scheduledTransfers = INITIAL_OPERATIONS.filter(
    (o) => o.type === 'internal' && o.status !== 'done' && o.status !== 'canceled'
  ).length;

  // Filtered Operations
  const filteredOperations = useMemo(() => {
    return INITIAL_OPERATIONS.filter((op) => {
      if (filters.documentType !== 'all' && op.type !== filters.documentType) {
        return false;
      }
      if (filters.status !== 'all' && op.status !== filters.status) {
        return false;
      }
      if (filters.warehouseId !== 'all') {
        const matchSrc = op.sourceLocation?.includes(filters.warehouseId);
        const matchDst = op.destinationLocation?.includes(filters.warehouseId);
        if (!matchSrc && !matchDst) return false;
      }
      return true;
    });
  }, [filters]);

  const columns: Column<OperationDocument>[] = [
    {
      header: 'Reference',
      accessorKey: 'documentNumber',
      sortable: true,
      cell: (op) => {
        const typeInfo = DOCUMENT_TYPE_CONFIG[op.type];
        return (
          <div>
            <div className="font-bold text-slate-900 hover:text-primary transition-colors cursor-pointer">
              {op.documentNumber}
            </div>
            <div className={`text-[11px] font-bold ${typeInfo.color}`}>{typeInfo.label}</div>
          </div>
        );
      },
    },
    {
      header: 'Source / Destination',
      cell: (op) => (
        <div className="text-xs space-y-0.5">
          {op.partner && <div><span className="text-slate-500 font-medium">Partner:</span> <span className="font-semibold text-slate-800">{op.partner}</span></div>}
          {op.sourceLocation && <div><span className="text-slate-500 font-medium">From:</span> <span className="font-semibold text-slate-800">{op.sourceLocation}</span></div>}
          {op.destinationLocation && <div><span className="text-slate-500 font-medium">To:</span> <span className="font-semibold text-slate-800">{op.destinationLocation}</span></div>}
        </div>
      ),
    },
    {
      header: 'Items Breakdown',
      cell: (op) => (
        <div className="text-xs space-y-0.5">
          {op.items.map((i, idx) => (
            <div key={idx} className="font-semibold text-slate-900">
              <span className="font-bold text-slate-700">{i.quantity} {i.unitOfMeasure}</span> × {i.productName}
            </div>
          ))}
        </div>
      ),
    },
    {
      header: 'Status',
      accessorKey: 'status',
      sortable: true,
      cell: (op) => <StatusBadge status={op.status} />,
    },
    {
      header: 'Date',
      accessorKey: 'createdAt',
      sortable: true,
      cell: (op) => <span className="text-xs font-medium text-slate-600">{formatDate(op.createdAt)}</span>,
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
          onClick={() => navigate('/operations/receipts/new')}
          className="btn btn-primary btn-sm rounded-xl text-white font-bold shadow-xs"
        >
          <Plus className="w-4 h-4 mr-1" />
          New Receipt
        </button>
        <button
          onClick={() => navigate('/operations/deliveries/new')}
          className="btn btn-outline border-slate-300 btn-sm rounded-xl font-bold bg-white text-slate-700 shadow-xs hover:bg-slate-50"
        >
          <Plus className="w-4 h-4 mr-1" />
          New Delivery
        </button>
      </PageHeader>

      {/* 5 KPIs as required */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
        <KpiCard
          title="Products in Stock"
          value={totalProducts}
          subtitle="Active items catalog"
          icon={Boxes}
          variant="primary"
          onClick={() => navigate('/products')}
        />
        <KpiCard
          title="Low Stock Alerts"
          value={lowStockCount}
          subtitle="Below safety threshold"
          icon={AlertTriangle}
          variant="warning"
          onClick={() => navigate('/products')}
        />
        <KpiCard
          title="Pending Receipts"
          value={pendingReceipts}
          subtitle="Awaiting vendor intake"
          icon={ArrowDownLeft}
          variant="success"
          onClick={() => navigate('/operations/receipts')}
        />
        <KpiCard
          title="Pending Deliveries"
          value={pendingDeliveries}
          subtitle="Awaiting dispatch"
          icon={ArrowUpRight}
          variant="info"
          onClick={() => navigate('/operations/deliveries')}
        />
        <KpiCard
          title="Transfers Sched."
          value={scheduledTransfers}
          subtitle="Internal moves"
          icon={ArrowLeftRight}
          variant="teal"
          onClick={() => navigate('/operations/transfers')}
        />
      </div>

      {/* Activity Overview */}
      <InventoryChart />

      {/* Dynamic Filters */}
      <OperationFilters
        filters={filters}
        onChange={setFilters}
        onReset={handleResetFilters}
      />

      {/* Filtered Operations */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900">
              Recent Inventory Operations ({filteredOperations.length})
            </h3>
            <p className="text-xs text-slate-500 font-medium">
              Filtered inventory movement documents and fulfillment orders
            </p>
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
          data={filteredOperations}
          keyExtractor={(op) => op.id}
          pageSize={8}
          emptyTitle="No matching operations found"
          emptyDescription="Try resetting your filters or create a new operation document."
          onRowClick={handleRowClick}
          paginationPosition="top"
        />
      </div>
    </div>
  );
};
