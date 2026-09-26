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

export const Deliveries: React.FC = () => {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const deliveries = INITIAL_OPERATIONS.filter((o) => o.type === 'delivery');

  const filtered = deliveries.filter((d) => {
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

  const columns: Column<OperationDocument>[] = [
    {
      header: 'Delivery #',
      cell: (d) => (
        <div>
          <div className="font-bold text-slate-900 hover:text-primary">{d.documentNumber}</div>
          <div className="text-xs font-medium text-slate-500">{d.sourceLocation}</div>
        </div>
      ),
    },
    {
      header: 'Customer / Recipient',
      accessorKey: 'partner',
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
      cell: (d) => <StatusBadge status={d.status} />,
    },
    {
      header: 'Scheduled Date',
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
          className="select select-sm select-bordered bg-white border border-slate-300 text-slate-900 rounded-lg text-xs font-semibold"
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
        data={filtered}
        keyExtractor={(d) => d.id}
        emptyTitle="No delivery orders found"
        emptyDescription="Create a delivery order when stock leaves the warehouse for customer dispatch."
        onRowClick={(d) => navigate(`/operations/deliveries/${d.id}`)}
      />
    </div>
  );
};
