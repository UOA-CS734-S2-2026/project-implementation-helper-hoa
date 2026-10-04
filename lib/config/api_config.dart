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

  /// Overrides supplied at build time, so a deployed backend URL does not have
  /// to be committed. Both are empty unless `--dart-define` is passed, which
  /// keeps the loopback defaults below for local development:
  ///
  ///   flutter run --dart-define=EXPRESS_BASE_URL=https://<service>.onrender.com
  static const _expressBaseUrlOverride = String.fromEnvironment('EXPRESS_BASE_URL');
  static const _pythonBaseUrlOverride = String.fromEnvironment('PYTHON_BASE_URL');

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
  static String get expressBaseUrl =>
      _expressBaseUrlOverride.isNotEmpty ? _expressBaseUrlOverride : 'http://$host:3000';

  /// Python FastAPI server (`python/chatbot_server.py`). Not deployed on Render,
  /// so this stays on loopback unless a build override points somewhere else.
  static String get pythonBaseUrl =>
      _pythonBaseUrlOverride.isNotEmpty ? _pythonBaseUrlOverride : 'http://$host:8000';
}
