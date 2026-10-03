import '../services/product_api_service.dart';
import 'package:flutter/material.dart';



class ProductPage extends StatefulWidget {
  final int itemID;
  const ProductPage({super.key, required this.itemID});

  @override
  State<ProductPage> createState() => _ProductPageState();
}

class _ProductPageState extends State<ProductPage> {
  
  late Future<Product?> item;
  @override
  void initState() {
    super.initState();
    item = Product.getProductById(widget.itemID);
  }

  @override
  Widget build(BuildContext context) {
    return FutureBuilder<Product?>(
      future: item,
      builder: (context, snapshot) {
        if (snapshot.connectionState == ConnectionState.waiting) {
          return const Center(child: CircularProgressIndicator());
        } else if (snapshot.hasError) {
          return Center(child: Text('Error: ${snapshot.error}'));
        } else if (!snapshot.hasData || snapshot.data == null) {
          return const Center(child: Text('No product found.'));
        } else {
          final product = snapshot.data!;
          return Scaffold(
            appBar: AppBar(
              title: Text(product.name),
            ),
            body: Padding(
              padding: const EdgeInsets.all(16.0),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text('SKU: ${product.sku}'),
                  Text('Category: ${product.category}'),
                  Text('Description: ${product.description}'),
                  Text('Cost Price: ${product.costPrice}'),
                  Text('Selling Price: ${product.sellingPrice}'),
                  Text('Tax Rate: ${product.taxRate}'),
                  Text('Total Stock: ${product.totalStock}'),
                  Text('Reorder Point: ${product.reOrderPoint}'),
                  Text('Unit of Measure: ${product.unitOfMeasure}'),
                  Text('Total Sales: ${product.totalSales}'),
                  Text('Sales Velocity: ${product.salesVelocity}'),
                  Text('Tags: ${product.tags.join(', ')}'),
                  Text('Status: ${product.status}'),
                  // Display images if available
                  if (product.images.isNotEmpty)
                    SizedBox(
                      height: 200,
                      child: ListView.builder(
                        scrollDirection: Axis.horizontal,
                        itemCount: product.images.length,
                        itemBuilder: (context, index) {
                          return Padding(
                            padding: const EdgeInsets.all(8.0),
                            child: Image.network(product.images[index]),
                          );
                        },
                      ),
                    ),
                ],
              ),
            ),
          );
        }
      },
    );
  }
}
