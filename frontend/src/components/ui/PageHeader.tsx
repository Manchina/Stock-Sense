import React from 'react';
import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  onBack?: () => void;
  backUrl?: string;
  children?: React.ReactNode;
}

export const PageHeader: React.FC<PageHeaderProps> = ({
  title,
  subtitle,
  onBack,
  backUrl,
  children,
}) => {
  const navigate = useNavigate();

  const handleBack = () => {
    if (onBack) onBack();
    else if (backUrl) navigate(backUrl);
    else navigate(-1);
  };

  const showBackButton = !!onBack || !!backUrl;

  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3.5 border-b border-slate-200">
      <div className="flex items-center gap-2.5">
        {showBackButton && (
          <button
            type="button"
            onClick={handleBack}
            className="btn btn-outline border-slate-300 btn-sm bg-white hover:bg-slate-100 text-slate-700 rounded-lg p-0 w-8 h-8 min-h-8 flex items-center justify-center shadow-xs shrink-0"
            title="Go back"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
        )}
        <div>
          <h1 className="text-lg sm:text-xl font-extrabold tracking-tight text-slate-900">{title}</h1>
          {subtitle && <p className="text-xs text-slate-500 font-medium">{subtitle}</p>}
        </div>
      </div>
      {children && <div className="flex items-center gap-2 flex-wrap">{children}</div>}
    </div>
  );
};
