import { describe, expect, it, vi } from 'vitest';
import type { HelperHoaStore } from '../store';
import { InvoiceService } from './invoice.service';

describe('InvoiceService', () => {
  it('rejects missing invoice number, invalid total, and missing vendor', async () => {
    const createInvoiceFromScanner = vi.fn();
    const service = new InvoiceService({
      createInvoiceFromScanner,
    } as unknown as HelperHoaStore);

    await expect(service.processInvoiceUpload({ total_amount: 0, vendor: { name: 'A' } }))
      .rejects.toThrow('Invoice number is missing');
    await expect(service.processInvoiceUpload({
      invoice_number: 'INV-1',
      total_amount: -1,
      vendor: { name: 'A' },
    })).rejects.toThrow('A valid total amount is required');
    await expect(service.processInvoiceUpload({
      invoice_number: 'INV-1',
      total_amount: 0,
      vendor: {},
    })).rejects.toThrow('Vendor name is required');
    expect(createInvoiceFromScanner).not.toHaveBeenCalled();
  });

  it('resolves a vendor ID from its name when the scanner did not provide one', async () => {
    const invoice = { id: 'invoice-1' };
    const createInvoiceFromScanner = vi.fn(async () => invoice);
    const service = new InvoiceService({
      createInvoiceFromScanner,
    } as unknown as HelperHoaStore);
    const scannedData = {
      invoice_number: 'INV-1',
      total_amount: 10,
      vendor: { name: 'Fresh Supply' },
    };

    await expect(service.processInvoiceUpload(scannedData)).resolves.toBe(invoice);
    expect(createInvoiceFromScanner).toHaveBeenCalledWith(
      scannedData,
      'vendor_fresh_supply',
    );
  });

  it('uses the provided vendor ID and delegates invoice listing', async () => {
    const invoices = [{ id: 'invoice-1' }];
    const store = {
      createInvoiceFromScanner: vi.fn(),
      invoices: vi.fn(async () => invoices),
    } as unknown as HelperHoaStore;
    const service = new InvoiceService(store);

    await service.processInvoiceUpload({
      invoice_number: 'INV-1',
      total_amount: 10,
      vendor: { id: 'vendor-1', name: 'Fresh Supply' },
    });

    expect(store.createInvoiceFromScanner).toHaveBeenCalledWith(
      expect.any(Object),
      'vendor-1',
    );
    await expect(service.getAllInvoices()).resolves.toBe(invoices);
  });
});
