
import 'package:flutter/material.dart';
import '../theme_extensions.dart';
import '../services/product_api_service.dart';
import 'product_page.dart';

class InventoryPage extends StatefulWidget {
  final String search;
  const InventoryPage({super.key, required this.search});

  @override
  State<InventoryPage> createState() => _InventoryPageState();
}

class _InventoryPageState extends State<InventoryPage> {
  late Future<List<Product>> _itemsFuture;

  List<Product> _items = [];
  List<Product> _filteredItems = [];
  String _searchQuery = "";
  String selectedCategory = 'All';
  String orderBy = 'Alphabetical Ascending';

  @override
  void initState() {
    super.initState();
    _itemsFuture = Product.getAllProducts();
    _itemsFuture.then((value) {
      setState(() {
        _items = value;
        _searchQuery = widget.search;
      });
      // Apply the query the home page search bar passed in, otherwise the list
      // is rendered unfiltered on arrival.
      _filterItems();
    });
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
          _filteredItems.sort((a, b) => a.sellingPrice.compareTo(b.sellingPrice));
          break;
        case 'Price Descending':
          _filteredItems.sort((a, b) => b.sellingPrice.compareTo(a.sellingPrice));
          break;
        case 'Most Urgent':
          _filteredItems.sort((a, b) => b.status.compareTo(a.status));
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
            child: FutureBuilder<List<Product>>(
              future: _itemsFuture,
              builder: (context, snapshot) {
                if (snapshot.connectionState == ConnectionState.waiting) {
                  return const Center(child: CircularProgressIndicator());
                } else if (snapshot.hasError) {
                  return Center(child: Text('Error: ${snapshot.error}'));
                } else if (!snapshot.hasData || snapshot.data!.isEmpty) {
                  return const Center(child: Text('No products found.'));
                } else {
                  return ListView.builder(
                    itemCount: _filteredItems.length,
                    itemBuilder: (context, index) {
                      final Product item = _filteredItems[index];
                        final Color urgencyColor = switch (item.status) {
                          "out_of_stock" => const Color(0xFFE74C3C),
                          "active" => const Color(0xFFF59E0B),
                          _ => Colors.grey,
                        };
                    
                      return Card.outlined(
                        clipBehavior: Clip.antiAlias,
                        child: InkWell(
                          splashColor: Colors.blue.withAlpha(30),
                          onTap: () {
                            Navigator.push(
                              context,
                              MaterialPageRoute(
                                builder: (context) => ProductPage(itemID: item.id),
                              ),
                            );
                          
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
                                        Text('Price: ${item.sellingPrice}'),
                                        Text('Quantity: ${item.totalStock}'),
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
                                      if (item.status.isNotEmpty)
                                        Text(
                                          '${item.status}',
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
                                          item.status == 'Low Stock' ? Icons.warning_amber_rounded : Icons.info_outline_rounded,
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
                  );
                }
              },
            ),
          ),
        ],
      ),
    );
  }
}