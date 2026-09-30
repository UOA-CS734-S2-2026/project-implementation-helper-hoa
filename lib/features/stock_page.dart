import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../theme_extensions.dart';

/// Stock page entry point. Uploading stock now happens through the dedicated
/// Snap flow (scan → review → add), so this page acts as a gateway.
class StockPage extends StatelessWidget {
  const StockPage({super.key});

  static const _blue = Color(0xFF4E6CD6);
  static const _yellow = Color(0xFFFFDF58);

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.fromLTRB(20, 18, 20, 24),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                'Stock',
                style: TextStyle(
                  fontSize: 26,
                  fontWeight: FontWeight.w800,
                  color: context.primaryText,
                ),
              ),
              const SizedBox(height: 6),
              Text(
                'Add stock from a supplier invoice or manage your inventory.',
                style: TextStyle(
                  fontSize: 13.5,
                  color: context.secondaryText,
                ),
              ),
              const SizedBox(height: 20),
              Container(
                width: double.infinity,
                padding: const EdgeInsets.all(18),
                decoration: BoxDecoration(
                  color: context.cardBackground,
                  borderRadius: BorderRadius.circular(22),
                  boxShadow: [
                    BoxShadow(
                      color: Colors.black.withValues(alpha: 0.04),
                      blurRadius: 10,
                      offset: const Offset(0, 4),
                    ),
                  ],
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Add stock from invoice',
                      style: TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.w700,
                        color: context.primaryText,
                      ),
                    ),
                    const SizedBox(height: 6),
                    Text(
                      'Snap, scan and review a supplier invoice. We extract the '
                      'items, you approve, and stock is updated.',
                      style: TextStyle(
                        fontSize: 13,
                        color: context.secondaryText,
                      ),
                    ),
                    const SizedBox(height: 16),
                    Row(
                      children: [
                        Expanded(
                          child: _button(
                            icon: Icons.upload_file_rounded,
                            label: 'Upload PDF',
                            color: _blue,
                            onTap: () => context.go('/snap'),
                          ),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: _button(
                            icon: Icons.camera_alt_rounded,
                            label: 'Take Photo',
                            color: _yellow,
                            foreground: const Color(0xFF111111),
                            onTap: () => context.go('/snap'),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 16),
                    SizedBox(
                      width: double.infinity,
                      height: 54,
                      child: ElevatedButton.icon(
                        onPressed: () => context.go('/snap'),
                        style: ElevatedButton.styleFrom(
                          backgroundColor: _blue,
                          foregroundColor: Colors.white,
                          elevation: 0,
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(16),
                          ),
                        ),
                        icon: const Icon(Icons.auto_awesome_motion_outlined),
                        label: const Text(
                          'Open Snap',
                          style: TextStyle(
                            fontSize: 15,
                            fontWeight: FontWeight.w700,
                          ),
                        ),
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 18),
              Container(
                width: double.infinity,
                padding: const EdgeInsets.all(18),
                decoration: BoxDecoration(
                  color: context.subtleFill,
                  borderRadius: BorderRadius.circular(20),
                ),
                child: Row(
                  children: [
                    const Icon(Icons.tips_and_updates_outlined, color: _blue),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Text(
                        'Recent stock activity from purchases will appear here.',
                        style: TextStyle(
                          fontSize: 13,
                          color: context.secondaryText,
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _button({
    required IconData icon,
    required String label,
    required Color color,
    required VoidCallback onTap,
    Color foreground = Colors.white,
  }) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        height: 56,
        decoration: BoxDecoration(
          color: color,
          borderRadius: BorderRadius.circular(16),
        ),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(icon, color: foreground, size: 20),
            const SizedBox(width: 8),
            Text(
              label,
              style: TextStyle(
                color: foreground,
                fontWeight: FontWeight.w700,
                fontSize: 13,
              ),
            ),
          ],
        ),
      ),
    );
  }
}