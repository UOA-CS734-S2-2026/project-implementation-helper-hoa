import 'package:flutter/foundation.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:helper_hoa/config/api_config.dart';

void main() {
  tearDown(() {
    debugDefaultTargetPlatformOverride = null;
  });

  test('uses the Android emulator host for Android builds', () {
    debugDefaultTargetPlatformOverride = TargetPlatform.android;

    expect(ApiConfig.host, '10.0.2.2');
    expect(ApiConfig.expressBaseUrl, 'http://10.0.2.2:3000');
    expect(ApiConfig.pythonBaseUrl, 'http://10.0.2.2:8000');
  });

  test('uses localhost for non-Android native targets', () {
    debugDefaultTargetPlatformOverride = TargetPlatform.iOS;

    expect(ApiConfig.host, 'localhost');
    expect(ApiConfig.expressBaseUrl, 'http://localhost:3000');
    expect(ApiConfig.pythonBaseUrl, 'http://localhost:8000');
  });
}
