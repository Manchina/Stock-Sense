import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Edit2, ShieldAlert } from 'lucide-react';
import { PageHeader } from '../../components/ui/PageHeader';
import { StockAvailability } from '../../features/products/components/StockAvailability';
import { StockStatus } from '../../components/inventory/StockStatus';
import { productsApi } from '../../features/products/api';
import { Product } from '../../types/common';
import { formatCurrency, formatDate } from '../../lib/utils';

export const ProductDetails: React.FC = () => {
  const { productId } = useParams<{ productId: string }>();
  const navigate = useNavigate();
  const [product, setProduct] = useState<Product | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (productId) {
      productsApi.getById(productId).then((p) => {
        if (p) setProduct(p);
        setIsLoading(false);
      });
    }
  }, [productId]);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[300px]">
        <span className="loading loading-spinner loading-lg text-primary"></span>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="space-y-4">
        <div className="alert alert-error">Product not found.</div>
      </div>
    );
  }

  return (
    <div className="w-full space-y-6">
      <PageHeader
        title={product.name}
        subtitle={`SKU: ${product.sku} • Category: ${product.category}`}
        backUrl="/products"
      >
        <button
          onClick={() => navigate(`/products/${product.id}/edit`)}
          className="btn btn-primary btn-sm rounded-xl text-white font-bold shadow-xs flex items-center"
        >
          <Edit2 className="w-4 h-4 mr-1.5" />
          Edit Product
        </button>
      </PageHeader>

      {/* Top Highlights Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-5 bg-white rounded-2xl border-2 border-slate-200 shadow-xs flex flex-col justify-between">
          <span className="text-xs font-bold text-slate-500">Current Total Stock</span>
          <div className="my-2">
            <span className="text-3xl font-black text-slate-900">
              {product.currentStock}
            </span>{' '}
            <span className="text-sm font-bold text-slate-500">
              {product.unitOfMeasure}
            </span>
          </div>
          <StockStatus
            currentStock={product.currentStock}
            minStockAlert={product.minStockAlert}
            unitOfMeasure={product.unitOfMeasure}
          />
        </div>

        <div className="p-5 bg-white rounded-2xl border-2 border-slate-200 shadow-xs flex flex-col justify-between">
          <span className="text-xs font-bold text-slate-500">Reordering Threshold</span>
          <div className="my-2 flex items-baseline gap-2">
            <span className="text-3xl font-black text-slate-900">
              {product.minStockAlert}
            </span>
            <span className="text-sm font-bold text-slate-500">
              {product.unitOfMeasure} min
            </span>
          </div>
          <div className="flex items-center gap-1 text-xs text-slate-600 font-medium">
            <ShieldAlert className="w-3.5 h-3.5 text-warning" />
            <span>Alert fires when stock ≤ {product.minStockAlert}</span>
          </div>
        </div>

        <div className="p-5 bg-white rounded-2xl border-2 border-slate-200 shadow-xs flex flex-col justify-between">
          <span className="text-xs font-bold text-slate-500">Selling & Cost Valuation</span>
          <div className="my-2">
            <span className="text-2xl font-black text-slate-900">
              {product.sellingPrice ? formatCurrency(product.sellingPrice) : 'N/A'}
            </span>
            {product.costPrice && (
              <span className="text-xs text-slate-500 font-medium block mt-0.5">
                Cost: {formatCurrency(product.costPrice)}
              </span>
            )}
          </div>
          <span className="badge badge-sm badge-success text-white font-bold">Active Item</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Location Stock Breakdown */}
        <StockAvailability product={product} />

        {/* Specifications & Notes */}
        <div className="bg-white p-5 rounded-2xl border-2 border-slate-200 shadow-xs space-y-4">
          <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-3">
            Product Specification
          </h3>
          <div className="space-y-3 text-xs">
            <div className="flex justify-between py-1 border-b border-slate-100">
              <span className="text-slate-500 font-medium">SKU / Code:</span>
              <span className="font-mono font-bold text-slate-900">{product.sku}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-100">
              <span className="text-slate-500 font-medium">Category:</span>
              <span className="font-bold text-slate-900">{product.category}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-100">
              <span className="text-slate-500 font-medium">Unit of Measure:</span>
              <span className="font-bold text-slate-900">{product.unitOfMeasure}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-100">
              <span className="text-slate-500 font-medium">Created At:</span>
              <span className="text-slate-700 font-medium">{formatDate(product.createdAt)}</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-slate-500 font-medium">Last Updated:</span>
              <span className="text-slate-700 font-medium">{formatDate(product.updatedAt)}</span>
            </div>
          </div>

          {product.description && (
            <div className="pt-2">
              <span className="text-xs font-bold text-slate-700 block mb-1">
                Description / Notes:
              </span>
              <p className="text-xs text-slate-800 bg-slate-50 p-3 rounded-xl border border-slate-200 leading-relaxed font-medium">
                {product.description}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
