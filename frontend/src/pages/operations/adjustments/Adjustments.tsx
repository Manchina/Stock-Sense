import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, RefreshCw } from 'lucide-react';
import { PageHeader } from '../../../components/ui/PageHeader';
import { DataTable, Column } from '../../../components/ui/DataTable';
import { StatusBadge } from '../../../components/ui/StatusBadge';
import { INITIAL_OPERATIONS } from '../../../lib/constants';
import { OperationDocument } from '../../../types/common';
import { formatDate } from '../../../lib/utils';
import { adjustmentsApi } from '../../../features/adjustments/api';

export const Adjustments: React.FC = () => {
  const navigate = useNavigate();
  const [adjustments, setAdjustments] = useState<OperationDocument[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  const fetchAdjustments = useCallback(async () => {
    try {
      const data = await adjustmentsApi.getAll({
        status: statusFilter === 'all' ? undefined : statusFilter,
        search: search.trim() ? search.trim() : undefined,
      });

      if (data && data.length > 0) {
        setAdjustments(data);
      } else if (!search && statusFilter === 'all') {
        setAdjustments(INITIAL_OPERATIONS.filter((o) => o.type === 'adjustment'));
      } else {
        setAdjustments([]);
      }
    } catch (err) {
      console.warn('API fetch adjustments failed, falling back to local dataset:', err);
      const fallbackList = INITIAL_OPERATIONS.filter((o) => o.type === 'adjustment');
      const filtered = fallbackList.filter((a) => {
        if (statusFilter !== 'all' && a.status !== statusFilter) return false;
        if (search) {
          const q = search.toLowerCase();
          return (
            a.documentNumber.toLowerCase().includes(q) ||
            a.sourceLocation?.toLowerCase().includes(q) ||
            a.items.some((i) => i.productName.toLowerCase().includes(q))
          );
        }
        return true;
      });
      setAdjustments(filtered);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [search, statusFilter]);

  useEffect(() => {
    fetchAdjustments();
  }, [fetchAdjustments]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    fetchAdjustments();
  };

  const columns: Column<OperationDocument>[] = [
    {
      header: 'Adjustment #',
      accessorKey: 'documentNumber',
      sortable: true,
      cell: (a) => (
        <div className="font-bold text-slate-900 hover:text-primary transition-colors cursor-pointer font-mono text-xs">
          {a.documentNumber}
        </div>
      ),
    },
    {
      header: 'Location',
      accessorKey: 'sourceLocation',
      sortable: true,
      cell: (a) => <span className="font-semibold text-xs text-slate-800">{a.sourceLocation || 'All Locations'}</span>,
    },
    {
      header: 'Adjusted Products',
      cell: (a) => (
        <div className="text-xs space-y-0.5">
          {(a.items || []).map((i, idx) => (
            <div key={idx} className="font-semibold text-slate-900">
              <span className={`font-bold ${i.quantity >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                {i.quantity > 0 ? `+${i.quantity}` : i.quantity} {i.unitOfMeasure}
              </span>{' '}
              × {i.productName}
            </div>
          ))}
        </div>
      ),
    },
    {
      header: 'Status',
      accessorKey: 'status',
      sortable: true,
      cell: (a) => <StatusBadge status={a.status} />,
    },
    {
      header: 'Date Created',
      accessorKey: 'createdAt',
      sortable: true,
      cell: (a) => <span className="text-xs font-medium text-slate-600">{formatDate(a.createdAt)}</span>,
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
      <option value="done">Applied / Done</option>
      <option value="canceled">Canceled</option>
    </select>
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Inventory Stock Adjustments"
        subtitle="Reconcile physical inventory counts vs recorded stock, damage write-offs, and scrap corrections."
      >
        <button
          onClick={handleRefresh}
          disabled={isRefreshing}
          className="btn btn-outline border-slate-300 btn-sm rounded-xl font-bold bg-white text-slate-700 shadow-xs hover:bg-slate-50"
          title="Refresh adjustments from database"
        >
          <RefreshCw className={`w-4 h-4 mr-1 ${isRefreshing ? 'animate-spin' : ''}`} />
          Refresh
        </button>
        <button
          onClick={() => navigate('/operations/adjustments/new')}
          className="btn btn-primary btn-sm rounded-xl text-white font-bold shadow-xs"
        >
          <Plus className="w-4 h-4 mr-1" />
          New Stock Adjustment
        </button>
      </PageHeader>

      <DataTable
        columns={columns}
        data={adjustments}
        keyExtractor={(a) => a.id}
        isLoading={isLoading}
        showSearch
        searchValue={search}
        searchPlaceholder="Search adjustment #, reason or item..."
        onSearchChange={setSearch}
        filters={filterDropdown}
        pageSize={10}
        emptyTitle="No stock adjustments found"
        emptyDescription="Create an adjustment to reconcile physical stock discrepancies."
        onRowClick={(a) => navigate(`/operations/adjustments/${a.id}`)}
        paginationPosition="top"
      />
    </div>
  );
};
