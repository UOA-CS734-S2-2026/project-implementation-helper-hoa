import { NewProduct, ProductBatch, ProductRecord, User } from "../types";


// ==========================================
// FIRESTORE MAPPERS (READ)
// Converts database snapshots into App Types
// ==========================================


export function toProductBatch(data: any): ProductBatch {
  return {
    batchNumber: data.batchNumber,
    quantity: data.quantity,
    costPrice: data.costPrice,
    expirationDate: data.expirationDate ? data.expirationDate.toDate() : new Date(), 
    receivedDate: data.receivedDate ? data.receivedDate.toDate() : new Date(),
  };
}

export function toProductRecord(doc: FirebaseFirestore.DocumentSnapshot): ProductRecord {
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
    batches: Array.isArray(data.batches) 
      ? data.batches.map((batch: any) => toProductBatch(batch))
      : []
  };
}

export function toUser(doc: FirebaseFirestore.DocumentSnapshot): User {
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
    // Status must be one of your union string types, not a boolean
    status: product.status || 'out_of_stock' 
  };
}

export function toFirestoreBatch(batch: ProductBatch) {
  return {
    ...batch,
    expirationDate: FirebaseFirestore.Timestamp.fromDate(batch.expirationDate),
    receivedDate: FirebaseFirestore.Timestamp.fromDate(batch.receivedDate),
  };
}
