import { HelperHoaStore } from '../store';
import {
  ConfirmResultItem,
  ConfirmedInvoice,
  NewBatch,
  NewProduct,
  NewSale,
  ProductRecord,
  SaleRecord,
} from '../types';


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
      await this.store.createConfirmedInvoice({
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
    if (!Number.isFinite(product.sellingPrice) || !Number.isFinite(product.costPrice) || product.sellingPrice < 0 || product.costPrice < 0) {
      throw new Error('Prices cannot be negative');
    }

    return this.store.createProduct(product);
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

  async sellProduct(
    id: string,
    quantity: number,
    batchNumber?: string,
    unitPrice?: number,
    soldBy?: string,
    paymentMethod?: string,
    unit?: string,
  ): Promise<ProductRecord> {
    // Business Rule: Prevent zero or negative sale quantities
    if (quantity <= 0) {
      throw new Error('Sale quantity must be greater than zero');
    }

    const product = await this.getProductById(id);

    // The cashier may override the unit price at the till; fall back to the
    // product's selling price when it is not supplied.
    const resolvedUnitPrice = unitPrice ?? product.sellingPrice;
    if (!Number.isFinite(resolvedUnitPrice) || resolvedUnitPrice < 0) {
      throw new Error('Sale price cannot be negative');
    }

    // Stock deduction (FIFO, honouring batchNumber) and the sale ledger entry
    // happen in a single store transaction.
    await this.store.sellProduct(id, quantity, batchNumber, {
      unitPrice: resolvedUnitPrice,
      unit: unit?.trim() || product.unitOfMeasure,
      paymentMethod: paymentMethod?.trim() || 'unspecified',
      soldBy: soldBy || 'unknown',
    });

    return this.getProductById(id);
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