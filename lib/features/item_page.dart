import 'item_class.dart';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../widgets/app_bottom_nav.dart';


class ItemPage extends StatelessWidget {
  final Item item;

  const ItemPage({Key? key, required this.item}) : super(key: key);

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
            Text('Price: ${item.price}'),
            if (item.expireDate.isNotEmpty)
              Text('Expire Date: ${item.expireDate}'),
            Text('Quantity: ${item.quantity}'),
            if (item.urgencyMessage.isNotEmpty)
              Text(
                '${item.urgencyMessage}',
                style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
              ),
          ],
        ),
      ),
    );
  }
}
