import { getFirestore } from 'firebase-admin/firestore';
// ==========================================
// TYPES & INTERFACES
// ==========================================

export type ProductBatch = {
  batchNumber: string;
  quantity: number;
  costPrice: number;
  expirationDate: Date;
  receivedDate: Date;
};

export type ProductRecord = {
  id: string;
  sku: string;
  name: string;
  category: string;
  description: string;
  
  costPrice: number;
  sellingPrice: number;
  taxRate: number;
  
  totalStock: number;
  reorderPoint: number;
  unitOfMeasure: string;
  
  totalSold: number;
  salesVelocity: number;
  tags: string[];
  status: 'active' | 'discontinued' | 'out_of_stock';
  
  batches: ProductBatch[]; 
};

export type User = {
  id: string;
  name: string;
  lastName: string;
  role: 'admin' | 'manager' | 'cashier';
  email: string;
  phone: string;
};

export type NewProduct = Omit<ProductRecord, 'id' | 'totalStock' | 'totalSold' | 'salesVelocity' | 'batches'>;
export type NewBatch = ProductBatch;



