import 'dart:io';

import 'package:file_picker/file_picker.dart';
import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import 'package:flutter/material.dart';
import '../theme_extensions.dart';
import 'product_class.dart';

class InventoryPage extends StatefulWidget {
  const InventoryPage({super.key});

  @override
  State<InventoryPage> createState() => _InventoryPageState();
}

class _InventoryPageState extends State<InventoryPage> {
  //TODO:Implement fetching items from server and displaying them in a list view
  final List<Product> _items = [Product(
    name: 'Wireless Headphones',
    index: '0',
    category: 'Electronics',
    price: '\$99.99',
    quantity: "10 units left",
    urgencyMessage: "Low Stock",
    urgencyLevel: 1,
  ),
  Product(
    name: 'Smart Watch',
    index: '1',
    category: 'Electronics',
    price: '\$199.99',
    quantity: "5 units left",
    urgencyMessage: "Low Stock",
    urgencyLevel: 2,
  ),
  Product(
    name: 'Running Shoes',
    index: '2',
    category: 'Apparel',
    price: '\$79.99',
    quantity: "20 pairs left",
    urgencyMessage: "",
    urgencyLevel: 0,
  ),
  Product(
    name: 'Cotton T-Shirt',
    index: '3',
    category: 'Apparel',
    price: '\$19.99',
    quantity: "50 units left",
    urgencyMessage: "",
    urgencyLevel: 0,
  ),
  Product(
    name: 'Stainless Steel Water Bottle',
    index: '4',
    category: 'Home & Kitchen',
    price: '\$29.99',
    quantity: "0 units left",
    urgencyMessage: "Out of Stock",
    urgencyLevel: 2,
  ),
  Product(
    name: 'Espresso Capsules',
    index: '5',
    category: 'Food and Beverages',
    price: '\$249.99',
    expireDate: '2026-11-20',
    quantity: "3 boxes left",
    urgencyMessage: "Expiring Soon",
    urgencyLevel: 2,
  ),
    ];

  List<Product> _filteredItems = [];
  String _searchQuery = '';
  String selectedCategory = 'All';
  String orderBy = 'Alphabetical Ascending';

  @override
  void initState() {
    super.initState();
    _filteredItems = _items;
  }

  void _filterItems() {
    setState(() {
      _filteredItems = _items.where((item) {
        final matchesSearchQuery = item.name.toLowerCase().contains(_searchQuery.toLowerCase());
        final matchesCategory = selectedCategory == 'All' || item.category == selectedCategory;
        return matchesSearchQuery && matchesCategory;
      }).toList();

      switch (orderBy) {
        case 'Alphabetical Ascending':
          _filteredItems.sort((a, b) => a.name.compareTo(b.name));
          break;
        case 'Alphabetical Descending':
          _filteredItems.sort((a, b) => b.name.compareTo(a.name));
          break;
        case 'Price Ascending':
          _filteredItems.sort((a, b) => double.parse(a.price.substring(1)).compareTo(double.parse(b.price.substring(1))));
          break;
        case 'Price Descending':
          _filteredItems.sort((a, b) => double.parse(b.price.substring(1)).compareTo(double.parse(a.price.substring(1))));
          break;
        case 'Expire Date Ascending':
          _filteredItems.sort((a, b) => a.expireDate.compareTo(b.expireDate));
          break;
        case 'Expire Date Descending':
          _filteredItems.sort((a, b) => b.expireDate.compareTo(a.expireDate));
          break;
        case 'Most Urgent':
          _filteredItems.sort((a, b) => b.urgencyLevel.compareTo(a.urgencyLevel));
          break;
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text(
                'Inventory Search',
                style: TextStyle(
                  fontSize: 28,
                  fontWeight: FontWeight.w800,
                  color: context.primaryText,
                ),
        )
      ),
      body: Column(
        children: [
          Padding(
            padding: const EdgeInsets.all(8.0),
            child: TextField(
              decoration: InputDecoration(
                  hintText: 'Search...',
                  hintStyle: TextStyle(color: Colors.grey.shade500),
                  prefixIcon: const Icon(Icons.search, color: Color(0xFF4E6CD6)),
                  filled: true,
                  fillColor: Colors.white,
                  border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(18),
                    borderSide: BorderSide(
                      color: const Color(0xFF4E6CD6).withValues(alpha: 0.2),
                    ),
                  ),
                  enabledBorder: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(18),
                    borderSide: BorderSide(
                      color: const Color(0xFF4E6CD6).withValues(alpha: 0.2),
                    ),
                  ),
                  focusedBorder: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(18),
                    borderSide:
                        const BorderSide(color: Color(0xFF4E6CD6), width: 1.5),
                  ),
                  contentPadding: const EdgeInsets.symmetric(
                    horizontal: 16,
                    vertical: 15,
                  ),
                ),
              onChanged: (value) {
                _searchQuery = value;
                _filterItems();
              },
            ),
          ),
          Padding(
            padding: const EdgeInsets.all(8.0),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                DropdownButton<String>(
                  borderRadius: BorderRadius.circular(8),
                  value: selectedCategory,
                  items: <String>['All', 'Electronics', 'Apparel', 'Home & Kitchen', "Food & Beverages"]
                      .map<DropdownMenuItem<String>>((String value) {
                    return DropdownMenuItem<String>(
                      value: value,
                      child: Text(value),
                    );
                  }).toList(),
                  onChanged: (String? newValue) {
                    setState(() {
                      selectedCategory = newValue!;
                      _filterItems();
                    });
                  },
                ),
                const SizedBox(width: 16),
                DropdownButton<String>(
                  borderRadius: BorderRadius.circular(8),
                  value: orderBy,
                  items: <String>['Alphabetical Ascending', 
                                  'Alphabetical Descending', 
                                  'Price Ascending', 
                                  'Price Descending', 
                                  'Expire Date Ascending', 
                                  'Expire Date Descending',
                                  'Most Urgent',]
                      .map<DropdownMenuItem<String>>((String value) {
                    return DropdownMenuItem<String>(
                      value: value,
                      child: Text(value),
                    );
                  }).toList(),
                  onChanged: (String? newValue) {
                    setState(() {
                      orderBy = newValue!;
                      _filterItems();
                    });
                  },
                ),
              ],
            ),
          ),
          Expanded(
            child: ListView.builder(
              itemCount: _filteredItems.length,
              itemBuilder: (context, index) {
                final Product item = _filteredItems[index];
                final Color urgencyColor = switch (item.urgencyLevel) {
                  1 => const Color(0xFFF59E0B),
                  2 => const Color(0xFFE74C3C),
                  _ => Colors.grey,
                };
              
                return Card.outlined(
                  clipBehavior: Clip.antiAlias,
                  child: InkWell(
                    splashColor: Colors.blue.withAlpha(30),
                    onTap: () {
                      debugPrint('Card tapped.');
                    },
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: <Widget>[
                        Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: <Widget>[
                            Container(
                              padding: const EdgeInsets.all(16),
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: <Widget>[
                                  Text(
                                    item.name,
                                    style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
                                  ),
                                  Text('Category: ${item.category}'),
                                  Text('Price: ${item.price}'),
                                  if (item.expireDate.isNotEmpty)
                                    Text('Expire Date: ${item.expireDate}'),
                                  Text('Quantity: ${item.quantity}'),
                                ],
                              ),
                            ),
                          ],
                        ),
                        Column(
                          crossAxisAlignment: CrossAxisAlignment.end,
                          children: [
                          Container(
                            padding: const EdgeInsets.all(16),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.end,
                              children: <Widget>[
                                if (item.urgencyMessage.isNotEmpty)
                                  Text(
                                    '${item.urgencyMessage}',
                                    style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold,
                                    color: urgencyColor)
                                    ),
                                  
                                  Container(
                                  width: 38,
                                  height: 38,
                                  decoration: BoxDecoration(
                                    color: urgencyColor.withValues(alpha: 0.14),
                                    borderRadius: BorderRadius.circular(12),
                                  ),
                                  child: Icon(
                                    item.urgencyLevel > 0 ? Icons.warning_amber_rounded : Icons.info_outline_rounded,
                                    color: urgencyColor,
                                    size: 20,
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ],)
                      ]
                    ) 
                  )
                );
              },
            ),
          ),
        ],
      ),
    );
  }
}