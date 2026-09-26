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
import { receiptsApi } from '../../../features/receipts/api';

export const Receipts: React.FC = () => {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [receipts, setReceipts] = useState<OperationDocument[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  const fetchReceipts = useCallback(async () => {
    try {
      const response = await receiptsApi.getReceipts({
        search: search.trim() ? search.trim() : undefined,
        status: statusFilter === 'all' ? undefined : statusFilter,
      });

      if (response && response.data && Array.isArray(response.data)) {
        setReceipts(response.data);
      }
    } catch (err) {
      console.warn('Could not fetch receipts from API, falling back to local dataset:', err);
      const fallbackList = INITIAL_OPERATIONS.filter((o) => o.type === 'receipt');
      const filtered = fallbackList.filter((r) => {
        if (statusFilter !== 'all' && r.status !== statusFilter) return false;
        if (search) {
          const q = search.toLowerCase();
          return (
            r.documentNumber.toLowerCase().includes(q) ||
            r.partner?.toLowerCase().includes(q) ||
            r.items.some((i) => i.productName.toLowerCase().includes(q))
          );
        }
        return true;
      });
      setReceipts(filtered);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [search, statusFilter]);

  useEffect(() => {
    fetchReceipts();
  }, [fetchReceipts]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    fetchReceipts();
  };

  const columns: Column<OperationDocument>[] = [
    {
      header: 'Receipt #',
      accessorKey: 'documentNumber',
      sortable: true,
      cell: (r) => (
        <div>
          <div className="font-bold text-slate-900 hover:text-primary transition-colors cursor-pointer">
            {r.documentNumber}
          </div>
          <div className="text-[11px] font-medium text-slate-500">{r.destinationLocation || 'Main Warehouse'}</div>
        </div>
      ),
    },
    {
      header: 'Supplier / Vendor',
      accessorKey: 'partner',
      sortable: true,
      cell: (r) => <span className="font-semibold text-xs text-slate-800">{r.partner || '-'}</span>,
    },
    {
      header: 'Received Goods',
      cell: (r) => (
        <div className="text-xs space-y-0.5">
          {r.items && r.items.length > 0 ? (
            r.items.map((i, idx) => (
              <div key={idx} className="font-semibold text-slate-900">
                <span className="font-bold text-emerald-700">
                  +{i.quantity} {i.unitOfMeasure}
                </span>{' '}
                × {i.productName}
              </div>
            ))
          ) : (
            <span className="text-slate-400 italic">No items</span>
          )}
        </div>
      ),
    },
    {
      header: 'Status',
      accessorKey: 'status',
      sortable: true,
      cell: (r) => <StatusBadge status={r.status} />,
    },
    {
      header: 'Date Created',
      accessorKey: 'createdAt',
      sortable: true,
      cell: (r) => <span className="text-xs font-medium text-slate-600">{formatDate(r.createdAt)}</span>,
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Incoming Receipts"
        subtitle="Manage inbound purchase receipts, vendor intake, and stock increment validation."
      >
        <button
          onClick={handleRefresh}
          disabled={isRefreshing}
          className="btn btn-outline border-slate-300 btn-sm rounded-xl font-bold bg-white text-slate-700 shadow-xs hover:bg-slate-50"
          title="Refresh receipts from database"
        >
          <RefreshCw className={`w-4 h-4 mr-1 ${isRefreshing ? 'animate-spin' : ''}`} />
          Refresh
        </button>
        <button
          onClick={() => navigate('/operations/receipts/new')}
          className="btn btn-primary btn-sm rounded-xl text-white font-bold shadow-xs"
        >
          <Plus className="w-4 h-4 mr-1" />
          Create Receipt
        </button>
      </PageHeader>

      {/* Search & Filter Controls */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 bg-white p-3 rounded-2xl border-2 border-slate-200 shadow-xs">
        <div className="flex-1">
          <SearchInput
            value={search}
            onChangeValue={setSearch}
            placeholder="Search receipt #, vendor or product name..."
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="select select-sm select-bordered bg-white border border-slate-300 text-slate-900 rounded-xl text-xs font-semibold"
        >
          <option value="all">All Statuses</option>
          <option value="draft">Draft</option>
          <option value="waiting">Waiting</option>
          <option value="ready">Ready</option>
          <option value="done">Done</option>
          <option value="canceled">Canceled</option>
        </select>
      </div>

      <DataTable
        columns={columns}
        data={receipts}
        keyExtractor={(r) => r.id}
        isLoading={isLoading}
        pageSize={10}
        emptyTitle="No receipts found"
        emptyDescription="Create a new vendor receipt to increase stock upon arrival."
        onRowClick={(r) => navigate(`/operations/receipts/${r.id}`)}
        paginationPosition="top"
      />
    </div>
  );
};
