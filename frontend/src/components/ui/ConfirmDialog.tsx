import React from 'react';
import { AlertTriangle } from 'lucide-react';

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'warning' | 'primary';
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'primary',
  onConfirm,
  onCancel,
}) => {
  if (!isOpen) return null;

  const btnClass = {
    danger: 'btn-error text-white',
    warning: 'btn-warning text-white',
    primary: 'btn-primary text-white',
  }[variant];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fadeIn">
      <div className="bg-base-100 rounded-2xl max-w-md w-full p-6 shadow-2xl border border-base-300">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-3 bg-amber-500/10 text-amber-600 rounded-full">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <h3 className="text-xl font-bold text-base-content">{title}</h3>
        </div>
        <p className="text-sm text-base-content/70 mb-6 leading-relaxed">{message}</p>
        <div className="flex justify-end gap-3">
          <button type="button" onClick={onCancel} className="btn btn-ghost btn-sm sm:btn-md">
            {cancelLabel}
          </button>
          <button type="button" onClick={onConfirm} className={`btn btn-sm sm:btn-md ${btnClass}`}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};
