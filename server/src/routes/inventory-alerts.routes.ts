import { Router, Response, NextFunction } from 'express';

import { AuthRequest, requireAuth, requireRole } from '../middlewares/auth';
import { InventoryAlertService } from '../services/inventory-alert.service';
import { HelperHoaStore } from '../store';

export function createInventoryAlertRoutes(
  service: InventoryAlertService,
  store: HelperHoaStore,
): Router {
  const router = Router();

  router.get(
    '/',
    requireAuth,
    requireRole(['admin', 'manager', 'cashier'], store),
    async (_request: AuthRequest, response: Response, next: NextFunction) => {
      try {
        const alerts = await service.getAlerts();
        response.status(200).json(alerts);
      } catch (error) {
        next(error);
      }
    },
  );

  return router;
}