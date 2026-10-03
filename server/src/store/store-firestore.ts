import { Query, FieldValue } from 'firebase-admin/firestore';
import { db } from '../config/firebase'; // Adjust path if your firebase.ts is located elsewhere
import {
    ProductBatch,
    ProductRecord,
    User,
    NewProduct,
    NewBatch,
    InvoiceRecord,
    ConfirmedInvoice,
    VendorRecord,
} from '../types';
import { toFirestoreBatch, toFirestoreProduct, toProductRecord, toUser, toInvoiceRecord, toFirestoreInvoice, toFirestoreConfirmedInvoice } from './mappers';
import { HelperHoaStore } from '.';

// ==========================================
// IMPLEMENTATION CLASS
// ==========================================

export class FirebaseHoaStore implements HelperHoaStore {
  
  // Returns products in alphabetical order
  async products(filters?: { activeOnly?: boolean; name?: string; category?: string }): Promise<ProductRecord[]> {
    let query: Query = db.collection('products');

    if (filters?.activeOnly) {
      query = query.where('status', '==', 'active');
    }

    if (filters?.category) {
      query = query.where('category', '==', filters.category);
    }

    if (filters?.name) {
      // Note: This enforces an exact, case-sensitive match. 
      // Firestore does not natively support partial text search (e.g., "LIKE %name%").
      query = query.where('name', '==', filters.name);
    }

    // Sorts A-Z alphabetically. 
    // IMPORTANT: Adding multiple where() clauses combined with orderBy() 
    // requires you to generate Composite Indexes in your Firebase Console.
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

  async vendors(): Promise<VendorRecord[]> {
    const snapshot = await db.collection('vendors').get();
    return snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        name: data.name ?? '',
        email: data.email ?? null,
        phone: data.phone ?? null,
        address: data.address ?? null,
      };
    });
  }

  async createProduct(product: NewProduct): Promise<ProductRecord> {
    const firestoreData = toFirestoreProduct(product);
    
    const docRef = await db.collection('products').add(firestoreData);
    const doc = await docRef.get();
    
    return toProductRecord(doc);
  }

  async productsByName(name: string): Promise<ProductRecord[]> {
    const normalized = name.trim().toLowerCase();
    if (!normalized) {
      return [];
    }

    const snapshot = await db.collection('products').get();
    return snapshot.docs
      .map((doc) => toProductRecord(doc))
      .filter((product) => (product.name || '').trim().toLowerCase() === normalized);
  }

  // Persists an invoice the user confirmed in the app (POST /api/invoices).
  // Mapped to the same layout as scanned invoices so GET /invoices can read
  // both kinds back through toInvoiceRecord.
  async createConfirmedInvoice(invoice: ConfirmedInvoice): Promise<string> {
    const firestoreData = toFirestoreConfirmedInvoice(invoice);

    const docRef = await db.collection('invoices').add(firestoreData);

    return docRef.id;
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

  async updateProduct(id: string, updates: Partial<NewProduct>): Promise<ProductRecord> {
    const docRef = db.collection('products').doc(id);
    
    // Note: Firestore update() ignores fields not present in the updates object
    await docRef.update(updates);
    
    const updatedProduct = await this.product(id);
    if (!updatedProduct) {
      throw new Error(`Failed to retrieve updated product with ID ${id}`);
    }
    
    return updatedProduct;
  }

  async updateBatch(productId: string, batchNumber: string, updates: Partial<NewBatch>): Promise<ProductBatch> {
    const productRef = db.collection('products').doc(productId);
    let updatedBatch: ProductBatch | undefined;

    await db.runTransaction(async (transaction) => {
      const doc = await transaction.get(productRef);
      if (!doc.exists) {
        throw new Error(`Product with ID ${productId} not found`);
      }

      const product = toProductRecord(doc);
      const batchIndex = product.batches.findIndex(b => b.batchNumber === batchNumber);

      if (batchIndex === -1) {
        throw new Error(`Batch ${batchNumber} not found on product ${productId}`);
      }

      const oldBatch = product.batches[batchIndex];
      
      // Calculate stock difference if the quantity is being modified
      let stockDifference = 0;
      if (updates.quantity !== undefined) {
        stockDifference = updates.quantity - oldBatch.quantity;
      }

      // Merge the existing batch data with the new updates
      updatedBatch = { ...oldBatch, ...updates } as ProductBatch;
      product.batches[batchIndex] = updatedBatch;

      transaction.update(productRef, {
        batches: product.batches.map(toFirestoreBatch),
        totalStock: FieldValue.increment(stockDifference)
      });
    });

    if (!updatedBatch) {
      throw new Error('Failed to update batch');
    }

    return updatedBatch;
  }

  async deleteProduct(id: string): Promise<void> {
    // This executes a hard delete. 
    // If you prefer a soft delete at the database level instead, 
    // change this to: await db.collection('products').doc(id).update({ status: 'discontinued' });
    await db.collection('products').doc(id).delete();
  }

  // Fetch all invoices, newest first. Both writers store the date as
  // invoiceDate; there is no `date` field, so ordering by it threw.
  async invoices(): Promise<InvoiceRecord[]> {
    const query = db.collection('invoices').orderBy('invoiceDate', 'desc');
    const snapshot = await query.get();
    
    return snapshot.docs.map((doc) => toInvoiceRecord(doc));
  }

  // Map and save a new invoice from a raw scanner payload
  async createInvoiceFromScanner(rawScannerData: any, resolvedVendorId: string): Promise<InvoiceRecord> {
    // 1. Transform the raw payload into a Firestore-compatible object
    const firestoreInvoice = toFirestoreInvoice(rawScannerData, resolvedVendorId);
    
    // 2. Save the mapped document to the 'invoices' collection
    const docRef = await db.collection('invoices').add(firestoreInvoice);
    
    // 3. Fetch the newly created document to return a complete InvoiceRecord
    const doc = await docRef.get();
    
    return toInvoiceRecord(doc);
  }

  // User operations
  async createUser(user: User): Promise<User> {
    // We use .set() instead of .add() because we want the Firestore document ID 
    // to perfectly match the Firebase Auth UID (which is passed in as user.id)
    await db.collection('users').doc(user.id).set(user);
    return user;
  }

  async deleteUser(id: string): Promise<void> {
    await db.collection('users').doc(id).delete();
  }

}