import React from 'react';
import { PackageOpen } from 'lucide-react';

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon = <PackageOpen className="w-12 h-12 text-base-content/30" />,
  title,
  description,
  action,
}) => {
  return (
    <div className="flex flex-col items-center justify-center p-12 text-center bg-base-100/50 rounded-2xl border border-dashed border-base-300 my-4">
      <div className="p-4 bg-base-200 rounded-full mb-3 shadow-inner">{icon}</div>
      <h3 className="text-lg font-semibold text-base-content">{title}</h3>
      {description && <p className="text-sm text-base-content/60 max-w-sm mt-1 mb-4">{description}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
};
