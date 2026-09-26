import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, RefreshCw } from 'lucide-react';
import { PageHeader } from '../../../components/ui/PageHeader';
import { DataTable, Column } from '../../../components/ui/DataTable';
import { StatusBadge } from '../../../components/ui/StatusBadge';
import { INITIAL_OPERATIONS } from '../../../lib/constants';
import { OperationDocument } from '../../../types/common';
import { formatDate } from '../../../lib/utils';
import { transfersApi } from '../../../features/transfers/api';

export const Transfers: React.FC = () => {
  const navigate = useNavigate();
  const [transfers, setTransfers] = useState<OperationDocument[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  const fetchTransfers = useCallback(async () => {
    try {
      const data = await transfersApi.getAll({
        status: statusFilter === 'all' ? undefined : statusFilter,
        search: search.trim() ? search.trim() : undefined,
      });

      if (data && data.length > 0) {
        setTransfers(data);
      } else if (!search && statusFilter === 'all') {
        setTransfers(INITIAL_OPERATIONS.filter((o) => o.type === 'internal'));
      } else {
        setTransfers([]);
      }
    } catch (err) {
      console.warn('API fetch transfers failed, falling back to local dataset:', err);
      const fallbackList = INITIAL_OPERATIONS.filter((o) => o.type === 'internal');
      const filtered = fallbackList.filter((t) => {
        if (statusFilter !== 'all' && t.status !== statusFilter) return false;
        if (search) {
          const q = search.toLowerCase();
          return (
            t.documentNumber.toLowerCase().includes(q) ||
            t.sourceLocation?.toLowerCase().includes(q) ||
            t.destinationLocation?.toLowerCase().includes(q) ||
            t.items.some((i) => i.productName.toLowerCase().includes(q))
          );
        }
        return true;
      });
      setTransfers(filtered);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [search, statusFilter]);

  useEffect(() => {
    fetchTransfers();
  }, [fetchTransfers]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    fetchTransfers();
  };

  const columns: Column<OperationDocument>[] = [
    {
      header: 'Transfer #',
      accessorKey: 'documentNumber',
      sortable: true,
      cell: (t) => (
        <div className="font-bold text-slate-900 hover:text-primary transition-colors cursor-pointer font-mono text-xs">
          {t.documentNumber}
        </div>
      ),
    },
    {
      header: 'From (Source)',
      accessorKey: 'sourceLocation',
      sortable: true,
      cell: (t) => <span className="font-semibold text-xs text-slate-800">{t.sourceLocation || '-'}</span>,
    },
    {
      header: 'To (Destination)',
      accessorKey: 'destinationLocation',
      sortable: true,
      cell: (t) => <span className="font-semibold text-xs text-slate-800">{t.destinationLocation || '-'}</span>,
    },
    {
      header: 'Transfer Items',
      cell: (t) => (
        <div className="text-xs space-y-0.5">
          {(t.items || []).map((i, idx) => (
            <div key={idx} className="font-semibold text-slate-900">
              <span className="font-bold text-teal-700">{i.quantity} {i.unitOfMeasure}</span> × {i.productName}
            </div>
          ))}
        </div>
      ),
    },
    {
      header: 'Status',
      accessorKey: 'status',
      sortable: true,
      cell: (t) => <StatusBadge status={t.status} />,
    },
    {
      header: 'Date',
      accessorKey: 'createdAt',
      sortable: true,
      cell: (t) => <span className="text-xs font-medium text-slate-600">{formatDate(t.createdAt)}</span>,
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
      <option value="waiting">Waiting (In Transit)</option>
      <option value="ready">Ready</option>
      <option value="done">Done (Completed)</option>
      <option value="canceled">Canceled</option>
    </select>
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Internal Stock Transfers"
        subtitle="Move stock internally across warehouses, production racks, and staging bays."
      >
        <button
          onClick={handleRefresh}
          disabled={isRefreshing}
          className="btn btn-outline border-slate-300 btn-sm rounded-xl font-bold bg-white text-slate-700 shadow-xs hover:bg-slate-50"
          title="Refresh transfers from database"
        >
          <RefreshCw className={`w-4 h-4 mr-1 ${isRefreshing ? 'animate-spin' : ''}`} />
          Refresh
        </button>
        <button
          onClick={() => navigate('/operations/transfers/new')}
          className="btn btn-primary btn-sm rounded-xl text-white font-bold shadow-xs"
        >
          <Plus className="w-4 h-4 mr-1" />
          Create Internal Transfer
        </button>
      </PageHeader>

      <DataTable
        columns={columns}
        data={transfers}
        keyExtractor={(t) => t.id}
        isLoading={isLoading}
        showSearch
        searchValue={search}
        searchPlaceholder="Search transfer #, source, destination, or product..."
        onSearchChange={setSearch}
        filters={filterDropdown}
        pageSize={10}
        emptyTitle="No internal transfers found"
        emptyDescription="Schedule a stock transfer between your storage racks or warehouses."
        onRowClick={(t) => navigate(`/operations/transfers/${t.id}`)}
        paginationPosition="top"
      />
    </div>
  );
};
