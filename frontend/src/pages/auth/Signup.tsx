import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Boxes, Lock, Mail, User, ArrowRight } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';

export const Signup: React.FC = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'inventory_manager' | 'warehouse_staff'>('inventory_manager');
  const { login, isLoading } = useAuthStore();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await login(email, role);
    navigate('/dashboard');
  };

  return (
    <div className="min-h-screen bg-base-200 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="inline-flex items-center justify-center p-3 bg-primary/10 text-primary rounded-2xl mb-4">
          <Boxes className="w-10 h-10" />
        </div>
        <h2 className="text-3xl font-extrabold tracking-tight text-base-content">
          Create StockSense Account
        </h2>
        <p className="mt-2 text-sm text-base-content/70">
          Get started with real-time stock digitization
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4">
        <div className="bg-base-100 py-8 px-6 shadow-xl rounded-3xl sm:px-10 border border-base-300">
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Full Name */}
            <div className="form-control">
              <label className="label py-1">
                <span className="label-text font-semibold text-xs text-base-content/80">
                  Full Name
                </span>
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-base-content/40 absolute left-3.5 top-3.5 pointer-events-none" />
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="input input-bordered w-full pl-10 bg-base-100 rounded-xl text-sm"
                  placeholder="Sarah Connor"
                />
              </div>
            </div>

            {/* Email */}
            <div className="form-control">
              <label className="label py-1">
                <span className="label-text font-semibold text-xs text-base-content/80">
                  Work Email
                </span>
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-base-content/40 absolute left-3.5 top-3.5 pointer-events-none" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="input input-bordered w-full pl-10 bg-base-100 rounded-xl text-sm"
                  placeholder="sarah@company.com"
                />
              </div>
            </div>

            {/* Role */}
            <div className="form-control">
              <label className="label py-1">
                <span className="label-text font-semibold text-xs text-base-content/80">Role</span>
              </label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as any)}
                className="select select-bordered w-full bg-base-100 rounded-xl text-sm"
              >
                <option value="inventory_manager">Inventory Manager (Full In/Out Control)</option>
                <option value="warehouse_staff">Warehouse Staff (Transfers & Picking)</option>
              </select>
            </div>

            {/* Password */}
            <div className="form-control">
              <label className="label py-1">
                <span className="label-text font-semibold text-xs text-base-content/80">
                  Password
                </span>
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-base-content/40 absolute left-3.5 top-3.5 pointer-events-none" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input input-bordered w-full pl-10 bg-base-100 rounded-xl text-sm"
                  placeholder="••••••••"
                />
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={isLoading}
              className="btn btn-primary w-full rounded-xl text-white font-bold shadow-md shadow-primary/20 flex items-center justify-center gap-2 mt-4"
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

          <div className="mt-6 text-center text-xs text-base-content/60">
            Already have an account?{' '}
            <Link to="/login" className="text-primary font-semibold hover:underline">
              Sign in
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
