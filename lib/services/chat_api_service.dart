import 'dart:convert';

import 'package:http/http.dart' as http;

import '../config/api_config.dart';

class ChatApiService {
  Future<String> sendMessage({
    required String message,
    List<Map<String, String>> history = const [],
  }) async {
    final response = await http.post(
      Uri.parse('${ApiConfig.expressBaseUrl}/api/ai/chat'),
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode({
        'message': message,
        'history': history,
      }),
    );

    if (response.statusCode != 200) {
      throw Exception('Could not get a reply from Hoa.');
    }

    final decoded = jsonDecode(response.body) as Map<String, dynamic>;
    return decoded['reply'] as String;
  }
}