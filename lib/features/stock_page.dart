import 'dart:io';

import 'package:file_picker/file_picker.dart';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:image_picker/image_picker.dart';
import '../theme_extensions.dart';
import '../services/invoice_ocr_service.dart';
import '../models/invoice_review.dart';


class StockPage extends StatefulWidget {
  const StockPage({super.key});

  @override
  State<StockPage> createState() => _StockPageState();
}

class _StockPageState extends State<StockPage> {
  final ImagePicker _picker = ImagePicker();
  final InvoiceOcrService _ocrService = InvoiceOcrService();
  final TextEditingController _supplierController = TextEditingController();
  final TextEditingController _invoiceNumberController = TextEditingController();
  final TextEditingController _receivedDateController = TextEditingController();

  String? _selectedFileName;
  String? _capturedImagePath;
  Map<String, dynamic>? _extractedJson;
  bool _isProcessing = false;

  @override
  void dispose() {
    _ocrService.dispose();
    _supplierController.dispose();
    _invoiceNumberController.dispose();
    _receivedDateController.dispose();
    super.dispose();
  }

 void _applyExtractedFields(Map<String, dynamic> json) {
    _supplierController.text = (json['supplierName'] as String?) ?? '';
    _invoiceNumberController.text = (json['invoiceNumber'] as String?) ?? '';
    _receivedDateController.text = (json['receivedDate'] as String?) ?? '';
  }

  Future<void> _pickPdf() async {
    try {
      final files = await FilePicker.pickFiles(
        type: FileType.custom,
        allowedExtensions: ['pdf'],
        withData: false,
      );

      if (files.isEmpty) {
        return;
      }

      final selectedFile = files.single;
      final pdfPath = selectedFile.path;

      if (pdfPath == null) {
        if (!mounted) {
          return;
        }

        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('The selected PDF could not be accessed.'),
          ),
        );
        return;
      }

      setState(() {
        _selectedFileName = selectedFile.name;
        _capturedImagePath = null;
        _isProcessing = true;
        _extractedJson = null;
      });

      final ocrResult = await _ocrService.processPdf(pdfPath);

      debugPrint('OCR raw text: ${ocrResult.rawText}');
      debugPrint('Extracted fields: ${ocrResult.json}');



      if (!mounted) {
        return;
      }

      _applyExtractedFields(ocrResult.json);

      setState(() {
        _extractedJson = ocrResult.json;
        _isProcessing = false;
      });
    } catch (error, stackTrace) {
      debugPrint('PDF pick/OCR failed: $error\n$stackTrace');

      if (!mounted) {
        return;
      }

      setState(() {
        _isProcessing = false;
      });

      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text(
            'We could not read this invoice. Please try another PDF.',
          ),
        ),
      );
    }
  }

  Future<void> _takePhoto() async {
    try {
      final pickedFile = await _picker.pickImage(
        source: ImageSource.camera,
      );

      if (pickedFile == null) {
        return;
      }

      setState(() {
        _capturedImagePath = pickedFile.path;
        _selectedFileName = null;
        _isProcessing = true;
        _extractedJson = null;
      });

      final ocrResult = await _ocrService.processImage(pickedFile.path);

      if (!mounted) {
        return;
      }

      _applyExtractedFields(ocrResult.json);

      setState(() {
        _extractedJson = ocrResult.json;
        _isProcessing = false;
      });
    } catch (error, stackTrace) {
      debugPrint('Camera/OCR failed: $error\n$stackTrace');

      if (!mounted) {
        return;
      }

      setState(() {
        _isProcessing = false;
      });

      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text(
            'We could not read the invoice photo. Please try again.',
          ),
        ),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.fromLTRB(20, 18, 20, 24),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  GestureDetector(
                    onTap: () => context.go('/'),
                    child: Container(
                      width: 40,
                      height: 40,
                      decoration: BoxDecoration(
                        color: context.cardBackground,
                        borderRadius: BorderRadius.circular(12),
                        boxShadow: [
                          BoxShadow(
                            color: Colors.black.withValues(alpha: 0.04),
                            blurRadius: 8,
                            offset: const Offset(0, 2),
                          ),
                        ],
                      ),
                      child: const Icon(
                        Icons.arrow_back_ios_new_rounded,
                        color: Color(0xFF4E6CD6),
                        size: 18,
                      ),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Text(
                    'Add Stock',
                    style: TextStyle(
                      fontSize: 26,
                      fontWeight: FontWeight.w800,
                      color: context.primaryText,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 18),
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
                      'Supplier invoice',
                      style: TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.w700,
                        color: context.primaryText,
                      ),
                    ),
                    const SizedBox(height: 16),
                    Row(
                      children: [
                        Expanded(
                          child: GestureDetector(
                            onTap: _pickPdf,
                            child: _uploadButton(
                              icon: Icons.upload_file_rounded,
                              label: 'Upload PDF',
                              color: const Color(0xFF4E6CD6),
                            ),
                          ),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: GestureDetector(
                            onTap: _takePhoto,
                            child: _uploadButton(
                              icon: Icons.camera_alt_rounded,
                              label: 'Take Photo',
                              color: const Color(0xFFFFDF58),
                              textColor: const Color(0xFF111111),
                            ),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 18),
                    Container(
                      width: double.infinity,
                      height: 210,
                      padding: const EdgeInsets.all(18),
                      decoration: BoxDecoration(
                        color: context.subtleFill,
                        borderRadius: BorderRadius.circular(20),
                        border: Border.all(
                          color: const Color(0xFF4E6CD6).withValues(alpha: 0.15),
                          width: 1.2,
                        ),
                      ),
                      child: _isProcessing
                          ? const Center(child: CircularProgressIndicator())
                          : _capturedImagePath != null
                              ? ClipRRect(
                                  borderRadius: BorderRadius.circular(16),
                                  child: Image.file(
                                    File(_capturedImagePath!),
                                    fit: BoxFit.cover,
                                    width: double.infinity,
                                    height: double.infinity,
                                  ),
                                )
                              : _selectedFileName != null
                                  ? Center(
                                      child: Column(
                                        mainAxisAlignment: MainAxisAlignment.center,
                                        children: [
                                          Container(
                                            width: 70,
                                            height: 70,
                                            decoration: BoxDecoration(
                                              color: const Color(0xFF4E6CD6)
                                                  .withValues(alpha: 0.1),
                                              borderRadius:
                                                  BorderRadius.circular(20),
                                            ),
                                            child: const Icon(
                                              Icons.picture_as_pdf_rounded,
                                              color: Color(0xFF4E6CD6),
                                              size: 32,
                                            ),
                                          ),
                                          const SizedBox(height: 12),
                                          Text(
                                            _selectedFileName!,
                                            textAlign: TextAlign.center,
                                            style: TextStyle(
                                              fontSize: 15,
                                              fontWeight: FontWeight.w700,
                                              color: context.primaryText,
                                            ),
                                          ),
                                          const SizedBox(height: 6),
                                          const Text(
                                            'PDF selected successfully',
                                            style: TextStyle(
                                              fontSize: 12.5,
                                              color: Color(0xFF4E6CD6),
                                              fontWeight: FontWeight.w600,
                                            ),
                                          ),
                                        ],
                                      ),
                                    )
                                  : Column(
                                      mainAxisAlignment: MainAxisAlignment.center,
                                      children: [
                                        Container(
                                          width: 70,
                                          height: 70,
                                          decoration: BoxDecoration(
                                            color: const Color(0xFF4E6CD6)
                                                .withValues(alpha: 0.1),
                                            borderRadius:
                                                BorderRadius.circular(20),
                                          ),
                                          child: const Icon(
                                            Icons.description_outlined,
                                            color: Color(0xFF4E6CD6),
                                            size: 32,
                                          ),
                                        ),
                                        const SizedBox(height: 12),
                                        Text(
                                          'No invoice selected yet',
                                          style: TextStyle(
                                            fontSize: 17,
                                            fontWeight: FontWeight.w700,
                                            color: context.primaryText,
                                          ),
                                        ),
                                        const SizedBox(height: 6),
                                        Text(
                                          'Upload a PDF or take a photo of the invoice',
                                          textAlign: TextAlign.center,
                                          style: TextStyle(
                                            fontSize: 12.5,
                                            color: context.secondaryText,
                                          ),
                                        ),
                                      ],
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
                  color: context.cardBackground,
                  borderRadius: BorderRadius.circular(20),
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
                      'Invoice details',
                      style: TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.w700,
                        color: context.primaryText,
                      ),
                    ),
                    const SizedBox(height: 14),
                    _inputField(
                      label: 'Supplier name',
                      hintText: 'Enter supplier name',
                      controller: _supplierController,
                    ),
                    const SizedBox(height: 12),
                    _inputField(
                      label: 'Invoice number',
                      hintText: 'INV-1048',
                      controller: _invoiceNumberController,
                    ),
                    const SizedBox(height: 12),
                    _inputField(
                      label: 'Received date',
                      hintText: 'DD/MM/YYYY',
                      controller: _receivedDateController,
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 24),
              SizedBox(
                width: double.infinity,
                height: 56,
                child: ElevatedButton(
                  onPressed: _isProcessing
                      ? null
                      : () {
        final rawItems = _extractedJson?['items'];

        debugPrint('Items supplied to Submit: $rawItems');
        debugPrint('Items runtime type: ${rawItems.runtimeType}');

        final extractedItems = rawItems is List
            ? rawItems
                .whereType<Map>()
                .map(
                  (item) => InvoiceItem.fromJson(
                    Map<String, dynamic>.from(item),
                  ),
                )
                .toList()
            : <InvoiceItem>[];

        debugPrint(
          'Items converted for review: '
          '${extractedItems.map((item) => item.toJson()).toList()}',
        );

        if (extractedItems.isEmpty) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text(
                'No invoice items were found. Check the invoice and try again.',
              ),
            ),
          );
          return;
        }

        context.push(
          '/stock/review',
          extra: InvoiceReview(
            supplierName: _supplierController.text.trim(),
            invoiceNumber: _invoiceNumberController.text.trim(),
            receivedDate: _receivedDateController.text.trim(),
            items: extractedItems,
          ),
        );
      },
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFF4E6CD6),
                    foregroundColor: Colors.white,
                    elevation: 0,
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(16),
                    ),
                  ),
                  child: const Text(
                    'Submit',
                    style: TextStyle(
                      fontSize: 16,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _uploadButton({
    required IconData icon,
    required String label,
    required Color color,
    Color textColor = Colors.white,
  }) {
    return Container(
      height: 56,
      decoration: BoxDecoration(
        color: color,
        borderRadius: BorderRadius.circular(16),
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(icon, color: textColor, size: 20),
          const SizedBox(width: 8),
          Text(
            label,
            style: TextStyle(
              color: textColor,
              fontWeight: FontWeight.w700,
              fontSize: 13,
            ),
          ),
        ],
      ),
    );
  }

  Widget _inputField({
    required String label,
    required String hintText,
    required TextEditingController controller,
  }) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          label,
          style: const TextStyle(
            fontSize: 12.5,
            fontWeight: FontWeight.w700,
            color: Color(0xFF4E6CD6),
          ),
        ),
        const SizedBox(height: 8),
        TextField(
          controller: controller,
          decoration: InputDecoration(
            hintText: hintText,
            hintStyle: TextStyle(color: context.secondaryText),
            filled: true,
            fillColor: context.subtleFill,
            border: OutlineInputBorder(
              borderRadius: BorderRadius.circular(14),
              borderSide: BorderSide.none,
            ),
            enabledBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(14),
              borderSide: BorderSide.none,
            ),
            focusedBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(14),
              borderSide: const BorderSide(
                color: Color(0xFF4E6CD6),
                width: 1.2,
              ),
            ),
            contentPadding: const EdgeInsets.symmetric(
              horizontal: 14,
              vertical: 14,
            ),
          ),
        ),
      ],
    );
  }
}