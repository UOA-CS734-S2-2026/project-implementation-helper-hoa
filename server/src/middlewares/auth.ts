import { Request, Response, NextFunction } from 'express';
import { DecodedIdToken, getAuth } from 'firebase-admin/auth';
import { HelperHoaStore } from '../store';
import app from '../config/firebase';
import { User } from '../types';

const adminAuth = getAuth(app);

export interface AuthRequest extends Request {
  token?: DecodedIdToken;
  /** The unverified bearer string, for forwarding the caller's identity downstream. */
  rawToken?: string;
  dbUser?: User;
}

export const requireAuth = async (
  req: AuthRequest, 
  res: Response, 
  next: NextFunction
): Promise<void> => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Unauthorized: Missing or invalid token format' });
    return;
  }

  const token = authHeader.split('Bearer ')[1];

  try {
    const decodedToken = await adminAuth.verifyIdToken(token);

    req.token = decodedToken;
    req.rawToken = token;

    next();
  } catch (error) {
    console.error('Token verification failed:', error);
    res.status(403).json({ error: 'Forbidden: Invalid or expired token' });
  }
};

export const requireRole = (allowedRoles: Array<'admin' | 'manager' | 'cashier'>, store: HelperHoaStore) => {
  return async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
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

      if (!allowedRoles.includes(user.role)) {
        res.status(403).json({ 
          error: `Forbidden: Requires one of [${allowedRoles.join(', ')}]. You are a ${user.role}.` 
        });
        return;
      }

      req.dbUser = user;
      next();
    } catch (error) {
      next(error);
    }
  };
};