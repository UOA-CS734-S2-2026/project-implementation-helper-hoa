// This is a basic Flutter widget test.
//
// To perform an interaction with a widget in your test, use the WidgetTester
// utility in the flutter_test package. For example, you can send tap and scroll
// gestures. You can also use WidgetTester to find child widgets in the widget
// tree, read text, and verify that the values of widget properties are correct.

import 'dart:async';

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

class EmptyAlertApi extends InventoryAlertApiService {
  @override
  Future<List<InventoryAlert>> getAlerts() async => [];
}

class FailingAlertApi extends InventoryAlertApiService {
  int calls = 0;

  @override
  Future<List<InventoryAlert>> getAlerts() async {
    calls++;
    throw Exception('offline');
  }
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

  testWidgets('Inventory alerts show a loading indicator while fetching',
      (tester) async {
    final response = Completer<List<InventoryAlert>>();
    final api = _CompleterAlertApi(response);

    await tester.pumpWidget(MaterialApp(home: HomePage(alertApi: api)));

    expect(find.byType(CircularProgressIndicator), findsOneWidget);

    response.complete([]);
    await tester.pumpAndSettle();
    expect(find.text('No inventory alerts.'), findsOneWidget);
  });

  testWidgets('Inventory alerts show the empty state', (tester) async {
    await tester
        .pumpWidget(MaterialApp(home: HomePage(alertApi: EmptyAlertApi())));
    await tester.pumpAndSettle();

    expect(find.text('No inventory alerts.'), findsOneWidget);
  });

  testWidgets('Inventory alert errors can be retried', (tester) async {
    final api = FailingAlertApi();
    await tester.pumpWidget(MaterialApp(home: HomePage(alertApi: api)));
    await tester.pumpAndSettle();

    expect(find.textContaining('Could not load inventory alerts.'),
        findsOneWidget);
    expect(api.calls, 1);

    await tester.tap(find.text('Retry'));
    await tester.pumpAndSettle();

    expect(api.calls, 2);
  });
}

class _CompleterAlertApi extends InventoryAlertApiService {
  _CompleterAlertApi(this.response);

  final Completer<List<InventoryAlert>> response;

  @override
  Future<List<InventoryAlert>> getAlerts() => response.future;
}
