import React from 'react';
import { Plus, Minus } from 'lucide-react';

interface QuantityInputProps {
  value: number;
  onChange: (val: number) => void;
  min?: number;
  max?: number;
  step?: number;
  unit?: string;
  label?: string;
  disabled?: boolean;
}

export const QuantityInput: React.FC<QuantityInputProps> = ({
  value,
  onChange,
  min = 1,
  max,
  step = 1,
  unit,
  label,
  disabled = false,
}) => {
  const handleDecrement = () => {
    const next = value - step;
    if (min !== undefined && next < min) return;
    onChange(next);
  };

  const handleIncrement = () => {
    const next = value + step;
    if (max !== undefined && next > max) return;
    onChange(next);
  };

  return (
    <div className="form-control">
      {label && (
        <label className="label py-0.5 mb-0.5">
          <span className="label-text font-bold text-xs text-slate-700">{label}</span>
        </label>
      )}
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={handleDecrement}
          disabled={disabled || (min !== undefined && value <= min)}
          className="btn btn-square btn-sm btn-outline border-slate-300 w-8 h-8 min-h-8 rounded-lg bg-white hover:bg-slate-100"
        >
          <Minus className="w-3.5 h-3.5" />
        </button>
        <input
          type="number"
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          min={min}
          max={max}
          step={step}
          disabled={disabled}
          className="input input-sm input-bordered w-20 text-center font-bold text-xs bg-white border border-slate-300 rounded-lg h-8 min-h-8"
        />
        <button
          type="button"
          onClick={handleIncrement}
          disabled={disabled || (max !== undefined && value >= max)}
          className="btn btn-square btn-sm btn-outline border-slate-300 w-8 h-8 min-h-8 rounded-lg bg-white hover:bg-slate-100"
        >
          <Plus className="w-3.5 h-3.5" />
        </button>
        {unit && <span className="text-xs text-slate-600 ml-1 font-semibold">{unit}</span>}
      </div>
    </div>
  );
};
