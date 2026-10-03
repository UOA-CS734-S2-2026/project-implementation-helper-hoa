import { Router, Response, NextFunction } from 'express';
import { HelperHoaStore } from '../store';
// Replace with your actual service that handles invoices
import { AuthRequest, requireAuth, requireRole } from '../middlewares/auth';
import { InvoiceService } from '../services/invoice.service';

export function createInvoiceRoutes(service: InvoiceService, store: HelperHoaStore): Router {
  const router = Router();

  // Upload and process a new invoice
  router.post('/', 
    requireAuth, 
    requireRole(['admin', 'manager'], store), 
    async (req: AuthRequest, res: Response, next: NextFunction) => {
      try {
        const rawScannerData = req.body;
        
        // The service should resolve the vendor, format the data using toFirestoreInvoice, 
        // and save it to the database.
        const newInvoice = await service.processInvoiceUpload(rawScannerData);
        
        res.status(201).json(newInvoice);
      } catch (error) {
        next(error);
      }
  });

  // Optional: Get all invoices
  router.get('/', 
    requireAuth, 
    requireRole(['admin', 'manager'], store), 
    async (req: AuthRequest, res: Response, next: NextFunction) => {
      try {
        const invoices = await service.getAllInvoices();
        res.status(200).json(invoices);
      } catch (error) {
        next(error);
      }
  });

  return router;
}