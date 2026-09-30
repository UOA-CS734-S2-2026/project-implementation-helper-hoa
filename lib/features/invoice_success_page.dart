import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

class InvoiceSuccessPage extends StatelessWidget {
  const InvoiceSuccessPage({
    super.key,
    required this.itemsAdded,
    required this.newProducts,
  });

  final int itemsAdded;
  final int newProducts;

  static const _green = Color(0xFF50BF9A);
  static const _blue = Color(0xFF4E6CD6);

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF5F7FB),
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 24),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              const Spacer(flex: 2),
              Center(
                child: Container(
                  width: 96,
                  height: 96,
                  decoration: BoxDecoration(
                    color: _green.withValues(alpha: 0.14),
                    shape: BoxShape.circle,
                  ),
                  child: const Icon(
                    Icons.check_rounded,
                    color: _green,
                    size: 54,
                  ),
                ),
              ),
              const SizedBox(height: 26),
              const Text(
                'Inventory Updated.',
                textAlign: TextAlign.center,
                style: TextStyle(
                  fontSize: 24,
                  fontWeight: FontWeight.w800,
                ),
              ),
              const SizedBox(height: 10),
              Text(
                '$itemsAdded item${itemsAdded == 1 ? '' : 's'} added'
                '${newProducts > 0 ? ' · $newProducts new' : ''}',
                textAlign: TextAlign.center,
                style: TextStyle(
                  fontSize: 15,
                  color: Colors.grey.shade600,
                ),
              ),
              const Spacer(flex: 2),
              SizedBox(
                height: 56,
                child: ElevatedButton(
                  onPressed: () => context.go('/stock'),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: _blue,
                    foregroundColor: Colors.white,
                    elevation: 0,
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(16),
                    ),
                  ),
                  child: const Text(
                    'View Stock',
                    style: TextStyle(fontSize: 16, fontWeight: FontWeight.w700),
                  ),
                ),
              ),
              const SizedBox(height: 20),
            ],
          ),
        ),
      ),
    );
  }
}