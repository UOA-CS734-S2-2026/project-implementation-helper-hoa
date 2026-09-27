import { HelperHoaStore } from '../store';
import {ProductRecord, NewProduct, NewBatch } from '../types';


export class InventoryService {
  // Inject the store so the service can access the database
  constructor(private store: HelperHoaStore) {}

async getAllProducts(filters?: { activeOnly?: boolean; name?: string; category?: string }): Promise<ProductRecord[]> {
    return this.store.products(filters);
  }
  

  async getProductById(id: string): Promise<ProductRecord> {
    const product = await this.store.product(id);
    if (!product) {
      // Throwing errors here allows your global Express error handler to catch them
      throw new Error(`Product with ID ${id} not found`); 
    }
    return product;
  }

  async createNewProduct(product: NewProduct): Promise<ProductRecord> {
    // Business Rule: Ensure SKU is uppercase and trimmed before saving
    product.sku = product.sku.trim().toUpperCase();
    
    // Business Rule: Prevent negative pricing
    if (product.sellingPrice < 0 || product.costPrice < 0) {
      throw new Error('Prices cannot be negative');
    }

    return this.store.createProduct(product);
  }

  async receiveInventory(productId: string, batch: NewBatch) {
    if (batch.quantity <= 0) {
      throw new Error('Batch quantity must be greater than zero');
    }
    return this.store.createBatch(productId, batch);
  }

  async sellProduct(id: string, quantity: number, batchNumber?: string): Promise<ProductRecord> {
    // Business Rule: Prevent zero or negative sale quantities
    if (quantity <= 0) {
      throw new Error('Sale quantity must be greater than zero');
    }

    const updatedProduct = await this.store.sellProduct(id, quantity, batchNumber);
    
    // Safety net in case the store layer resolves with undefined
    if (!updatedProduct) {
      throw new Error(`Product with ID ${id} not found or failed to process sale`);
    }

    return updatedProduct;
  }

  async updateProduct(id: string, updates: Partial<NewProduct>): Promise<ProductRecord> {
    // Business Rule: Ensure SKU remains uppercase and trimmed if being updated
    if (updates.sku) {
      updates.sku = updates.sku.trim().toUpperCase();
    }
    
    // Business Rule: Prevent negative pricing
    if ((updates.sellingPrice !== undefined && updates.sellingPrice < 0) || 
        (updates.costPrice !== undefined && updates.costPrice < 0)) {
      throw new Error('Prices cannot be negative');
    }

    return this.store.updateProduct(id, updates);
  }

  async updateBatch(productId: string, batchNumber: string, updates: Partial<NewBatch>) {
    // Business Rule: Prevent setting batch quantities below zero
    if (updates.quantity !== undefined && updates.quantity < 0) {
      throw new Error('Batch quantity cannot be negative');
    }
    
    return this.store.updateBatch(productId, batchNumber, updates);
  }

  async deleteProduct(id: string): Promise<void> {
    // Soft Delete: Instead of wiping the product and breaking past invoices, 
    // we change its status to 'discontinued' to hide it from active queries.
    const updates = { status: 'discontinued' } as Partial<NewProduct>;
    await this.store.updateProduct(id, updates);
  }
}