import 'dart:convert';

import 'package:http/http.dart' as http;

import '../models/invoice_review.dart';

class InvoiceApiService {
  static const _baseUrl = 'http://10.0.2.2:3000';

  Future<void> saveConfirmedInvoice({
    required String supplierName,
    required String invoiceNumber,
    required String receivedDate,
    required List<InvoiceItem> items,
  }) async {
    final response = await http.post(
      Uri.parse('$_baseUrl/api/invoices'),
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode({
        'supplierName': supplierName,
        'invoiceNumber': invoiceNumber,
        'receivedDate': receivedDate,
        'items': items.map((item) => item.toJson()).toList(),
      }),
    );

    if (response.statusCode != 201) {
      throw Exception('Could not save the confirmed invoice.');
    }
  }
}