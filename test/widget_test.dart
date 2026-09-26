// This is a basic Flutter widget test.
//
// To perform an interaction with a widget in your test, use the WidgetTester
// utility in the flutter_test package. For example, you can send tap and scroll
// gestures. You can also use WidgetTester to find child widgets in the widget
// tree, read text, and verify that the values of widget properties are correct.

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:helper_hoa/features/home_page.dart';
import 'package:helper_hoa/models/inventory_alert.dart';
import 'package:helper_hoa/services/inventory_alert_api_service.dart';

class FakeAlertApi extends InventoryAlertApiService {
  @override
  Future<List<InventoryAlert>> getAlerts() async => [
        InventoryAlert.fromJson({
          'productId': 'product-1',
          'productName': 'Coffee beans',
          'vendorName': 'Fresh Supply',
          'totalSold': 24,
          'quantityRemaining': 3,
          'unitOfMeasure': 'bags',
          'reorderPoint': 5,
          'nearestExpiryDate': '2026-10-01T12:00:00.000Z',
          'daysUntilExpiry': 5,
          'severity': 'low',
          'reasons': ['low_stock'],
        }),
      ];
}

void main() {
  testWidgets('Alert tap reveals and hides product details', (tester) async {
    await tester
        .pumpWidget(MaterialApp(home: HomePage(alertApi: FakeAlertApi())));
    await tester.pumpAndSettle();

    expect(find.text('Fresh Supply'), findsNothing);
    await tester.tap(find.text('Coffee beans'));
    await tester.pumpAndSettle();

    expect(find.text('Fresh Supply'), findsOneWidget);
    expect(find.text('24 bags'), findsOneWidget);
    expect(find.text('Expiration date'), findsOneWidget);
    expect(find.textContaining('2026'), findsOneWidget);

    await tester.tap(find.text('Coffee beans'));
    await tester.pumpAndSettle();
    expect(find.text('Fresh Supply'), findsNothing);
  });

  testWidgets('Counter increments smoke test', (WidgetTester tester) async {
    // Build our app and trigger a frame.
    await tester.pumpWidget(MaterialApp(
      home: Scaffold(
        appBar: AppBar(title: const Text('Counter')),
        body: const Center(child: Text('0')),
        floatingActionButton: FloatingActionButton(
          onPressed: () {},
          child: const Icon(Icons.add),
        ),
      ),
    ));

    // Verify that our counter starts at 0.
    expect(find.text('0'), findsOneWidget);
    expect(find.text('1'), findsNothing);

    // Tap the '+' icon and trigger a frame.
    await tester.tap(find.byIcon(Icons.add));
    await tester.pump();

    // Verify that our counter has incremented.
    expect(find.text('0'), findsNothing);
    expect(find.text('1'), findsOneWidget);
  });
}
