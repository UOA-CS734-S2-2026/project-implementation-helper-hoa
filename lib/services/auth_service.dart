import 'dart:convert';

import 'package:flutter/foundation.dart';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';

import '../config/api_config.dart';

/// Holds the signed-in user's Firebase ID token.
///
/// The token comes from POST /auth/login (see server/src/routes/auth.routes.ts)
/// and is sent as `Authorization: Bearer <idToken>` on every API call. The
/// Express server verifies it with requireAuth and forwards it to the Python
/// tier, so the chatbot's MCP tools act as this user.
///
/// Firebase ID tokens last an hour, so [authHeaders] silently refreshes them
/// with the stored refresh token when they are about to expire. Extends
/// ChangeNotifier so the router and the login screen can react to sign-in and
/// sign-out, matching the ThemeController pattern in theme_controller.dart.
class AuthController extends ChangeNotifier {
  AuthController._();

  static final AuthController instance = AuthController._();

  static const _idTokenKey = 'auth.idToken';
  static const _refreshTokenKey = 'auth.refreshToken';
  static const _expiresAtKey = 'auth.expiresAt';
  static const _profileKey = 'auth.profile';

  /// Refresh this far ahead of the real expiry so a token cannot lapse
  /// mid-flight between the header check and the server's verification.
  static const _refreshMargin = Duration(minutes: 2);

  String? _idToken;
  String? _refreshToken;
  DateTime? _expiresAt;
  Map<String, dynamic>? _profile;

  /// Guards against several concurrent callers each kicking off their own
  /// refresh (e.g. a chat request and a scan at the same time).
  Future<bool>? _inFlightRefresh;

  bool get isSignedIn => _idToken != null;
  String? get idToken => _idToken;
  Map<String, dynamic>? get profile => _profile;
  String? get role => _profile?['role'] as String?;

  /// Restores a previous session. Call before runApp so the app does not flash
  /// the login screen for someone who is already signed in.
  Future<void> restore() async {
    final prefs = await SharedPreferences.getInstance();

    _idToken = prefs.getString(_idTokenKey);
    _refreshToken = prefs.getString(_refreshTokenKey);
    _expiresAt = DateTime.tryParse(prefs.getString(_expiresAtKey) ?? '');
    final rawProfile = prefs.getString(_profileKey);

    if (rawProfile != null) {
      try {
        _profile = jsonDecode(rawProfile) as Map<String, dynamic>;
      } on FormatException {
        _profile = null;
      }
    }

    if (_idToken == null) {
      await signOut();
      return;
    }

    // Best effort: a restored token that is already stale gets replaced here
    // rather than on the first API call.
    if (await _ensureFreshToken()) {
      notifyListeners();
    }
  }

  Future<void> signIn({required String email, required String password}) async {
    final response = await http
        .post(
          Uri.parse('${ApiConfig.expressBaseUrl}/auth/login'),
          headers: {'Content-Type': 'application/json'},
          body: jsonEncode({'email': email, 'password': password}),
        )
        .timeout(const Duration(seconds: 20));

    if (response.statusCode != 200) {
      throw AuthException(_messageFrom(response, 'Could not sign in.'));
    }

    final decoded = jsonDecode(response.body) as Map<String, dynamic>;
    final idToken = decoded['idToken'] as String?;
    final refreshToken = decoded['refreshToken'] as String?;

    if (idToken == null || refreshToken == null) {
      throw const AuthException('The server did not return a session token.');
    }

    _idToken = idToken;
    _refreshToken = refreshToken;
    _expiresAt = DateTime.now().add(
      Duration(seconds: (decoded['expiresIn'] as num?)?.toInt() ?? 3600),
    );

    await _persistSession();
    await _loadProfile();
    notifyListeners();
  }

  Future<void> signOut() async {
    _idToken = null;
    _refreshToken = null;
    _expiresAt = null;
    _profile = null;
    _inFlightRefresh = null;

    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(_idTokenKey);
    await prefs.remove(_refreshTokenKey);
    await prefs.remove(_expiresAtKey);
    await prefs.remove(_profileKey);

    notifyListeners();
  }

  /// Headers for an authenticated request, refreshing the token if needed.
  /// Returns an empty map when nobody is signed in, which leaves the server to
  /// answer 401 -- the same outcome as sending a bad token.
  Future<Map<String, String>> authHeaders() async {
    if (!isSignedIn || !await _ensureFreshToken()) {
      return const {};
    }

    return {'Authorization': 'Bearer $_idToken'};
  }

  /// True when the token was rejected because it is no longer valid. Services
  /// use this to clear the session and send the user back to the login screen.
  Future<void> handleUnauthorized() => signOut();

  /// Returns true when [_idToken] is present and not about to expire.
  Future<bool> _ensureFreshToken() async {
    if (_idToken == null) {
      return false;
    }

    final expiry = _expiresAt;
    final stillValid = expiry != null && expiry.isAfter(
          DateTime.now().add(_refreshMargin),
        );

    if (stillValid) {
      return true;
    }

    // Reuse the in-flight refresh so parallel callers share one request.
    final pending = _inFlightRefresh ??= _refresh().whenComplete(() {
      _inFlightRefresh = null;
    });

    return pending;
  }

  Future<bool> _refresh() async {
    final refreshToken = _refreshToken;

    if (refreshToken == null) {
      await signOut();
      return false;
    }

    try {
      final response = await http
          .post(
            Uri.parse('${ApiConfig.expressBaseUrl}/auth/refresh'),
            headers: {'Content-Type': 'application/json'},
            body: jsonEncode({'refreshToken': refreshToken}),
          )
          .timeout(const Duration(seconds: 20));

      if (response.statusCode != 200) {
        // The refresh token is spent or was revoked, so the only way forward is
        // to log in again.
        await signOut();
        return false;
      }

      final decoded = jsonDecode(response.body) as Map<String, dynamic>;
      final idToken = decoded['idToken'] as String?;

      if (idToken == null) {
        await signOut();
        return false;
      }

      _idToken = idToken;
      _refreshToken = decoded['refreshToken'] as String? ?? refreshToken;
      _expiresAt = DateTime.now().add(
        Duration(seconds: (decoded['expiresIn'] as num?)?.toInt() ?? 3600),
      );

      await _persistSession();
      return true;
    } on Exception {
      // A network blip should not throw away a session that may still be
      // valid, so keep the token and let the request itself surface the error.
      return _idToken != null;
    }
  }

  Future<void> _persistSession() async {
    final prefs = await SharedPreferences.getInstance();

    await prefs.setString(_idTokenKey, _idToken ?? '');
    await prefs.setString(_refreshTokenKey, _refreshToken ?? '');
    await prefs.setString(_expiresAtKey, _expiresAt?.toIso8601String() ?? '');

    final profile = _profile;
    if (profile != null) {
      await prefs.setString(_profileKey, jsonEncode(profile));
    }
  }

  /// Fetches the profile so the UI can show a name and role. Sign-in already
  /// succeeded by this point, so a failure here is not worth surfacing.
  Future<void> _loadProfile() async {
    final token = _idToken;
    if (token == null) {
      return;
    }

    try {
      final response = await http
          .get(
            Uri.parse('${ApiConfig.expressBaseUrl}/auth/me'),
            headers: {'Authorization': 'Bearer $token'},
          )
          .timeout(const Duration(seconds: 15));

      if (response.statusCode != 200) {
        return;
      }

      _profile = jsonDecode(response.body) as Map<String, dynamic>;
      await _persistSession();
    } on Exception {
      // Leave _profile null; the app still works without it.
    }
  }

  String _messageFrom(http.Response response, String fallback) {
    try {
      final decoded = jsonDecode(response.body);

      if (decoded is Map<String, dynamic>) {
        final message = decoded['error'];

        if (message is String && message.isNotEmpty) {
          return message;
        }
      }
    } on FormatException {
      // Not JSON, so fall through to the generic message.
    }

    return fallback;
  }
}

class AuthException implements Exception {
  const AuthException(this.message);

  final String message;

  @override
  String toString() => message;
}
