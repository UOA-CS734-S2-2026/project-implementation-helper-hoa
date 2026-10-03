import 'dart:convert';

import 'package:http/http.dart' as http;

import '../config/api_config.dart';
import '../models/inventory_alert.dart';
import 'auth_service.dart';
import 'dev_test_token_provider.dart';

class InventoryAlertApiService {
  Future<Map<String, String>> _authHeaders() async {
    final headers = await AuthController.instance.authHeaders();
    if (headers.isNotEmpty) {
      return headers;
    }

    // No signed-in session, so fall back to the local development token.
    final devToken = DevTestTokenProvider.token;
    if (devToken == null) {
      throw StateError(
        'No signed-in user and no DEV_TEST_ID_TOKEN set in .env.',
      );
    }

    return {'Authorization': 'Bearer $devToken'};
  }

  Future<List<InventoryAlert>> getAlerts() async {
    final response = await http.get(
      Uri.parse('${ApiConfig.expressBaseUrl}/inventory-alerts'),
      headers: await _authHeaders(),
    );

    if (response.statusCode == 401) {
      // Drop the session so the router sends the user back to the login screen.
      await AuthController.instance.handleUnauthorized();
      throw Exception('Your session has expired. Please log in again.');
    }

    if (response.statusCode != 200) {
      throw Exception('Could not load inventory alerts.');
    }

    final data = jsonDecode(response.body) as List<dynamic>;

    return data
        .map(
          (item) => InventoryAlert.fromJson(
            Map<String, dynamic>.from(item as Map),
          ),
        )
        .toList();
  }
}
