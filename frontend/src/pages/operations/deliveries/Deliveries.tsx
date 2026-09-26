import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, RefreshCw, Truck } from 'lucide-react';
import { PageHeader } from '../../../components/ui/PageHeader';
import { DataTable, Column } from '../../../components/ui/DataTable';
import { StatusBadge } from '../../../components/ui/StatusBadge';
import { OperationDocument } from '../../../types/common';
import { formatDate } from '../../../lib/utils';
import { deliveriesApi } from '../../../features/deliveries/api';

export const Deliveries: React.FC = () => {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [deliveries, setDeliveries] = useState<OperationDocument[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  const fetchDeliveries = useCallback(async () => {
    try {
      const response = await deliveriesApi.getAll({
        search: search.trim() ? search.trim() : undefined,
        status: statusFilter === 'all' ? undefined : statusFilter,
      });

      if (response && response.data && Array.isArray(response.data)) {
        setDeliveries(response.data);
      }
    } catch (err) {
      console.warn('API fetch deliveries failed:', err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [search, statusFilter]);

  useEffect(() => {
    fetchDeliveries();
  }, [fetchDeliveries]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    fetchDeliveries();
  };

  const columns: Column<OperationDocument>[] = [
    {
      header: 'Delivery #',
      accessorKey: 'documentNumber',
      sortable: true,
      cell: (d) => (
        <div>
          <div className="font-bold text-slate-900 hover:text-primary transition-colors cursor-pointer flex items-center gap-1.5">
            <Truck className="w-3.5 h-3.5 text-slate-400" />
            {d.documentNumber}
          </div>
          <div className="text-[11px] font-medium text-slate-500">{d.sourceLocation || 'Main Warehouse'}</div>
        </div>
      ),
    },
    {
      header: 'Customer / Recipient',
      accessorKey: 'partner',
      sortable: true,
      cell: (d) => (
        <div>
          <span className="font-semibold text-xs text-slate-800">{d.partner || d.customerName || '-'}</span>
          {d.notes && <div className="text-[11px] text-slate-400 truncate max-w-xs">{d.notes}</div>}
        </div>
      ),
    },
    {
      header: 'Outbound Items',
      cell: (d) => (
        <div className="text-xs space-y-0.5">
          {(d.items || []).map((i, idx) => (
            <div key={idx} className="font-semibold text-slate-900">
              <span className="font-bold text-rose-600">-{i.quantity} {i.unitOfMeasure}</span> × {i.productName}
            </div>
          ))}
          {(!d.items || d.items.length === 0) && (
            <span className="text-slate-400 italic text-xs">No items listed</span>
          )}
        </div>
      ),
    },
    {
      header: 'Status',
      accessorKey: 'status',
      sortable: true,
      cell: (d) => <StatusBadge status={d.status} />,
    },
    {
      header: 'Scheduled Date',
      accessorKey: 'scheduledDate',
      sortable: true,
      cell: (d) => <span className="text-xs font-medium text-slate-600">{formatDate(d.scheduledDate || d.createdAt)}</span>,
    },
  ];

  const filterDropdown = (
    <select
      value={statusFilter}
      onChange={(e) => setStatusFilter(e.target.value)}
      className="select select-sm select-bordered bg-white border border-slate-300 text-slate-900 rounded-lg text-xs font-semibold h-8 min-h-8"
    >
      <option value="all">All Statuses</option>
      <option value="draft">Draft</option>
      <option value="waiting">Waiting (Picking)</option>
      <option value="ready">Ready (Packed)</option>
      <option value="done">Done (Dispatched)</option>
      <option value="canceled">Canceled</option>
    </select>
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Outgoing Delivery Orders"
        subtitle="Manage customer shipments, picking & packing operations, and outbound inventory reduction."
      >
        <button
          onClick={handleRefresh}
          disabled={isRefreshing}
          className="btn btn-outline border-slate-300 btn-sm rounded-xl font-bold bg-white text-slate-700 shadow-xs hover:bg-slate-50"
          title="Refresh deliveries from database"
        >
          <RefreshCw className={`w-4 h-4 mr-1 ${isRefreshing ? 'animate-spin' : ''}`} />
          Refresh
        </button>
        <button
          onClick={() => navigate('/operations/deliveries/new')}
          className="btn btn-primary btn-sm rounded-xl text-white font-bold shadow-xs"
        >
          <Plus className="w-4 h-4 mr-1" />
          Create Delivery Order
        </button>
      </PageHeader>

      <DataTable
        columns={columns}
        data={deliveries}
        keyExtractor={(d) => d.id}
        isLoading={isLoading}
        showSearch
        searchValue={search}
        searchPlaceholder="Search delivery #, customer, or product..."
        onSearchChange={setSearch}
        filters={filterDropdown}
        pageSize={10}
        emptyTitle="No delivery orders found"
        emptyDescription="Create a delivery order when goods leave the warehouse for customer dispatch."
        onRowClick={(d) => navigate(`/operations/deliveries/${d.id}`)}
        paginationPosition="top"
      />
    </div>
  );
};
