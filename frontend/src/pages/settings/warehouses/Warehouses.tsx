import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Warehouse as WarehouseIcon, Edit2, MapPin } from 'lucide-react';
import { PageHeader } from '../../../components/ui/PageHeader';
import { INITIAL_WAREHOUSES } from '../../../lib/constants';
import { Warehouse } from '../../../types/common';
import { formatDate } from '../../../lib/utils';

export const Warehouses: React.FC = () => {
  const navigate = useNavigate();
  const [warehouses] = useState<Warehouse[]>(INITIAL_WAREHOUSES);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Warehouse & Location Management"
        subtitle="Configure physical warehouses, distribution hubs, and internal storage locations/racks."
      >
        <button
          onClick={() => navigate('/settings/warehouses/new')}
          className="btn btn-primary btn-sm rounded-xl text-white font-bold shadow-xs"
        >
          <Plus className="w-4 h-4 mr-1" />
          Add Warehouse
        </button>
      </PageHeader>

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
                  Locations / Zones ({wh.locations.length}):
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {wh.locations.map((loc) => (
                    <span
                      key={loc}
                      className="badge badge-sm bg-slate-100 text-slate-800 text-xs font-semibold border border-slate-300"
                    >
                      {loc}
                    </span>
                  ))}
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
    </div>
  );
};
