import React from 'react';
import { LucideIcon } from 'lucide-react';
import { cn } from '../../../lib/utils';

interface KpiCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  variant?: 'primary' | 'warning' | 'info' | 'success' | 'teal';
  onClick?: () => void;
}

export const KpiCard: React.FC<KpiCardProps> = ({
  title,
  value,
  subtitle,
  icon: Icon,
  variant = 'primary',
  onClick,
}) => {
  const variantStyles = {
    primary: 'border-blue-200 bg-blue-50 text-blue-700',
    warning: 'border-amber-200 bg-amber-50 text-amber-700',
    info: 'border-sky-200 bg-sky-50 text-sky-700',
    success: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    teal: 'border-teal-200 bg-teal-50 text-teal-700',
  }[variant];

  return (
    <div
      onClick={onClick}
      className={cn(
        'p-5 rounded-2xl bg-white border-2 border-slate-200 shadow-xs hover:shadow-md transition-all duration-150 flex flex-col justify-between',
        onClick ? 'cursor-pointer hover:border-primary' : ''
      )}
    >
      <div className="flex items-start justify-between">
        <div>
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
            {title}
          </span>
          <h3 className="text-3xl font-black text-slate-900 mt-1.5">{value}</h3>
        </div>
        <div className={cn('p-3 rounded-xl border-2', variantStyles)}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
      {subtitle && (
        <div className="mt-4 pt-3 border-t border-slate-100 text-xs text-slate-500 flex items-center font-medium">
          <span>{subtitle}</span>
        </div>
      )}
    </div>
  );
};
