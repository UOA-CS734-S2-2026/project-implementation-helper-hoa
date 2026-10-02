import 'dart:convert';

import 'package:http/http.dart' as http;

import '../config/api_config.dart';
import '../models/invoice_review.dart';
import 'auth_service.dart';

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
    final auth = AuthController.instance;
    final response = await http.post(
      Uri.parse('${ApiConfig.expressBaseUrl}/api/invoices'),
      headers: {
        'Content-Type': 'application/json',
        ...await auth.authHeaders(),
      },
      body: jsonEncode({
        'supplierName': supplierName,
        'invoiceNumber': invoiceNumber,
        'receivedDate': receivedDate,
        'items': items.map((item) => item.toJson()).toList(),
      }),
    );

    if (response.statusCode == 401) {
      await auth.handleUnauthorized();
      throw Exception('Your session has expired. Please log in again.');
    }

    if (response.statusCode == 403) {
      // This route has two different 403 sources. requireAuth uses it for an
      // invalid or expired token, while requireRole uses it for a role that is
      // not allowed to confirm invoices. Only the first one ends the session;
      // signing the user out over a permissions problem would be wrong.
      final detail = response.body.toLowerCase();
      if (detail.contains('token')) {
        await auth.handleUnauthorized();
        throw Exception('Your session has expired. Please log in again.');
      }

      throw Exception(
        'Your role is not allowed to confirm invoices. Ask an admin or manager.',
      );
    }

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