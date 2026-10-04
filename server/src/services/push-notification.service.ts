import { createHash } from 'node:crypto';
import type { Message } from 'firebase-admin/messaging';
import type { InventoryAlert } from '../types';

export interface PushDevice {
  id: string;
  uid: string;
  token: string;
  revision: string;
}

export interface PushRepository {
  devices(): Promise<PushDevice[]>;
  delivered(device: PushDevice): Promise<Record<string, string> | null>;
  saveDelivered(device: PushDevice, alerts: Record<string, string>): Promise<void>;
  remove(device: PushDevice): Promise<void>;
}

export function alertFingerprint(alert: InventoryAlert): string {
  const stock = alert.totalStock <= 0 ? 'out'
    : alert.reorderPoint > 0 && alert.totalStock <= alert.reorderPoint * 0.5 ? 'very-low'
    : alert.reorderPoint > 0 && alert.totalStock <= alert.reorderPoint ? 'low' : 'normal';
  const days = alert.daysToExpiry;
  const expiry = days === null || days > 7 ? 'normal'
    : days <= 0 ? 'expired' : days <= 2 ? 'urgent' : 'soon';
  return createHash('sha256').update(JSON.stringify([
    stock, expiry, expiry === 'normal' ? null : alert.nearestExpiry?.toISOString(),
  ])).digest('hex');
}

export function inventoryMessage(alert: InventoryAlert, token: string): Message {
  return {
    token,
    notification: {
      title: `${alert.level}: ${alert.name}`,
      body: `${alert.totalStock} ${alert.unitOfMeasure} remaining. ${alert.reasons.join('. ')}.`,
    },
    data: { type: 'inventory_alert', productId: alert.productId },
    android: {
      priority: 'high',
      ttl: 24 * 60 * 60 * 1000,
      notification: {
        channelId: 'inventory_alerts',
        tag: `inventory-${alert.productId}`,
      },
    },
  };
}

function invalidToken(error: unknown): boolean {
  if (!(error instanceof Error) || !('code' in error)) return false;
  return error.code === 'messaging/registration-token-not-registered'
    || error.code === 'messaging/invalid-registration-token';
}

export class PushNotificationService {
  private running: Promise<void> | null = null;
  private pending = false;

  constructor(
    private readonly alerts: () => Promise<InventoryAlert[]>,
    private readonly repository: PushRepository,
    private readonly send: (message: Message) => Promise<string>,
  ) {}

  scan(): Promise<void> {
    this.pending = true;
    if (!this.running) {
      this.running = this.drain().finally(() => { this.running = null; });
    }
    return this.running;
  }

  private async drain(): Promise<void> {
    while (this.pending) {
      this.pending = false;
      await this.deliver();
    }
  }

  private async deliver(): Promise<void> {
    const [alerts, devices] = await Promise.all([
      this.alerts(), this.repository.devices(),
    ]);
    for (const device of devices) {
      const previous = await this.repository.delivered(device);
      if (previous === null) continue;
      const next: Record<string, string> = {};
      let removed = false;
      for (const alert of alerts) {
        const key = createHash('sha256').update(alert.productId).digest('hex');
        const fingerprint = alertFingerprint(alert);
        if (previous[key] === fingerprint) {
          next[key] = fingerprint;
          continue;
        }
        try {
          await this.send(inventoryMessage(alert, device.token));
          next[key] = fingerprint;
        } catch (error) {
          if (invalidToken(error)) {
            await this.repository.remove(device);
            removed = true;
            break;
          }
          // Keep the last successful state so a transient failure is retried.
          if (previous[key]) next[key] = previous[key];
          console.error(`Inventory push failed for device ${device.id}`, error);
        }
      }
      if (!removed) await this.repository.saveDelivered(device, next);
    }
  }
}
