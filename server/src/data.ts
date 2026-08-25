// Starting point for what should be saved server side, feel free to give feedback

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

// Used TypeScript's `Omit` utility to define creation objects 
export type NewProduct = Omit<ProductRecord, 'id' | 'totalStock' | 'totalSold' | 'salesVelocity' | 'batches'>;
export type NewBatch = ProductBatch;

export type HelperHoaStore = {
  // Read operations
  products(activeOnly?: boolean): Promise<ProductRecord[]>;
  product(id: string): Promise<ProductRecord | undefined>;
  user(id: string): Promise<User | undefined>;

  // Write operations
  sellProduct(id: string, quantity: number, batchNumber?: string): Promise<ProductRecord | undefined>;
  createBatch(productId: string, batch: NewBatch): Promise<ProductBatch>;
  createProduct(product: NewProduct): Promise<ProductRecord>;
};