import { ConfirmedInvoice, InvoiceRecord, NewBatch, NewProduct, ProductBatch, ProductRecord, User, VendorRecord } from "../types";

export type HelperHoaStore = {
  // Read operations
  products(filters?: { activeOnly?: boolean; name?: string; category?: string }): Promise<ProductRecord[]>;
  product(id: string): Promise<ProductRecord | undefined>;
  user(id: string): Promise<User | undefined>;
  vendors(): Promise<VendorRecord[]>;
  invoices(): Promise<InvoiceRecord[]>;


  // Write operations
  sellProduct(id: string, quantity: number, batchNumber?: string): Promise<ProductRecord | undefined>;
  createBatch(productId: string, batch: NewBatch): Promise<ProductBatch>;
  createProduct(product: NewProduct): Promise<ProductRecord>;

  // Invoice ingestion. Scanned and app-confirmed invoices are both stored in
  // the same `invoices` collection, so they use distinct method names.
  productsByName(name: string): Promise<ProductRecord[]>;
  createConfirmedInvoice(invoice: ConfirmedInvoice): Promise<string>;
  createInvoiceFromScanner(rawScannerData: any, resolvedVendorId: string): Promise<InvoiceRecord>;
  createUser(user: User): Promise<User>;
  deleteUser(id: string): Promise<void>;
  
  // Update and Delete operations
  updateProduct(id: string, updates: Partial<NewProduct>): Promise<ProductRecord>;
  updateBatch(productId: string, batchNumber: string, updates: Partial<NewBatch>): Promise<ProductBatch>;
  deleteProduct(id: string): Promise<void>;
};