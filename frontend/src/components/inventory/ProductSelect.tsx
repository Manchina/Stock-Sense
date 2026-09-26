import React, { useState, useEffect } from 'react';
import { Product } from '../../types/common';
import { INITIAL_PRODUCTS } from '../../lib/constants';
import { productsApi } from '../../features/products/api';

interface ProductSelectProps {
  value: string;
  onChange: (productId: string, product?: Product) => void;
  products?: Product[];
  sourceLocation?: string;
  label?: string;
  required?: boolean;
  className?: string;
}

export const ProductSelect: React.FC<ProductSelectProps> = ({
  value,
  onChange,
  products: passedProducts,
  sourceLocation,
  label = 'Select Product',
  required = false,
  className,
}) => {
  const [internalProducts, setInternalProducts] = useState<Product[]>(
    passedProducts || INITIAL_PRODUCTS
  );

  useEffect(() => {
    if (passedProducts) {
      setInternalProducts(passedProducts);
    } else {
      productsApi.getAll().then((loaded) => {
        if (loaded && loaded.length > 0) {
          setInternalProducts(loaded);
        }
      });
    }
  }, [passedProducts]);

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedId = e.target.value;
    const selectedProduct = internalProducts.find((p) => p.id === selectedId);
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
        {internalProducts.map((prod) => {
          const locStock =
            sourceLocation && prod.locationStock && sourceLocation in prod.locationStock
              ? prod.locationStock[sourceLocation]
              : undefined;

          return (
            <option key={prod.id} value={prod.id}>
              {prod.name} ({prod.sku}) —{' '}
              {locStock !== undefined
                ? `Available here: ${locStock} ${prod.unitOfMeasure || 'pcs'} (Total: ${prod.currentStock})`
                : `Total Stock: ${prod.currentStock} ${prod.unitOfMeasure || 'pcs'}`}
            </option>
          );
        })}
      </select>
    </div>
  );
};
