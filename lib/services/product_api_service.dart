import 'package:http/http.dart' as http;
import 'dart:convert';
import '../config/api_config.dart';

class Product {
  final int id;
  final String sku;
  final String name;
  final String category;
  final String description;
  final String costPrice;
  final String sellingPrice;
  final String taxRate;
  final int totalStock;
  final String reOrderPoint;
  final String unitOfMeasure;
  final String totalSales;
  final String salesVelocity;
  final List<String> tags;
  final String status;
  final List<String> images;

  Product({
    required this.id,
    required this.sku,
    required this.name,
    required this.category,
    required this.description,
    required this.costPrice,
    required this.sellingPrice,
    required this.taxRate,
    required this.totalStock,
    required this.reOrderPoint,
    required this.unitOfMeasure,
    required this.totalSales,
    required this.salesVelocity,
    required this.tags,
    required this.status,
    required this.images,
  });

  factory Product.fromJson(Map<String, dynamic> json) {
      return Product(
        id: json['id'] as int? ?? 0,
        sku: json['sku'] as String? ?? '',
        name: json['name'] as String? ?? '',
        category: json['category'] as String? ?? '',
        description: json['description'] as String? ?? '',
        costPrice: json['costPrice'] as String? ?? '',
        sellingPrice: json['sellingPrice'] as String? ?? '',
        taxRate: json['taxRate'] as String? ?? '',
        totalStock: json['totalStock'] as int? ?? 0,
        reOrderPoint: json['reOrderPoint'] as String? ?? '',
        unitOfMeasure: json['unitOfMeasure'] as String? ?? '',
        totalSales: json['totalSales'] as String? ?? '',
        salesVelocity: json['salesVelocity'] as String? ?? '',
        tags: List<String>.from(json['tags'] as List<dynamic>? ?? []),
        status: json['status'] as String? ?? '',
        images: List<String>.from(json['images'] as List<dynamic>? ?? []),
      );
    }

  static Future<Product?> getProductById(int id) async {
    final response = await http.post(Uri.parse('${ApiConfig.expressBaseUrl}/store/product/$id'));
    if (response.statusCode == 200) {
      final Map<String, dynamic> json = jsonDecode(response.body) as Map<String, dynamic>;
      return Product.fromJson(json);
    }
    return null;
  }

  static Future<List<Product>> getAllProducts() async {
    final response = await http.post(Uri.parse('${ApiConfig.expressBaseUrl}/store/products'));
    if (response.statusCode == 200) {
      final List<dynamic> jsonList = jsonDecode(response.body) as List<dynamic>;
      return jsonList.map((json) => Product.fromJson(json as Map<String, dynamic>)).toList();
    }
    return [];
  }

}