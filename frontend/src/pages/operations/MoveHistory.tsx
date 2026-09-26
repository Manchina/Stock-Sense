import React, { useState, useEffect, useCallback } from 'react';
import { Loader2, RefreshCw } from 'lucide-react';
import { PageHeader } from '../../components/ui/PageHeader';
import { DataTable, Column } from '../../components/ui/DataTable';
import { SearchInput } from '../../components/ui/SearchInput';
import { INITIAL_MOVE_HISTORY, DOCUMENT_TYPE_CONFIG } from '../../lib/constants';
import { MoveHistoryRecord } from '../../types/common';
import { formatDate } from '../../lib/utils';
import { historyApi, mapBackendToMoveRecord } from '../../features/history/api';

export const MoveHistory: React.FC = () => {
  const [records, setRecords] = useState<MoveHistoryRecord[]>(INITIAL_MOVE_HISTORY);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  const fetchHistory = useCallback(async () => {
    try {
      const response = await historyApi.getHistory({
        type: typeFilter === 'all' ? undefined : typeFilter,
        search: search.trim() ? search.trim() : undefined,
      });

      if (response && response.data && response.data.length > 0) {
        const mapped = response.data.map(mapBackendToMoveRecord);
        setRecords(mapped);
      } else if (response && response.data && response.data.length === 0) {
        if (!search && typeFilter === 'all') {
          setRecords(INITIAL_MOVE_HISTORY);
        } else {
          setRecords([]);
        }
      }
    } catch (err) {
      console.warn('Could not fetch history from API, falling back to local dataset:', err);
      const filtered = INITIAL_MOVE_HISTORY.filter((m) => {
        if (typeFilter !== 'all' && m.documentType !== typeFilter) return false;
        if (search) {
          const q = search.toLowerCase();
          return (
            m.referenceNumber.toLowerCase().includes(q) ||
            m.productName.toLowerCase().includes(q) ||
            m.sku.toLowerCase().includes(q) ||
            (m.fromLocation && m.fromLocation.toLowerCase().includes(q)) ||
            (m.toLocation && m.toLocation.toLowerCase().includes(q)) ||
            m.user.toLowerCase().includes(q)
          );
        }
        return true;
      });
      setRecords(filtered);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [typeFilter, search]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    fetchHistory();
  };

  const columns: Column<MoveHistoryRecord>[] = [
    {
      header: 'Date & Time',
      accessorKey: 'date',
      sortable: true,
      cell: (m) => <span className="text-xs text-slate-700 font-semibold">{formatDate(m.date)}</span>,
    },
    {
      header: 'Reference #',
      accessorKey: 'referenceNumber',
      sortable: true,
      cell: (m) => {
        const typeInfo =
          DOCUMENT_TYPE_CONFIG[m.documentType] ||
          DOCUMENT_TYPE_CONFIG.internal || { label: m.documentType, color: 'text-slate-600' };
        return (
          <div>
            <div className="font-bold text-slate-900 text-xs font-mono">{m.referenceNumber}</div>
            <div className={`text-[11px] font-bold ${typeInfo.color}`}>{typeInfo.label}</div>
          </div>
        );
      },
    },
    {
      header: 'Product / SKU',
      accessorKey: 'productName',
      sortable: true,
      cell: (m) => (
        <div>
          <div className="font-bold text-xs text-slate-900">{m.productName}</div>
          <div className="text-[11px] text-slate-500 font-mono font-medium">{m.sku}</div>
        </div>
      ),
    },
    {
      header: 'From Location',
      accessorKey: 'fromLocation',
      sortable: true,
      cell: (m) => <span className="text-xs text-slate-700 font-medium">{m.fromLocation || '-'}</span>,
    },
    {
      header: 'To Location',
      accessorKey: 'toLocation',
      sortable: true,
      cell: (m) => <span className="text-xs text-slate-900 font-bold">{m.toLocation || '-'}</span>,
    },
    {
      header: 'Qty Delta',
      accessorKey: 'quantityChange',
      sortable: true,
      cell: (m) => (
        <span
          className={`font-black text-xs ${
            m.quantityChange > 0
              ? 'text-emerald-700'
              : m.quantityChange < 0
              ? 'text-rose-700'
              : 'text-teal-700'
          }`}
        >
          {m.quantityChange > 0 ? `+${m.quantityChange}` : m.quantityChange} {m.unitOfMeasure}
        </span>
      ),
    },
    {
      header: 'Balance After',
      accessorKey: 'balanceAfter',
      sortable: true,
      cell: (m) =>
        m.balanceAfter !== undefined ? (
          <span className="font-mono text-xs font-bold text-slate-800 bg-slate-100 px-2 py-0.5 rounded-md">
            {m.balanceAfter} {m.unitOfMeasure}
          </span>
        ) : (
          <span className="text-xs text-slate-400">-</span>
        ),
    },
    {
      header: 'Operator',
      accessorKey: 'user',
      sortable: true,
      cell: (m) => <span className="text-xs text-slate-700 font-medium">{m.user}</span>,
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Stock Move History & Ledger"
        subtitle="Immutable audit log of all goods receipts, customer shipments, rack-to-rack transfers, and adjustments."
      >
        <button
          onClick={handleRefresh}
          disabled={isRefreshing}
          className="btn btn-outline border-slate-300 btn-sm rounded-xl font-bold bg-white text-slate-700 shadow-xs hover:bg-slate-50"
          title="Refresh ledger records"
        >
          <RefreshCw className={`w-4 h-4 mr-1 ${isRefreshing ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </PageHeader>

      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 bg-white p-3 rounded-2xl border-2 border-slate-200 shadow-xs">
        <div className="flex-1">
          <SearchInput
            value={search}
            onChangeValue={setSearch}
            placeholder="Search move reference, product SKU, location, or user..."
          />
        </div>
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="select select-sm select-bordered bg-white border border-slate-300 text-slate-900 rounded-xl text-xs font-semibold"
        >
          <option value="all">All Movements</option>
          <option value="receipt">Receipts (+In)</option>
          <option value="delivery">Deliveries (-Out)</option>
          <option value="transfer">Internal Transfers (⇄ Move)</option>
          <option value="adjustment">Adjustments (± Delta)</option>
          <option value="initial_inventory">Initial Inventory</option>
        </select>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center p-12 bg-white rounded-2xl border-2 border-slate-200">
          <Loader2 className="w-6 h-6 animate-spin text-primary mr-2" />
          <span className="text-sm font-semibold text-slate-600">Loading ledger movements...</span>
        </div>
      ) : (
        <DataTable
          columns={columns}
          data={records}
          keyExtractor={(m) => m.id}
          pageSize={10}
          emptyTitle="No move ledger records"
          emptyDescription="All completed inventory operations will automatically append to this ledger."
          paginationPosition="top"
        />
      )}
    </div>
  );
};
