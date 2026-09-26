import { ProductFormData } from './types';

export const validateProductForm = (data: ProductFormData): Record<string, string> => {
  const errors: Record<string, string> = {};

  if (!data.name?.trim()) {
    errors.name = 'Product name is required';
  }

  if (!data.sku?.trim()) {
    errors.sku = 'SKU / Product code is required';
  } else if (!/^[A-Z0-9-_]+$/i.test(data.sku.trim())) {
    errors.sku = 'SKU should only contain alphanumeric characters, hyphens, and underscores';
  }

  if (!data.category?.trim()) {
    errors.category = 'Category is required';
  }

  if (!data.unitOfMeasure?.trim()) {
    errors.unitOfMeasure = 'Unit of measure is required';
  }

  if (data.currentStock < 0) {
    errors.currentStock = 'Stock cannot be negative';
  }

  if (data.minStockAlert < 0) {
    errors.minStockAlert = 'Minimum stock alert cannot be negative';
  }

  return errors;
};
