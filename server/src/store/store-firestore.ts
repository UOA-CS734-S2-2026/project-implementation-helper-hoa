import { FieldValue, Query, Timestamp } from 'firebase-admin/firestore';
import { auth, db } from '../config/firebase';
import {
    ProductBatch,
    ProductRecord,
  SaleRecord,
    User,
    NewProduct,
    NewBatch,
    NewSale,
  NewUser,
  NewVendor,
  VendorRecord,
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

  async updateProduct(id: string, changes: Partial<NewProduct>): Promise<ProductRecord> {
    const ref = db.collection('products').doc(id);
    const existing = await ref.get();
    if (!existing.exists) throw new Error(`Product with ID ${id} not found`);
    if (changes.sku) {
      const duplicate = await this.productBySku(changes.sku);
      if (duplicate && duplicate.id !== id) {
        throw new Error(`Product with SKU ${changes.sku} already exists`);
      }
      changes.sku = changes.sku.trim().toUpperCase();
    }
    await ref.update(changes);
    return (await this.product(id))!;
  }

  async deleteProduct(id: string): Promise<void> {
    const ref = db.collection('products').doc(id);
    const doc = await ref.get();
    if (!doc.exists) throw new Error(`Product with ID ${id} not found`);
    await ref.delete();
  }

  async createUser(user: NewUser): Promise<User> {
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

  async deleteUser(id: string): Promise<void> {
    const ref = db.collection('users').doc(id);
    const existing = await ref.get();
    if (!existing.exists) throw new Error(`User with ID ${id} not found`);
    try {
      await auth.deleteUser(id);
    } catch (error) {
      if ((error as { code?: string }).code !== 'auth/user-not-found') throw error;
    }
    await ref.delete();
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
      totalPrice: Number((input.quantity * input.unitPrice).toFixed(2)),
      paymentMethod: input.paymentMethod,
      soldBy: input.soldBy,
      soldAt: soldAt.toDate().toISOString(),
    };
  }

  async sellProduct(id: string, quantity: number, batchNumber?: string): Promise<ProductRecord | undefined> {
    const product = await this.product(id);
    if (!product) throw new Error(`Product with ID ${id} not found`);
    if (batchNumber) {
      const batch = product.batches.find((candidate) => candidate.batchNumber === batchNumber);
      if (!batch || batch.quantity < quantity) throw new Error(`Insufficient stock in batch ${batchNumber}`);
    }
    await this.recordSale({
      productId: id,
      quantity,
      unitPrice: product.sellingPrice,
      paymentMethod: 'unspecified',
      soldBy: 'unknown',
    });
    return this.product(id);
  }
}