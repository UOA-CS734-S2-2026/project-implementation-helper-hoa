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