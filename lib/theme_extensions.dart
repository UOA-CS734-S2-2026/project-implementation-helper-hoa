import 'package:flutter/material.dart';

/// Shortcuts so pages don't hardcode light-only colors.
extension AppColors on BuildContext {
  Color get cardBackground => Theme.of(this).cardColor;
  Color get primaryText => Theme.of(this).colorScheme.onSurface;
  Color get secondaryText => Theme.of(this).colorScheme.onSurfaceVariant;
  Color get subtleFill => Theme.of(this).colorScheme.surfaceContainerHighest;
}