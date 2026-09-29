import {
  ConfirmedInvoice,
  NewBatch,
  NewProduct,
  ProductBatch,
  ProductRecord,
  User,
} from "../types";

export type HelperHoaStore = {
  // Read operations
  products(activeOnly?: boolean): Promise<ProductRecord[]>;
  product(id: string): Promise<ProductRecord | undefined>;
  user(id: string): Promise<User | undefined>;

  // Write operations
  sellProduct(id: string, quantity: number, batchNumber?: string): Promise<ProductRecord | undefined>;
  createBatch(productId: string, batch: NewBatch): Promise<ProductBatch>;
  createProduct(product: NewProduct): Promise<ProductRecord>;

  // Invoice ingestion
  productsByName(name: string): Promise<ProductRecord[]>;
  createInvoice(invoice: ConfirmedInvoice): Promise<string>;
};