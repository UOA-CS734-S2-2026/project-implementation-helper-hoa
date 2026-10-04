import 'dart:async';
import 'dart:convert';

import 'package:firebase_core/firebase_core.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter/widgets.dart';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';

import '../config/api_config.dart';
import 'auth_service.dart';

class PushNotificationService extends ChangeNotifier
    with WidgetsBindingObserver {
  PushNotificationService._();

  static final instance = PushNotificationService._();
  final inventoryChanges = ValueNotifier<int>(0);
  static const firebaseProjectId = 'helperhoa-5f706';
  static const _enabledKey = 'push.enabled';
  final _auth = AuthController.instance;
  FirebaseMessaging? _messaging;
  Future<void> _work = Future.value();
  String? _token;
  bool _enabled = true;
  bool _ready = false;
  bool _revoked = false;
  String? _error;
  String _status = 'Push notifications are starting';

  bool get supported =>
      !kIsWeb && defaultTargetPlatform == TargetPlatform.android;
  bool get enabled => _enabled;
  String? get error => _error;
  String get status => supported ? _status : 'Push is supported on Android only';

  Future<void> initialize({
    required void Function(RemoteMessage) onForeground,
    required void Function(RemoteMessage) onOpened,
  }) async {
    if (!supported) return;
    try {
      final preferences = await SharedPreferences.getInstance();
      _enabled = preferences.getBool(_enabledKey) ?? true;
      final app = await Firebase.initializeApp();
      if (app.options.projectId != firebaseProjectId) {
        throw StateError(
          'Replace android/app/google-services.json with the Android config '
          'from $firebaseProjectId, then rebuild the app.',
        );
      }
      _messaging = FirebaseMessaging.instance;
      FirebaseMessaging.onMessage.listen((message) {
        if (_enabled && _auth.isSignedIn) {
          if (message.data['type'] == 'inventory_alert') inventoryChanges.value++;
          onForeground(message);
        }
      });
      FirebaseMessaging.onMessageOpenedApp.listen((message) {
        if (_enabled) {
          if (message.data['type'] == 'inventory_alert') inventoryChanges.value++;
          onOpened(message);
        }
      });
      _messaging!.onTokenRefresh.listen((token) {
        _enqueue(() => _sync(token: token));
      }, onError: (Object error, StackTrace stack) {
        _report(error, stack);
      });
      _ready = true;
      // Do not queue this behind _sync: an auth refresh inside _sync can
      // itself sign out, and waiting on the queue would deadlock.
      _auth.beforeSignOut = _revoke;
      _auth.addListener(_authChanged);
      WidgetsBinding.instance.addObserver(this);
      // Retry token registration after a temporary network failure, including
      // when the backend starts after the phone.
      Timer.periodic(const Duration(minutes: 1), (_) => _authChanged());
      final initialMessage = await _messaging!.getInitialMessage();
      if (initialMessage != null && _enabled) onOpened(initialMessage);
      await _enqueue(_sync);
    } on Exception catch (error, stack) {
      _report(error, stack);
    } on StateError catch (error, stack) {
      _report(error, stack);
    }
  }

  void _authChanged() {
    unawaited(_enqueue(_sync));
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.resumed) _authChanged();
  }

  Future<void> setEnabled(bool enabled) async {
    _enabled = enabled;
    final preferences = await SharedPreferences.getInstance();
    await preferences.setBool(_enabledKey, enabled);
    notifyListeners();
    if (!_ready) {
      throw StateError(_error ?? 'Push notifications are not available.');
    }
    await _enqueue(enabled ? _sync : _revoke, propagate: true);
  }

  Future<void> _enqueue(Future<void> Function() action,
      {bool propagate = false}) {
    final result = _work.then((_) => action());
    _work = result.then<void>((_) {}, onError: (Object error, StackTrace stack) {
      _report(error, stack);
    });
    return propagate ? result : _work;
  }

  Future<void> _sync({String? token}) async {
    final messaging = _messaging;
    if (messaging == null) return;
    if (!_enabled || !_auth.isSignedIn) {
      await _revoke();
      _status = !_enabled ? 'Push notifications are off' : 'Sign in to receive alerts';
      notifyListeners();
      return;
    }
    final permission = await messaging.requestPermission();
    if (permission.authorizationStatus != AuthorizationStatus.authorized &&
        permission.authorizationStatus != AuthorizationStatus.provisional) {
      await _revoke();
      _status = 'Allow notifications in the phone settings to receive alerts';
      notifyListeners();
      return;
    }
    final currentToken = token ?? await messaging.getToken();
    if (currentToken == null) {
      throw StateError('FCM did not return a device token. Check Google Play services.');
    }
    _token = currentToken;
    _revoked = false;
    final headers = await _auth.authHeaders();
    // A refresh may have signed the user out.
    if (!_auth.isSignedIn) return;
    final response = await http
        .put(
          Uri.parse('${ApiConfig.expressBaseUrl}/push/devices'),
          headers: {...headers, 'Content-Type': 'application/json'},
          body: jsonEncode({
            'token': currentToken,
            'projectId': firebaseProjectId,
          }),
        )
        .timeout(const Duration(seconds: 20));
    _checkResponse(response);
    if (!_auth.isSignedIn || !_enabled || _revoked) return;
    _error = null;
    _status = 'Stock and expiry alerts are enabled';
    notifyListeners();
  }

  Future<void> _revoke() async {
    final messaging = _messaging;
    if (messaging == null || _revoked) return;
    final token = _token ?? await messaging.getToken();
    final idToken = _auth.idToken;
    if (token != null && idToken != null) {
      try {
        final response = await http
            .delete(
              Uri.parse('${ApiConfig.expressBaseUrl}/push/devices'),
              headers: {
                'Authorization': 'Bearer $idToken',
                'Content-Type': 'application/json',
              },
              body: jsonEncode({'token': token}),
            )
            .timeout(const Duration(seconds: 20));
        _checkResponse(response);
      } on Exception catch (error, stack) {
        // Invalidating the FCM token still prevents delivery when the API is
        // unreachable or the user's auth token has already expired.
        _report(error, stack);
      }
    }
    await messaging.deleteToken();
    _token = null;
    _revoked = true;
    _status = 'Push notifications are off';
    notifyListeners();
  }

  void _checkResponse(http.Response response) {
    if (response.statusCode == 204) return;
    String message = 'Push registration failed (${response.statusCode}).';
    try {
      final body = jsonDecode(response.body);
      if (body is Map<String, dynamic> && body['error'] is String) {
        message = body['error'] as String;
      }
    } on FormatException {
      // Proxies may return HTML rather than the API's JSON error.
    }
    throw PushRegistrationException(message);
  }

  void _report(Object error, StackTrace stack) {
    _error = error.toString();
    _status = 'Push unavailable: $_error';
    notifyListeners();
    FlutterError.reportError(FlutterErrorDetails(
      exception: error,
      stack: stack,
      library: 'push notifications',
    ));
  }
}

class PushRegistrationException implements Exception {
  const PushRegistrationException(this.message);
  final String message;

  @override
  String toString() => message;
}
