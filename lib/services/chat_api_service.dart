import 'dart:convert';

import 'package:http/http.dart' as http;

import '../config/api_config.dart';
import 'auth_service.dart';

class ChatApiService {
  Future<String> sendMessage({
    required String message,
    List<Map<String, String>> history = const [],
  }) async {
    final auth = AuthController.instance;
    final response = await http.post(
      Uri.parse('${ApiConfig.expressBaseUrl}/api/ai/chat'),
      headers: {
        'Content-Type': 'application/json',
        ...await auth.authHeaders(),
      },
      body: jsonEncode({
        'message': message,
        'history': history,
      }),
    );

    if (response.statusCode == 401) {
      // The token is gone or expired: drop the session so the router sends the
      // user back to the login screen.
      await auth.handleUnauthorized();
      throw Exception('Your session has expired. Please log in again.');
    }

    // requireAuth reports an unverified or expired token as 403, not 401, so
    // the session has to be cleared on that code too.
    if (response.statusCode == 403) {
      await auth.handleUnauthorized();
      throw Exception('Your session has expired. Please log in again.');
    }

    if (response.statusCode != 200) {
      throw Exception('Could not get a reply from Hoa.');
    }

    final decoded = jsonDecode(response.body) as Map<String, dynamic>;
    return decoded['reply'] as String;
  }
}