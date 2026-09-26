import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Plus,
  Warehouse as WarehouseIcon,
  Edit2,
  MapPin,
  Loader2,
  RefreshCw,
  LayoutGrid,
  List,
} from 'lucide-react';
import { PageHeader } from '../../../components/ui/PageHeader';
import { SearchInput } from '../../../components/ui/SearchInput';
import { DataTable, Column } from '../../../components/ui/DataTable';
import { PaginationBar } from '../../../components/ui/PaginationBar';
import { INITIAL_WAREHOUSES } from '../../../lib/constants';
import { Warehouse } from '../../../types/common';
import { formatDate } from '../../../lib/utils';
import { api } from '../../../lib/api';

export const Warehouses: React.FC = () => {
  const navigate = useNavigate();
  const [warehouses, setWarehouses] = useState<Warehouse[]>(INITIAL_WAREHOUSES);
  const [search, setSearch] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(6);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  const fetchWarehouses = async () => {
    try {
      const response = await api.get<{ success: boolean; data: Warehouse[] }>('/warehouses');
      if (response && response.data && Array.isArray(response.data)) {
        setWarehouses(response.data);
      }
    } catch (err) {
      console.warn('Could not load warehouses from API, using fallback data:', err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchWarehouses();
  }, []);

  const handleRefresh = () => {
    setIsRefreshing(true);
    fetchWarehouses();
  };

  const filteredWarehouses = useMemo(() => {
    return warehouses.filter((wh) => {
      if (!search.trim()) return true;
      const q = search.toLowerCase();
      return (
        wh.name.toLowerCase().includes(q) ||
        wh.code.toLowerCase().includes(q) ||
        (wh.address && wh.address.toLowerCase().includes(q)) ||
        (wh.locations && wh.locations.some((loc) => loc.toLowerCase().includes(q)))
      );
    });
  }, [warehouses, search]);

  const totalItems = filteredWarehouses.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const paginatedWarehouses = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredWarehouses.slice(start, start + pageSize);
  }, [filteredWarehouses, currentPage, pageSize]);

  const startRecord = totalItems === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const endRecord = Math.min(currentPage * pageSize, totalItems);

  const columns: Column<Warehouse>[] = [
    {
      header: 'Warehouse Name / Code',
      accessorKey: 'name',
      sortable: true,
      cell: (wh) => (
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-50 text-primary rounded-lg border border-blue-200">
            <WarehouseIcon className="w-4 h-4" />
          </div>
          <div>
            <div className="font-bold text-slate-900 hover:text-primary transition-colors cursor-pointer">{wh.name}</div>
            <div className="font-mono text-[11px] font-bold text-slate-500">{wh.code}</div>
          </div>
        </div>
      ),
    },
    {
      header: 'Address / Location',
      accessorKey: 'address',
      sortable: true,
      cell: (wh) => (
        <div className="text-xs text-slate-700 flex items-center gap-1">
          <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          <span>{wh.address || 'Unspecified address'}</span>
        </div>
      ),
    },
    {
      header: 'Zones / Storage Racks',
      cell: (wh) => (
        <div className="flex flex-wrap gap-1 max-w-xs">
          {wh.locations && wh.locations.length > 0 ? (
            wh.locations.map((loc) => (
              <span key={loc} className="badge badge-sm bg-slate-100 text-slate-800 text-[10px] font-bold border border-slate-300">
                {loc}
              </span>
            ))
          ) : (
            <span className="text-slate-400 italic text-xs">None configured</span>
          )}
        </div>
      ),
    },
    {
      header: 'Created Date',
      accessorKey: 'createdAt',
      sortable: true,
      cell: (wh) => <span className="text-xs text-slate-600 font-medium">{formatDate(wh.createdAt)}</span>,
    },
    {
      header: 'Actions',
      className: 'text-right',
      cell: (wh) => (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            navigate(`/settings/warehouses/${wh.id}/edit`);
          }}
          className="btn btn-ghost btn-xs text-primary font-bold hover:bg-primary/10 gap-1"
        >
          <Edit2 className="w-3 h-3" /> Edit
        </button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Warehouse & Location Management"
        subtitle="Configure physical warehouses, distribution hubs, and internal storage locations/racks."
      >
        <button
          onClick={handleRefresh}
          disabled={isRefreshing}
          className="btn btn-outline border-slate-300 btn-sm rounded-xl font-bold bg-white text-slate-700 shadow-xs hover:bg-slate-50"
          title="Refresh from server"
        >
          <RefreshCw className={`w-4 h-4 mr-1 ${isRefreshing ? 'animate-spin' : ''}`} />
          Refresh
        </button>
        <button
          onClick={() => navigate('/settings/warehouses/new')}
          className="btn btn-primary btn-sm rounded-xl text-white font-bold shadow-xs"
        >
          <Plus className="w-4 h-4 mr-1" />
          Add Warehouse
        </button>
      </PageHeader>

      {/* Search & Layout View Selector */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-3 rounded-2xl border-2 border-slate-200 shadow-xs">
        <div className="flex-1 max-w-md">
          <SearchInput
            value={search}
            onChangeValue={setSearch}
            placeholder="Search warehouse name, code, or storage rack..."
          />
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto">
          <div className="join bg-slate-100 p-0.5 rounded-xl border border-slate-300">
            <button
              onClick={() => setViewMode('grid')}
              className={`join-item btn btn-xs border-0 rounded-lg ${
                viewMode === 'grid' ? 'btn-primary text-white shadow-2xs font-bold' : 'btn-ghost text-slate-600'
              }`}
              title="Grid View"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`join-item btn btn-xs border-0 rounded-lg ${
                viewMode === 'table' ? 'btn-primary text-white shadow-2xs font-bold' : 'btn-ghost text-slate-600'
              }`}
              title="Table View"
            >
              <List className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20 bg-white rounded-2xl border-2 border-slate-200">
          <Loader2 className="w-8 h-8 text-primary animate-spin" />
          <span className="ml-3 text-sm font-semibold text-slate-600">Loading warehouses from database...</span>
        </div>
      ) : filteredWarehouses.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border-2 border-slate-200 p-6">
          <WarehouseIcon className="w-12 h-12 text-slate-400 mx-auto mb-3" />
          <h3 className="text-base font-bold text-slate-800">No warehouses found</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1 mb-4">
            Try adjusting your search query or add a new warehouse location.
          </p>
          <button
            onClick={() => navigate('/settings/warehouses/new')}
            className="btn btn-primary btn-sm rounded-xl text-white font-bold"
          >
            <Plus className="w-4 h-4 mr-1" /> Add Warehouse
          </button>
        </div>
      ) : viewMode === 'table' ? (
        <DataTable
          columns={columns}
          data={filteredWarehouses}
          keyExtractor={(wh) => wh.id}
          pageSize={10}
          onRowClick={(wh) => navigate(`/settings/warehouses/${wh.id}/edit`)}
          paginationPosition="top"
        />
      ) : (
        <div className="space-y-4">
          {/* Top Pagination for Grid Mode */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-2.5 bg-slate-50 border-2 border-slate-200 rounded-2xl text-xs font-medium text-slate-600 shadow-2xs">
            <div>
              Showing <span className="font-bold text-slate-900">{startRecord}</span> to{' '}
              <span className="font-bold text-slate-900">{endRecord}</span> of{' '}
              <span className="font-bold text-slate-900">{totalItems}</span> warehouses
            </div>
            <PaginationBar
              currentPage={currentPage}
              totalPages={totalPages}
              totalItems={totalItems}
              pageSize={pageSize}
              pageSizeOptions={[6, 12, 24, 48]}
              onPageChange={setCurrentPage}
              onPageSizeChange={(newSize) => {
                setPageSize(newSize);
                setCurrentPage(1);
              }}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {paginatedWarehouses.map((wh) => (
              <div
                key={wh.id}
                className="bg-white rounded-2xl border-2 border-slate-200 p-5 shadow-xs hover:shadow-md transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between mb-3">
                    <div className="p-3 bg-blue-50 text-primary rounded-xl border border-blue-200">
                      <WarehouseIcon className="w-6 h-6" />
                    </div>
                    <span className="font-mono text-xs font-bold bg-slate-100 text-slate-800 px-2.5 py-1 rounded-lg border border-slate-200">
                      {wh.code}
                    </span>
                  </div>

                  <h3 className="font-bold text-base text-slate-900">{wh.name}</h3>
                  {wh.address && (
                    <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-1 font-medium">
                      <MapPin className="w-3.5 h-3.5 flex-shrink-0 text-slate-400" />
                      <span className="truncate">{wh.address}</span>
                    </div>
                  )}

                  <div className="mt-4 pt-3 border-t border-slate-100">
                    <span className="text-xs font-bold text-slate-700 block mb-2">
                      Locations / Storage Racks ({wh.locations?.length || 0}):
                    </span>
                    <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
                      {wh.locations && wh.locations.length > 0 ? (
                        wh.locations.map((loc) => (
                          <span
                            key={loc}
                            className="badge badge-sm bg-slate-100 text-slate-800 text-[11px] font-semibold border border-slate-300"
                          >
                            {loc}
                          </span>
                        ))
                      ) : (
                        <span className="text-xs text-slate-400 italic">No locations configured</span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500 font-medium">
                  <span>Added: {formatDate(wh.createdAt)}</span>
                  <button
                    type="button"
                    onClick={() => navigate(`/settings/warehouses/${wh.id}/edit`)}
                    className="btn btn-ghost btn-xs text-primary font-bold hover:bg-primary/10 gap-1"
                  >
                    <Edit2 className="w-3 h-3" /> Edit
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
