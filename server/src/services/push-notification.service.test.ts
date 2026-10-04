import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { InventoryAlert, ProductRecord } from '../types';
import type { HelperHoaStore } from '../store';
import {
  alertFingerprint, inventoryMessage, PushNotificationService,
  type PushDevice, type PushRepository,
} from './push-notification.service';
import { InventoryService } from './inventory.service';

function alert(changes: Partial<InventoryAlert> = {}): InventoryAlert {
  return {
    productId: 'coffee', name: 'Coffee', sku: 'COFFEE', category: 'Food',
    unitOfMeasure: 'bags', level: 'Low', reasons: ['Stock at or below reorder point (10)'],
    totalStock: 8, reorderPoint: 10, sellingPrice: 5,
    nearestExpiry: null, daysToExpiry: null, batches: [], ...changes,
  };
}

class MemoryRepository implements PushRepository {
  registered: PushDevice[] = [{ id: 'phone', uid: 'staff', token: 'fcm-token', revision: '1' }];
  states: Record<string, Record<string, string>> = {};
  async devices() { return this.registered; }
  async delivered(device: PushDevice): Promise<Record<string, string> | null> {
    return this.states[device.id] ?? {};
  }
  async saveDelivered(device: PushDevice, alerts: Record<string, string>) {
    this.states[device.id] = alerts;
  }
  async remove(device: PushDevice) {
    this.registered = this.registered.filter((other) => other.id !== device.id);
  }
}

describe('inventory push notifications', () => {
  let repository: MemoryRepository;
  let alerts: InventoryAlert[];
  beforeEach(() => {
    repository = new MemoryRepository();
    alerts = [alert()];
  });

  function worker() {
    const sender = vi.fn(async () => 'message-id');
    return {
      sender,
      service: new PushNotificationService(async () => alerts, repository, sender),
    };
  }

  it('sends an OS-displayable notification with navigation data and high Android priority', async () => {
    const { service, sender } = worker();
    await service.scan();
    expect(sender).toHaveBeenCalledWith(expect.objectContaining({
      token: 'fcm-token',
      notification: { title: 'Low: Coffee', body: '8 bags remaining. Stock at or below reorder point (10).' },
      data: { type: 'inventory_alert', productId: 'coffee' },
      android: expect.objectContaining({ priority: 'high' }),
    }));
  });

  it('does not resend unchanged alerts or quantity changes within a threshold, even after restart', async () => {
    const { service, sender } = worker();
    await service.scan();
    alerts = [alert({ totalStock: 7 })];
    await service.scan();
    expect(sender).toHaveBeenCalledTimes(1);
    const restarted = worker();
    await restarted.service.scan();
    expect(restarted.sender).not.toHaveBeenCalled();
  });

  it('notifies on very-low and out-of-stock transitions and after recovery', async () => {
    const { service, sender } = worker();
    await service.scan();
    alerts = [alert({ totalStock: 5, level: 'Very low' })];
    await service.scan();
    alerts = [alert({ totalStock: 0, level: 'Urgent' })];
    await service.scan();
    expect(sender).toHaveBeenCalledTimes(3);
    alerts = [];
    await service.scan();
    alerts = [alert()];
    await service.scan();
    expect(sender).toHaveBeenCalledTimes(4);
  });

  it('detects expiry becoming urgent or expired without a stock write', async () => {
    const { service, sender } = worker();
    const nearestExpiry = new Date('2026-10-10');
    alerts = [alert({ totalStock: 20, daysToExpiry: 7, nearestExpiry, level: 'Expiring soon' })];
    await service.scan();
    alerts = [alert({ totalStock: 20, daysToExpiry: 6, nearestExpiry, level: 'Expiring soon' })];
    await service.scan();
    expect(sender).toHaveBeenCalledTimes(1);
    alerts[0] = { ...alerts[0], daysToExpiry: 2, level: 'Urgent' };
    await service.scan();
    alerts[0] = { ...alerts[0], daysToExpiry: 0 };
    await service.scan();
    expect(sender).toHaveBeenCalledTimes(3);
  });

  it('detects a new expiring batch and stock transitions even when the overall level stays urgent', () => {
    const original = alert({ level: 'Urgent', daysToExpiry: 1, nearestExpiry: new Date('2026-10-05') });
    expect(alertFingerprint(original)).not.toBe(alertFingerprint({ ...original, totalStock: 0 }));
    expect(alertFingerprint(original)).not.toBe(alertFingerprint({
      ...original, nearestExpiry: new Date('2026-10-06'),
    }));
  });

  it('delivers active alerts to newly registered phones independently', async () => {
    const { service, sender } = worker();
    await service.scan();
    repository.registered.push({ id: 'second', uid: 'cashier', token: 'second-token', revision: '1' });
    await service.scan();
    expect(sender).toHaveBeenCalledTimes(2);
  });

  it('retries transient FCM failures without marking them delivered', async () => {
    const { service, sender } = worker();
    const log = vi.spyOn(console, 'error').mockImplementation(() => {});
    sender.mockRejectedValueOnce(new Error('FCM temporarily unavailable'));
    try {
      await service.scan();
      await service.scan();
      expect(sender).toHaveBeenCalledTimes(2);
      expect(log).toHaveBeenCalled();
    } finally {
      log.mockRestore();
    }
  });

  it('deletes permanently invalid tokens', async () => {
    const { service, sender } = worker();
    sender.mockRejectedValueOnce(Object.assign(new Error('Uninstalled'), {
      code: 'messaging/registration-token-not-registered',
    }));
    await service.scan();
    expect(repository.registered).toEqual([]);
  });

  it('retains devices on payload/configuration errors and retries', async () => {
    const { service, sender } = worker();
    const log = vi.spyOn(console, 'error').mockImplementation(() => {});
    sender.mockRejectedValueOnce(Object.assign(new Error('Invalid payload'), {
      code: 'messaging/invalid-argument',
    }));
    try {
      await service.scan();
      expect(repository.registered).toHaveLength(1);
      await service.scan();
      expect(sender).toHaveBeenCalledTimes(2);
    } finally {
      log.mockRestore();
    }
  });

  it('skips devices revoked after the device list was fetched', async () => {
    const { service, sender } = worker();
    vi.spyOn(repository, 'delivered').mockResolvedValueOnce(null);
    await service.scan();
    expect(sender).not.toHaveBeenCalled();
  });

  it('coalesces overlapping scans without concurrent sends', async () => {
    const { service, sender } = worker();
    await Promise.all([service.scan(), service.scan(), service.scan()]);
    expect(sender).toHaveBeenCalledTimes(1);
  });
});

describe('push uses existing inventory thresholds', () => {
  it('includes exactly the reorder point and seven-day expiry, excluding depleted batches and discontinued products', async () => {
    const now = vi.spyOn(Date, 'now').mockReturnValue(new Date('2026-10-01').getTime());
    const product = (id: string, stock: number, days: number): ProductRecord => ({
      id, name: id, sku: id, barcode: null, category: 'Food', description: '',
      images: [], costPrice: 1, sellingPrice: 2, taxRate: 15, totalStock: stock,
      reorderPoint: 10, unitOfMeasure: 'bags', totalSold: 0, salesVelocity: 0,
      tags: [], status: 'active',
      batches: [{
        batchNumber: id, quantity: stock, costPrice: 1, vendorId: '',
        receivedDate: new Date('2026-09-01'), invoiceNumber: id,
        expirationDate: new Date(Date.now() + days * 86400000),
      }],
    });
    const products = [
      product('low', 10, 8), product('healthy', 11, 8),
      product('expiry', 11, 7),
      { ...product('discontinued', 1, 1), status: 'discontinued' },
      { ...product('depleted-batch', 11, 1), batches: [{ ...product('batch', 0, 1).batches[0], quantity: 0 }] },
    ];
    const store = { products: async () => products, vendors: async () => [] } as unknown as HelperHoaStore;
    try {
      const alerts = await new InventoryService(store).getInventoryAlerts();
      expect(alerts.map((value) => value.productId).sort()).toEqual(['expiry', 'low']);
      expect(alerts.find((value) => value.productId === 'expiry')?.daysToExpiry).toBe(7);
    } finally {
      now.mockRestore();
    }
  });
});
