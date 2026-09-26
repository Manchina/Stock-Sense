import React from 'react';
import { CheckCircle2, AlertTriangle, AlertCircle, Info, X, ShieldAlert } from 'lucide-react';
import { useToast, ToastItem } from '../../context/ToastContext';

export const ToastContainer: React.FC = () => {
  const { toasts, removeToast } = useToast();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[9999] flex flex-col-reverse gap-2.5 max-w-lg w-full px-4 sm:px-0 pointer-events-none items-center">
      {toasts.map((toast) => (
        <ToastCard key={toast.id} toast={toast} onClose={() => removeToast(toast.id)} />
      ))}
    </div>
  );
};

const ToastCard: React.FC<{ toast: ToastItem; onClose: () => void }> = ({ toast, onClose }) => {
  const { type, title, message, zodError } = toast;

  if (type === 'zod' && zodError && zodError.fieldErrors.length > 0) {
    return (
      <div className="pointer-events-auto w-full bg-white border-2 border-rose-300 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-300">
        <div className="bg-rose-50 px-4 py-3 border-b border-rose-200/80 flex items-start justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="p-1 bg-rose-500 text-white rounded-lg">
              <ShieldAlert className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-xs font-black text-rose-950 uppercase tracking-wider">
                {title || 'Zod Validation Failed'}
              </h4>
              <p className="text-[11px] font-medium text-rose-700">{message}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-rose-400 hover:text-rose-700 p-1 rounded-lg hover:bg-rose-100 transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="p-3 bg-white space-y-1.5 max-h-56 overflow-y-auto">
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-1">
            Required Corrections ({zodError.fieldErrors.length})
          </div>
          {zodError.fieldErrors.map((err, idx) => (
            <div
              key={idx}
              className="px-2.5 py-1.5 bg-rose-50/60 rounded-xl border border-rose-100 text-xs flex flex-col gap-0.5"
            >
              <span className="font-bold text-slate-900 text-[11px]">{err.field}</span>
              <span className="text-rose-600 font-medium text-[11px]">{err.message}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  const getStyle = () => {
    switch (type) {
      case 'success':
        return {
          bg: 'bg-emerald-50 border-emerald-300',
          iconBg: 'bg-emerald-600 text-white',
          titleColor: 'text-emerald-950',
          textColor: 'text-emerald-800',
          Icon: CheckCircle2,
        };
      case 'error':
      case 'zod':
        return {
          bg: 'bg-rose-50 border-rose-300',
          iconBg: 'bg-rose-600 text-white',
          titleColor: 'text-rose-950',
          textColor: 'text-rose-800',
          Icon: AlertCircle,
        };
      case 'warning':
        return {
          bg: 'bg-amber-50 border-amber-300',
          iconBg: 'bg-amber-500 text-white',
          titleColor: 'text-amber-950',
          textColor: 'text-amber-800',
          Icon: AlertTriangle,
        };
      case 'info':
      default:
        return {
          bg: 'bg-blue-50 border-blue-300',
          iconBg: 'bg-blue-600 text-white',
          titleColor: 'text-blue-950',
          textColor: 'text-blue-800',
          Icon: Info,
        };
    }
  };

  const style = getStyle();
  const IconComponent = style.Icon;

  return (
    <div
      className={`pointer-events-auto w-full p-3.5 rounded-2xl border-2 shadow-2xl ${style.bg} animate-in fade-in slide-in-from-bottom-4 duration-300 flex items-start gap-3`}
    >
      <div className={`p-1.5 rounded-xl shrink-0 ${style.iconBg}`}>
        <IconComponent className="w-4 h-4" />
      </div>

      <div className="flex-1 min-w-0 pr-1">
        {title && <div className={`text-xs font-bold ${style.titleColor}`}>{title}</div>}
        <div className={`text-xs font-medium leading-relaxed ${style.textColor}`}>{message}</div>
      </div>

      <button
        onClick={onClose}
        className="text-slate-400 hover:text-slate-700 p-1 rounded-lg hover:bg-slate-200/50 transition-colors shrink-0"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
};
