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
      expect(item.expiryDate, '');
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
}
