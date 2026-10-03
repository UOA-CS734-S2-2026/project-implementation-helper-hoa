import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:helper_hoa/features/invoice_review_page.dart';
import 'package:helper_hoa/models/invoice_review.dart';

void main() {
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

  testWidgets('Invoice items start selected and can be toggled',
      (tester) async {
    await tester.pumpWidget(
      const MaterialApp(home: InvoiceReviewPage(invoice: invoice)),
    );

    expect(find.text('Fresh Supply'), findsOneWidget);
    expect(find.text('Invoice: INV-42'), findsOneWidget);
    expect(
      tester
          .widget<CheckboxListTile>(find.byType(CheckboxListTile).at(0))
          .value,
      isTrue,
    );
    expect(
      tester
          .widget<CheckboxListTile>(find.byType(CheckboxListTile).at(1))
          .value,
      isTrue,
    );

    await tester.tap(find.text('Coffee beans'));
    await tester.pump();

    expect(
      tester
          .widget<CheckboxListTile>(find.byType(CheckboxListTile).at(0))
          .value,
      isFalse,
    );
  });

  testWidgets('Confirming with no selected items shows validation',
      (tester) async {
    await tester.pumpWidget(
      const MaterialApp(home: InvoiceReviewPage(invoice: invoice)),
    );

    await tester.tap(find.text('Coffee beans'));
    await tester.tap(find.text('Tea leaves'));
    await tester.pump();
    await tester.tap(find.text('Confirm selected items'));
    await tester.pumpAndSettle();

    expect(find.text('Select at least one item to confirm.'), findsOneWidget);
  });
}
