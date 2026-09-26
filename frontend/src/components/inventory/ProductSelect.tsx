import React from 'react';
import { Product } from '../../types/common';
import { INITIAL_PRODUCTS } from '../../lib/constants';

interface ProductSelectProps {
  value: string;
  onChange: (productId: string, product?: Product) => void;
  products?: Product[];
  label?: string;
  required?: boolean;
  className?: string;
}

export const ProductSelect: React.FC<ProductSelectProps> = ({
  value,
  onChange,
  products = INITIAL_PRODUCTS,
  label = 'Select Product',
  required = false,
  className,
}) => {
  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedId = e.target.value;
    const selectedProduct = products.find((p) => p.id === selectedId);
    onChange(selectedId, selectedProduct);
  };

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
        onChange={handleChange}
        required={required}
        className="select select-bordered select-sm w-full bg-white border border-slate-300 text-slate-900 text-xs font-semibold focus:border-primary focus:outline-none rounded-lg shadow-2xs"
      >
        <option value="" disabled>
          Choose a product...
        </option>
        {products.map((prod) => (
          <option key={prod.id} value={prod.id}>
            {prod.name} ({prod.sku}) — Available: {prod.currentStock} {prod.unitOfMeasure}
          </option>
        ))}
      </select>
    </div>
  );
};
