import React from 'react';
import { Search, X } from 'lucide-react';
import { cn } from '../../lib/utils';

interface SearchInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  value: string;
  onChangeValue: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export const SearchInput: React.FC<SearchInputProps> = ({
  value,
  onChangeValue,
  placeholder = 'Search by SKU, name, or reference...',
  className,
  ...props
}) => {
  return (
    <div className={cn('relative flex items-center w-full', className)}>
      <Search className="absolute left-2.5 w-4 h-4 text-slate-400 pointer-events-none z-10 shrink-0" />
      <input
        type="text"
        value={value}
        onChange={(e) => onChangeValue(e.target.value)}
        placeholder={placeholder}
        className="input input-sm input-bordered w-full !pl-8.5 !pr-7 bg-white border border-slate-300 text-slate-900 placeholder:text-slate-400 focus:border-primary focus:outline-none rounded-lg text-xs font-medium shadow-2xs"
        style={{ paddingLeft: '2.125rem', paddingRight: '1.75rem' }}
        {...props}
      />
      {value && (
        <button
          type="button"
          onClick={() => onChangeValue('')}
          className="absolute right-2 p-0.5 rounded-md hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors z-10"
          title="Clear search"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
};
