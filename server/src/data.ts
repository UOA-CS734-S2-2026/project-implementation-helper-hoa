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

// function to return the products in alphabetical order
export function toDocument(record: ProductRecord, order: number) {
  return { ...record, status: record.totalStock > 0, order };
}

export function toProductRecord(doc: any): ProductRecord {
  return {
    id: doc._id.toString(),
    sku: doc.sku,
    name: doc.name,
    category: doc.category,
    description: doc.description,
    costPrice: doc.costPrice,
    sellingPrice: doc.sellingPrice,
    taxRate: doc.taxRate,
    totalStock: doc.totalStock,
    reorderPoint: doc.reorderPoint,
    unitOfMeasure: doc.unitOfMeasure,
    totalSold: doc.totalSold,
    salesVelocity: doc.salesVelocity,
    tags: doc.tags || [],
    status: doc.status,
    batches: doc.batches || [] 
  };
}

export function toUser(doc: any): User {
  return {
    id: doc._id.toString(),
    name: doc.name,
    lastName: doc.lastName,
    role: doc.role, 
    email: doc.email,
    phone: doc.phone || "",
  };
}

export function toProductBatch(doc: any): ProductBatch {
  return {
    batchNumber: doc.batchNumber,
    quantity: doc.quantity,
    costPrice: doc.costPrice,
    expirationDate: new Date(doc.expirationDate), 
    receivedDate: new Date(doc.receivedDate),
  };
}