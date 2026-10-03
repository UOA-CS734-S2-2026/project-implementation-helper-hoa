import { getFirestore } from 'firebase-admin/firestore';
// ==========================================
// TYPES & INTERFACES
// ==========================================

export type VendorRecord = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
};

export type NewVendor = Omit<VendorRecord, 'id'>;

export type ProductBatch = {
  batchNumber: string;
  quantity: number;
  costPrice: number;
  expirationDate: Date;
  receivedDate: Date;
  vendorId: string;
  invoiceNumber: string;
};

export type ProductRecord = {
  id: string;
  sku: string;
  barcode: string | null;
  name: string;
  category: string;
  description: string;
  images: string[] | null;
  
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

export type NewUser = Omit<User, 'id'> & { password: string };

export type SaleRecord = {
  id: string;
  productId: string;
  sku: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  unit: string;
  totalPrice: number;
  paymentMethod: string;
  soldBy: string;
  soldAt: string;
};

// Sale metadata attached to a stock deduction. The cashier may override the
// unit of measure and the unit price at the till, so both are recorded on the
// sale document rather than being read back off the product.
export type SaleLog = {
  unitPrice: number;
  unit?: string;
  paymentMethod?: string;
  soldBy?: string;
};

export type NewSale = {
  productId?: string;
  sku?: string;
  quantity: number;
  unitPrice: number;
  unit?: string;
  paymentMethod: string;
  soldBy: string;
};

export type InvoiceLineItem = {
  productName: string;
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
  category: 'Maintenance' | 'Repair' | 'Labor' | 'Materials' | 'Professional Services' | 'Utilities' | 'Other';
};

export type InvoiceRecord = {
  id: string;
  invoiceNumber: string;
  invoiceDate: Date | null;
  dueDate: Date | null;
  
  vendorId: string; 
  vendorSnapshot: {
    name: string;
    email: string | null;
    phone: string | null;
    address: string | null;
  };
  
  billTo: {
    propertyAddress: string | null;
    contactName: string | null;
  };
  
  lineItems: InvoiceLineItem[];
  
  subtotal: number;
  tax: number;
  taxRate: number | null;
  discount: number | null;
  totalAmount: number;
  
  paymentTerms: string | null;
  paymentMethod: string | null;
  purchaseOrder: string | null;
  notes: string | null;
};



// totalStock / totalSold / batches are derived state. Callers that upsert a
// bare product (invoice confirmation) omit them and toFirestoreProduct defaults
// them; the admin UI may supply an opening stock explicitly.
export type NewProduct = Omit<ProductRecord, 'id' | 'totalStock' | 'totalSold' | 'salesVelocity' | 'batches' | 'barcode'>
  & Partial<Pick<ProductRecord, 'totalStock' | 'totalSold' | 'batches' | 'barcode'>>;
// Non-stock batches carry no expiry; toFirestoreBatch omits the field entirely
// rather than writing undefined, which Firestore rejects.
export type NewBatch = Omit<ProductBatch, 'expirationDate'> & { expirationDate?: Date };

// Payload for confirming an invoice: each line item upserts a product + batch.
export type ConfirmedInvoiceItem = {
  lineNumber?: number;
  name: string;
  quantity: number;
  unit?: string;
  costPrice: number;
  sellingPrice?: number;
  expiryDate?: string | null;
  category?: string;
  description?: string;
};

export type ConfirmedInvoice = {
  id?: string;
  supplierName: string;
  invoiceNumber: string;
  receivedDate: string;
  confirmedAt?: string;
  items: ConfirmedInvoiceItem[];
};

export type ConfirmResultItem = {
  productId: string;
  created: boolean;
  name: string;
};


export type InventoryAlertSeverity = 'urgent' | 'very_low' | 'low' | 'expiring_soon';

export type InventoryAlertReason = 'out_of_stock' | 'low_stock' | 'expiring_soon';

export type InventoryAlert = {
  productId: string;
  productName: string;
  vendorName: string | null;
  totalSold: number;

  quantityRemaining: number;
  unitOfMeasure: string;
  reorderPoint: number;

  nearestExpiryDate: Date | null;
  daysUntilExpiry: number | null;

  severity: InventoryAlertSeverity;
  reasons: InventoryAlertReason[];
};

export type InventoryAlertResponse = Omit<
  InventoryAlert,
  'nearestExpiryDate'
> & {
  nearestExpiryDate: string | null;
};