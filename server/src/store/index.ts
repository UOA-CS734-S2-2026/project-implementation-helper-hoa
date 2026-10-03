import {
  ConfirmedInvoice,
  InvoiceRecord,
  NewBatch,
  NewProduct,
  NewSale,
  NewUser,
  NewVendor,
  ProductBatch,
  ProductRecord,
  SaleLog,
  SaleRecord,
  User,
  VendorRecord,
} from '../types';

export type HelperHoaStore = {
  // Read operations
  products(filters?: { activeOnly?: boolean; name?: string; category?: string }): Promise<ProductRecord[]>;
  product(id: string): Promise<ProductRecord | undefined>;
  productBySku(sku: string): Promise<ProductRecord | undefined>;
  users(): Promise<User[]>;
  user(id: string): Promise<User | undefined>;
  invoices(): Promise<InvoiceRecord[]>;
  vendors(): Promise<VendorRecord[]>;
  vendor(id: string): Promise<VendorRecord | undefined>;
  sales(): Promise<SaleRecord[]>;
  vendorName(id: string): Promise<string | undefined>;

  // Write operations
  // Passing a `sale` also appends a document to the `sales` collection in the
  // same transaction, so the stock deduction and the sale history cannot drift
  // apart. Omit it for stock adjustments that are not customer sales.
  sellProduct(id: string, quantity: number, batchNumber?: string, sale?: SaleLog): Promise<ProductRecord | undefined>;
  createBatch(productId: string, batch: NewBatch): Promise<NewBatch>;
  createProduct(product: NewProduct): Promise<ProductRecord>;

  // Invoice ingestion. Scanned and app-confirmed invoices are both stored in
  // the same `invoices` collection, so they use distinct method names.
  productsByName(name: string): Promise<ProductRecord[]>;
  createConfirmedInvoice(invoice: ConfirmedInvoice): Promise<string>;
  createInvoiceFromScanner(rawScannerData: any, resolvedVendorId: string): Promise<InvoiceRecord>;

  /**
   * Writes the Firestore profile for a user whose Firebase Auth record already
   * exists. The document id is the Auth uid, which the caller owns so it can
   * roll the Auth user back if this write fails.
   */
  createUser(user: User): Promise<User>;
  deleteUser(id: string): Promise<void>;

  /**
   * Creates the Firebase Auth record and the Firestore profile together, rolling
   * back the Auth user if the profile write fails. Distinct from createUser
   * above, which must not create a second Auth record for an existing user.
   */
  createUserWithAuth(user: NewUser): Promise<User>;
  updateUser(id: string, user: Partial<User>): Promise<User>;

  createVendor(vendor: NewVendor): Promise<VendorRecord>;
  updateVendor(id: string, vendor: Partial<NewVendor>): Promise<VendorRecord>;
  deleteVendor(id: string): Promise<void>;
  recordSale(input: NewSale): Promise<SaleRecord>;

  // Update and Delete operations
  updateProduct(id: string, updates: Partial<NewProduct>): Promise<ProductRecord>;
  updateBatch(productId: string, batchNumber: string, updates: Partial<NewBatch>): Promise<ProductBatch>;
  deleteProduct(id: string): Promise<void>;
};