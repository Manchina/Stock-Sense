import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { AlertCircle } from 'lucide-react';
import { PageHeader } from '../../components/ui/PageHeader';
import { ProductForm } from '../../features/products/components/ProductForm';
import { ProductFormData } from '../../features/products/types';
import { productsApi } from '../../features/products/api';
import { Product } from '../../types/common';

export const ProductEdit: React.FC = () => {
  const { productId } = useParams<{ productId: string }>();
  const navigate = useNavigate();
  const [product, setProduct] = useState<Product | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (productId) {
      productsApi.getById(productId).then((p) => {
        if (p) setProduct(p);
        setIsLoading(false);
      });
    }
  }, [productId]);

  const handleSubmit = async (data: ProductFormData) => {
    if (!productId) return;
    setIsSaving(true);
    setErrorMsg(null);
    try {
      await productsApi.update(productId, data);
      navigate(`/products/${productId}`);
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to update product');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[300px]">
        <span className="loading loading-spinner loading-lg text-primary"></span>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="alert alert-error">
        <span>Product not found.</span>
      </div>
    );
  }

  return (
    <div className="w-full space-y-4">
      <PageHeader
        title={`Edit Product: ${product.name}`}
        subtitle={`Updating SKU: ${product.sku}`}
        backUrl={`/products/${productId}`}
      >
        <button
          type="button"
          onClick={() => navigate(`/products/${productId}`)}
          disabled={isSaving}
          className="btn btn-outline border-slate-300 btn-xs sm:btn-sm rounded-lg font-bold bg-white"
        >
          Cancel
        </button>
        <button
          type="submit"
          form="product-form"
          disabled={isSaving}
          className="btn btn-primary btn-xs sm:btn-sm rounded-lg text-white font-bold shadow-xs px-4"
        >
          {isSaving ? (
            <span className="loading loading-spinner loading-xs"></span>
          ) : (
            'Update Product'
          )}
        </button>
      </PageHeader>

      {errorMsg && (
        <div className="alert alert-error text-xs font-semibold rounded-xl flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      <ProductForm
        initialData={product}
        onSubmit={handleSubmit}
        isEditing={true}
      />
    </div>
  );
};
