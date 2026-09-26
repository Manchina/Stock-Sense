import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { KeyRound, Lock, CheckCircle2, AlertCircle, ArrowLeft, ArrowRight } from 'lucide-react';
import { api } from '../../lib/api';

export const ResetPassword: React.FC = () => {
  const [searchParams] = useSearchParams();
  const email = searchParams.get('email') || '';
  const devOtp = searchParams.get('devOtp') || '';
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [newPassword, setNewPassword] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (devOtp && devOtp.length === 6) {
      setOtp(devOtp.split(''));
    }
  }, [devOtp]);

  const handleOtpChange = (val: string, index: number) => {
    // Only accept numeric digits
    const cleaned = val.replace(/\D/g, '');
    if (cleaned.length > 1) {
      // Handle paste
      const digits = cleaned.slice(0, 6).split('');
      const updatedOtp = [...otp];
      digits.forEach((d, i) => {
        if (i < 6) updatedOtp[i] = d;
      });
      setOtp(updatedOtp);
      const nextIdx = Math.min(digits.length, 5);
      document.getElementById(`otp-input-${nextIdx}`)?.focus();
      return;
    }

    const newOtp = [...otp];
    newOtp[index] = cleaned;
    setOtp(newOtp);

    // Auto focus next input
    if (cleaned && index < 5) {
      const nextInput = document.getElementById(`otp-input-${index + 1}`);
      nextInput?.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, index: number) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      const prevInput = document.getElementById(`otp-input-${index - 1}`);
      prevInput?.focus();
    }
  };

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    const code = otp.join('');
    if (code.length !== 6) {
      setErrorMsg('Please enter all 6 digits of the OTP code.');
      return;
    }

    setIsLoading(true);
    setErrorMsg(null);

    try {
      // Step 1: Verify OTP and receive reset token
      const verifyRes = await api.post<{ success: boolean; resetToken: string }>('/auth/otp/verify', {
        email,
        code,
      });

      // Step 2: Use reset token to apply new password
      await api.post('/auth/reset-password', {
        resetToken: verifyRes.resetToken,
        newPassword,
      });

      setIsSuccess(true);
      setTimeout(() => {
        navigate('/login');
      }, 2000);
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Password reset failed. Please verify the code.');
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
          Verify OTP & Set Password
        </h2>
        <p className="mt-2 text-sm text-slate-600 font-medium">
          Enter the verification code sent to <span className="font-bold text-primary">{email || 'your email'}</span>
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

          {devOtp && (
            <div className="mb-4 p-3 rounded-xl bg-blue-50 border border-blue-200 text-xs text-blue-900 flex items-center justify-between">
              <span>Demo OTP Code: <strong className="font-mono text-sm">{devOtp}</strong></span>
              <button
                type="button"
                onClick={() => setOtp(devOtp.split(''))}
                className="text-primary font-bold hover:underline"
              >
                Auto-fill
              </button>
            </div>
          )}

          {isSuccess ? (
            <div className="text-center py-4 space-y-3">
              <div className="p-3 bg-emerald-50 text-emerald-600 rounded-full w-12 h-12 mx-auto flex items-center justify-center border border-emerald-200">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h3 className="font-black text-lg text-slate-900">Password Reset Successfully!</h3>
              <p className="text-xs text-slate-600 font-medium">Redirecting you to sign in...</p>
            </div>
          ) : (
            <form onSubmit={handleReset} className="space-y-5">
              <div className="form-control">
                <label className="label py-1">
                  <span className="label-text font-bold text-xs text-slate-700">
                    6-Digit OTP Code
                  </span>
                </label>
                <div className="flex justify-between gap-1.5 sm:gap-2">
                  {otp.map((digit, idx) => (
                    <input
                      key={idx}
                      id={`otp-input-${idx}`}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      value={digit}
                      onChange={(e) => handleOtpChange(e.target.value, idx)}
                      onKeyDown={(e) => handleKeyDown(e, idx)}
                      className="input input-bordered w-11 h-12 sm:w-12 sm:h-12 text-center text-lg font-black bg-white border-2 border-slate-300 text-slate-900 rounded-xl focus:border-primary focus:ring-1 focus:ring-primary"
                      required
                    />
                  ))}
                </div>
              </div>

              <div className="form-control">
                <label className="label py-1">
                  <span className="label-text font-bold text-xs text-slate-700">
                    New Password
                  </span>
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5 pointer-events-none" />
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="input input-bordered w-full pl-10 bg-white border-2 border-slate-300 text-slate-900 rounded-xl text-sm font-medium"
                    placeholder="Enter new password (min. 6 chars)"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="btn btn-primary w-full rounded-xl text-white font-bold shadow-xs flex items-center justify-center gap-2 mt-4"
              >
                {isLoading ? (
                  <span className="loading loading-spinner loading-sm"></span>
                ) : (
                  <>
                    <span>Reset & Sign In</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          )}

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
