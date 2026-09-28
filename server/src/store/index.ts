import {
  NewBatch,
  NewProduct,
  NewSale,
  NewUser,
  NewVendor,
  ProductBatch,
  ProductRecord,
  SaleRecord,
  User,
  VendorRecord,
} from '../types';

export type HelperHoaStore = {
  // Read operations
  products(activeOnly?: boolean): Promise<ProductRecord[]>;
  product(id: string): Promise<ProductRecord | undefined>;
  productBySku(sku: string): Promise<ProductRecord | undefined>;
  users(): Promise<User[]>;
  user(id: string): Promise<User | undefined>;
  vendors(): Promise<VendorRecord[]>;
  vendor(id: string): Promise<VendorRecord | undefined>;
  sales(): Promise<SaleRecord[]>;
  vendorName(id: string): Promise<string | undefined>;

  // Write operations
  sellProduct(id: string, quantity: number, batchNumber?: string): Promise<ProductRecord | undefined>;
  createBatch(productId: string, batch: NewBatch): Promise<ProductBatch>;
  createProduct(product: NewProduct): Promise<ProductRecord>;
  updateProduct(id: string, product: Partial<NewProduct>): Promise<ProductRecord>;
  deleteProduct(id: string): Promise<void>;
  createUser(user: NewUser): Promise<User>;
  updateUser(id: string, user: Partial<User>): Promise<User>;
  deleteUser(id: string): Promise<void>;
  createVendor(vendor: NewVendor): Promise<VendorRecord>;
  updateVendor(id: string, vendor: Partial<NewVendor>): Promise<VendorRecord>;
  deleteVendor(id: string): Promise<void>;
  recordSale(input: NewSale): Promise<SaleRecord>;
};