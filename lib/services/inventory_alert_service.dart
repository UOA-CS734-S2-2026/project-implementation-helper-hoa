import 'dart:convert';

import 'package:http/http.dart' as http;

import '../config/api_config.dart';
import 'auth_service.dart';

class AlertVendor {
  final String name;
  final String? email;
  final String? phone;
  final String? address;

  AlertVendor({required this.name, this.email, this.phone, this.address});

  factory AlertVendor.fromJson(Map<String, dynamic> json) => AlertVendor(
        name: json['name'] as String? ?? 'Unknown vendor',
        email: json['email'] as String?,
        phone: json['phone'] as String?,
        address: json['address'] as String?,
      );
}

class AlertBatch {
  final String batchNumber;
  final num quantity;
  final DateTime? expirationDate;
  final DateTime? receivedDate;
  final String invoiceNumber;
  final AlertVendor? vendor;

  AlertBatch({
    required this.batchNumber,
    required this.quantity,
    required this.expirationDate,
    required this.receivedDate,
    required this.invoiceNumber,
    required this.vendor,
  });

  factory AlertBatch.fromJson(Map<String, dynamic> json) => AlertBatch(
        batchNumber: json['batchNumber'] as String? ?? '',
        quantity: json['quantity'] as num? ?? 0,
        expirationDate:
            DateTime.tryParse(json['expirationDate'] as String? ?? ''),
        receivedDate: DateTime.tryParse(json['receivedDate'] as String? ?? ''),
        invoiceNumber: json['invoiceNumber'] as String? ?? '',
        vendor: json['vendor'] is Map<String, dynamic>
            ? AlertVendor.fromJson(json['vendor'] as Map<String, dynamic>)
            : null,
      );
}

class InventoryAlert {
  final String productId;
  final String name;
  final String sku;
  final String category;
  final String unitOfMeasure;
  final String level;
  final List<String> reasons;
  final num totalStock;
  final num reorderPoint;
  final num sellingPrice;
  final DateTime? nearestExpiry;
  final int? daysToExpiry;
  final List<AlertBatch> batches;

  InventoryAlert({
    required this.productId,
    required this.name,
    required this.sku,
    required this.category,
    required this.unitOfMeasure,
    required this.level,
    required this.reasons,
    required this.totalStock,
    required this.reorderPoint,
    required this.sellingPrice,
    required this.nearestExpiry,
    required this.daysToExpiry,
    required this.batches,
  });

  factory InventoryAlert.fromJson(Map<String, dynamic> json) => InventoryAlert(
        productId: json['productId'] as String? ?? '',
        name: json['name'] as String? ?? '',
        sku: json['sku'] as String? ?? '',
        category: json['category'] as String? ?? '',
        unitOfMeasure: json['unitOfMeasure'] as String? ?? 'each',
        level: json['level'] as String? ?? '',
        reasons: List<String>.from(json['reasons'] as List<dynamic>? ?? []),
        totalStock: json['totalStock'] as num? ?? 0,
        reorderPoint: json['reorderPoint'] as num? ?? 0,
        sellingPrice: json['sellingPrice'] as num? ?? 0,
        nearestExpiry:
            DateTime.tryParse(json['nearestExpiry'] as String? ?? ''),
        daysToExpiry: (json['daysToExpiry'] as num?)?.toInt(),
        batches: (json['batches'] as List<dynamic>? ?? [])
            .map((b) => AlertBatch.fromJson(b as Map<String, dynamic>))
            .toList(),
      );
}

class InventoryAlertService {
  Future<List<InventoryAlert>> fetchAlerts() async {
    final auth = AuthController.instance;
    final response = await http.get(
      Uri.parse('${ApiConfig.expressBaseUrl}/products/alerts'),
      headers: await auth.authHeaders(),
    );

    if (response.statusCode == 401) {
      await auth.handleUnauthorized();
      throw Exception('Your session has expired. Please log in again.');
    }

    if (response.statusCode != 200) {
      throw Exception('Could not load inventory alerts.');
    }

    final decoded = jsonDecode(response.body) as List<dynamic>;
    return decoded
        .map((json) => InventoryAlert.fromJson(json as Map<String, dynamic>))
        .toList();
  }
}
