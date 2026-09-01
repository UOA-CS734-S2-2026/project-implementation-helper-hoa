import { Query, FieldValue } from 'firebase-admin/firestore';
import { db } from '../config/firebase'; // Adjust path if your firebase.ts is located elsewhere
import {
    ProductBatch,
    ProductRecord,
    User,
    NewProduct,
    NewBatch,
} from '../types';
import { toFirestoreBatch, toFirestoreProduct, toProductRecord, toUser } from './mappers';
import { HelperHoaStore } from '.';

// ==========================================
// IMPLEMENTATION CLASS
// ==========================================

export class FirebaseHoaStore implements HelperHoaStore {
  
  // Returns products in alphabetical order
  async products(activeOnly?: boolean): Promise<ProductRecord[]> {
    // Replaced FirebaseFirestore.Query with direct Query import, and this.db with db
    let query: Query = db.collection('products');

    if (activeOnly) {
      query = query.where('status', '==', 'active');
    }

    // Sorts A-Z alphabetically. Requires a composite index in Firebase if activeOnly is true.
    query = query.orderBy('name', 'asc');

    const snapshot = await query.get();
    return snapshot.docs.map((doc) => toProductRecord(doc));
  }

  async product(id: string): Promise<ProductRecord | undefined> {
    const doc = await db.collection('products').doc(id).get();
    return doc.exists ? toProductRecord(doc) : undefined;
  }

  async user(id: string): Promise<User | undefined> {
    const doc = await db.collection('users').doc(id).get();
    return doc.exists ? toUser(doc) : undefined;
  }

  async createProduct(product: NewProduct): Promise<ProductRecord> {
    const firestoreData = toFirestoreProduct(product);
    
    const docRef = await db.collection('products').add(firestoreData);
    const doc = await docRef.get();
    
    return toProductRecord(doc);
  }

  async createBatch(productId: string, batch: NewBatch): Promise<ProductBatch> {
    const productRef = db.collection('products').doc(productId);
    const firestoreBatch = toFirestoreBatch(batch);

    await productRef.update({
      // Replaced FirebaseFirestore.FieldValue with direct FieldValue import
      batches: FieldValue.arrayUnion(firestoreBatch),
      totalStock: FieldValue.increment(batch.quantity)
    });

    return batch;
  }

  async sellProduct(id: string, quantity: number, batchNumber?: string): Promise<ProductRecord | undefined> {
    // This requires a Firestore transaction to read batches, deduct the right amount, 
    // and write back safely. Kept as stub based on your interface.
    throw new Error('Not implemented: requires FIFO batch deduction logic');
  }
}