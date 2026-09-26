import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { PageHeader } from '../../../components/ui/PageHeader';
import { DataTable, Column } from '../../../components/ui/DataTable';
import { StatusBadge } from '../../../components/ui/StatusBadge';
import { SearchInput } from '../../../components/ui/SearchInput';
import { INITIAL_OPERATIONS } from '../../../lib/constants';
import { OperationDocument } from '../../../types/common';
import { formatDate } from '../../../lib/utils';

export const Receipts: React.FC = () => {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const receipts = INITIAL_OPERATIONS.filter((o) => o.type === 'receipt');

  const filtered = receipts.filter((r) => {
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

  const columns: Column<OperationDocument>[] = [
    {
      header: 'Receipt #',
      cell: (r) => (
        <div>
          <div className="font-bold text-slate-900 hover:text-primary">{r.documentNumber}</div>
          <div className="text-xs font-medium text-slate-500">{r.destinationLocation}</div>
        </div>
      ),
    },
    {
      header: 'Supplier / Vendor',
      accessorKey: 'partner',
      cell: (r) => <span className="font-semibold text-xs text-slate-800">{r.partner || '-'}</span>,
    },
    {
      header: 'Received Goods',
      cell: (r) => (
        <div className="text-xs space-y-0.5">
          {r.items.map((i, idx) => (
            <div key={idx} className="font-semibold text-slate-900">
              <span className="font-bold text-emerald-700">+{i.quantity} {i.unitOfMeasure}</span> × {i.productName}
            </div>
          ))}
        </div>
      ),
    },
    {
      header: 'Status',
      cell: (r) => <StatusBadge status={r.status} />,
    },
    {
      header: 'Date Created',
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
          onClick={() => navigate('/operations/receipts/new')}
          className="btn btn-primary btn-sm rounded-xl text-white font-bold shadow-xs"
        >
          <Plus className="w-4 h-4 mr-1" />
          Create Receipt
        </button>
      </PageHeader>

      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 bg-white p-3 rounded-2xl border-2 border-slate-200 shadow-xs">
        <div className="flex-1">
          <SearchInput
            value={search}
            onChangeValue={setSearch}
            placeholder="Search receipt #, vendor or product..."
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
          <option value="done">Done</option>
          <option value="canceled">Canceled</option>
        </select>
      </div>

      <DataTable
        columns={columns}
        data={filtered}
        keyExtractor={(r) => r.id}
        emptyTitle="No receipts found"
        emptyDescription="Create a new vendor receipt to increase stock upon arrival."
        onRowClick={(r) => navigate(`/operations/receipts/${r.id}`)}
      />
    </div>
  );
};
