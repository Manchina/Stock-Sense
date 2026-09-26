import React from 'react';
import { Warehouse } from '../../types/common';
import { INITIAL_WAREHOUSES } from '../../lib/constants';

interface WarehouseSelectProps {
  value: string;
  onChange: (locationValue: string) => void;
  warehouses?: Warehouse[];
  label?: string;
  placeholder?: string;
  required?: boolean;
  className?: string;
}

export const WarehouseSelect: React.FC<WarehouseSelectProps> = ({
  value,
  onChange,
  warehouses = INITIAL_WAREHOUSES,
  label = 'Warehouse / Location',
  placeholder = 'Select warehouse location...',
  required = false,
  className,
}) => {
  return (
    <div className={`form-control w-full ${className || ''}`}>
      {label && (
        <label className="label py-0.5 mb-0.5">
          <span className="label-text font-bold text-xs text-slate-700">
            {label} {required && <span className="text-error">*</span>}
          </span>
        </label>
      )}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        className="select select-bordered select-sm w-full bg-white border border-slate-300 text-slate-900 text-xs font-semibold focus:border-primary focus:outline-none rounded-lg shadow-2xs"
      >
        <option value="" disabled>
          {placeholder}
        </option>
        {warehouses.map((wh) => (
          <optgroup key={wh.id} label={`${wh.name} (${wh.code})`}>
            {wh.locations.map((loc) => {
              const fullLoc = `${wh.code} / ${loc}`;
              return (
                <option key={fullLoc} value={fullLoc}>
                  {wh.name} → {loc}
                </option>
              );
            })}
          </optgroup>
        ))}
      </select>
    </div>
  );
};
