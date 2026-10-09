import { describe, expect, it } from 'vitest';
import { Timestamp } from 'firebase-admin/firestore';
import { toProductBatch, toProductRecord, toFirestoreProductPatch } from './mappers';
import type { NewProduct } from '../types';

describe('product batch mappers', () => {
  it('reads a string expirationDate as a Date', () => {
    const batch = toProductBatch({ batchNumber: 'B-1', quantity: 2, costPrice: 3, expirationDate: '2026-12-31', receivedDate: '2026-09-01' });

    expect(batch.expirationDate).toEqual(new Date('2026-12-31T00:00:00.000Z'));
    expect(batch.receivedDate).toEqual(new Date('2026-09-01T00:00:00.000Z'));
  });

  it('reads a Firestore Timestamp expirationDate as a Date', () => {
    const batch = toProductBatch({
      batchNumber: 'B-1',
      quantity: 2,
      costPrice: 3,
      expirationDate: Timestamp.fromDate(new Date('2026-10-15T12:00:00.000Z')),
      receivedDate: Timestamp.fromDate(new Date('2026-09-01')),
    });

    expect(batch.expirationDate).toEqual(new Date('2026-10-15T12:00:00.000Z'));
  });

  it('defaults receivedDate and leaves missing dates null', () => {
    const batch = toProductBatch({ batchNumber: 'B-1', quantity: 0, costPrice: 1 });

    expect(batch.expirationDate).toBeNull();
    expect(batch.receivedDate).toBeInstanceOf(Date);
  });

  it('does not break product records that contain string dates', () => {
    const record = toProductRecord({
      id: 'coffee',
      data: () => ({
        sku: 'COFFEE',
        name: 'Coffee beans',
        category: 'Food',
        description: '',
        costPrice: 5,
        sellingPrice: 8,
        taxRate: 15,
        totalStock: 2,
        reorderPoint: 4,
        unitOfMeasure: 'bags',
        totalSold: 3,
        salesVelocity: 0,
        tags: [],
        status: 'active',
        images: [],
        batches: [{ batchNumber: 'B-1', quantity: 2, costPrice: 5, expirationDate: '2027-01-01', receivedDate: '2026-10-01', vendorId: 'v-1', invoiceNumber: 'INV-1' }],
      }),
    } as never);

    expect(record.batches[0].expirationDate).toEqual(new Date('2027-01-01T00:00:00.000Z'));
  });

  it('converts string batch dates to Timestamps for product updates', () => {
    const patch = toFirestoreProductPatch({
      name: 'Coffee beans',
      batches: [{ batchNumber: 'B-1', quantity: 2, costPrice: 5, expirationDate: '2027-01-01', receivedDate: '2026-10-01', vendorId: 'v-1', invoiceNumber: 'INV-1' }],
    } as unknown as Partial<NewProduct>);

    expect(patch.name).toBe('Coffee beans');
    expect(patch.batches).toHaveLength(1);
    const stored = patch.batches as Array<{ expirationDate: Timestamp; receivedDate: Timestamp }>;
    expect(stored[0].expirationDate).toBeInstanceOf(Timestamp);
    expect(stored[0].expirationDate.toDate()).toEqual(new Date('2027-01-01T00:00:00.000Z'));
    expect(stored[0].receivedDate.toDate()).toEqual(new Date('2026-10-01T00:00:00.000Z'));
  });

  it('leaves non-batch updates untouched', () => {
    const patch = toFirestoreProductPatch({ sellingPrice: 9.5 });

    expect(patch).toEqual({ sellingPrice: 9.5 });
  });
});