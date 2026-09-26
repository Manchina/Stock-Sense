import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertCircle } from 'lucide-react';
import { PageHeader } from '../../components/ui/PageHeader';
import { ProductForm } from '../../features/products/components/ProductForm';
import { ProductFormData } from '../../features/products/types';
import { productsApi } from '../../features/products/api';
import { toast } from '../../context/ToastContext';

export const ProductCreate: React.FC = () => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = async (data: ProductFormData) => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const created = await productsApi.create(data);
      toast.success(`Product '${created.name}' (${created.sku}) registered successfully!`, 'Product Registered');
      navigate(`/products/${created.id}`);
    } catch (err: any) {
      toast.zod(err, 'Failed to register product');
      setErrorMsg(err?.message || 'Failed to register product');
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

      {errorMsg && (
        <div className="alert alert-error text-xs font-semibold rounded-xl flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      <ProductForm onSubmit={handleSubmit} isEditing={false} />
    </div>
  );
};
