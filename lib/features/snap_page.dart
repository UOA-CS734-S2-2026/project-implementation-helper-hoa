import 'package:file_picker/file_picker.dart';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:image_picker/image_picker.dart';

import '../models/invoice_review.dart';
import '../services/scan_api_service.dart';
import '../theme_extensions.dart';

class SnapPage extends StatefulWidget {
  const SnapPage({super.key});

  @override
  State<SnapPage> createState() => _SnapPageState();
}

class _SnapPageState extends State<SnapPage> {
  static const _blue = Color(0xFF4E6CD6);
  static const _yellow = Color(0xFFFFDF58);

  final ImagePicker _picker = ImagePicker();
  final ScanApiService _scanApi = ScanApiService();

  bool _isScanning = false;

  @override
  Widget build(BuildContext context) {
    return Stack(
      children: [
        Scaffold(
          body: SafeArea(
            child: SingleChildScrollView(
              padding: const EdgeInsets.fromLTRB(20, 18, 20, 24),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Snap Invoice',
                    style: TextStyle(
                      fontSize: 26,
                      fontWeight: FontWeight.w800,
                      color: context.primaryText,
                    ),
                  ),
                  const SizedBox(height: 6),
                  Text(
                    'Upload a supplier invoice and we will extract the stock for you.',
                    style: TextStyle(
                      fontSize: 13.5,
                      color: context.secondaryText,
                    ),
                  ),
                  const SizedBox(height: 24),
                  _dashedZone(context),
                  const SizedBox(height: 20),
                  Row(
                    children: [
                      Expanded(
                        child: _actionButton(
                          icon: Icons.upload_file_rounded,
                          label: 'Browse',
                          background: _blue,
                          foreground: Colors.white,
                          onTap: _browse,
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: _actionButton(
                          icon: Icons.photo_camera_rounded,
                          label: 'Take Photo',
                          background: _yellow,
                          foreground: const Color(0xFF111111),
                          onTap: _takePhoto,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 18),
                  Center(
                    child: Text(
                      'Supports PDF and image files',
                      style: TextStyle(
                        fontSize: 12,
                        color: context.secondaryText,
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
        if (_isScanning)
          Container(
            color: Colors.black.withValues(alpha: 0.4),
            child: const Center(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  CircularProgressIndicator(color: _blue),
                  SizedBox(height: 16),
                  Text(
                    'Extracting invoice…',
                    style: TextStyle(
                      color: Colors.white,
                      fontSize: 15,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                ],
              ),
            ),
          ),
      ],
    );
  }

  // ---------------------------------------------------------------------------
  // Upload actions
  // ---------------------------------------------------------------------------

  Future<void> _browse() async {
    try {
      final selected = await FilePicker.pickFile(
        type: FileType.custom,
        allowedExtensions: ['pdf', 'png', 'jpg', 'jpeg'],
      );

      if (selected == null) {
        return;
      }

      final bytes = await selected.readAsBytes();

      if (bytes.isEmpty) {
        _showError('The selected file is empty.');
        return;
      }

      await _scanAndNavigate(bytes, selected.name);
    } catch (error, stackTrace) {
      debugPrint('Browse failed: $error\n$stackTrace');
      _showError('We could not open that file. Please try another one.');
    }
  }

  Future<void> _takePhoto() async {
    try {
      final pickedFile = await _picker.pickImage(source: ImageSource.camera);

      if (pickedFile == null) {
        return;
      }

      // XFile.readAsBytes() works on web as well as mobile; dart:io's File does
      // not exist on the web, which breaks the whole build.
      final bytes = await pickedFile.readAsBytes();
      await _scanAndNavigate(bytes, pickedFile.name);
    } catch (error, stackTrace) {
      debugPrint('Camera failed: $error\n$stackTrace');
      _showError('We could not read the photo. Please try again.');
    }
  }

  Future<void> _scanAndNavigate(List<int> bytes, String filename) async {
    setState(() => _isScanning = true);

    try {
      final result = await _scanApi.scanInvoice(bytes: bytes, filename: filename);
      final extract = result['extract'];
      final review = InvoiceReview.fromScan(
        extract is Map ? Map<String, dynamic>.from(extract) : {},
      );

      if (review.items.isEmpty) {
        if (mounted) {
          setState(() => _isScanning = false);
          _showError('No stock items were found in the invoice.');
        }
        return;
      }

      if (!mounted) {
        return;
      }

      setState(() => _isScanning = false);
      context.push('/snap/review', extra: review);
    } catch (error, stackTrace) {
      debugPrint('Scan failed: $error\n$stackTrace');
      if (!mounted) {
        return;
      }
      setState(() => _isScanning = false);
      // Surface the real reason (timeout, unreachable, scanner detail) instead
      // of always blaming the server, which sent a perfectly good response
      // whenever the browser withheld it.
      _showError('Extraction failed. $error');
    }
  }

  void _showError(String message) {
    if (!mounted) {
      return;
    }
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(message),
        behavior: SnackBarBehavior.floating,
      ),
    );
  }

  // ---------------------------------------------------------------------------
  // Widgets
  // ---------------------------------------------------------------------------

  Widget _dashedZone(BuildContext context) {
    return GestureDetector(
      onTap: _browse,
      child: Container(
        width: double.infinity,
        height: 240,
        padding: const EdgeInsets.all(18),
        decoration: BoxDecoration(
          color: context.subtleFill,
          borderRadius: BorderRadius.circular(24),
        ),
        child: CustomPaint(
          painter: _DashedBorderPainter(color: _blue.withValues(alpha: 0.5)),
          child: Center(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Container(
                  width: 64,
                  height: 64,
                  decoration: BoxDecoration(
                    color: _blue.withValues(alpha: 0.1),
                    borderRadius: BorderRadius.circular(18),
                  ),
                  child: const Icon(
                    Icons.receipt_long_rounded,
                    color: _blue,
                    size: 32,
                  ),
                ),
                const SizedBox(height: 14),
                Text(
                  'Drag invoice here or use buttons below.',
                  textAlign: TextAlign.center,
                  style: TextStyle(
                    fontSize: 15,
                    fontWeight: FontWeight.w700,
                    color: context.primaryText,
                  ),
                ),
                const SizedBox(height: 6),
                Text(
                  'Tap to browse a file',
                  style: TextStyle(
                    fontSize: 12.5,
                    color: context.secondaryText,
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _actionButton({
    required IconData icon,
    required String label,
    required Color background,
    required Color foreground,
    required VoidCallback onTap,
  }) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        height: 58,
        decoration: BoxDecoration(
          color: background,
          borderRadius: BorderRadius.circular(18),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withValues(alpha: 0.06),
              blurRadius: 10,
              offset: const Offset(0, 4),
            ),
          ],
        ),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(icon, color: foreground, size: 21),
            const SizedBox(width: 8),
            Text(
              label,
              style: TextStyle(
                color: foreground,
                fontWeight: FontWeight.w700,
                fontSize: 15,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _DashedBorderPainter extends CustomPainter {
  _DashedBorderPainter({required this.color});

  final Color color;

  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()
      ..color = color
      ..style = PaintingStyle.stroke
      ..strokeWidth = 1.8
      ..strokeCap = StrokeCap.round;

    final rrect = RRect.fromRectAndRadius(
      Offset.zero & size,
      const Radius.circular(20),
    );
    final path = Path()..addRRect(rrect);

    final dashed = Path();
    for (final metric in path.computeMetrics()) {
      var distance = 0.0;
      const dashLength = 9.0;
      const gapLength = 6.0;
      while (distance < metric.length) {
        dashed.addPath(
          metric.extractPath(distance, distance + dashLength),
          Offset.zero,
        );
        distance += dashLength + gapLength;
      }
    }

    canvas.drawPath(dashed, paint);
  }

  @override
  bool shouldRepaint(_DashedBorderPainter oldDelegate) =>
      oldDelegate.color != color;
}