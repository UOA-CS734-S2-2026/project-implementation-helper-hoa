import { DocumentSnapshot, Timestamp } from 'firebase-admin/firestore';
import { ConfirmedInvoice, InvoiceLineItem, InvoiceRecord, NewProduct, ProductBatch, ProductRecord, User } from "../types";

// ==========================================
// FIRESTORE MAPPERS (READ)
// Converts database snapshots into App Types
// ==========================================


export function toDate(value: unknown): Date | null {
  if (value instanceof Timestamp) return value.toDate();
  if (value instanceof Date) return value;
  if (typeof value === 'string' && value.trim()) {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }
  return null;
}

export function toProductBatch(data: any): ProductBatch {
  return {
    batchNumber: data.batchNumber,
    quantity: data.quantity,
    costPrice: data.costPrice,
    expirationDate: toDate(data.expirationDate),
    receivedDate: toDate(data.receivedDate) ?? new Date(),
    vendorId: data.vendorId,
    invoiceNumber: data.invoiceNumber,
  };
}

export function toProductRecord(doc: DocumentSnapshot): ProductRecord {
  const data = doc.data() || {}; // doc.data() contains the fields in Firestore
  
  return {
    id: doc.id,
    sku: data.sku,
    barcode: data.barcode ?? null,
    name: data.name,
    category: data.category,
    description: data.description,
    costPrice: data.costPrice,
    sellingPrice: data.sellingPrice,
    taxRate: data.taxRate,
    totalStock: data.totalStock,
    reorderPoint: data.reorderPoint,
    unitOfMeasure: data.unitOfMeasure,
    totalSold: data.totalSold,
    salesVelocity: data.salesVelocity,
    tags: data.tags || [],
    status: data.status,
    images: data.images || [],
    batches: Array.isArray(data.batches) 
      ? data.batches.map((batch: any) => toProductBatch(batch))
      : []
  };
}

export function toUser(doc: DocumentSnapshot): User {
  const data = doc.data() || {};
  
  return {
    id: doc.id,
    name: data.name ?? '',
    lastName: data.lastName ?? '',
    role: data.role ?? 'cashier',
    email: data.email ?? '',
    phone: data.phone ?? '',
  };
}

export function toInvoiceRecord(doc: DocumentSnapshot): InvoiceRecord {
  const data = doc.data() || {};
  
  return {
    id: doc.id,
    invoiceNumber: data.invoiceNumber,
    invoiceDate: toDate(data.invoiceDate),
    dueDate: toDate(data.dueDate),
    
    vendorId: data.vendorId,
    vendorSnapshot: data.vendorSnapshot || { name: 'Unknown' },
    billTo: data.billTo || {},
    lineItems: data.lineItems || [],
    
    subtotal: data.subtotal || 0,
    tax: data.tax || 0,
    taxRate: data.taxRate || null,
    discount: data.discount || null,
    totalAmount: data.totalAmount || 0,
    
    paymentTerms: data.paymentTerms || null,
    paymentMethod: data.paymentMethod || null,
    purchaseOrder: data.purchaseOrder || null,
    notes: data.notes || null,
  };
}


// ==========================================
// FIRESTORE MAPPERS (WRITE)
// Prepares App Types to be saved to Firestore
// ==========================================


export function toFirestoreProduct(product: NewProduct) {
  return {
    ...product,
    // Ensure initial values are set correctly for the database
    totalStock: product.totalStock || 0,
    totalSold: product.totalSold || 0,
    salesVelocity: 0,
    batches: (product.batches || []).map(toFirestoreBatch),
    images: product.images || [],
    // Status must be one of your union string types, not a boolean
    status: product.status || 'out_of_stock' 
  };
}

export function toFirestoreBatch(batch: any) {
  const formattedBatch = { ...batch };

  // Safely handle receivedDate (default to current time if missing)
  formattedBatch.receivedDate = batch.receivedDate 
    ? Timestamp.fromDate(new Date(batch.receivedDate)) 
    : Timestamp.now();

  // Safely handle optional expirationDate
  if (batch.expirationDate) {
    formattedBatch.expirationDate = Timestamp.fromDate(new Date(batch.expirationDate));
  } else {
    // Delete it so Firestore doesn't throw an error trying to save an undefined field
    delete formattedBatch.expirationDate; 
  }

  return formattedBatch;
}

/**
 * Prepares a partial product update for Firestore. Batch dates must be stored
 * as Timestamps so reads (toProductBatch) can `.toDate()` them; the admin
 * panel sends dates as plain strings, so they are converted here the same way
 * toFirestoreBatch does on the create path.
 */
export function toFirestoreProductPatch(updates: Partial<NewProduct>): Record<string, unknown> {
  const patch: Record<string, unknown> = { ...updates };
  if (Array.isArray(updates.batches)) {
    patch.batches = updates.batches.map(toFirestoreBatch);
  }
  return patch;
}

export function toFirestoreInvoice(
  rawScannerData: any, 
  resolvedVendorId: string
) {
  const parseDateToTimestamp = (dateString: string | null) => {
    if (!dateString) return null;
    const date = new Date(dateString);
    return Timestamp.fromDate(date);
  };

  return {
    invoiceNumber: rawScannerData.invoice_number, // required field from schema
    invoiceDate: parseDateToTimestamp(rawScannerData.invoice_date),
    dueDate: parseDateToTimestamp(rawScannerData.due_date),
    
    vendorId: resolvedVendorId,
    vendorSnapshot: {
      name: rawScannerData.vendor.name, // required field from schema
      email: rawScannerData.vendor.email || null,
      phone: rawScannerData.vendor.phone || null,
      address: rawScannerData.vendor.address || null,
    },
    
    billTo: {
      propertyAddress: rawScannerData.bill_to?.property_address || null,
      contactName: rawScannerData.bill_to?.contact_name || null,
    },
    
    lineItems: (rawScannerData.line_items || []).map((item: any) => ({
      productName: item.product_name, // required field
      description: item.description || '',
      quantity: item.quantity, // required field
      unitPrice: item.unit_price, // required field
      total: item.total || 0,
      category: item.category || 'Other',
    })),
    
    subtotal: rawScannerData.subtotal || 0,
    tax: rawScannerData.tax || 0,
    taxRate: rawScannerData.tax_rate || null,
    discount: rawScannerData.discount || null,
    totalAmount: rawScannerData.total_amount, // required field
    
    paymentTerms: rawScannerData.payment_terms || null,
    paymentMethod: rawScannerData.payment_method || null,
    purchaseOrder: rawScannerData.purchase_order || null,
    notes: rawScannerData.notes || null,
  };
}

/**
 * Converts an invoice the user confirmed in the app into the same Firestore
 * layout that toFirestoreInvoice produces for scanned invoices. Keeping one
 * shape means toInvoiceRecord and the invoices() query can read both kinds back
 * without special-casing.
 *
 * The confirmed payload arrives in camelCase with supplierName/items rather
 * than the scanner's snake_case vendor/line_items, which is why it needs its
 * own mapper instead of reusing toFirestoreInvoice.
 */
export function toFirestoreConfirmedInvoice(invoice: ConfirmedInvoice) {
  const lineItems: InvoiceLineItem[] = invoice.items.map((item) => {
    const unitPrice = typeof item.costPrice === 'number' ? item.costPrice : 0;
    const quantity = typeof item.quantity === 'number' ? item.quantity : 0;

    return {
      productName: item.name,
      description: item.description || '',
      quantity,
      unitPrice,
      total: unitPrice * quantity,
      // toFirestoreInvoice falls back to 'Other' the same way. The wider union
      // type on InvoiceLineItem means an unchecked cast would let an arbitrary
      // string through into Firestore.
      category: (item.category || 'Other') as InvoiceLineItem['category'],
    };
  });

  const subtotal = lineItems.reduce((sum, line) => sum + line.total, 0);
  const parseDate = (value?: string | null): Timestamp | null => {
    if (!value) return null;
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : Timestamp.fromDate(parsed);
  };

  return {
    invoiceNumber: invoice.invoiceNumber,
    // Scanned invoices store their date as invoiceDate, and invoices() sorts on
    // it, so the received date is what the confirmed invoice carries over.
    invoiceDate: parseDate(invoice.receivedDate),
    dueDate: null,

    vendorId: '',
    vendorSnapshot: {
      name: invoice.supplierName,
      email: null,
      phone: null,
      address: null,
    },

    billTo: {
      propertyAddress: null,
      contactName: null,
    },

    lineItems,

    subtotal,
    tax: 0,
    taxRate: null,
    discount: null,
    totalAmount: subtotal,

    paymentTerms: null,
    paymentMethod: null,
    purchaseOrder: null,
    // confirmedAt is kept so it is not lost when the rest is normalised into
    // the scanner layout.
    notes: `Confirmed at ${invoice.confirmedAt ?? new Date().toISOString()}`,
  };
}
