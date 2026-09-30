
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

  Future<Product?> getProductById(int id) async {

    return null;
  }

  Future<List<Product>> getAllProducts() async {

    return [];
  }
}
