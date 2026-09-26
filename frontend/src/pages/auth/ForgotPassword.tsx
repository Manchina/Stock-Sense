import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, ArrowRight, ArrowLeft, KeyRound, AlertCircle } from 'lucide-react';
import { api } from '../../lib/api';

export const ForgotPassword: React.FC = () => {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const navigate = useNavigate();

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMsg(null);

    try {
      const res = await api.post<{ success: boolean; message: string; otp?: string }>('/auth/otp/request', {
        email,
      });

      // Navigate to reset password page with email and optional dev OTP
      const query = new URLSearchParams({ email });
      if (res.otp) {
        query.set('devOtp', res.otp);
      }
      navigate(`/reset-password?${query.toString()}`);
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to request OTP. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="inline-flex items-center justify-center p-3.5 bg-primary text-white rounded-2xl mb-4 shadow-xs">
          <KeyRound className="w-9 h-9" />
        </div>
        <h2 className="text-3xl font-black tracking-tight text-slate-900">
          Reset your password
        </h2>
        <p className="mt-2 text-sm text-slate-600 font-medium">
          Enter your registered email and we'll generate a 6-digit OTP code
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

          <form onSubmit={handleSendOtp} className="space-y-4">
            <div className="form-control">
              <label className="label py-1">
                <span className="label-text font-bold text-xs text-slate-700">
                  Email Address
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
                  placeholder="name@company.com"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="btn btn-primary w-full rounded-xl text-white font-bold shadow-xs flex items-center justify-center gap-2 mt-2"
            >
              {isLoading ? (
                <span className="loading loading-spinner loading-sm"></span>
              ) : (
                <>
                  <span>Send OTP Code</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          <div className="mt-6 text-center">
            <Link
              to="/login"
              className="inline-flex items-center text-xs text-slate-600 hover:text-primary font-bold"
            >
              <ArrowLeft className="w-3.5 h-3.5 mr-1" />
              Back to Sign In
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
