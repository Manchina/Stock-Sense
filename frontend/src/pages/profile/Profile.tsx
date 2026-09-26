import React, { useState, useEffect } from 'react';
import { User, Mail, Shield, Warehouse, Save, CheckCircle2, AlertCircle, Lock } from 'lucide-react';
import { PageHeader } from '../../components/ui/PageHeader';
import { useAuthStore } from '../../store/authStore';
import { INITIAL_WAREHOUSES } from '../../lib/constants';

import { UserRole } from '../../types/common';

export const Profile: React.FC = () => {
  const { user, updateProfile, isLoading } = useAuthStore();
  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [role, setRole] = useState<UserRole>(user?.role || 'inventory_manager');
  const [warehouseId, setWarehouseId] = useState(user?.warehouseId || 'wh-1');
  const [saved, setSaved] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      setName(user.name);
      setEmail(user.email);
      if (user.role) {
        setRole(user.role);
      }
      if (user.warehouseId) {
        setWarehouseId(user.warehouseId);
      }
    }
  }, [user]);

  const isSuperAdmin = user?.role === 'super_admin';

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    try {
      await updateProfile({
        name: name.trim(),
        email: email.trim(),
        ...(isSuperAdmin ? { role } : {}),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to update profile.');
    }
  };

  return (
    <div className="w-full space-y-4">
      <form onSubmit={handleSave} className="space-y-4">
        <PageHeader
          title="My Profile & Preferences"
          subtitle="Manage personal contact details, role permissions, and default operational warehouse."
          backUrl="/"
        >
          <button
            type="submit"
            disabled={isLoading}
            className="btn btn-primary btn-xs sm:btn-sm rounded-lg text-white font-bold shadow-xs px-4 flex items-center gap-1.5"
          >
            {isLoading ? (
              <span className="loading loading-spinner loading-xs"></span>
            ) : (
              <Save className="w-3.5 h-3.5" />
            )}
            Save Changes
          </button>
        </PageHeader>

        {saved && (
          <div className="alert alert-success shadow-xs rounded-xl text-xs font-bold flex items-center bg-emerald-50 text-emerald-800 border border-emerald-200 py-2">
            <CheckCircle2 className="w-4 h-4 mr-1.5 text-emerald-600 shrink-0" />
            <span>Profile changes saved successfully!</span>
          </div>
        )}

        {errorMsg && (
          <div className="alert alert-error shadow-xs rounded-xl text-xs font-bold flex items-center bg-rose-50 text-rose-800 border border-rose-200 py-2">
            <AlertCircle className="w-4 h-4 mr-1.5 text-rose-600 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* User Card */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col items-center text-center">
            <div className="avatar mb-3">
              <div className="w-20 h-20 rounded-full ring-4 ring-blue-100 overflow-hidden shadow-xs">
                <img
                  src={
                    user?.avatar ||
                    'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&auto=format&fit=crop&q=80'
                  }
                  alt={name}
                  className="w-full h-full object-cover"
                />
              </div>
            </div>
            <h3 className="font-extrabold text-base text-slate-900">{name}</h3>
            <p className="text-xs text-slate-500 font-medium">{email}</p>
            <span className="badge bg-blue-50 text-blue-700 border border-blue-200 badge-sm mt-2.5 font-bold capitalize">
              {role.replace('_', ' ')}
            </span>

            <div className="mt-4 w-full pt-3 border-t border-slate-100 text-left text-xs space-y-2.5 font-medium">
              <div className="flex items-center gap-2 text-slate-700">
                <Shield className="w-4 h-4 text-blue-600 shrink-0" />
                <span>Full Operational Rights</span>
              </div>
              <div className="flex items-center gap-2 text-slate-700">
                <Warehouse className="w-4 h-4 text-blue-600 shrink-0" />
                <span>
                  {INITIAL_WAREHOUSES.find((w) => w.id === warehouseId)?.name || 'Central WH'}
                </span>
              </div>
            </div>
          </div>

          {/* Edit Form */}
          <div className="lg:col-span-2 bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 border-b border-slate-100 pb-2">
              Account Information
            </h3>

            <div className="space-y-3">
              <div className="form-control">
                <label className="label py-0.5 mb-0.5">
                  <span className="label-text font-bold text-xs text-slate-700">
                    Full Name <span className="text-error">*</span>
                  </span>
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="input input-sm input-bordered w-full pl-9 bg-white border border-slate-300 rounded-lg text-xs font-medium"
                    required
                  />
                </div>
              </div>

              <div className="form-control">
                <label className="label py-0.5 mb-0.5">
                  <span className="label-text font-bold text-xs text-slate-700">
                    Email Address <span className="text-error">*</span>
                  </span>
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="input input-sm input-bordered w-full pl-9 bg-white border border-slate-300 rounded-lg text-xs font-medium"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="form-control">
                  <div className="flex items-center justify-between mb-0.5">
                    <label className="label py-0">
                      <span className="label-text font-bold text-xs text-slate-700">
                        Assigned Role
                      </span>
                    </label>
                    {!isSuperAdmin && (
                      <span className="text-[10px] text-slate-400 font-semibold flex items-center gap-1">
                        <Lock className="w-2.5 h-2.5" /> Super Admin only
                      </span>
                    )}
                  </div>
                  <select
                    value={role}
                    disabled={!isSuperAdmin}
                    onChange={(e) => setRole(e.target.value as UserRole)}
                    className={`select select-sm select-bordered w-full border border-slate-300 rounded-lg text-xs font-medium ${
                      !isSuperAdmin ? 'bg-slate-100/80 text-slate-500 cursor-not-allowed' : 'bg-white text-slate-900'
                    }`}
                  >
                    <option value="super_admin">Super Admin (Master Access)</option>
                    <option value="inventory_manager">Inventory Manager</option>
                    <option value="warehouse_staff">Warehouse Staff</option>
                  </select>
                  {!isSuperAdmin && (
                    <span className="text-[10px] text-slate-400 mt-1">
                      Role changes can only be performed by a Super Admin.
                    </span>
                  )}
                </div>

                <div className="form-control">
                  <label className="label py-0.5 mb-0.5">
                    <span className="label-text font-bold text-xs text-slate-700">
                      Primary Facility
                    </span>
                  </label>
                  <select
                    value={warehouseId}
                    onChange={(e) => setWarehouseId(e.target.value)}
                    className="select select-sm select-bordered w-full bg-white border border-slate-300 rounded-lg text-xs font-medium"
                  >
                    {INITIAL_WAREHOUSES.map((w) => (
                      <option key={w.id} value={w.id}>
                        {w.name} ({w.code})
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
};
