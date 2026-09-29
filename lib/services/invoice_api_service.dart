import 'dart:convert';

import 'package:http/http.dart' as http;

import '../config/api_config.dart';
import '../models/invoice_review.dart';

class ConfirmResultItem {
  const ConfirmResultItem({
    required this.productId,
    required this.created,
    required this.name,
  });

  final String productId;
  final bool created;
  final String name;

  factory ConfirmResultItem.fromJson(Map<String, dynamic> json) {
    return ConfirmResultItem(
      productId: json['productId'] as String? ?? '',
      created: json['created'] as bool? ?? false,
      name: json['name'] as String? ?? '',
    );
  }
}

class InvoiceApiService {
  /// Confirms an invoice with the Express backend. The server upserts a
  /// product per line item and a received batch into Firestore.
  ///
  /// Returns the per-item result (product id + whether it was newly created).
  Future<List<ConfirmResultItem>> saveConfirmedInvoice({
    required String supplierName,
    required String invoiceNumber,
    required String receivedDate,
    required List<InvoiceItem> items,
  }) async {
    final response = await http.post(
      Uri.parse('${ApiConfig.expressBaseUrl}/api/invoices'),
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

    final decoded = jsonDecode(response.body) as Map<String, dynamic>;
    final rawItems = decoded['items'] as List? ?? const [];
    return rawItems
        .whereType<Map>()
        .map((item) => ConfirmResultItem.fromJson(Map<String, dynamic>.from(item)))
        .toList();
  }
}