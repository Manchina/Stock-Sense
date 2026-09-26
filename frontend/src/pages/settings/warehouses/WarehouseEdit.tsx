import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Plus, Trash2, Loader2, AlertCircle } from 'lucide-react';
import { PageHeader } from '../../../components/ui/PageHeader';
import { INITIAL_WAREHOUSES } from '../../../lib/constants';
import { Warehouse } from '../../../types/common';
import { api } from '../../../lib/api';
import { toast } from '../../../context/ToastContext';

export const WarehouseEdit: React.FC = () => {
  const { warehouseId } = useParams<{ warehouseId: string }>();
  const navigate = useNavigate();

  const [warehouse, setWarehouse] = useState<Warehouse | null>(null);
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [address, setAddress] = useState('');
  const [locations, setLocations] = useState<string[]>([]);
  const [newLocationInput, setNewLocationInput] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadWarehouse() {
      if (!warehouseId) return;
      try {
        const res = await api.get<{ success: boolean; data: Warehouse }>(`/warehouses/${warehouseId}`);
        if (res && res.data && isMounted) {
          setWarehouse(res.data);
          setName(res.data.name);
          setCode(res.data.code);
          setAddress(res.data.address || '');
          setLocations(res.data.locations || []);
          setIsLoading(false);
          return;
        }
      } catch (err) {
        console.warn('API fetch by ID failed, falling back to local constants:', err);
      }

      // Fallback to constants
      const wh = INITIAL_WAREHOUSES.find((w) => w.id === warehouseId);
      if (wh && isMounted) {
        setWarehouse(wh);
        setName(wh.name);
        setCode(wh.code);
        setAddress(wh.address || '');
        setLocations([...wh.locations]);
      }
      if (isMounted) setIsLoading(false);
    }

    loadWarehouse();
    return () => {
      isMounted = false;
    };
  }, [warehouseId]);

  const handleAddLocation = () => {
    if (!newLocationInput.trim()) return;
    setLocations([...locations, newLocationInput.trim()]);
    setNewLocationInput('');
  };

  const handleRemoveLocation = (index: number) => {
    setLocations(locations.filter((_, idx) => idx !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!warehouse || !warehouseId) return;

    setIsSubmitting(true);
    setErrorMsg(null);

    const payload = {
      name: name.trim(),
      code: code.trim().toUpperCase(),
      address: address.trim() || undefined,
      locations: locations.filter((l) => l.trim().length > 0),
    };

    try {
      await api.put<{ success: boolean; data: Warehouse }>(`/warehouses/${warehouseId}`, payload);
      // Update local fallback as well
      const wh = INITIAL_WAREHOUSES.find((w) => w.id === warehouseId);
      if (wh) {
        wh.name = payload.name;
        wh.code = payload.code;
        wh.address = payload.address;
        wh.locations = payload.locations;
      }
      toast.success(`Warehouse '${payload.name}' updated successfully.`, 'Warehouse Updated');
      navigate('/settings/warehouses');
    } catch (err: any) {
      console.warn('API update failed, updating local state:', err);
      toast.zod(err, 'Failed to update warehouse');
      const wh = INITIAL_WAREHOUSES.find((w) => w.id === warehouseId);
      if (wh) {
        wh.name = payload.name;
        wh.code = payload.code;
        wh.address = payload.address;
        wh.locations = payload.locations;
      }
      navigate('/settings/warehouses');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20 bg-white rounded-2xl border border-slate-200">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
        <span className="ml-3 text-sm font-semibold text-slate-600">Loading warehouse details...</span>
      </div>
    );
  }

  if (!warehouse) {
    return (
      <div className="bg-rose-50 border border-rose-200 rounded-2xl p-6 text-rose-800 space-y-3">
        <div className="flex items-center gap-2 font-bold text-base">
          <AlertCircle className="w-5 h-5" /> Warehouse not found
        </div>
        <p className="text-xs text-rose-600">The requested warehouse could not be located in the system.</p>
        <button
          onClick={() => navigate('/settings/warehouses')}
          className="btn btn-outline border-rose-300 btn-xs rounded-lg font-bold"
        >
          Back to Warehouses
        </button>
      </div>
    );
  }

  return (
    <div className="w-full space-y-4">
      <form onSubmit={handleSubmit} className="space-y-4">
        <PageHeader
          title={`Edit Warehouse: ${warehouse.name}`}
          subtitle={`Facility Code: ${warehouse.code}`}
          backUrl="/settings/warehouses"
        >
          <button
            type="button"
            onClick={() => navigate('/settings/warehouses')}
            className="btn btn-outline border-slate-300 btn-xs sm:btn-sm rounded-lg font-bold bg-white"
            disabled={isSubmitting}
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="btn btn-primary btn-xs sm:btn-sm rounded-lg text-white font-bold shadow-xs px-4 flex items-center gap-1.5"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Updating...</span>
              </>
            ) : (
              <span>Update Warehouse</span>
            )}
          </button>
        </PageHeader>

        {errorMsg && (
          <div className="alert alert-error text-xs flex items-center gap-2 rounded-xl">
            <AlertCircle className="w-4 h-4" />
            <span>{errorMsg}</span>
          </div>
        )}

        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 border-b border-slate-100 pb-2">
            Facility Information
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="form-control sm:col-span-2">
              <label className="label py-0.5 mb-0.5">
                <span className="label-text font-bold text-xs text-slate-700">
                  Warehouse Name <span className="text-error">*</span>
                </span>
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="input input-sm input-bordered bg-white border border-slate-300 rounded-lg text-xs font-medium"
              />
            </div>

            <div className="form-control sm:col-span-2">
              <label className="label py-0.5 mb-0.5">
                <span className="label-text font-bold text-xs text-slate-700">
                  Facility Code <span className="text-error">*</span>
                </span>
              </label>
              <input
                type="text"
                required
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                className="input input-sm input-bordered font-mono uppercase bg-white border border-slate-300 rounded-lg text-xs font-bold"
              />
            </div>

            <div className="form-control sm:col-span-4">
              <label className="label py-0.5 mb-0.5">
                <span className="label-text font-bold text-xs text-slate-700">Facility Address</span>
              </label>
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="input input-sm input-bordered bg-white border border-slate-300 rounded-lg text-xs font-medium"
              />
            </div>
          </div>
        </div>

        {/* Location / Rack Builder */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 border-b border-slate-100 pb-2">
            Internal Storage Locations & Racks
          </h3>

          <div className="flex gap-2 max-w-lg">
            <input
              type="text"
              value={newLocationInput}
              onChange={(e) => setNewLocationInput(e.target.value)}
              placeholder="e.g. Rack E or Staging Bay 3"
              className="input input-sm input-bordered bg-white border border-slate-300 rounded-lg text-xs font-medium flex-1"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAddLocation();
                }
              }}
            />
            <button
              type="button"
              onClick={handleAddLocation}
              className="btn btn-xs btn-outline border-slate-300 rounded-lg font-bold bg-white px-3"
            >
              <Plus className="w-3.5 h-3.5 mr-1" /> Add Location
            </button>
          </div>

          <div className="flex flex-wrap gap-2 pt-1">
            {locations.map((loc, idx) => (
              <div
                key={idx}
                className="badge badge-md bg-slate-100 text-slate-800 border border-slate-300 gap-1.5 p-2.5 font-semibold text-xs rounded-lg"
              >
                <span>{loc}</span>
                <button
                  type="button"
                  onClick={() => handleRemoveLocation(idx)}
                  className="hover:text-rose-600 text-slate-400"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        </div>
      </form>
    </div>
  );
};
