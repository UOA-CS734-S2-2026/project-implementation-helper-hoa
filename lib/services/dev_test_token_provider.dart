import 'package:flutter/foundation.dart';
import 'package:flutter_dotenv/flutter_dotenv.dart';

/// Returns a hardcoded Firebase ID token for local testing only.
/// Never use this path in a release build.
class DevTestTokenProvider {
  static String? get token {
    if (kReleaseMode) {
      return null;
    }

    final value = dotenv.env['DEV_TEST_ID_TOKEN'];
    return (value == null || value.isEmpty) ? null : value;
  }
}