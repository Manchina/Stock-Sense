import React, { useState } from 'react';
import { PageHeader } from '../../components/ui/PageHeader';
import { DataTable, Column } from '../../components/ui/DataTable';
import { SearchInput } from '../../components/ui/SearchInput';
import { INITIAL_MOVE_HISTORY, DOCUMENT_TYPE_CONFIG } from '../../lib/constants';
import { MoveHistoryRecord } from '../../types/common';
import { formatDate } from '../../lib/utils';

export const MoveHistory: React.FC = () => {
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');

  const filtered = INITIAL_MOVE_HISTORY.filter((m) => {
    if (typeFilter !== 'all' && m.documentType !== typeFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        m.referenceNumber.toLowerCase().includes(q) ||
        m.productName.toLowerCase().includes(q) ||
        m.sku.toLowerCase().includes(q) ||
        m.fromLocation.toLowerCase().includes(q) ||
        m.toLocation.toLowerCase().includes(q) ||
        m.user.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const columns: Column<MoveHistoryRecord>[] = [
    {
      header: 'Date & Time',
      cell: (m) => <span className="text-xs text-slate-700 font-semibold">{formatDate(m.date)}</span>,
    },
    {
      header: 'Reference #',
      cell: (m) => {
        const typeInfo = DOCUMENT_TYPE_CONFIG[m.documentType];
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
      cell: (m) => <span className="text-xs text-slate-700 font-medium">{m.fromLocation}</span>,
    },
    {
      header: 'To Location',
      accessorKey: 'toLocation',
      cell: (m) => <span className="text-xs text-slate-900 font-bold">{m.toLocation}</span>,
    },
    {
      header: 'Qty Delta',
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
      header: 'Operator',
      accessorKey: 'user',
      cell: (m) => <span className="text-xs text-slate-700 font-medium">{m.user}</span>,
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Stock Move History & Ledger"
        subtitle="Immutable audit log of all goods receipts, customer shipments, rack-to-rack transfers, and adjustments."
      />

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
          className="select select-sm select-bordered bg-white border border-slate-300 text-slate-900 rounded-lg text-xs font-semibold"
        >
          <option value="all">All Movements</option>
          <option value="receipt">Receipts (+In)</option>
          <option value="delivery">Deliveries (-Out)</option>
          <option value="internal">Internal Transfers (⇄ Move)</option>
          <option value="adjustment">Adjustments (± Delta)</option>
        </select>
      </div>

      <DataTable
        columns={columns}
        data={filtered}
        keyExtractor={(m) => m.id}
        emptyTitle="No move ledger records"
        emptyDescription="All completed inventory operations will automatically append to this ledger."
      />
    </div>
  );
};
