import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Loader2 } from 'lucide-react';
import { PageHeader } from '../../../components/ui/PageHeader';
import { DataTable, Column } from '../../../components/ui/DataTable';
import { StatusBadge } from '../../../components/ui/StatusBadge';
import { SearchInput } from '../../../components/ui/SearchInput';
import { INITIAL_OPERATIONS } from '../../../lib/constants';
import { OperationDocument } from '../../../types/common';
import { formatDate } from '../../../lib/utils';
import { adjustmentsApi } from '../../../features/adjustments/api';

export const Adjustments: React.FC = () => {
  const navigate = useNavigate();
  const [adjustments, setAdjustments] = useState<OperationDocument[]>(
    INITIAL_OPERATIONS.filter((o) => o.type === 'adjustment')
  );
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [isLoading, setIsLoading] = useState(true);

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
      console.warn('Could not fetch adjustments from API:', err);
    } finally {
      setIsLoading(false);
    }
  }, [statusFilter, search]);

  useEffect(() => {
    fetchAdjustments();
  }, [fetchAdjustments]);

  const columns: Column<OperationDocument>[] = [
    {
      header: 'Adjustment #',
      cell: (a) => (
        <div className="font-bold text-slate-900 hover:text-primary font-mono text-xs">
          {a.documentNumber}
        </div>
      ),
    },
    {
      header: 'Location',
      accessorKey: 'sourceLocation',
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
      cell: (a) => <StatusBadge status={a.status} />,
    },
    {
      header: 'Date Created',
      cell: (a) => <span className="text-xs font-medium text-slate-600">{formatDate(a.createdAt)}</span>,
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Inventory Stock Adjustments"
        subtitle="Reconcile physical inventory counts vs recorded stock, damage write-offs, and scrap corrections."
      >
        <button
          onClick={() => navigate('/operations/adjustments/new')}
          className="btn btn-primary btn-sm rounded-xl text-white font-bold shadow-xs"
        >
          <Plus className="w-4 h-4 mr-1" />
          New Stock Adjustment
        </button>
      </PageHeader>

      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 bg-white p-3 rounded-2xl border-2 border-slate-200 shadow-xs">
        <div className="flex-1">
          <SearchInput
            value={search}
            onChangeValue={setSearch}
            placeholder="Search adjustment #, reason or item..."
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="select select-sm select-bordered bg-white border border-slate-300 text-slate-900 rounded-lg text-xs font-semibold"
        >
          <option value="all">All Statuses</option>
          <option value="draft">Draft</option>
          <option value="waiting">Waiting</option>
          <option value="ready">Ready</option>
          <option value="done">Done (Applied)</option>
          <option value="canceled">Canceled</option>
        </select>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center p-12 bg-white rounded-2xl border-2 border-slate-200">
          <Loader2 className="w-6 h-6 animate-spin text-primary mr-2" />
          <span className="text-sm font-semibold text-slate-600">Loading adjustments...</span>
        </div>
      ) : (
        <DataTable
          columns={columns}
          data={adjustments}
          keyExtractor={(a) => a.id}
          emptyTitle="No stock adjustments recorded"
          emptyDescription="Reconcile inventory when physical counts differ from recorded balances."
          onRowClick={(a) => navigate(`/operations/adjustments/${a.id}`)}
        />
      )}
    </div>
  );
};
