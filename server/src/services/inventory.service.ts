import { HelperHoaStore } from '../store';
import {
  ConfirmResultItem,
  ConfirmedInvoice,
  NewBatch,
  NewProduct,
  ProductRecord,
} from '../types';


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

  async confirmInvoice(invoice: ConfirmedInvoice): Promise<ConfirmResultItem[]> {
    const results: ConfirmResultItem[] = [];

    for (const item of invoice.items) {
      const name = (item.name || '').trim();
      if (!name) {
        continue;
      }

      const matches = await this.store.productsByName(name);
      let product: ProductRecord | undefined = matches[0];

      if (!product) {
        product = await this.createNewProduct({
          name,
          sku: this.buildSku(name, item.category),
          category: item.category || 'Materials',
          description: item.description || '',
          costPrice: item.costPrice,
          sellingPrice: typeof item.sellingPrice === 'number' ? item.sellingPrice : 0,
          taxRate: 15,
          reorderPoint: 0,
          unitOfMeasure: item.unit || 'each',
          tags: [],
          images: [],
          status: 'active',
        });
      }

      const batch: NewBatch = {
        batchNumber: this.buildBatchNumber(invoice.invoiceNumber),
        quantity: item.quantity,
        costPrice: item.costPrice,
        receivedDate: new Date(),
        vendorId: '',
        invoiceNumber: invoice.invoiceNumber,
      };

      if (item.expiryDate) {
        batch.expirationDate = new Date(item.expiryDate);
      }

      await this.store.createBatch(product.id, batch);

      results.push({ productId: product.id, created: matches.length === 0, name });
    }

    if (results.length > 0) {
      await this.store.createInvoice({
        id: '',
        supplierName: invoice.supplierName,
        invoiceNumber: invoice.invoiceNumber,
        receivedDate: invoice.receivedDate,
        confirmedAt: new Date().toISOString(),
        items: invoice.items,
      });
    }

    return results;
  }

  private buildSku(name: string, category?: string): string {
    const root = category
      ? `${category}-${name}`
      : name;
    const sanitized = root.replace(/[^A-Za-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
    return `SKU-${sanitized}-${Math.floor(Math.random() * 9000 + 1000)}`;
  }

  private buildBatchNumber(invoiceNumber: string): string {
    const date = new Date();
    const stamp = date.toISOString().slice(0, 10).replace(/-/g, '');
    return `BATCH-${invoiceNumber || 'INV'}-${stamp}`;
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