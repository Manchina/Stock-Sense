import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Boxes, Lock, Mail, User, ArrowRight, AlertCircle } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { toast } from '../../context/ToastContext';

export const Signup: React.FC = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'inventory_manager' | 'warehouse_staff'>('inventory_manager');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const { signup, isLoading } = useAuthStore();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    try {
      await signup({ name, email, password, role });
      toast.success(`Account created for ${name}! Welcome to StockSense.`, 'Registration Successful');
      navigate('/dashboard');
    } catch (err: any) {
      toast.zod(err, 'Registration Failed');
      setErrorMsg(err instanceof Error ? err.message : 'Registration failed. Please check your inputs.');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="inline-flex items-center justify-center p-3.5 bg-primary text-white rounded-2xl mb-4 shadow-xs">
          <Boxes className="w-9 h-9" />
        </div>
        <h2 className="text-3xl font-black tracking-tight text-slate-900">
          Create StockSense Account
        </h2>
        <p className="mt-2 text-sm text-slate-600 font-medium">
          Get started with real-time stock digitization
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4">
        <div className="bg-white py-8 px-6 shadow-sm rounded-3xl sm:px-10 border-2 border-slate-200">
          {errorMsg && (
            <div className="mb-5 p-3.5 rounded-xl bg-rose-50 border border-rose-200 flex items-start gap-2.5 text-xs text-rose-800">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div className="font-semibold">{errorMsg}</div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Full Name */}
            <div className="form-control">
              <label className="label py-1">
                <span className="label-text font-bold text-xs text-slate-700">
                  Full Name
                </span>
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5 pointer-events-none" />
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="input input-bordered w-full pl-10 bg-white border-2 border-slate-300 text-slate-900 rounded-xl text-sm font-medium"
                  placeholder="Sarah Connor"
                />
              </div>
            </div>

            {/* Email */}
            <div className="form-control">
              <label className="label py-1">
                <span className="label-text font-bold text-xs text-slate-700">
                  Work Email
                </span>
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5 pointer-events-none" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="input input-bordered w-full pl-10 bg-white border-2 border-slate-300 text-slate-900 rounded-xl text-sm font-medium"
                  placeholder="sarah@company.com"
                />
              </div>
            </div>

            {/* Role */}
            <div className="form-control">
              <label className="label py-1">
                <span className="label-text font-bold text-xs text-slate-700">Role</span>
              </label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as any)}
                className="select select-bordered w-full bg-white border-2 border-slate-300 text-slate-900 rounded-xl text-sm font-medium"
              >
                <option value="inventory_manager">Inventory Manager (Full In/Out Control)</option>
                <option value="warehouse_staff">Warehouse Staff (Transfers & Picking)</option>
              </select>
            </div>

            {/* Password */}
            <div className="form-control">
              <label className="label py-1">
                <span className="label-text font-bold text-xs text-slate-700">
                  Password
                </span>
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5 pointer-events-none" />
                <input
                  type="password"
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input input-bordered w-full pl-10 bg-white border-2 border-slate-300 text-slate-900 rounded-xl text-sm font-medium"
                  placeholder="••••••••"
                />
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={isLoading}
              className="btn btn-primary w-full rounded-xl text-white font-bold shadow-xs flex items-center justify-center gap-2 mt-4"
            >
              {isLoading ? (
                <span className="loading loading-spinner loading-sm"></span>
              ) : (
                <>
                  <span>Create Account</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          <div className="mt-6 text-center text-xs text-slate-600 font-medium">
            Already have an account?{' '}
            <Link to="/login" className="text-primary font-bold hover:underline">
              Sign in
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
