import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { KeyRound, Lock, CheckCircle2 } from 'lucide-react';

export const ResetPassword: React.FC = () => {
  const [searchParams] = useSearchParams();
  const email = searchParams.get('email') || 'your email';
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [newPassword, setNewPassword] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleOtpChange = (val: string, index: number) => {
    if (val.length > 1) val = val.slice(0, 1);
    const newOtp = [...otp];
    newOtp[index] = val;
    setOtp(newOtp);

    // auto focus next input
    if (val && index < 5) {
      const nextInput = document.getElementById(`otp-input-${index + 1}`);
      nextInput?.focus();
    }
  };

  const handleReset = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      setIsSuccess(true);
      setTimeout(() => navigate('/login'), 1500);
    }, 600);
  };

  return (
    <div className="min-h-screen bg-base-200 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="inline-flex items-center justify-center p-3 bg-primary/10 text-primary rounded-2xl mb-4">
          <KeyRound className="w-10 h-10" />
        </div>
        <h2 className="text-3xl font-extrabold tracking-tight text-base-content">
          Verify OTP & Set Password
        </h2>
        <p className="mt-2 text-sm text-base-content/70">
          We sent a verification code to <span className="font-semibold text-primary">{email}</span>
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4">
        <div className="bg-base-100 py-8 px-6 shadow-xl rounded-3xl sm:px-10 border border-base-300">
          {isSuccess ? (
            <div className="text-center py-4 space-y-3">
              <div className="p-3 bg-success/10 text-success rounded-full w-12 h-12 mx-auto flex items-center justify-center">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-lg text-base-content">Password Reset Successfully!</h3>
              <p className="text-xs text-base-content/70">Redirecting to login...</p>
            </div>
          ) : (
            <form onSubmit={handleReset} className="space-y-5">
              <div className="form-control">
                <label className="label py-1">
                  <span className="label-text font-semibold text-xs text-base-content/80">
                    6-Digit OTP Code
                  </span>
                </label>
                <div className="flex justify-between gap-2">
                  {otp.map((digit, idx) => (
                    <input
                      key={idx}
                      id={`otp-input-${idx}`}
                      type="text"
                      maxLength={1}
                      value={digit}
                      onChange={(e) => handleOtpChange(e.target.value, idx)}
                      className="input input-bordered w-12 h-12 text-center text-lg font-bold bg-base-100 rounded-xl"
                      required
                    />
                  ))}
                </div>
              </div>

              <div className="form-control">
                <label className="label py-1">
                  <span className="label-text font-semibold text-xs text-base-content/80">
                    New Password
                  </span>
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-base-content/40 absolute left-3.5 top-3.5 pointer-events-none" />
                  <input
                    type="password"
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="input input-bordered w-full pl-10 bg-base-100 rounded-xl text-sm"
                    placeholder="Enter new password"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="btn btn-primary w-full rounded-xl text-white font-bold shadow-md shadow-primary/20 flex items-center justify-center gap-2 mt-4"
              >
                {isLoading ? (
                  <span className="loading loading-spinner loading-sm"></span>
                ) : (
                  'Reset & Sign In'
                )}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
