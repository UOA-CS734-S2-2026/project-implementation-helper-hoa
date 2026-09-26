import 'product_class.dart';
import 'package:flutter/material.dart';



class ProductPage extends StatelessWidget {
  final Product item;

  const ProductPage({Key? key, required this.item}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text(item.name),
      ),
      body: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('Category: ${item.category}'),
            Text('Sell Price: ${item.sellingPrice}'),
            Text('Cost Price: ${item.costPrice}'),
            Text('Quantity: ${item.totalStock}'),
            if (item.status.isNotEmpty)
              Text(
                '${item.status}',
                style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
              ),
          ],
        ),
      ),
    );
  }
}
