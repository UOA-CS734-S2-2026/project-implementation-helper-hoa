import 'dart:io';

import 'package:google_mlkit_text_recognition/google_mlkit_text_recognition.dart';
import 'package:path_provider/path_provider.dart';
import 'package:pdfx/pdfx.dart';
import 'package:syncfusion_flutter_pdf/pdf.dart' as syncfusion;
import 'package:flutter/foundation.dart';

class InvoiceOcrResult {
  final String rawText;
  final Map<String, dynamic> json;

  InvoiceOcrResult({
    required this.rawText,
    required this.json,
  });
}

class InvoiceOcrService {
  final TextRecognizer _recognizer = TextRecognizer();

  Future<String> _extractEmbeddedPdfText(String pdfPath) async {
    final pdfBytes = await File(pdfPath).readAsBytes();
    final document = syncfusion.PdfDocument(inputBytes: pdfBytes);

    try {
      return syncfusion.PdfTextExtractor(document).extractText();
    } finally {
      document.dispose();
    }
  }

  Future<List<File>> _renderPdfToImages(String pdfPath) async {
    final document = await PdfDocument.openFile(pdfPath);
    final tempDir = await getTemporaryDirectory();
    final images = <File>[];

    for (var pageNumber = 1; pageNumber <= document.pagesCount; pageNumber++) {
      final page = await document.getPage(pageNumber);

      final pageImage = await page.render(
        width: page.width * 4,
        height: page.height * 4,
        format: PdfPageImageFormat.png,
      );

      await page.close();

      if (pageImage != null) {
        final imageFile = File(
          '${tempDir.path}/invoice_page_$pageNumber.png',
        );

        await imageFile.writeAsBytes(pageImage.bytes);
        images.add(imageFile);
      }
    }

    await document.close();
    return images;
  }

  Future<String> _recognizePdfWithOcr(String pdfPath) async {
    final imageFiles = await _renderPdfToImages(pdfPath);
    final buffer = StringBuffer();

    for (final imageFile in imageFiles) {
      final inputImage = InputImage.fromFile(imageFile);
      final recognizedText = await _recognizer.processImage(inputImage);
      buffer.writeln(recognizedText.text);
    }

    return buffer.toString();
  }

  Future<InvoiceOcrResult> processPdf(String pdfPath) async {
    var rawText = '';

    try {
      rawText = await _extractEmbeddedPdfText(pdfPath);
      debugPrint('Embedded PDF text:\n$rawText');
    } catch (error, stackTrace) {
      debugPrint(
        'Embedded PDF text extraction failed.\n'
        'Error: $error\n'
        'Stack trace: $stackTrace',
      );
    }

    if (rawText.trim().isEmpty) {
      try {
        rawText = await _recognizePdfWithOcr(pdfPath);
        debugPrint('OCR PDF text:\n$rawText');
      } catch (error, stackTrace) {
        debugPrint(
          'PDF image OCR fallback failed.\n'
          'Error: $error\n'
          'Stack trace: $stackTrace',
        );

        throw Exception(
          'Both embedded-text extraction and image OCR failed. '
          'See the Debug Console for the underlying error.',
        );
      }
    }

    final extractedFields = _parseInvoiceFields(rawText);
    debugPrint('Extracted invoice data: $extractedFields');

    return InvoiceOcrResult(
      rawText: rawText,
      json: extractedFields,
    );
  }

  Future<InvoiceOcrResult> processImage(String imagePath) async {
    final inputImage = InputImage.fromFilePath(imagePath);
    final recognizedText = await _recognizer.processImage(inputImage);
    final rawText = recognizedText.text;

    return InvoiceOcrResult(
      rawText: rawText,
      json: _parseInvoiceFields(rawText),
    );
  }

  Map<String, dynamic> _parseInvoiceFields(String text) {
    String? findField(String labelPattern, String valuePattern) {
      final match = RegExp(
        '$labelPattern\\s*:\\s*($valuePattern)',
        caseSensitive: false,
        dotAll: true,
      ).firstMatch(text);

      debugPrint('Invoice text sent to item parser:\n$text');

      return match?.group(1)?.replaceAll(RegExp(r'\s+'), '').trim();
    }

    final supplierMatch = RegExp(
      r'supplier\s*name\s*:\s*([A-Za-z0-9_ .&-]+)',
      caseSensitive: false,
      dotAll: true,
    ).firstMatch(text);

    final invoiceNumber = findField(
      r'invoice\s*number',
      r'[A-Za-z0-9\-/]+',
    );

    final receivedDate = findField(
      r'received\s*date',
      r'\d\s*\d?\s*[/-]\s*\d\s*\d?\s*[/-]\s*\d\s*\d\s*\d\s*\d',
    );

    return {
      'supplierName': supplierMatch
          ?.group(1)
          ?.replaceAll(RegExp(r'\s+'), ' ')
          .trim(),
      'invoiceNumber': invoiceNumber,
      'receivedDate': receivedDate,
      'items': _parseLineItems(text),
      'rawText': text,
    };
  }

  List<Map<String, dynamic>> _parseLineItems(String text) {
    final lines = text
        .split(RegExp(r'\r?\n'))
        .map((line) => line.trim())
        .where((line) => line.isNotEmpty)
        .toList();

    final tableHeaderIndex = lines.indexWhere(
      (line) => line.toLowerCase().replaceAll(RegExp(r'\s+'), '') == 'sl#',
    );

    if (tableHeaderIndex == -1) {
      debugPrint('Could not find the invoice item table header.');
      return [];
    }

    final quantityPattern = RegExp(
      r'^(\d+(?:\.\d+)?)\s+([A-Za-z]+)$',
    );
    final pricePattern = RegExp(r'^\d+(?:\.\d+)?$');
    final datePattern = RegExp(
      r'^\d{1,4}\s*[/-]\s*\d{1,2}\s*[/-]\s*\d{1,4}$',
    );

    final items = <Map<String, dynamic>>[];
    var index = tableHeaderIndex + 1;

    while (index < lines.length) {
      // Ignore column headings until a serial number is found.
      final lineNumber = int.tryParse(lines[index]);

      if (lineNumber == null) {
        index++;
        continue;
      }

      index++;

      // Collect all product-name lines until reaching "quantity unit",
      // for example "60 kg" or "30 pc".
      final nameParts = <String>[];

      while (index < lines.length) {
        if (quantityPattern.hasMatch(lines[index])) {
          break;
        }

        // A number on its own is the next product row.
        if (int.tryParse(lines[index]) != null) {
          break;
        }

        nameParts.add(lines[index]);
        index++;
      }

      if (nameParts.isEmpty || index >= lines.length) {
        debugPrint('Missing product name or quantity for row $lineNumber.');
        continue;
      }

      final quantityMatch = quantityPattern.firstMatch(lines[index]);

      if (quantityMatch == null) {
        debugPrint('Could not parse quantity for row $lineNumber.');
        continue;
      }

      final quantity = double.parse(quantityMatch.group(1)!);
      final unit = quantityMatch.group(2)!;
      index++;

      if (index >= lines.length || !pricePattern.hasMatch(lines[index])) {
        debugPrint('Could not parse price for row $lineNumber.');
        continue;
      }

      final costPrice = double.parse(lines[index]);
      index++;

      if (index >= lines.length || !datePattern.hasMatch(lines[index])) {
        debugPrint('Could not parse expiry date for row $lineNumber.');
        continue;
      }

      final expiryDate = lines[index]
          .replaceAll(RegExp(r'\s+'), '')
          .trim();
      index++;

      items.add({
        'lineNumber': lineNumber,
        'name': nameParts.join(' ').replaceAll(RegExp(r'\s+'), ' ').trim(),
        'quantity': quantity,
        'unit': unit,
        'costPrice': costPrice,
        'expiryDate': expiryDate,
      });
    }

    debugPrint('Parsed ${items.length} invoice items: $items');
    return items;


  }

  void dispose() {
    _recognizer.close();
  }
}
