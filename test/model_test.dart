import 'package:flutter_test/flutter_test.dart';
import 'package:helper_hoa/models/inventory_alert.dart';
import 'package:helper_hoa/models/invoice_review.dart';

void main() {
  group('InvoiceItem', () {
    test('parses numeric fields and serializes them back to JSON', () {
      final item = InvoiceItem.fromJson({
        'lineNumber': 2.8,
        'name': 'Coffee beans',
        'quantity': 12,
        'unit': 'bags',
        'costPrice': 8,
        'expiryDate': '2026-10-01',
      });

      expect(item.lineNumber, 2);
      expect(item.quantity, 12.0);
      expect(item.costPrice, 8.0);
      expect(item.toJson(), {
        'lineNumber': 2,
        'name': 'Coffee beans',
        'quantity': 12.0,
        'unit': 'bags',
        'costPrice': 8.0,
        'expiryDate': '2026-10-01',
      });
    });

    test('uses defaults for missing JSON fields', () {
      final item = InvoiceItem.fromJson({});

      expect(item.lineNumber, 0);
      expect(item.name, '');
      expect(item.quantity, 0);
      expect(item.unit, '');
      expect(item.costPrice, 0);
      expect(item.expiryDate, isNull);
    });

    test('omits nullable fields when serializing and can clear them', () {
      const item = InvoiceItem(
        lineNumber: 1,
        name: 'Tea',
        quantity: 2,
        unit: 'boxes',
        costPrice: 4,
        expiryDate: '2026-12-01',
        sellingPrice: 6,
      );

      final updated = item.copyWith(clearExpiry: true, clearSellingPrice: true);

      expect(updated.expiryDate, isNull);
      expect(updated.sellingPrice, isNull);
      expect(updated.toJson(), {
        'lineNumber': 1,
        'name': 'Tea',
        'quantity': 2.0,
        'unit': 'boxes',
        'costPrice': 4.0,
      });
    });
  });

  group('InvoiceReview.fromScan', () {
    test('normalizes invoice fields and ignores malformed line items', () {
      final invoice = InvoiceReview.fromScan({
        'vendor': {'name': '  Fresh Supply  '},
        'invoice_number': ' INV-42 ',
        'invoice_date': ' 2026-09-27 ',
        'line_items': [
          {
            'product_name': ' Coffee beans ',
            'quantity': 12,
            'unit_price': 8.5,
          },
          null,
          'not a line item',
        ],
      });

      expect(invoice.supplierName, 'Fresh Supply');
      expect(invoice.invoiceNumber, 'INV-42');
      expect(invoice.receivedDate, '2026-09-27');
      expect(invoice.items, hasLength(1));
      expect(invoice.items.single.name, 'Coffee beans');
      expect(invoice.items.single.quantity, 12);
      expect(invoice.items.single.costPrice, 8.5);
      expect(invoice.items.single.unit, 'each');
    });

    test('returns empty defaults for absent or invalid collections', () {
      final invoice = InvoiceReview.fromScan({
        'vendor': 'not an object',
        'line_items': 'not a list',
      });

      expect(invoice.supplierName, isEmpty);
      expect(invoice.invoiceNumber, isEmpty);
      expect(invoice.receivedDate, isEmpty);
      expect(invoice.items, isEmpty);
    });
  });

  test('InventoryAlert parses dates, optional values, and reasons', () {
    final alert = InventoryAlert.fromJson({
      'productId': 'coffee-1',
      'productName': 'Coffee beans',
      'vendorName': 'Fresh Supply',
      'totalSold': 24,
      'quantityRemaining': 3,
      'unitOfMeasure': 'bags',
      'reorderPoint': 5,
      'nearestExpiryDate': '2026-10-01T12:00:00.000Z',
      'daysUntilExpiry': 5.9,
      'severity': 'urgent',
      'reasons': ['low_stock', 'expiring_soon'],
    });

    expect(alert.nearestExpiryDate, DateTime.utc(2026, 10, 1, 12));
    expect(alert.daysUntilExpiry, 5);
    expect(alert.vendorName, 'Fresh Supply');
    expect(alert.reasons, ['low_stock', 'expiring_soon']);
  });

  test('InventoryAlert uses safe defaults when fields are absent', () {
    final alert = InventoryAlert.fromJson({});

    expect(alert.productName, 'Unknown product');
    expect(alert.vendorName, isNull);
    expect(alert.nearestExpiryDate, isNull);
    expect(alert.daysUntilExpiry, isNull);
    expect(alert.severity, 'low');
    expect(alert.reasons, isEmpty);
  });
}
