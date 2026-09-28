import { HelperHoaStore } from '../store';
import { NewBatch, NewProduct, NewSale, ProductRecord, SaleRecord } from '../types';


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
    if (!Number.isFinite(product.sellingPrice) || !Number.isFinite(product.costPrice) || product.sellingPrice < 0 || product.costPrice < 0) {
      throw new Error('Prices cannot be negative');
    }

    return this.store.createProduct(product);
  }

  async updateProduct(id: string, changes: Partial<NewProduct>): Promise<ProductRecord> {
    if (changes.sellingPrice !== undefined && (!Number.isFinite(changes.sellingPrice) || changes.sellingPrice < 0)) {
      throw new Error('Selling price cannot be negative');
    }
    if (changes.costPrice !== undefined && (!Number.isFinite(changes.costPrice) || changes.costPrice < 0)) {
      throw new Error('Cost price cannot be negative');
    }
    if (changes.sku !== undefined) changes.sku = changes.sku.trim().toUpperCase();
    return this.store.updateProduct(id, changes);
  }

  async deleteProduct(id: string): Promise<void> {
    return this.store.deleteProduct(id);
  }

  async getProductBySku(sku: string): Promise<ProductRecord> {
    const product = await this.store.productBySku(sku);
    if (!product) throw new Error(`Product with SKU ${sku} not found`);
    return product;
  }

  async createSale(sale: NewSale): Promise<SaleRecord> {
    if (!Number.isInteger(sale.quantity) || sale.quantity <= 0) {
      throw new Error('Sale quantity must be a positive whole number');
    }
    if (!Number.isFinite(sale.unitPrice) || sale.unitPrice < 0) {
      throw new Error('Sale price cannot be negative');
    }
    if (!sale.productId && !sale.sku?.trim()) {
      throw new Error('A product ID or SKU is required');
    }
    return this.store.recordSale({
      ...sale,
      sku: sale.sku?.trim().toUpperCase(),
      paymentMethod: sale.paymentMethod.trim() || 'cash',
    });
  }

  async receiveInventory(productId: string, batch: NewBatch) {
    if (batch.quantity <= 0) {
      throw new Error('Batch quantity must be greater than zero');
    }
    return this.store.createBatch(productId, batch);
  }

  async sellProduct(id: string, quantity: number, batchNumber?: string, unitPrice?: number, soldBy = 'unknown'): Promise<ProductRecord> {
    // Business Rule: Prevent zero or negative sale quantities
    if (quantity <= 0) {
      throw new Error('Sale quantity must be greater than zero');
    }

    if (batchNumber) {
      const product = await this.getProductById(id);
      const batch = product.batches.find((candidate) => candidate.batchNumber === batchNumber);
      if (!batch || batch.quantity < quantity) throw new Error(`Insufficient stock in batch ${batchNumber}`);
    }
    const product = await this.getProductById(id);
    await this.createSale({
      productId: id,
      quantity,
      unitPrice: unitPrice ?? product.sellingPrice,
      paymentMethod: 'unspecified',
      soldBy,
    });
    return this.getProductById(id);
  }
}