import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '../../components/ui/PageHeader';
import { ProductForm } from '../../features/products/components/ProductForm';
import { ProductFormData } from '../../features/products/types';
import { productsApi } from '../../features/products/api';

export const ProductCreate: React.FC = () => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (data: ProductFormData) => {
    setIsLoading(true);
    try {
      const created = await productsApi.create(data);
      navigate(`/products/${created.id}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full space-y-4">
      <PageHeader
        title="New Product Registration"
        subtitle="Register a new item with SKU, unit of measure, initial stock, and reordering thresholds."
        backUrl="/products"
      >
        <button
          type="button"
          onClick={() => navigate('/products')}
          disabled={isLoading}
          className="btn btn-outline border-slate-300 btn-xs sm:btn-sm rounded-lg font-bold bg-white"
        >
          Cancel
        </button>
        <button
          type="submit"
          form="product-form"
          disabled={isLoading}
          className="btn btn-primary btn-xs sm:btn-sm rounded-lg text-white font-bold shadow-xs px-4"
        >
          {isLoading ? (
            <span className="loading loading-spinner loading-xs"></span>
          ) : (
            'Save Product'
          )}
        </button>
      </PageHeader>

      <ProductForm onSubmit={handleSubmit} isEditing={false} />
    </div>
  );
};
