import './config/env';
import express from 'express';
import cors from 'cors';
import { createProductRoutes } from './routes/products.routes';
import { createAIRoutes } from './routes/ai.routes';
import { FirebaseHoaStore } from './store/store-firestore';
import { globalErrorHandler } from './middlewares/errorHandler';
import { AuthRequest, requireAuth, requireRole } from './middlewares/auth';
import { InventoryService } from './services/inventory.service';
import { createInvoiceRoutes } from './routes/invoices.routes';
import { InvoiceService } from './services/invoice.service';  
import { UserService } from './services/user.service';
import { createUserRoutes } from './routes/user.routes';
import { AIService } from './services/ai.service';
import { AuthService } from './services/auth.service';
import { createAuthRoutes } from './routes/auth.routes';
import { ConfirmedInvoice } from './types';
import { createInventoryAlertRoutes } from './routes/inventory-alerts.routes';
import { InventoryAlertService } from './services/inventory-alert.service';
import { createAdminRoutes } from './routes/admin.routes';

const app = express();
const port = Number(Number(process.env.PORT)) || 3000;

const store = new FirebaseHoaStore();
const inventoryService = new InventoryService(store);
const invoiceService = new InvoiceService(store);
const userService = new UserService(store);
const aiService = new AIService();
const authService = new AuthService();
const inventoryAlertService = new InventoryAlertService(store);

const allowedOrigins = (process.env.ALLOWED_ORIGINS ?? 'http://localhost:5173,http://localhost:3000,http://localhost:8080')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

// The Flutter web dev server falls back to a random port when its preferred one
// is taken, so the browser origin is not stable during development and a fixed
// list rejects it. Match any loopback port, as python/chatbot_server.py does.
const loopbackOrigin = /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/;

app.use(cors({
  origin(origin, callback) {
    if (!origin || allowedOrigins.includes(origin) || loopbackOrigin.test(origin)) {
      callback(null, true);
      return;
    }
    const error = new Error('Origin is not allowed by CORS') as Error & { status?: number };
    error.status = 403;
    callback(error);
  },
}));
app.use(express.json({ limit: '1mb' }));
app.use('/products', createProductRoutes(inventoryService, store));
app.use('/admin', createAdminRoutes(store, inventoryService));
app.use(
  '/inventory-alerts',
  createInventoryAlertRoutes(inventoryAlertService, store),
);

app.use('/invoices', createInvoiceRoutes(invoiceService, store));
app.use('/users', createUserRoutes(userService, store));
app.use('/auth', createAuthRoutes(authService, store));
app.use('/api/ai', createAIRoutes(aiService));

app.post(
  '/api/invoices',
  requireAuth,
  requireRole(['admin', 'manager'], store),
  async (request: AuthRequest, response, next) => {
    const body = request.body as Partial<ConfirmedInvoice>;

    if (
      typeof body.supplierName !== 'string' ||
      typeof body.invoiceNumber !== 'string' ||
      typeof body.receivedDate !== 'string' ||
      !Array.isArray(body.items) ||
      body.items.length === 0
    ) {
      response.status(400).json({
        message: 'Supplier, invoice number, received date, and items are required.',
      });
      return;
    }

    try {
      const items = await inventoryService.confirmInvoice({
        supplierName: body.supplierName,
        invoiceNumber: body.invoiceNumber,
        receivedDate: body.receivedDate,
        items: body.items,
      });

      response.status(201).json({ items });
    } catch (error) {
      next(error);
    }
  },
);

app.use(globalErrorHandler);


app.listen(port, () => {
  console.log(`Helper Hoa API is running at http://localhost:${port}`);
});

