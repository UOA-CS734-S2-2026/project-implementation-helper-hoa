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



export type NewProduct = Omit<ProductRecord, 'id' | 'totalStock' | 'totalSold' | 'salesVelocity' | 'batches'>;
export type NewBatch = ProductBatch;

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



