import { FieldValue, Query, Timestamp } from 'firebase-admin/firestore';
import { auth, db } from '../config/firebase';
import {
    ProductBatch,
    ProductRecord,
  SaleRecord,
  SaleLog,
    User,
    NewProduct,
    NewBatch,
    InvoiceRecord,
    ConfirmedInvoice,
    NewSale,
  NewUser,
  NewVendor,
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

  async productBySku(sku: string): Promise<ProductRecord | undefined> {
    const value = sku.trim().toUpperCase();
    const snapshot = await db.collection('products')
      .where('sku', '==', value)
      .limit(1)
      .get();
    const skuDoc = snapshot.docs[0];
    if (skuDoc) return toProductRecord(skuDoc);

    const barcodeSnapshot = await db.collection('products')
      .where('barcode', '==', value)
      .limit(1)
      .get();
    const barcodeDoc = barcodeSnapshot.docs[0];
    return barcodeDoc ? toProductRecord(barcodeDoc) : undefined;
  }

  async users(): Promise<User[]> {
    const snapshot = await db.collection('users').orderBy('name', 'asc').get();
    return snapshot.docs.map(toUser);
  }

  async user(id: string): Promise<User | undefined> {
    const doc = await db.collection('users').doc(id).get();
    return doc.exists ? toUser(doc) : undefined;
  }

  async vendors(): Promise<VendorRecord[]> {
    const snapshot = await db.collection('vendors').orderBy('name', 'asc').get();
    return snapshot.docs.map((doc) => ({
      id: doc.id,
      name: doc.get('name') ?? '',
      email: doc.get('email') ?? null,
      phone: doc.get('phone') ?? null,
      address: doc.get('address') ?? null,
    }));
  }

  async vendor(id: string): Promise<VendorRecord | undefined> {
    const doc = await db.collection('vendors').doc(id).get();
    if (!doc.exists) return undefined;
    return {
      id: doc.id,
      name: doc.get('name') ?? '',
      email: doc.get('email') ?? null,
      phone: doc.get('phone') ?? null,
      address: doc.get('address') ?? null,
    };
  }

  async sales(): Promise<SaleRecord[]> {
    const snapshot = await db.collection('sales').orderBy('soldAt', 'desc').limit(200).get();
    return snapshot.docs.map((doc) => {
      const sale = doc.data();
      return {
        id: doc.id,
        productId: sale.productId,
        sku: sale.sku,
        productName: sale.productName,
        quantity: sale.quantity,
        unitPrice: sale.unitPrice,
        unit: sale.unit || '',
        totalPrice: sale.totalPrice,
        paymentMethod: sale.paymentMethod,
        soldBy: sale.soldBy,
        soldAt: sale.soldAt instanceof Timestamp
          ? sale.soldAt.toDate().toISOString()
          : new Date(sale.soldAt).toISOString(),
      };
    });
  }

  async vendorName(id: string): Promise<string | undefined> {
    const doc = await db.collection('vendors').doc(id).get();
    return doc.data()?.name as string | undefined;
  }

  async createProduct(product: NewProduct): Promise<ProductRecord> {
    const existing = await this.productBySku(product.sku);
    if (existing) throw new Error(`Product with SKU ${product.sku} already exists`);
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

  // Creates the Firebase Auth record and the Firestore profile together, rolling
  // back the Auth user if the profile write fails. Distinct from createUser
  // further down, which only writes the profile for an Auth record the caller
  // already created, so that caller can roll back on its own terms.
  async createUserWithAuth(user: NewUser): Promise<User> {
    const { password, ...profile } = user;
    const authUser = await auth.createUser({
      email: profile.email,
      password,
      displayName: `${profile.name} ${profile.lastName}`.trim(),
    });
    try {
      await db.collection('users').doc(authUser.uid).set(profile);
    } catch (error) {
      await auth.deleteUser(authUser.uid);
      throw error;
    }
    return { id: authUser.uid, ...profile };
  }

  async updateUser(id: string, changes: Partial<User>): Promise<User> {
    const ref = db.collection('users').doc(id);
    const existing = await ref.get();
    if (!existing.exists) throw new Error(`User with ID ${id} not found`);
    const profileChanges = { ...changes };
    delete profileChanges.id;
    await ref.update(profileChanges);
    try {
      const authChanges: { email?: string; displayName?: string; disabled?: boolean } = {};
      if (changes.email) authChanges.email = changes.email;
      if (changes.name || changes.lastName) {
        const current = toUser(existing);
        authChanges.displayName = `${changes.name ?? current.name} ${changes.lastName ?? current.lastName}`.trim();
      }
      if (Object.keys(authChanges).length > 0) await auth.updateUser(id, authChanges);
    } catch (error) {
      if ((error as { code?: string }).code !== 'auth/user-not-found') throw error;
    }
    return (await this.user(id))!;
  }

  async createVendor(vendor: NewVendor): Promise<VendorRecord> {
    const ref = await db.collection('vendors').add(vendor);
    return { id: ref.id, ...vendor };
  }

  async updateVendor(id: string, changes: Partial<NewVendor>): Promise<VendorRecord> {
    const ref = db.collection('vendors').doc(id);
    const existing = await ref.get();
    if (!existing.exists) throw new Error(`Vendor with ID ${id} not found`);
    await ref.update(changes);
    return (await this.vendor(id))!;
  }

  async deleteVendor(id: string): Promise<void> {
    const ref = db.collection('vendors').doc(id);
    const existing = await ref.get();
    if (!existing.exists) throw new Error(`Vendor with ID ${id} not found`);
    await ref.delete();
  }

  async createBatch(productId: string, batch: NewBatch): Promise<NewBatch> {
    const productRef = db.collection('products').doc(productId);
    const firestoreBatch = toFirestoreBatch(batch);

    await productRef.update({
      // Replaced FirebaseFirestore.FieldValue with direct FieldValue import
      batches: FieldValue.arrayUnion(firestoreBatch),
      totalStock: FieldValue.increment(batch.quantity)
    });

    return batch;
  }

  async recordSale(input: NewSale): Promise<SaleRecord> {
    if (!Number.isInteger(input.quantity) || input.quantity <= 0) {
      throw new Error('Sale quantity must be a positive whole number');
    }
    if (!Number.isFinite(input.unitPrice) || input.unitPrice < 0) {
      throw new Error('Sale price cannot be negative');
    }
    const initialProduct = input.productId
      ? await this.product(input.productId)
      : input.sku ? await this.productBySku(input.sku) : undefined;
    if (!initialProduct) throw new Error('Product not found for the supplied ID or SKU');

    const productRef = db.collection('products').doc(initialProduct.id);
    const saleRef = db.collection('sales').doc();
    const soldAt = Timestamp.now();

    await db.runTransaction(async (transaction) => {
      const doc = await transaction.get(productRef);
      if (!doc.exists) throw new Error(`Product with ID ${initialProduct.id} not found`);
      const product = toProductRecord(doc);
      if (product.totalStock < input.quantity) {
        throw new Error(`Insufficient stock. Only ${product.totalStock} left.`);
      }

      let remaining = input.quantity;
      const batches = [...product.batches].sort(
        (a, b) => a.receivedDate.getTime() - b.receivedDate.getTime(),
      );
      for (const batch of batches) {
        if (remaining === 0) break;
        const deducted = Math.min(batch.quantity, remaining);
        batch.quantity -= deducted;
        remaining -= deducted;
      }

      const totalPrice = Number((input.quantity * input.unitPrice).toFixed(2));
      transaction.update(productRef, {
        batches: batches.filter((batch) => batch.quantity > 0).map(toFirestoreBatch),
        totalStock: FieldValue.increment(-input.quantity),
        totalSold: FieldValue.increment(input.quantity),
      });
      transaction.set(saleRef, {
        productId: product.id,
        sku: product.sku,
        productName: product.name,
        quantity: input.quantity,
        unitPrice: input.unitPrice,
        unit: input.unit?.trim() || initialProduct.unitOfMeasure,
        totalPrice,
        paymentMethod: input.paymentMethod,
        soldBy: input.soldBy,
        soldAt,
      });
    });

    return {
      id: saleRef.id,
      productId: initialProduct.id,
      sku: initialProduct.sku,
      productName: initialProduct.name,
      quantity: input.quantity,
      unitPrice: input.unitPrice,
      unit: input.unit?.trim() || initialProduct.unitOfMeasure,
      totalPrice: Number((input.quantity * input.unitPrice).toFixed(2)),
      paymentMethod: input.paymentMethod,
      soldBy: input.soldBy,
      soldAt: soldAt.toDate().toISOString(),
    };
  }

  async sellProduct(id: string, quantity: number, batchNumber?: string, sale?: SaleLog): Promise<ProductRecord | undefined> {
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

      // Append the sale history in the same transaction, so the ledger can never
      // drift from the stock it was deducted from.
      if (sale) {
        transaction.set(db.collection('sales').doc(), {
          productId: product.id,
          sku: product.sku,
          productName: product.name,
          quantity,
          unitPrice: sale.unitPrice,
          unit: sale.unit?.trim() || product.unitOfMeasure,
          totalPrice: Number((quantity * sale.unitPrice).toFixed(2)),
          paymentMethod: sale.paymentMethod?.trim() || 'unspecified',
          soldBy: sale.soldBy || 'unknown',
          soldAt: Timestamp.now(),
        });
      }
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