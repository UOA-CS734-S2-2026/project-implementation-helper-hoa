import { createHash, randomUUID } from 'node:crypto';
import { FieldValue } from 'firebase-admin/firestore';
import { db } from '../config/firebase';
import type { PushDevice, PushRepository } from '../services/push-notification.service';
import type { HelperHoaStore } from '.';

const devices = db.collection('pushDevices');
const deviceId = (token: string) => createHash('sha256').update(token).digest('hex');

export class FirestorePushRepository implements PushRepository {
  constructor(private readonly store: HelperHoaStore) {}

  async register(uid: string, token: string): Promise<void> {
    const ref = devices.doc(deviceId(token));
    await db.runTransaction(async (transaction) => {
      const existing = await transaction.get(ref);
      const sameOwner = existing.get('uid') === uid;
      transaction.set(ref, {
        uid, token,
        revision: sameOwner ? existing.get('revision') : randomUUID(),
        sentAlerts: sameOwner ? existing.get('sentAlerts') ?? {} : {},
        updatedAt: FieldValue.serverTimestamp(),
      });
    });
  }

  async unregister(uid: string, token: string): Promise<void> {
    const ref = devices.doc(deviceId(token));
    await db.runTransaction(async (transaction) => {
      const existing = await transaction.get(ref);
      if (existing.get('uid') === uid) transaction.delete(ref);
    });
  }

  async devices(): Promise<PushDevice[]> {
    const [snapshot, users] = await Promise.all([devices.get(), this.store.users()]);
    const staff = new Set(users
      .filter((user) => ['admin', 'manager', 'cashier'].includes(user.role))
      .map((user) => user.id));
    return snapshot.docs
      .filter((doc) => staff.has(doc.get('uid')))
      .map((doc) => ({
        id: doc.id, uid: doc.get('uid'), token: doc.get('token'),
        revision: doc.get('revision'),
      }));
  }

  async delivered(device: PushDevice): Promise<Record<string, string> | null> {
    const doc = await devices.doc(device.id).get();
    return doc.get('revision') === device.revision ? doc.get('sentAlerts') ?? {} : null;
  }

  async saveDelivered(device: PushDevice, alerts: Record<string, string>): Promise<void> {
    const ref = devices.doc(device.id);
    await db.runTransaction(async (transaction) => {
      const doc = await transaction.get(ref);
      if (doc.get('revision') === device.revision) {
        transaction.update(ref, { sentAlerts: alerts });
      }
    });
  }

  async remove(device: PushDevice): Promise<void> {
    const ref = devices.doc(device.id);
    await db.runTransaction(async (transaction) => {
      const doc = await transaction.get(ref);
      if (doc.get('revision') === device.revision) transaction.delete(ref);
    });
  }
}
