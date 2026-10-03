import { Router, Request, Response, NextFunction } from 'express';
import { HelperHoaStore } from '../store';
import { InventoryService } from '../services/inventory.service';
import { AuthRequest, requireAuth, requireRole } from '../middlewares/auth';

// Inject both the service (for business logic) and store (for auth middleware)
export function createProductRoutes(service: InventoryService, store: HelperHoaStore): Router {
  const router = Router();

  router.get('/sku/:sku',
    requireAuth,
    requireRole(['admin', 'manager', 'cashier'], store),
    async (req: AuthRequest, res: Response, next: NextFunction) => {
      try {
        const sku = Array.isArray(req.params.sku) ? req.params.sku[0] : req.params.sku;
        res.status(200).json(await service.getProductBySku(sku));
      } catch (error) { next(error); }
    },
  );

  router.get('/', 
    requireAuth, 
    requireRole(['admin', 'manager', 'cashier'], store), 
    async (req: AuthRequest, res: Response, next: NextFunction) => {
      try {
        const activeOnly = req.query.active === 'true';
        const name = req.query.name as string | undefined;
        const category = req.query.category as string | undefined;
        
        // Pass the new parameters into the service
        const products = await service.getAllProducts({ activeOnly, name, category });
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
        const { quantity, batchNumber, unitPrice, unit, paymentMethod } = req.body;
        const updatedProduct = await service.sellProduct(
          id,
          quantity,
          batchNumber,
          unitPrice,
          req.token?.uid,
          paymentMethod,
          unit,
        );
        res.status(200).json(updatedProduct);
      } catch (error) {
        next(error);
      }
  });

  // Edit a product's details
  router.put('/:id', 
    requireAuth, 
    requireRole(['admin', 'manager'], store), 
    async (req: AuthRequest, res: Response, next: NextFunction) => {
      try {
        const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
        const updatedProduct = await service.updateProduct(id, req.body);
        res.status(200).json(updatedProduct);
      } catch (error) {
        next(error);
      }
  });

  // Edit a specific batch
  router.put('/:id/batches/:batchNumber', 
    requireAuth, 
    requireRole(['admin', 'manager'], store), 
    async (req: AuthRequest, res: Response, next: NextFunction) => {
      try {
        const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
        const { quantity, batchNumber } = req.body;
        const updatedBatch = await service.updateBatch(id, batchNumber, req.body);
        res.status(200).json(updatedBatch);
      } catch (error) {
        next(error);
      }
  });

  // Discontinue or delete a product
  router.delete('/:id', 
    requireAuth, 
    requireRole(['admin'], store), 
    async (req: AuthRequest, res: Response, next: NextFunction) => {
      try {
        const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
        // The service layer should determine if this is a hard delete from Firestore 
        // or a soft delete (e.g., updating status to 'discontinued') to preserve sales history.
        await service.deleteProduct(id);
        res.status(204).send(); // 204 No Content is standard for successful deletions
      } catch (error) {
        next(error);
      }
  });

  return router;
}