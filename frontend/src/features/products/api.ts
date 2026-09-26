import { Product } from '../../types/common';
import { INITIAL_PRODUCTS } from '../../lib/constants';
import { ProductFormData } from './types';

// Mock in-memory store for client demo & state persistence
let mockProducts: Product[] = [...INITIAL_PRODUCTS];

export const productsApi = {
  getAll: async (): Promise<Product[]> => {
    return new Promise((res) => setTimeout(() => res([...mockProducts]), 200));
  },

  getById: async (id: string): Promise<Product | undefined> => {
    return new Promise((res) => {
      setTimeout(() => res(mockProducts.find((p) => p.id === id)), 150);
    });
  },

  create: async (data: ProductFormData): Promise<Product> => {
    const newProduct: Product = {
      id: `prod-${Date.now()}`,
      name: data.name,
      sku: data.sku.toUpperCase(),
      category: data.category,
      unitOfMeasure: data.unitOfMeasure,
      currentStock: data.currentStock || 0,
      minStockAlert: data.minStockAlert || 0,
      costPrice: data.costPrice,
      sellingPrice: data.sellingPrice,
      description: data.description,
      locationStock: data.initialLocation
        ? { [data.initialLocation]: data.currentStock }
        : {},
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    mockProducts.unshift(newProduct);
    return newProduct;
  },

  update: async (id: string, data: Partial<ProductFormData>): Promise<Product> => {
    const idx = mockProducts.findIndex((p) => p.id === id);
    if (idx === -1) throw new Error('Product not found');

    const updated: Product = {
      ...mockProducts[idx],
      ...data,
      updatedAt: new Date().toISOString(),
    };
    mockProducts[idx] = updated;
    return updated;
  },

  delete: async (id: string): Promise<void> => {
    mockProducts = mockProducts.filter((p) => p.id !== id);
  },
};
