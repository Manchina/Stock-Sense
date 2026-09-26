import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, RefreshCw } from 'lucide-react';
import { PageHeader } from '../../../components/ui/PageHeader';
import { DataTable, Column } from '../../../components/ui/DataTable';
import { StatusBadge } from '../../../components/ui/StatusBadge';
import { SearchInput } from '../../../components/ui/SearchInput';
import { INITIAL_OPERATIONS } from '../../../lib/constants';
import { OperationDocument } from '../../../types/common';
import { formatDate } from '../../../lib/utils';
import { api } from '../../../lib/api';

export const Deliveries: React.FC = () => {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [deliveries, setDeliveries] = useState<OperationDocument[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  const fetchDeliveries = useCallback(async () => {
    try {
      const response = await api.get<{ success: boolean; data: OperationDocument[] }>('/operations/deliveries', {
        params: {
          search: search.trim() ? search.trim() : undefined,
          status: statusFilter === 'all' ? undefined : statusFilter,
        },
      });

      if (response && response.data && Array.isArray(response.data)) {
        setDeliveries(response.data);
      }
    } catch (err) {
      console.warn('API fetch deliveries failed, falling back to local dataset:', err);
      const fallbackList = INITIAL_OPERATIONS.filter((o) => o.type === 'delivery');
      const filtered = fallbackList.filter((d) => {
        if (statusFilter !== 'all' && d.status !== statusFilter) return false;
        if (search) {
          const q = search.toLowerCase();
          return (
            d.documentNumber.toLowerCase().includes(q) ||
            d.partner?.toLowerCase().includes(q) ||
            d.items.some((i) => i.productName.toLowerCase().includes(q))
          );
        }
        return true;
      });
      setDeliveries(filtered);
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
          <div className="font-bold text-slate-900 hover:text-primary transition-colors cursor-pointer">{d.documentNumber}</div>
          <div className="text-[11px] font-medium text-slate-500">{d.sourceLocation || 'Central Warehouse'}</div>
        </div>
      ),
    },
    {
      header: 'Customer / Recipient',
      accessorKey: 'partner',
      sortable: true,
      cell: (d) => <span className="font-semibold text-xs text-slate-800">{d.partner || '-'}</span>,
    },
    {
      header: 'Outbound Items',
      cell: (d) => (
        <div className="text-xs space-y-0.5">
          {d.items.map((i, idx) => (
            <div key={idx} className="font-semibold text-slate-900">
              <span className="font-bold text-blue-700">{i.quantity} {i.unitOfMeasure}</span> × {i.productName}
            </div>
          ))}
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

      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 bg-white p-3 rounded-2xl border-2 border-slate-200 shadow-xs">
        <div className="flex-1">
          <SearchInput
            value={search}
            onChangeValue={setSearch}
            placeholder="Search delivery #, customer or item..."
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="select select-sm select-bordered bg-white border border-slate-300 text-slate-900 rounded-xl text-xs font-semibold"
        >
          <option value="all">All Statuses</option>
          <option value="draft">Draft</option>
          <option value="waiting">Waiting (Picking)</option>
          <option value="ready">Ready (Packed)</option>
          <option value="done">Done (Shipped)</option>
          <option value="canceled">Canceled</option>
        </select>
      </div>

      <DataTable
        columns={columns}
        data={deliveries}
        keyExtractor={(d) => d.id}
        isLoading={isLoading}
        pageSize={10}
        emptyTitle="No delivery orders found"
        emptyDescription="Create a delivery order when stock leaves the warehouse for customer dispatch."
        onRowClick={(d) => navigate(`/operations/deliveries/${d.id}`)}
        paginationPosition="top"
      />
    </div>
  );
};
