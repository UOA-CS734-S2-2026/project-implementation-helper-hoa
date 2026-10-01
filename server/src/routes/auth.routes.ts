import { Router, Response, NextFunction } from 'express';
import { AuthRequest, requireAuth } from '../middlewares/auth';
import { AuthService, AuthServiceError } from '../services/auth.service';
import { HelperHoaStore } from '../store';

function respondWithAuthError(
  error: unknown,
  res: Response,
  next: NextFunction,
): void {
  if (error instanceof AuthServiceError) {
    res.status(error.status).json({ error: error.message });
    return;
  }

  next(error);
}

export function createAuthRoutes(service: AuthService, store: HelperHoaStore): Router {
  const router = Router();

  // Exchanges email + password for a Firebase ID token. The client stores the
  // token and sends it as `Authorization: Bearer <idToken>` on every request.
  router.post('/login', async (req, res: Response, next: NextFunction) => {
    const { email, password } = req.body as { email?: unknown; password?: unknown };

    if (
      typeof email !== 'string' ||
      email.trim().length === 0 ||
      typeof password !== 'string' ||
      password.length === 0
    ) {
      res.status(400).json({ error: 'Email and password are required.' });
      return;
    }

    try {
      res.status(200).json(await service.signIn(email, password));
    } catch (error) {
      respondWithAuthError(error, res, next);
    }
  });

  // Trades the stored refresh token for a fresh ID token, so the client does not
  // have to make the user log in again every hour.
  router.post('/refresh', async (req, res: Response, next: NextFunction) => {
    const { refreshToken } = req.body as { refreshToken?: unknown };

    if (typeof refreshToken !== 'string' || refreshToken.length === 0) {
      res.status(400).json({ error: 'refreshToken is required.' });
      return;
    }

    try {
      res.status(200).json(await service.refresh(refreshToken));
    } catch (error) {
      respondWithAuthError(error, res, next);
    }
  });

  // Profile of whoever the caller's token belongs to.
  router.get('/me', requireAuth, async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const uid = req.token?.uid;

      if (!uid) {
        res.status(401).json({ error: 'Unauthorized: User ID missing' });
        return;
      }

      const user = await store.user(uid);

      if (!user) {
        res.status(404).json({ error: 'User record not found in database' });
        return;
      }

      res.status(200).json({
        uid,
        email: user.email,
        name: user.name,
        lastName: user.lastName,
        role: user.role,
      });
    } catch (error) {
      next(error);
    }
  });

  return router;
}
