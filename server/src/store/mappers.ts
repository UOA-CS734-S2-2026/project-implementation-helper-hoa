import { DocumentSnapshot, Timestamp } from 'firebase-admin/firestore';
import { InvoiceRecord, NewProduct, ProductBatch, ProductRecord, User } from "../types";

// ==========================================
// FIRESTORE MAPPERS (READ)
// Converts database snapshots into App Types
// ==========================================


export function toProductBatch(data: any): ProductBatch {
  return {
    batchNumber: data.batchNumber,
    quantity: data.quantity,
    costPrice: data.costPrice,
    expirationDate: data.expirationDate ? data.expirationDate.toDate() : null as unknown as Date,
    receivedDate: data.receivedDate ? data.receivedDate.toDate() : new Date(),
    vendorId: data.vendorId,
    invoiceNumber: data.invoiceNumber,
  };
}

export function toProductRecord(doc: DocumentSnapshot): ProductRecord {
  const data = doc.data() || {}; // doc.data() contains the fields in Firestore
  
  return {
    id: doc.id,
    sku: data.sku,
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
    name: data.name,
    lastName: data.lastName,
    role: data.role, 
    email: data.email,
    phone: data.phone || "",
  };
}

export function toInvoiceRecord(doc: DocumentSnapshot): InvoiceRecord {
  const data = doc.data() || {};
  
  return {
    id: doc.id,
    invoiceNumber: data.invoiceNumber,
    invoiceDate: data.invoiceDate ? data.invoiceDate.toDate() : null,
    dueDate: data.dueDate ? data.dueDate.toDate() : null,
    
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
    totalStock: 0,
    totalSold: 0,
    salesVelocity: 0,
    batches: [],
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
