import { HelperHoaStore } from '../store';
import {
  InventoryAlert,
  InventoryAlertReason,
  InventoryAlertResponse,
  InventoryAlertSeverity,
  ProductRecord,
} from '../types';

const millisecondsPerDay = 24 * 60 * 60 * 1000;

export class InventoryAlertService {
  constructor(private readonly store: HelperHoaStore) {}

  async getAlerts(): Promise<InventoryAlertResponse[]> {
    const products = await this.store.products(true);

    return products
        .map((product) => this.createAlert(product))
        .filter((alert): alert is InventoryAlert => alert !== null)
        .map((alert) => ({
          ...alert,
          nearestExpiryDate: alert.nearestExpiryDate?.toISOString() ?? null,
        }));
  }

  private createAlert(product: ProductRecord): InventoryAlert | null {
    if (!product.unitOfMeasure || product.reorderPoint == null) {
      return null;
    }

    const reasons: InventoryAlertReason[] = [];

    if (product.totalStock === 0) {
      reasons.push('out_of_stock');
    } else if (product.totalStock <= product.reorderPoint) {
      reasons.push('low_stock');
    }

    const activeBatches = product.batches
        .filter((batch) => batch.quantity > 0 && batch.expirationDate)
        .sort(
          (first, second) =>
            first.expirationDate.getTime() - second.expirationDate.getTime(),
        );

    const nearestExpiryDate = activeBatches[0]?.expirationDate ?? null;
    const daysUntilExpiry = nearestExpiryDate == null
        ? null
        : Math.ceil(
            (nearestExpiryDate.getTime() - Date.now()) / millisecondsPerDay,
          );

    if (daysUntilExpiry !== null && daysUntilExpiry <= 7) {
      reasons.push('expiring_soon');
    }

    if (reasons.length === 0) {
      return null;
    }

    const severity = this.calculateSeverity(
      product.totalStock,
      product.reorderPoint,
      daysUntilExpiry,
    );

    return {
      productId: product.id,
      productName: product.name,
      quantityRemaining: product.totalStock,
      unitOfMeasure: product.unitOfMeasure,
      reorderPoint: product.reorderPoint,
      nearestExpiryDate,
      daysUntilExpiry,
      severity,
      reasons,
    };
  }

  private calculateSeverity(
    totalStock: number,
    reorderPoint: number,
    daysUntilExpiry: number | null,
  ): InventoryAlertSeverity {
    if (totalStock === 0 || daysUntilExpiry !== null && daysUntilExpiry <= 3) {
      return 'urgent';
    }

    if (totalStock <= reorderPoint * 0.25) {
      return 'very_low';
    }

    if (totalStock <= reorderPoint) {
      return 'low';
    }

    return 'expiring_soon';
  }
}