import { HelperHoaStore } from '../store';
import { InvoiceRecord } from '../types';

export class InvoiceService {
  // Inject the store so the service can access the database
  constructor(private store: HelperHoaStore) {}

  async processInvoiceUpload(rawScannerData: any): Promise<InvoiceRecord> {
    // Business Rule: Validate critical fields from the raw scanner payload
    if (!rawScannerData.invoice_number) {
      throw new Error('Invoice number is missing from the uploaded data');
    }

    if (rawScannerData.total_amount === undefined || rawScannerData.total_amount < 0) {
      throw new Error('A valid total amount is required to process an invoice');
    }

    if (!rawScannerData.vendor || !rawScannerData.vendor.name) {
      throw new Error('Vendor name is required');
    }

    // Vendor Resolution Logic
    // If the scanner didn't provide a precise ID, you would typically query your 
    // database here to match the vendor.name to an existing vendor record.
    // For now, we will fallback to a generated or placeholder ID.
    const resolvedVendorId = rawScannerData.vendor.id || `vendor_${rawScannerData.vendor.name.toLowerCase().replace(/\s+/g, '_')}`;

    // Pass the data down to the store layer to be mapped and saved
    return this.store.createInvoiceFromScanner(rawScannerData, resolvedVendorId);
  }

  async getAllInvoices(): Promise<InvoiceRecord[]> {
    return this.store.invoices();
  }
}