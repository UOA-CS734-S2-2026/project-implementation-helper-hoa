import cors from 'cors';
import express from 'express';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

type ConfirmedInvoiceItem = {
  lineNumber: number;
  name: string;
  quantity: number;
  unit: string;
  costPrice: number;
  expiryDate: string;
};

type ConfirmedInvoice = {
  id: string;
  supplierName: string;
  invoiceNumber: string;
  receivedDate: string;
  confirmedAt: string;
  items: ConfirmedInvoiceItem[];
};

const currentDirectory = path.dirname(fileURLToPath(import.meta.url));
const dataDirectory = path.resolve(currentDirectory, '../data');
const invoicesFile = path.join(dataDirectory, 'confirmed-invoices.json');

const app = express();

app.use(cors());
app.use(express.json());

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
    id: crypto.randomUUID(),
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

app.listen(3000, () => {
  console.log('Helper Hoa API is running at http://localhost:3000');
});