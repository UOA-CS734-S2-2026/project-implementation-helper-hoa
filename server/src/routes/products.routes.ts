import { Router, Request, Response, NextFunction } from 'express';
import { HelperHoaStore } from '../store';
import { AuthRequest, requireAuth, requireRole } from '../middlewares/auth';

// The factory function injects the store into the router
export function createProductRoutes(store: HelperHoaStore): Router {
  const router = Router();

  // GET /products
  router.get('/', 
    requireAuth, 
    requireRole(['admin', 'manager', 'cashier'], store), 
    async (req: AuthRequest, res: Response, next: NextFunction) => {
      try {
        const activeOnly = req.query.active === 'true';
        const products = await store.products(activeOnly);
        res.status(200).json(products);
      } catch (error) {
        next(error);
      }
  });

  // GET /products/:id
  router.get('/:id', 
    requireAuth, 
    requireRole(['admin', 'manager', 'cashier'], store), 
    async (req: AuthRequest, res: Response, next: NextFunction) => {
      try {
        const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
        const product = await store.product(id);
        if (!product) {
          res.status(404).json({ error: 'Product not found' });
          return;
      }
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
        const newProduct = await store.createProduct(req.body);
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
        const newBatch = await store.createBatch(id, req.body);
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
        const updatedProduct = await store.sellProduct(id, quantity, batchNumber);
        res.status(200).json(updatedProduct);
      } catch (error) {
        next(error);
      }
  });

  return router;
}