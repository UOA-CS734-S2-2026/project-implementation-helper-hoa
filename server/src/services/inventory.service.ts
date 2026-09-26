import { HelperHoaStore } from '../store';
import {ProductRecord, NewProduct, NewBatch } from '../types';


export class InventoryService {
  // Inject the store so the service can access the database
  constructor(private store: HelperHoaStore) {}

  async getAllProducts(activeOnly?: boolean): Promise<ProductRecord[]> {
    return this.store.products(activeOnly);
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
}