import { describe, expect, it, vi } from 'vitest';
import { HelperHoaStore } from '../store';
import { ProductRecord } from '../types';
import { InventoryAlertService } from './inventory-alert.service';

describe('InventoryAlertService', () => {
  it('returns sales and the vendor of the nearest expiring active batch', async () => {
    const product = {
      id: 'coffee',
      name: 'Coffee beans',
      status: 'active',
      totalStock: 3,
      totalSold: 24,
      unitOfMeasure: 'bags',
      reorderPoint: 5,
      batches: [
        { quantity: 3, vendorId: 'fresh', expirationDate: new Date('2026-10-01'), receivedDate: new Date('2026-09-01') },
        { quantity: 0, vendorId: 'old', expirationDate: new Date('2026-09-30'), receivedDate: new Date('2026-09-02') },
      ],
    } as ProductRecord;
    const vendorName = vi.fn(async () => 'Fresh Supply');
    const store = { products: async () => [product], vendorName } as unknown as HelperHoaStore;

    const alerts = await new InventoryAlertService(store).getAlerts();

    expect(alerts).toMatchObject([{
      productId: 'coffee',
      vendorName: 'Fresh Supply',
      totalSold: 24,
      nearestExpiryDate: '2026-10-01T00:00:00.000Z',
    }]);
    expect(vendorName).toHaveBeenCalledWith('fresh');
  });

  it('uses the most recently received batch for out-of-stock alerts', async () => {
    const product = {
      id: 'coffee', name: 'Coffee beans', totalStock: 0, totalSold: 24,
      unitOfMeasure: 'bags', reorderPoint: 5,
      batches: [
        { quantity: 0, vendorId: 'old', receivedDate: new Date('2026-08-01') },
        { quantity: 0, vendorId: 'recent', receivedDate: new Date('2026-09-01') },
      ],
    } as ProductRecord;
    const vendorName = vi.fn(async () => undefined);
    const store = { products: async () => [product], vendorName } as unknown as HelperHoaStore;

    expect(await new InventoryAlertService(store).getAlerts()).toMatchObject([
      { vendorName: null, totalSold: 24, nearestExpiryDate: null },
    ]);
    expect(vendorName).toHaveBeenCalledWith('recent');
  });
});