import 'dart:convert';

import 'package:firebase_auth/firebase_auth.dart';
import 'package:http/http.dart' as http;

import '../models/inventory_alert.dart';
import 'dev_test_token_provider.dart';
import 'package:flutter/foundation.dart';

final String baseUrl =
    kIsWeb ? 'http://localhost:3000' : 'http://10.0.2.2:3000';

class InventoryAlertApiService {
  

  Future<String> _resolveToken() async {
    final user = FirebaseAuth.instance.currentUser;

    if (user != null) {
      final idToken = await user.getIdToken();

      if (idToken != null) {
        return idToken;
      }
    }

    final devToken = DevTestTokenProvider.token;

    if (devToken != null) {
      return devToken;
    }

    throw StateError(
      'No signed-in user and no DEV_TEST_ID_TOKEN set in .env.',
    );
  }

  Future<List<InventoryAlert>> getAlerts() async {
    final token = await _resolveToken();

    final response = await http.get(
      Uri.parse('$baseUrl/inventory-alerts'),
      headers: {
        'Authorization': 'Bearer $token',
      },
    );

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