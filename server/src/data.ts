import { getFirestore } from 'firebase-admin/firestore';
// ==========================================
// TYPES & INTERFACES
// ==========================================

export type ProductBatch = {
  batchNumber: string;
  quantity: number;
  costPrice: number;
  expirationDate: Date;
  receivedDate: Date;
};

export type ProductRecord = {
  id: string;
  sku: string;
  name: string;
  category: string;
  description: string;
  
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

export type NewProduct = Omit<ProductRecord, 'id' | 'totalStock' | 'totalSold' | 'salesVelocity' | 'batches'>;
export type NewBatch = ProductBatch;

export type HelperHoaStore = {
  // Read operations
  products(activeOnly?: boolean): Promise<ProductRecord[]>;
  product(id: string): Promise<ProductRecord | undefined>;
  user(id: string): Promise<User | undefined>;

  // Write operations
  sellProduct(id: string, quantity: number, batchNumber?: string): Promise<ProductRecord | undefined>;
  createBatch(productId: string, batch: NewBatch): Promise<ProductBatch>;
  createProduct(product: NewProduct): Promise<ProductRecord>;
};


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

/**
 * Prepares a batch to be saved, converting native JS Dates into Firestore Timestamps.
 */
export function toFirestoreBatch(batch: ProductBatch) {
  return {
    ...batch,
    expirationDate: FirebaseFirestore.Timestamp.fromDate(batch.expirationDate),
    receivedDate: FirebaseFirestore.Timestamp.fromDate(batch.receivedDate),
  };
}


// ==========================================
// IMPLEMENTATION CLASS
// ==========================================

export class FirebaseHoaStore implements HelperHoaStore {
  private db = getFirestore();

  // Returns products in alphabetical order
  async products(activeOnly?: boolean): Promise<ProductRecord[]> {
    let query: FirebaseFirestore.Query = this.db.collection('products');

    if (activeOnly) {
      query = query.where('status', '==', 'active');
    }

    // Sorts A-Z alphabetically. Requires a composite index in Firebase if activeOnly is true.
    query = query.orderBy('name', 'asc');

    const snapshot = await query.get();
    return snapshot.docs.map((doc) => toProductRecord(doc));
  }

  async product(id: string): Promise<ProductRecord | undefined> {
    const doc = await this.db.collection('products').doc(id).get();
    return doc.exists ? toProductRecord(doc) : undefined;
  }

  async user(id: string): Promise<User | undefined> {
    const doc = await this.db.collection('users').doc(id).get();
    return doc.exists ? toUser(doc) : undefined;
  }

  async createProduct(product: NewProduct): Promise<ProductRecord> {
    const firestoreData = toFirestoreProduct(product);
    
    const docRef = await this.db.collection('products').add(firestoreData);
    const doc = await docRef.get();
    
    return toProductRecord(doc);
  }

  async createBatch(productId: string, batch: NewBatch): Promise<ProductBatch> {
    const productRef = this.db.collection('products').doc(productId);
    const firestoreBatch = toFirestoreBatch(batch);

    await productRef.update({
      batches: FirebaseFirestore.FieldValue.arrayUnion(firestoreBatch),
      totalStock: FirebaseFirestore.FieldValue.increment(batch.quantity)
    });

    return batch;
  }

  async sellProduct(id: string, quantity: number, batchNumber?: string): Promise<ProductRecord | undefined> {
    // This requires a Firestore transaction to read batches, deduct the right amount, 
    // and write back safely. Kept as stub based on your interface.
    throw new Error('Not implemented: requires FIFO batch deduction logic');
  }
}