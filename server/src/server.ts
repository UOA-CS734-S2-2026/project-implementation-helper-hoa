import 'dotenv/config';
import { randomUUID } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import express from 'express';
import cors from 'cors';
import { createProductRoutes } from './routes/products.routes';
import { FirebaseHoaStore } from './store/store-firestore';
import { globalErrorHandler } from './middlewares/errorHandler';
import { InventoryService } from './services/inventory.service';
import { createInventoryAlertRoutes } from './routes/inventory-alerts.routes';
import { InventoryAlertService } from './services/inventory-alert.service';
import { createAdminRoutes } from './routes/admin.routes';

const app = express();
const port = Number(process.env.PORT) || 3000;

const store = new FirebaseHoaStore();
const inventoryService = new InventoryService(store);
const inventoryAlertService = new InventoryAlertService(store);

const allowedOrigins = (process.env.ALLOWED_ORIGINS ?? 'http://localhost:5173,http://localhost:3000,http://localhost:8080')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use(cors({
  origin(origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
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

type ConfirmedInvoice = {
  id: string;
  supplierName: string;
  invoiceNumber: string;
  receivedDate: string;
  confirmedAt: string;
  items: unknown[];
};

const dataDirectory = path.join(process.cwd(), 'data');
const invoicesFile = path.join(dataDirectory, 'invoices.json');

async function readInvoices(): Promise<ConfirmedInvoice[]> {
  try {
    const contents = await readFile(invoicesFile, 'utf-8');
    return JSON.parse(contents) as ConfirmedInvoice[];
  } catch {
    return [];
  }
}

app.post('/api/invoices', async (request, response) => {
  const {
    supplierName,
    invoiceNumber,
    receivedDate,
    items,
  } = request.body as Partial<ConfirmedInvoice>;

  if (
    typeof supplierName !== 'string' ||
    typeof invoiceNumber !== 'string' ||
    typeof receivedDate !== 'string' ||
    !Array.isArray(items) ||
    items.length === 0
  ) {
    response.status(400).json({
      message: 'Supplier, invoice number, received date, and items are required.',
    });
    return;
  }

  const invoice: ConfirmedInvoice = {
    id: randomUUID(),
    supplierName,
    invoiceNumber,
    receivedDate,
    confirmedAt: new Date().toISOString(),
    items,
  };

  await mkdir(dataDirectory, { recursive: true });

  const invoices = await readInvoices();
  invoices.push(invoice);

  await writeFile(
    invoicesFile,
    JSON.stringify(invoices, null, 2),
    'utf-8',
  );

  response.status(201).json(invoice);
});

app.use(globalErrorHandler);

app.listen(port, () => {
  console.log(`Helper Hoa API is running at http://localhost:${port}`);
});

