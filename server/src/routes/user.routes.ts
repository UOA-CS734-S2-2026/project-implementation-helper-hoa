import { Router, Response, NextFunction } from 'express';
import { UserService } from '../services/user.service';
import { HelperHoaStore } from '../store';
import { AuthRequest, requireAuth, requireRole } from '../middlewares/auth';

export function createUserRoutes(service: UserService, store: HelperHoaStore): Router {
  const router = Router();

  // Create a new employee (Admin only)
  router.post(
    '/',
    requireAuth,
    requireRole(['admin'], store),
    async (req: AuthRequest, res: Response, next: NextFunction) => {
      try {
        const { name, lastName, role, email, phone, password } = req.body;

        const newUser = await service.createEmployee(
          { name, lastName, role, email, phone },
          password
        );

        res.status(201).json(newUser);
      } catch (error) {
        next(error);
      }
    }
  );

  // Get a user profile by ID (Admin & Manager)
  router.get(
    '/:id',
    requireAuth,
    requireRole(['admin', 'manager'], store),
    async (req: AuthRequest, res: Response, next: NextFunction) => {
      try {
        const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
        const user = await service.getUserById(id);
        if (!user) {
          return res.status(404).json({ error: 'User not found' });
        }
        res.status(200).json(user);
      } catch (error) {
        next(error);
      }
    }
  );

  // Delete an employee (Admin only)
  router.delete(
    '/:id',
    requireAuth,
    requireRole(['admin'], store),
    async (req: AuthRequest, res: Response, next: NextFunction) => {
      try {
        const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
        await service.deleteEmployee(id);
        res.status(200).json({ message: `User ${id} successfully deleted` });
      } catch (error) {
        next(error);
      }
    }
  );

  return router;
}