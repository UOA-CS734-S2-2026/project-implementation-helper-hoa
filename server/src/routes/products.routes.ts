import { Router, Request, Response, NextFunction } from 'express';
import { HelperHoaStore } from '../store';
import { InventoryService } from '../services/inventory.service';
import { AuthRequest, requireAuth, requireRole } from '../middlewares/auth';

// Inject both the service (for business logic) and store (for auth middleware)
export function createProductRoutes(service: InventoryService, store: HelperHoaStore): Router {
  const router = Router();

  router.get('/', 
    requireAuth, 
    requireRole(['admin', 'manager', 'cashier'], store), 
    async (req: AuthRequest, res: Response, next: NextFunction) => {
      try {
        const activeOnly = req.query.active === 'true';
        const products = await service.getAllProducts(activeOnly);
        res.status(200).json(products);
      } catch (error) {
        next(error);
      }
  });

  router.get('/:id', 
    requireAuth, 
    requireRole(['admin', 'manager', 'cashier'], store), 
    async (req: AuthRequest, res: Response, next: NextFunction) => {
      try {
        const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
        const product = await service.getProductById(id);
        res.status(200).json(product);
      } catch (error) {
        next(error);
      }
  });

  router.post('/', 
    requireAuth, 
    requireRole(['admin'], store), 
    async (req: AuthRequest, res: Response, next: NextFunction) => {
      try {
        const newProduct = await service.createNewProduct(req.body);
        res.status(201).json(newProduct);
      } catch (error) {
        next(error);
      }
  });

  router.post('/:id/batches', 
    requireAuth, 
    requireRole(['admin', 'manager'], store), 
    async (req: AuthRequest, res: Response, next: NextFunction) => {
      try {
        const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
        // Updated to use the service
        const newBatch = await service.receiveInventory(id, req.body);
        res.status(201).json(newBatch);
      } catch (error) {
        next(error);
      }
  });

  router.post('/:id/sell', 
    requireAuth, 
    requireRole(['admin', 'manager', 'cashier'], store), 
    async (req: AuthRequest, res: Response, next: NextFunction) => {
      try {
        const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
        const { quantity, batchNumber } = req.body;
        const updatedProduct = await service.sellProduct(id, quantity, batchNumber);
        res.status(200).json(updatedProduct);
      } catch (error) {
        next(error);
      }
  });

  return router;
}