import 'dart:io';

import 'package:file_picker/file_picker.dart';
import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import 'package:flutter/material.dart';
import '../theme_extensions.dart';


class InventoryPage extends StatefulWidget {
  const InventoryPage({super.key});

  @override
  State<InventoryPage> createState() => _InventoryPageState();
}

class _InventoryPageState extends State<InventoryPage> {
  //TODO:Implement fetching items from server and displaying them in a list view
  final List<Item> _items = [Item(
    name: 'Wireless Headphones',
    index: '0',
    category: 'Electronics',
    price: '\$99.99',
    quantity: 10,
  ),
  Item(
    name: 'Smart Watch',
    index: '1',
    category: 'Electronics',
    price: '\$199.99',
    quantity: 5,
  ),
  Item(
    name: 'Running Shoes',
    index: '2',
    category: 'Apparel',
    price: '\$79.99',
    quantity: 20,
  ),
  Item(
    name: 'Cotton T-Shirt',
    index: '3',
    category: 'Apparel',
    price: '\$19.99',
    quantity: 50,
  ),
  Item(
    name: 'Stainless Steel Water Bottle',
    index: '4',
    category: 'Home & Kitchen',
    price: '\$29.99',
    quantity: 15,
  ),
  Item(
    name: 'Espresso Capsules',
    index: '5',
    category: 'Food',
    price: '\$249.99',
    expireDate: '2026-11-20',
    quantity: 3,
  ),
  Item (
    category: 'Food', 
    name: 'Organic Almonds', 
    index: '6', 
    price: '\$15.99', 
    expireDate: '2026-12-31',
    quantity: 25,)
    ];

  List<Item> _filteredItems = [];
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
              children: [
                DropdownButton<String>(
                  value: selectedCategory,
                  items: <String>['All', 'Electronics', 'Apparel', 'Home & Kitchen']
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
                  value: orderBy,
                  items: <String>['Alphabetical Ascending', 
                                  'Alphabetical Descending', 
                                  'Price Ascending', 
                                  'Price Descending', 
                                  'Expire Date Ascending', 
                                  'Expire Date Descending']
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
                final item = _filteredItems[index];
                return Card.outlined(
                  clipBehavior: Clip.antiAlias,
                  child: InkWell(
                    splashColor: Colors.blue.withAlpha(30),
                    onTap: () {
                      debugPrint('Card tapped.');
                    },
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        ListTile(
                          title: Text(item.name),
                          subtitle: Text('Category: ${item.category}'),
                          trailing: Text(item.price),
                        ),
                      ],

                      
                    ),
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

class Item {
  final String name;
  final String index;
  final String category;
  final String price;
  final String expireDate;
  final int quantity;

  Item({
    required this.name,
    required this.index, 
    required this.category,
    required this.price,
    this.expireDate = '',
    required this.quantity,
  });
}