import { Router } from 'express';
import { getMessaging } from 'firebase-admin/messaging';
import firebase, { firebaseProjectId } from '../config/firebase';
import { AuthRequest, requireAuth, requireRole } from '../middlewares/auth';
import type { HelperHoaStore } from '../store';
import type { FirestorePushRepository } from '../store/push-firestore';

export function createPushRoutes(repository: FirestorePushRepository, store: HelperHoaStore): Router {
  const router = Router();
  router.use(requireAuth, requireRole(['admin', 'manager', 'cashier'], store));
  router.put('/devices', async (request: AuthRequest, response, next) => {
    const { token, projectId } = request.body ?? {};
    if (typeof token !== 'string' || token.length < 20 || token.length > 4096
      || typeof projectId !== 'string') {
      response.status(400).json({ error: 'A valid FCM token and Firebase project ID are required.' });
      return;
    }
    if (projectId !== firebaseProjectId) {
      response.status(409).json({ error: 'The phone and backend must use the same Firebase project.' });
      return;
    }
    try {
      // Dry-run validates the token and verifies that its sender matches this backend.
      await getMessaging(firebase).send({ token, data: { type: 'registration_check' } }, true);
      await repository.register(request.token!.uid, token);
      response.sendStatus(204);
    } catch (error) {
      next(error);
    }
  });
  router.delete('/devices', async (request: AuthRequest, response, next) => {
    const token = request.body?.token;
    if (typeof token !== 'string' || token.length < 20 || token.length > 4096) {
      response.status(400).json({ error: 'A valid FCM token is required.' });
      return;
    }
    try {
      await repository.unregister(request.token!.uid, token);
      response.sendStatus(204);
    } catch (error) {
      next(error);
    }
  });
  return router;
}
