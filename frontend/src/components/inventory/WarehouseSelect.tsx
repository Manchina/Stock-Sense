import React, { useState, useEffect } from 'react';
import { Warehouse } from '../../types/common';
import { INITIAL_WAREHOUSES } from '../../lib/constants';
import { api } from '../../lib/api';

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
  warehouses: passedWarehouses,
  label = 'Warehouse / Location',
  placeholder = 'Select warehouse location...',
  required = false,
  className,
}) => {
  const [internalWarehouses, setInternalWarehouses] = useState<Warehouse[]>(
    passedWarehouses || INITIAL_WAREHOUSES
  );

  useEffect(() => {
    if (passedWarehouses) {
      setInternalWarehouses(passedWarehouses);
    } else {
      api
        .get<{ success: boolean; data: Warehouse[] }>('/warehouses')
        .then((res) => {
          if (res && res.data && Array.isArray(res.data) && res.data.length > 0) {
            setInternalWarehouses(res.data);
          }
        })
        .catch((err) => {
          console.warn('Could not load warehouses for select, using fallback:', err);
        });
    }
  }, [passedWarehouses]);

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
        {internalWarehouses.map((wh) => (
          <optgroup key={wh.id} label={`${wh.name} (${wh.code})`}>
            {(wh.locations || []).map((loc) => {
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
