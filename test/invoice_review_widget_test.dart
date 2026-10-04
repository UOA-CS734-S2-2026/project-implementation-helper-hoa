import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:helper_hoa/features/invoice_review_page.dart';
import 'package:helper_hoa/models/invoice_review.dart';

const invoice = InvoiceReview(
  supplierName: 'Fresh Supply',
  invoiceNumber: 'INV-42',
  receivedDate: '2026-09-27',
  items: [
    InvoiceItem(
      lineNumber: 1,
      name: 'Coffee beans',
      quantity: 12,
      unit: 'bags',
      costPrice: 8.5,
      expiryDate: '2026-10-01',
    ),
    InvoiceItem(
      lineNumber: 2,
      name: 'Tea leaves',
      quantity: 6,
      unit: 'boxes',
      costPrice: 4.25,
      expiryDate: '2026-12-01',
    ),
  ],
);

void main() {
  Future<void> pumpReview(WidgetTester tester, {InvoiceReview? value}) {
    return tester.pumpWidget(
      MaterialApp(home: InvoiceReviewPage(invoice: value ?? invoice)),
    );
  }

  testWidgets('renders invoice details, items, and the calculated total',
      (tester) async {
    await pumpReview(tester);

    expect(find.text('Fresh Supply'), findsOneWidget);
    expect(find.text('INV-42'), findsOneWidget);
    expect(find.text('Coffee beans'), findsOneWidget);
    expect(find.text('Tea leaves'), findsOneWidget);
    expect(find.text('Total  \$127.50'), findsOneWidget);
  });

  testWidgets('edits a line item and recalculates the invoice total',
      (tester) async {
    tester.view.physicalSize = const Size(800, 1000);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);
    await pumpReview(tester);

    await tester.tap(find.byTooltip('Edit row').first);
    await tester.pump();
    await tester.enterText(find.byType(TextField).at(0), 'Espresso');
    await tester.enterText(find.byType(TextField).at(1), '10');
    await tester.enterText(find.byType(TextField).at(2), '9');
    final saveButton = find.widgetWithText(ElevatedButton, 'Save');
    await tester.tap(saveButton);
    await tester.pump();

    expect(find.text('Espresso'), findsOneWidget);
    expect(find.text('Total  \$115.50'), findsOneWidget);
  });

  testWidgets('shows the empty state and prevents approving an empty invoice',
      (tester) async {
    await pumpReview(
      tester,
      value: const InvoiceReview(
        supplierName: 'Fresh Supply',
        invoiceNumber: 'INV-42',
        receivedDate: '2026-09-27',
        items: [],
      ),
    );

    expect(find.text('No line items'), findsOneWidget);
    expect(find.text('Total  \$0.00'), findsOneWidget);
    await tester.tap(find.text('Approve'));
    await tester.pump();

    expect(find.text('Add at least one line item to approve.'), findsOneWidget);
  });

  testWidgets('removes a line item and updates the total', (tester) async {
    await pumpReview(tester);

    await tester.tap(find.byTooltip('Delete row').first);
    await tester.pump();

    expect(find.text('Coffee beans'), findsNothing);
    expect(find.text('Tea leaves'), findsOneWidget);
    expect(find.text('Total  \$25.50'), findsOneWidget);
  });
}
