import 'package:flutter/material.dart';

/// App-wide theme mode (light/dark/system), shared between main.dart and SettingsPage.
class ThemeController {
  ThemeController._();

  static final ValueNotifier<ThemeMode> mode = ValueNotifier(ThemeMode.system);
}