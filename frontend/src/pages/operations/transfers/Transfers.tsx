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
import { transfersApi } from '../../../features/transfers/api';

export const Transfers: React.FC = () => {
  const navigate = useNavigate();
  const [transfers, setTransfers] = useState<OperationDocument[]>(
    INITIAL_OPERATIONS.filter((o) => o.type === 'internal')
  );
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [isLoading, setIsLoading] = useState(true);

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
      console.warn('Could not fetch transfers from API:', err);
    } finally {
      setIsLoading(false);
    }
  }, [statusFilter, search]);

  useEffect(() => {
    fetchTransfers();
  }, [fetchTransfers]);

  const columns: Column<OperationDocument>[] = [
    {
      header: 'Transfer #',
      cell: (t) => (
        <div className="font-bold text-slate-900 hover:text-primary font-mono text-xs">
          {t.documentNumber}
        </div>
      ),
    },
    {
      header: 'From (Source)',
      accessorKey: 'sourceLocation',
      cell: (t) => <span className="font-semibold text-xs text-slate-800">{t.sourceLocation}</span>,
    },
    {
      header: 'To (Destination)',
      accessorKey: 'destinationLocation',
      cell: (t) => <span className="font-semibold text-xs text-slate-800">{t.destinationLocation}</span>,
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
      cell: (t) => <StatusBadge status={t.status} />,
    },
    {
      header: 'Date',
      cell: (t) => <span className="text-xs font-medium text-slate-600">{formatDate(t.createdAt)}</span>,
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Internal Stock Transfers"
        subtitle="Move stock internally across warehouses, production racks, and staging bays."
      >
        <button
          onClick={() => navigate('/operations/transfers/new')}
          className="btn btn-primary btn-sm rounded-xl text-white font-bold shadow-xs"
        >
          <Plus className="w-4 h-4 mr-1" />
          Create Internal Transfer
        </button>
      </PageHeader>

      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 bg-white p-3 rounded-2xl border-2 border-slate-200 shadow-xs">
        <div className="flex-1">
          <SearchInput
            value={search}
            onChangeValue={setSearch}
            placeholder="Search transfer #, source, destination, or product..."
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="select select-sm select-bordered bg-white border border-slate-300 text-slate-900 rounded-lg text-xs font-semibold"
        >
          <option value="all">All Statuses</option>
          <option value="draft">Draft</option>
          <option value="waiting">Waiting (In Transit)</option>
          <option value="ready">Ready</option>
          <option value="done">Done (Completed)</option>
          <option value="canceled">Canceled</option>
        </select>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center p-12 bg-white rounded-2xl border-2 border-slate-200">
          <Loader2 className="w-6 h-6 animate-spin text-primary mr-2" />
          <span className="text-sm font-semibold text-slate-600">Loading transfers...</span>
        </div>
      ) : (
        <DataTable
          columns={columns}
          data={transfers}
          keyExtractor={(t) => t.id}
          emptyTitle="No internal transfers found"
          emptyDescription="Schedule a stock transfer between your storage racks or warehouses."
          onRowClick={(t) => navigate(`/operations/transfers/${t.id}`)}
        />
      )}
    </div>
  );
};
