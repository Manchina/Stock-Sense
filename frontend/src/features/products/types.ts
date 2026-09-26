export interface ProductFormData {
  name: string;
  sku: string;
  category: string;
  unitOfMeasure: string;
  currentStock: number;
  minStockAlert: number;
  costPrice?: number;
  sellingPrice?: number;
  description?: string;
  initialLocation?: string;
}

export interface ProductFilterState {
  search: string;
  category: string;
  stockStatus: 'all' | 'in_stock' | 'low_stock' | 'out_of_stock';
}
