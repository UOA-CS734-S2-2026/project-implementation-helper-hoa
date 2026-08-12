import 'package:flutter/material.dart';

class SellPage extends StatefulWidget {
  const SellPage({super.key});

  @override
  State<SellPage> createState() => _SellPageState();
}

class _SellPageState extends State<SellPage> {
  final TextEditingController _itemController = TextEditingController();

  @override
  void dispose() {
    _itemController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.all(20.0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            'List an item',
            style: TextStyle(fontSize: 28, fontWeight: FontWeight.bold),
          ),
          const SizedBox(height: 20),
          TextField(
            controller: _itemController,
            decoration: const InputDecoration(
              border: OutlineInputBorder(),
              labelText: 'Item name',
            ),
          ),
          const SizedBox(height: 20),
          ElevatedButton(
            onPressed: () {
              final itemName = _itemController.text.trim();

              if (itemName.isEmpty) {
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(content: Text('Please enter an item name.')),
                );
                return;
              }

              ScaffoldMessenger.of(context).showSnackBar(
                SnackBar(content: Text('Listing "$itemName" for sale.')),
              );
            },
            child: const Text('List item'),
          ),
        ],
      ),
    );
  }
}
