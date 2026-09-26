import React, { useState, useEffect } from 'react';
import { ProductFormData } from '../types';
import { validateProductForm } from '../schemas';
import { PRODUCT_CATEGORIES, UNITS_OF_MEASURE } from '../../../lib/constants';
import { productsApi } from '../api';

interface ProductFormProps {
  initialData?: Partial<ProductFormData>;
  onSubmit: (data: ProductFormData) => void;
  isEditing?: boolean;
}

export const ProductForm: React.FC<ProductFormProps> = ({
  initialData,
  onSubmit,
  isEditing = false,
}) => {
  const [categoriesList, setCategoriesList] = useState<string[]>(PRODUCT_CATEGORIES);
  const [locationsList, setLocationsList] = useState<string[]>([]);

  const [formData, setFormData] = useState<ProductFormData>({
    name: initialData?.name || '',
    sku: initialData?.sku || '',
    category: initialData?.category || PRODUCT_CATEGORIES[0],
    unitOfMeasure: initialData?.unitOfMeasure || UNITS_OF_MEASURE[0],
    currentStock: initialData?.currentStock ?? 0,
    minStockAlert: initialData?.minStockAlert ?? 10,
    costPrice: initialData?.costPrice != null ? Number(initialData.costPrice) : undefined,
    sellingPrice: initialData?.sellingPrice != null ? Number(initialData.sellingPrice) : undefined,
    description: initialData?.description || '',
    initialLocation: initialData?.initialLocation || '',
  });

  useEffect(() => {
    if (initialData) {
      setFormData({
        name: initialData.name || '',
        sku: initialData.sku || '',
        category: initialData.category || PRODUCT_CATEGORIES[0],
        unitOfMeasure: initialData.unitOfMeasure || UNITS_OF_MEASURE[0],
        currentStock: initialData.currentStock ?? 0,
        minStockAlert: initialData.minStockAlert ?? 10,
        costPrice: initialData.costPrice != null ? Number(initialData.costPrice) : undefined,
        sellingPrice: initialData.sellingPrice != null ? Number(initialData.sellingPrice) : undefined,
        description: initialData.description || '',
        initialLocation: initialData.initialLocation || '',
      });
      if (initialData.category) {
        setCategoriesList((prev) =>
          prev.includes(initialData.category!) ? prev : [initialData.category!, ...prev]
        );
      }
    }
  }, [initialData]);

  useEffect(() => {
    productsApi.getCategories().then((cats) => {
      if (cats && cats.length > 0) {
        setCategoriesList((prev) => {
          const combined = new Set([...cats, ...prev]);
          return Array.from(combined);
        });
      }
    });

    productsApi.getWarehouseLocations().then((locs) => {
      if (locs && locs.length > 0) {
        setLocationsList(locs);
        if (!formData.initialLocation) {
          setFormData((prev) => ({ ...prev, initialLocation: locs[0] }));
        }
      }
    });
  }, []);

  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const validationErrors = validateProductForm(formData);
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }
    onSubmit(formData);
  };

  return (
    <form id="product-form" onSubmit={handleSubmit} className="w-full space-y-4">
      {/* Section 1: General Details */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 border-b border-slate-100 pb-2">
          General Information
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Name */}
          <div className="form-control sm:col-span-2">
            <label className="label py-0.5 mb-0.5">
              <span className="label-text font-bold text-xs text-slate-700">
                Product Name <span className="text-error">*</span>
              </span>
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g. Steel Rods (12mm)"
              className={`input input-sm input-bordered bg-white border border-slate-300 rounded-lg text-xs font-medium ${
                errors.name ? 'input-error' : ''
              }`}
            />
            {errors.name && <span className="text-error text-[11px] mt-0.5">{errors.name}</span>}
          </div>

          {/* SKU / Code */}
          <div className="form-control">
            <label className="label py-0.5 mb-0.5">
              <span className="label-text font-bold text-xs text-slate-700">
                SKU / Product Code <span className="text-error">*</span>
              </span>
            </label>
            <input
              type="text"
              value={formData.sku}
              onChange={(e) => setFormData({ ...formData, sku: e.target.value.toUpperCase() })}
              placeholder="e.g. RAW-STL-12MM"
              className={`input input-sm input-bordered uppercase bg-white border border-slate-300 rounded-lg font-mono text-xs font-bold ${
                errors.sku ? 'input-error' : ''
              }`}
            />
            {errors.sku && <span className="text-error text-[11px] mt-0.5">{errors.sku}</span>}
          </div>

          {/* Category */}
          <div className="form-control">
            <label className="label py-0.5 mb-0.5">
              <span className="label-text font-bold text-xs text-slate-700">
                Category <span className="text-error">*</span>
              </span>
            </label>
            <select
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              className="select select-sm select-bordered bg-white border border-slate-300 rounded-lg text-xs font-medium"
            >
              {categoriesList.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          {/* Unit of Measure */}
          <div className="form-control">
            <label className="label py-0.5 mb-0.5">
              <span className="label-text font-bold text-xs text-slate-700">
                Unit of Measure <span className="text-error">*</span>
              </span>
            </label>
            <select
              value={formData.unitOfMeasure}
              onChange={(e) => setFormData({ ...formData, unitOfMeasure: e.target.value })}
              className="select select-sm select-bordered bg-white border border-slate-300 rounded-lg text-xs font-medium"
            >
              {UNITS_OF_MEASURE.map((u) => (
                <option key={u} value={u}>
                  {u}
                </option>
              ))}
            </select>
          </div>

          {/* Description */}
          <div className="form-control sm:col-span-3">
            <label className="label py-0.5 mb-0.5">
              <span className="label-text font-bold text-xs text-slate-700">Description / Specifications</span>
            </label>
            <input
              type="text"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Specifications, supplier notes or storage instructions..."
              className="input input-sm input-bordered bg-white border border-slate-300 rounded-lg text-xs font-medium"
            />
          </div>
        </div>
      </div>

      {/* Section 2: Stock & Reordering Rules */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 border-b border-slate-100 pb-2">
          Stock & Inventory Reordering
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {!isEditing && (
            <div className="form-control">
              <label className="label py-0.5 mb-0.5">
                <span className="label-text font-bold text-xs text-slate-700">
                  Initial Stock Quantity
                </span>
              </label>
              <input
                type="number"
                min="0"
                value={formData.currentStock ?? ''}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    currentStock: e.target.value === '' ? 0 : Number(e.target.value),
                  })
                }
                className="input input-sm input-bordered bg-white border border-slate-300 rounded-lg text-xs font-medium"
              />
            </div>
          )}

          <div className="form-control">
            <label className="label py-0.5 mb-0.5">
              <span className="label-text font-bold text-xs text-slate-700">
                Min Stock Alert Threshold
              </span>
            </label>
            <input
              type="number"
              min="0"
              value={formData.minStockAlert ?? ''}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  minStockAlert: e.target.value === '' ? 0 : Number(e.target.value),
                })
              }
              className="input input-sm input-bordered bg-white border border-slate-300 rounded-lg text-xs font-medium"
            />
          </div>

          {!isEditing && (
            <div className="form-control">
              <label className="label py-0.5 mb-0.5">
                <span className="label-text font-bold text-xs text-slate-700">
                  Initial Staging Location
                </span>
              </label>
              <select
                value={formData.initialLocation}
                onChange={(e) => setFormData({ ...formData, initialLocation: e.target.value })}
                className="select select-sm select-bordered bg-white border border-slate-300 rounded-lg text-xs font-medium"
              >
                {locationsList.map((loc) => (
                  <option key={loc} value={loc}>
                    {loc}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>

      {/* Section 3: Pricing & Valuation */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 border-b border-slate-100 pb-2">
          Pricing & Valuation
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="form-control">
            <label className="label py-0.5 mb-0.5">
              <span className="label-text font-bold text-xs text-slate-700">
                Cost Price ($)
              </span>
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={formData.costPrice ?? ''}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  costPrice: e.target.value === '' ? undefined : Number(e.target.value),
                })
              }
              placeholder="0.00"
              className="input input-sm input-bordered bg-white border border-slate-300 rounded-lg text-xs font-medium"
            />
          </div>

          <div className="form-control">
            <label className="label py-0.5 mb-0.5">
              <span className="label-text font-bold text-xs text-slate-700">
                Selling Price ($)
              </span>
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={formData.sellingPrice ?? ''}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  sellingPrice: e.target.value === '' ? undefined : Number(e.target.value),
                })
              }
              placeholder="0.00"
              className="input input-sm input-bordered bg-white border border-slate-300 rounded-lg text-xs font-medium"
            />
          </div>
        </div>
      </div>
    </form>
  );
};
