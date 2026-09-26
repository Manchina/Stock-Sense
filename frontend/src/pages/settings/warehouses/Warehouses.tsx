import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Warehouse as WarehouseIcon, Edit2, MapPin, Loader2, RefreshCw } from 'lucide-react';
import { PageHeader } from '../../../components/ui/PageHeader';
import { INITIAL_WAREHOUSES } from '../../../lib/constants';
import { Warehouse } from '../../../types/common';
import { formatDate } from '../../../lib/utils';
import { api } from '../../../lib/api';

export const Warehouses: React.FC = () => {
  const navigate = useNavigate();
  const [warehouses, setWarehouses] = useState<Warehouse[]>(INITIAL_WAREHOUSES);
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

      {isLoading ? (
        <div className="flex items-center justify-center py-20 bg-white rounded-2xl border border-slate-200">
          <Loader2 className="w-8 h-8 text-primary animate-spin" />
          <span className="ml-3 text-sm font-semibold text-slate-600">Loading warehouses from database...</span>
        </div>
      ) : warehouses.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-slate-200 p-6">
          <WarehouseIcon className="w-12 h-12 text-slate-400 mx-auto mb-3" />
          <h3 className="text-base font-bold text-slate-800">No warehouses configured</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1 mb-4">
            Get started by adding your first central warehouse or production storage hub.
          </p>
          <button
            onClick={() => navigate('/settings/warehouses/new')}
            className="btn btn-primary btn-sm rounded-xl text-white font-bold"
          >
            <Plus className="w-4 h-4 mr-1" /> Add Warehouse
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {warehouses.map((wh) => (
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
                    <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
                    <span className="truncate">{wh.address}</span>
                  </div>
                )}

                <div className="mt-4 pt-3 border-t border-slate-200">
                  <span className="text-xs font-bold text-slate-700 block mb-2">
                    Locations / Zones ({wh.locations?.length || 0}):
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {wh.locations && wh.locations.length > 0 ? (
                      wh.locations.map((loc) => (
                        <span
                          key={loc}
                          className="badge badge-sm bg-slate-100 text-slate-800 text-xs font-semibold border border-slate-300"
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

              <div className="mt-5 pt-3 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500 font-medium">
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
      )}
    </div>
  );
};
