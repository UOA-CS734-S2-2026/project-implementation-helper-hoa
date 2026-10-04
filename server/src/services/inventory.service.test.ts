import { afterEach, describe, expect, it, vi } from 'vitest';
import type { HelperHoaStore } from '../store';
import type { NewProduct, ProductRecord } from '../types';
import { InventoryService } from './inventory.service';

function product(
  id: string,
  changes: Partial<ProductRecord> = {},
): ProductRecord {
  return {
    id,
    sku: id.toUpperCase(),
    barcode: null,
    name: id,
    category: 'Food',
    description: '',
    images: [],
    costPrice: 1,
    sellingPrice: 2,
    taxRate: 15,
    totalStock: 20,
    reorderPoint: 10,
    unitOfMeasure: 'bags',
    totalSold: 0,
    salesVelocity: 0,
    tags: [],
    status: 'active',
    batches: [],
    ...changes,
  };
}

describe('InventoryService', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('calculates alert boundaries, excludes depleted batches, and orders urgent first',
      async () => {
    vi.spyOn(Date, 'now').mockReturnValue(new Date('2026-10-01T00:00:00Z').getTime());
    const products = [
      product('low', {
        totalStock: 10,
        batches: [{
          batchNumber: 'low-batch',
          quantity: 10,
          costPrice: 1,
          receivedDate: new Date('2026-09-01'),
          expirationDate: new Date('2026-10-08'),
          vendorId: 'vendor-1',
          invoiceNumber: 'INV-1',
        }],
      }),
      product('urgent', {
        totalStock: 20,
        batches: [
          {
            batchNumber: 'depleted',
            quantity: 0,
            costPrice: 1,
            receivedDate: new Date('2026-09-01'),
            expirationDate: new Date('2026-10-01'),
            vendorId: 'vendor-1',
            invoiceNumber: 'INV-0',
          },
          {
            batchNumber: 'active',
            quantity: 20,
            costPrice: 1,
            receivedDate: new Date('2026-09-02'),
            expirationDate: new Date('2026-10-03'),
            vendorId: 'vendor-1',
            invoiceNumber: 'INV-2',
          },
        ],
      }),
      product('discontinued', { status: 'discontinued', totalStock: 0 }),
      product('healthy'),
    ];
    const vendor = {
      id: 'vendor-1',
      name: 'Fresh Supply',
      email: null,
      phone: null,
      address: null,
    };
    const store = {
      products: vi.fn(async () => products),
      vendors: vi.fn(async () => [vendor]),
    } as unknown as HelperHoaStore;

    const alerts = await new InventoryService(store).getInventoryAlerts();

    expect(alerts.map(({ productId, level }) => [productId, level])).toEqual([
      ['urgent', 'Urgent'],
      ['low', 'Low'],
    ]);
    expect(alerts[0].batches.map((batch) => batch.batchNumber)).toEqual(['active']);
    expect(alerts[0].batches[0].vendor).toEqual(vendor);
    expect(alerts[1].daysToExpiry).toBe(7);
    expect(alerts[1].reasons).toContain('Stock at or below reorder point (10)');
    expect(store.vendors).toHaveBeenCalledOnce();
  });

  it('normalizes product SKUs and rejects invalid prices before persistence', async () => {
    const created = product('new');
    const createProduct = vi.fn(async (value: NewProduct) => ({
      ...created,
      ...value,
    }));
    const store = { createProduct } as unknown as HelperHoaStore;
    const service = new InventoryService(store);
    const input: NewProduct = {
      sku: '  coffee  ',
      name: 'Coffee',
      category: 'Food',
      description: '',
      costPrice: 1,
      sellingPrice: 2,
      taxRate: 15,
      reorderPoint: 0,
      unitOfMeasure: 'bags',
      tags: [],
      images: [],
      status: 'active',
    };

    await service.createNewProduct(input);
    expect(input.sku).toBe('COFFEE');
    expect(createProduct).toHaveBeenCalledOnce();

    await expect(service.createNewProduct({ ...input, sellingPrice: -1 }))
      .rejects.toThrow('Prices cannot be negative');
    expect(createProduct).toHaveBeenCalledOnce();
  });

  it('validates and normalizes sale payloads before recording them', async () => {
    const recordSale = vi.fn(async (input) => ({
      id: 'sale-1',
      productId: input.productId ?? 'product-1',
      sku: input.sku ?? '',
      productName: 'Coffee',
      quantity: input.quantity,
      unitPrice: input.unitPrice,
      unit: input.unit ?? '',
      totalPrice: input.quantity * input.unitPrice,
      paymentMethod: input.paymentMethod,
      soldBy: input.soldBy,
      soldAt: '2026-10-01T00:00:00.000Z',
    }));
    const store = { recordSale } as unknown as HelperHoaStore;
    const service = new InventoryService(store);

    await expect(service.createSale({
      sku: 'coffee',
      quantity: 1.5,
      unitPrice: 2,
      paymentMethod: 'cash',
      soldBy: 'staff',
    })).rejects.toThrow('Sale quantity must be a positive whole number');
    await expect(service.createSale({
      quantity: 1,
      unitPrice: 2,
      paymentMethod: 'cash',
      soldBy: 'staff',
    })).rejects.toThrow('A product ID or SKU is required');
    expect(recordSale).not.toHaveBeenCalled();

    await service.createSale({
      sku: ' coffee ',
      quantity: 2,
      unitPrice: 3,
      paymentMethod: '  ',
      soldBy: 'staff',
    });
    expect(recordSale).toHaveBeenCalledWith(expect.objectContaining({
      sku: 'COFFEE',
      paymentMethod: 'cash',
    }));
  });

  it('confirms matching products, creates new products, and skips blank item names',
      async () => {
    const existing = product('existing', { name: 'Coffee beans' });
    const created = product('new-product');
    const productsByName = vi.fn(async (name: string) =>
      name === 'Coffee beans' ? [existing] : [],
    );
    const createProduct = vi.fn(async (input: NewProduct) => ({
      ...created,
      ...input,
    }));
    const createBatch = vi.fn(async (_id: string, batch) => batch);
    const createConfirmedInvoice = vi.fn(async () => 'invoice-1');
    const store = {
      productsByName,
      createProduct,
      createBatch,
      createConfirmedInvoice,
    } as unknown as HelperHoaStore;

    const results = await new InventoryService(store).confirmInvoice({
      supplierName: 'Fresh Supply',
      invoiceNumber: 'INV-42',
      receivedDate: '2026-10-01',
      items: [
        { name: ' Coffee beans ', quantity: 2, costPrice: 3 },
        { name: 'Tea leaves', quantity: 4, costPrice: 5, expiryDate: '2027-01-01' },
        { name: '  ', quantity: 1, costPrice: 1 },
      ],
    });

    expect(results).toEqual([
      { productId: 'existing', created: false, name: 'Coffee beans' },
      { productId: 'new-product', created: true, name: 'Tea leaves' },
    ]);
    expect(createProduct).toHaveBeenCalledWith(expect.objectContaining({
      name: 'Tea leaves',
      sku: expect.stringMatching(/^SKU-TEA-LEAVES-/),
    }));
    expect(createBatch).toHaveBeenCalledTimes(2);
    expect(createBatch).toHaveBeenLastCalledWith('new-product', expect.objectContaining({
      quantity: 4,
      expirationDate: new Date('2027-01-01'),
    }));
    expect(createConfirmedInvoice).toHaveBeenCalledOnce();
  });
});
