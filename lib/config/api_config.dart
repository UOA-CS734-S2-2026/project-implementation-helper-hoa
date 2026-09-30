import 'package:flutter/foundation.dart' show TargetPlatform, defaultTargetPlatform, kIsWeb;

/// Single source of truth for backend hosts.
///
/// These used to be hardcoded per service and disagreed with each other
/// (`localhost:3000` in one place, `10.0.2.2:3000` in another), which meant
/// the app only worked on whichever target a given service happened to suit.
///
/// `10.0.2.2` is the Android emulator's alias for the host machine. It is not a
/// real address on web, iOS, Windows, macOS, or a physical device, so it is only
/// used when running on Android.
///
/// Uses `defaultTargetPlatform` rather than `dart:io`'s `Platform` because
/// `dart:io` is unavailable on the web and would break the web build.
class ApiConfig {
  const ApiConfig._();

  static String get host {
    if (kIsWeb) {
      return 'localhost';
    }
    if (defaultTargetPlatform == TargetPlatform.android) {
      return '10.0.2.2';
    }
    // iOS simulator, desktop, and physical devices already see the host directly.
    return 'localhost';
  }

  /// Express server (`server/`), which fronts the chatbot and persists invoices.
  static String get expressBaseUrl => 'http://$host:3000';

  /// Python FastAPI server (`python/chatbot_server.py`).
  static String get pythonBaseUrl => 'http://$host:8000';
}
