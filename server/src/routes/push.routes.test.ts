import express from 'express';
import type { Server } from 'node:http';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { FirestorePushRepository } from '../store/push-firestore';
import type { HelperHoaStore } from '../store';
import { globalErrorHandler } from '../middlewares/errorHandler';

const mocks = vi.hoisted(() => ({
  send: vi.fn(async () => 'dry-run-id'),
  verify: vi.fn(async () => ({ uid: 'staff' })),
}));
vi.mock('../config/firebase', () => ({
  default: {}, firebaseProjectId: 'helperhoa-5f706',
}));
vi.mock('firebase-admin/auth', () => ({
  getAuth: () => ({ verifyIdToken: mocks.verify }),
}));
vi.mock('firebase-admin/messaging', () => ({
  getMessaging: () => ({ send: mocks.send }),
}));

import { createPushRoutes } from './push.routes';

describe('authenticated FCM device registration', () => {
  let server: Server;
  let url: string;
  const register = vi.fn(async () => {});
  const unregister = vi.fn(async () => {});
  const user = vi.fn(async () => ({ id: 'staff', role: 'cashier' }));
  const token = 'valid-fcm-device-token-for-test';
  beforeEach(async () => {
    vi.clearAllMocks();
    user.mockResolvedValue({ id: 'staff', role: 'cashier' });
    const app = express();
    app.use(express.json());
    app.use('/push', createPushRoutes(
      { register, unregister } as unknown as FirestorePushRepository,
      { user } as unknown as HelperHoaStore,
    ));
    app.use(globalErrorHandler);
    await new Promise<void>((resolve, reject) => {
      server = app.listen(0, '127.0.0.1', () => resolve());
      server.once('error', reject);
    });
    const address = server.address();
    if (!address || typeof address === 'string') throw new Error('Missing test server address');
    url = `http://127.0.0.1:${address.port}/push/devices`;
  });
  afterEach(async () => {
    await new Promise<void>((resolve, reject) => {
      server.close((error) => error ? reject(error) : resolve());
    });
  });

  function request(body: object, method = 'PUT', authenticated = true) {
    return fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(authenticated ? { Authorization: 'Bearer test-id-token' } : {}),
      },
      body: JSON.stringify(body),
    });
  }

  it('rejects unauthenticated registrations', async () => {
    expect((await request({ token, projectId: 'helperhoa-5f706' }, 'PUT', false)).status).toBe(401);
    expect(register).not.toHaveBeenCalled();
  });

  it('allows cashiers and records the authenticated uid, not a caller-supplied uid', async () => {
    expect((await request({ token, projectId: 'helperhoa-5f706', uid: 'someone-else' })).status).toBe(204);
    expect(mocks.send).toHaveBeenCalledWith({
      token, data: { type: 'registration_check' },
    }, true);
    expect(register).toHaveBeenCalledWith('staff', token);
  });

  it('rejects project mismatches before contacting FCM', async () => {
    const response = await request({ token, projectId: 'another-project' });
    expect(response.status).toBe(409);
    expect(mocks.send).not.toHaveBeenCalled();
    expect(register).not.toHaveBeenCalled();
  });

  it('validates missing, short, oversized, and non-string tokens', async () => {
    for (const invalid of [undefined, 'short', 'x'.repeat(4097), 123]) {
      expect((await request({ token: invalid, projectId: 'helperhoa-5f706' })).status).toBe(400);
    }
    expect(register).not.toHaveBeenCalled();
  });

  it('removes only a registration owned by the authenticated staff member', async () => {
    expect((await request({ token, uid: 'someone-else' }, 'DELETE')).status).toBe(204);
    expect(unregister).toHaveBeenCalledWith('staff', token);
  });

  it('surfaces FCM validation errors without saving the token', async () => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => {});
    mocks.send.mockRejectedValueOnce(new Error('FCM sender mismatch'));
    try {
      const response = await request({ token, projectId: 'helperhoa-5f706' });
      expect(response.status).toBe(500);
      expect(await response.json()).toEqual({ error: 'FCM sender mismatch' });
      expect(register).not.toHaveBeenCalled();
    } finally {
      log.mockRestore();
    }
  });

  it('rejects unknown/non-staff roles', async () => {
    user.mockResolvedValueOnce({ id: 'staff', role: 'customer' });
    expect((await request({ token, projectId: 'helperhoa-5f706' })).status).toBe(403);
    expect(register).not.toHaveBeenCalled();
  });
});
