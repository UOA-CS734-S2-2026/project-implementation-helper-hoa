import 'dart:async';
import 'dart:convert';

import 'package:http/http.dart' as http;

import '../config/api_config.dart';

/// Uploads an invoice file to the Python scanner (POST /scan/invoice on the
/// FastAPI chatbot server) and returns the LlamaCloud extraction result.
class ScanApiService {
  /// LlamaCloud runs on the `agentic` tier and is billed per page, so a
  /// multi-page invoice can legitimately take well over two minutes.
  static const _timeout = Duration(minutes: 10);

  /// Returns the extracted JSON map. The response is
  /// `{"extract": {...}, "metadata": {...}}`.
  Future<Map<String, dynamic>> scanInvoice({
    required List<int> bytes,
    required String filename,
  }) async {
    final request = http.MultipartRequest(
      'POST',
      Uri.parse('${ApiConfig.pythonBaseUrl}/scan/invoice'),
    );

    request.files.add(
      http.MultipartFile.fromBytes(
        'file',
        bytes,
        filename: filename,
      ),
    );

    late final http.Response response;
    try {
      final streamed = await request.send().timeout(_timeout);
      response = await http.Response.fromStream(streamed);
    } on TimeoutException {
      throw Exception(
        'Extraction timed out after ${_timeout.inMinutes} minutes. '
        'The invoice may be very large — try again or pick a shorter file.',
      );
    } on http.ClientException catch (error) {
      throw Exception(
        'Could not reach the scanner at ${ApiConfig.pythonBaseUrl} (${error.message}). '
        'Is the Python server running?',
      );
    }

    if (response.statusCode != 200) {
      throw Exception('Invoice scan failed: ${_describeFailure(response)}');
    }

    final decoded = jsonDecode(response.body) as Map<String, dynamic>;
    final extract = decoded['extract'];
    if (extract is! Map) {
      throw Exception('The scanner returned an unexpected response shape.');
    }
    return decoded;
  }

  /// FastAPI reports problems as `{"detail": "..."}`; fall back to the raw body
  /// so nothing is swallowed.
  String _describeFailure(http.Response response) {
    try {
      final decoded = jsonDecode(response.body);
      if (decoded is Map && decoded['detail'] != null) {
        return '${response.statusCode}: ${decoded['detail']}';
      }
    } on FormatException {
      // Not JSON; fall through to the raw body.
    }
    return '${response.statusCode}: ${response.body}';
  }
}
