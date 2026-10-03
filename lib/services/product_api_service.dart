import 'package:http/http.dart' as http;
import 'dart:convert';
import '../config/api_config.dart';
import 'auth_service.dart';

/// Mirrors the server's `ProductRecord` (server/src/types/index.ts). Product ids
/// are Firestore document ids, so they are strings rather than integers.
class Product {
  final String id;
  final String sku;
  final String barcode;
  final String name;
  final String category;
  final String description;
  final double costPrice;
  final double sellingPrice;
  final double taxRate;
  final int totalStock;
  final double reorderPoint;
  final String unitOfMeasure;
  final double totalSold;
  final double salesVelocity;
  final List<String> tags;
  final String status;
  final List<String> images;

  Product({
    required this.id,
    required this.sku,
    required this.barcode,
    required this.name,
    required this.category,
    required this.description,
    required this.costPrice,
    required this.sellingPrice,
    required this.taxRate,
    required this.totalStock,
    required this.reorderPoint,
    required this.unitOfMeasure,
    required this.totalSold,
    required this.salesVelocity,
    required this.tags,
    required this.status,
    required this.images,
  });

  factory Product.fromJson(Map<String, dynamic> json) {
    double number(String key) => (json[key] as num?)?.toDouble() ?? 0;

    return Product(
      id: json['id'] as String? ?? '',
      sku: json['sku'] as String? ?? '',
      barcode: json['barcode'] as String? ?? '',
      name: json['name'] as String? ?? '',
      category: json['category'] as String? ?? '',
      description: json['description'] as String? ?? '',
      costPrice: number('costPrice'),
      sellingPrice: number('sellingPrice'),
      taxRate: number('taxRate'),
      totalStock: (json['totalStock'] as num?)?.toInt() ?? 0,
      reorderPoint: number('reorderPoint'),
      unitOfMeasure: json['unitOfMeasure'] as String? ?? '',
      totalSold: number('totalSold'),
      salesVelocity: number('salesVelocity'),
      tags: List<String>.from(json['tags'] as List<dynamic>? ?? const []),
      status: json['status'] as String? ?? '',
      images:
          List<String>.from(json['images'] as List<dynamic>? ?? const []),
    );
  }

  static Future<Product?> getProductById(String id) async {
    final auth = AuthController.instance;
    final response = await http.get(
      Uri.parse('${ApiConfig.expressBaseUrl}/products/$id'),
      headers: await auth.authHeaders(),
    );

    if (response.statusCode == 401) {
      await auth.handleUnauthorized();
      throw Exception('Your session has expired. Please log in again.');
    }

    if (response.statusCode == 404) return null;
    if (response.statusCode != 200) {
      throw Exception('Could not load the product (${response.statusCode}).');
    }

    return Product.fromJson(jsonDecode(response.body) as Map<String, dynamic>);
  }

  static Future<List<Product>> getAllProducts() async {
    final auth = AuthController.instance;
    final response = await http.get(
      Uri.parse('${ApiConfig.expressBaseUrl}/products'),
      headers: await auth.authHeaders(),
    );

    if (response.statusCode == 401) {
      await auth.handleUnauthorized();
      throw Exception('Your session has expired. Please log in again.');
    }

    if (response.statusCode != 200) {
      throw Exception('Could not load products (${response.statusCode}).');
    }

    final decoded = jsonDecode(response.body) as List<dynamic>;
    return decoded
        .map((json) => Product.fromJson(json as Map<String, dynamic>))
        .toList();
  }
}