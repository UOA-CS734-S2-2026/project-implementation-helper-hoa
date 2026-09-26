import 'dotenv/config';
import { randomUUID } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import express from 'express';
import cors from 'cors';
import { createProductRoutes } from './routes/products.routes';
import { createAIRoutes } from './routes/ai.routes';
import { FirebaseHoaStore } from './store/store-firestore';
import { globalErrorHandler } from './middlewares/errorHandler';
import { InventoryService } from './services/inventory.service';
import { AIService } from './services/ai.service';

const app = express();
const port = Number(process.env.PORT) || 3000;

const store = new FirebaseHoaStore();
const inventoryService = new InventoryService(store);
const aiService = new AIService();

app.use(cors());
app.use(express.json());
app.use('/products', createProductRoutes(inventoryService, store));
app.use('/api/ai', createAIRoutes(aiService));

type ConfirmedInvoice = {
  id: string;
  supplierName: string;
  invoiceNumber: string;
  receivedDate: string;
  confirmedAt: string;
  items: {
    lineNumber?: number;
    name: string;
    quantity: number;
    unit?: string;
    costPrice: number;
    expiryDate?: string | null;
  }[];
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