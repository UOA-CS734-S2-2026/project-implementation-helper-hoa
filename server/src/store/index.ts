import { InvoiceRecord, NewBatch, NewProduct, ProductBatch, ProductRecord, User } from "../types";

export type HelperHoaStore = {
  // Read operations
  products(filters?: { activeOnly?: boolean; name?: string; category?: string }): Promise<ProductRecord[]>;
  product(id: string): Promise<ProductRecord | undefined>;
  user(id: string): Promise<User | undefined>;
  invoices(): Promise<InvoiceRecord[]>;


  // Write operations
  sellProduct(id: string, quantity: number, batchNumber?: string): Promise<ProductRecord | undefined>;
  createBatch(productId: string, batch: NewBatch): Promise<ProductBatch>;
  createProduct(product: NewProduct): Promise<ProductRecord>;
  createInvoice(rawScannerData: any, resolvedVendorId: string): Promise<InvoiceRecord>;
  
  // Update and Delete operations
  updateProduct(id: string, updates: Partial<NewProduct>): Promise<ProductRecord>;
  updateBatch(productId: string, batchNumber: string, updates: Partial<NewBatch>): Promise<ProductBatch>;
  deleteProduct(id: string): Promise<void>;
};