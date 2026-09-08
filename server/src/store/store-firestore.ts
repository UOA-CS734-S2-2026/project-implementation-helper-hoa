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
    const productRef = db.collection('products').doc(id);

    // runTransaction ensures no other cashier can modify this product while the math is happening
    await db.runTransaction(async (transaction) => {
      const doc = await transaction.get(productRef);
      if (!doc.exists) {
        throw new Error(`Product with ID ${id} not found`);
      }

      const product = toProductRecord(doc);
      
      if (product.totalStock < quantity) {
        throw new Error(`Insufficient stock. Only ${product.totalStock} left.`);
      }

      let remainingToDeduct = quantity;
      
      // Sort batches by oldest received date first (FIFO)
      const sortedBatches = [...product.batches].sort(
        (a, b) => a.receivedDate.getTime() - b.receivedDate.getTime()
      );
    if (batchNumber) {
      const specificBatch = product.batches.find(b => b.batchNumber === batchNumber);
      if (!specificBatch || specificBatch.quantity < quantity) {
      throw new Error(`Insufficient stock in batch ${batchNumber}`);
    }
    specificBatch.quantity -= quantity;
    } else {

      for (const batch of sortedBatches) {
        if (remainingToDeduct === 0) break;

        if (batch.quantity >= remainingToDeduct) {
          batch.quantity -= remainingToDeduct; 
          remainingToDeduct = 0; 
        } else {
          remainingToDeduct -= batch.quantity; 
          batch.quantity = 0; 
        }
      }
    }

      // Filter out completely depleted batches
      const activeBatches = sortedBatches.filter(b => b.quantity > 0);

      // Write the calculated arrays and fields back to the document
      transaction.update(productRef, {
        // Must map the TS objects back to Firestore-compatible objects
        batches: activeBatches.map(toFirestoreBatch), 
        totalStock: FieldValue.increment(-quantity),
        totalSold: FieldValue.increment(quantity)
      });
    });

    // Fetch and return the newly updated state
    return this.product(id);
  }
}