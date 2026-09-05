import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import 'features/ask_hoa_page.dart';
import 'features/home_page.dart';
import 'features/my_home.dart';
import 'features/profile_page.dart';
import 'features/sell_page.dart';
import 'features/settings_page.dart';
import 'features/stock_page.dart';
import 'theme_controller.dart';
import 'features/inventory_page.dart';

void main() {
  runApp(const HelperHoaApp());
}

class HelperHoaApp extends StatelessWidget {
  const HelperHoaApp({super.key});

  @override
  Widget build(BuildContext context) {
    final router = GoRouter(
      initialLocation: '/',
      routes: [
        ShellRoute(
          builder: (context, state, child) => MyHome(child: child),
          routes: [
            GoRoute(
              path: '/',
              builder: (context, state) => const HomePage(),
            ),
            GoRoute(
              path: '/stock',
              builder: (context, state) => const StockPage(),
            ),
            GoRoute(
              path: '/sell',
              builder: (context, state) => const SellPage(),
            ),
            GoRoute(
              path: '/ask-hoa',
              builder: (context, state) => const AskHoaPage(),
            ),
            GoRoute(
              path: '/profile',
              builder: (context, state) => const ProfilePage(),
            ),
            GoRoute(
              path: '/settings',
              builder: (context, state) => const SettingsPage(),
            ),
            GoRoute(
              path: '/inventory',
              builder: (context, state) => const InventoryPage(),
            ),
          ],
        ),
      ],
    );

    return ValueListenableBuilder<ThemeMode>(
      valueListenable: ThemeController.mode,
      builder: (context, themeMode, _) {
        return MaterialApp.router(
          title: 'Helper Hoa',
          debugShowCheckedModeBanner: false,
          routerConfig: router,
          themeMode: themeMode,
          theme: ThemeData(
            useMaterial3: true,
            brightness: Brightness.light,
            scaffoldBackgroundColor: const Color(0xFFF5F7FB),
            cardColor: Colors.white,
            colorScheme: ColorScheme.fromSeed(
              seedColor: const Color(0xFF50BF9A),
              brightness: Brightness.light,
              primary: const Color(0xFF50BF9A),
              secondary: const Color(0xFFFFDF58),
            ),
          ),
          darkTheme: ThemeData(
            useMaterial3: true,
            brightness: Brightness.dark,
            scaffoldBackgroundColor: const Color(0xFF121212),
            cardColor: const Color(0xFF1E1E1E),
            colorScheme: ColorScheme.fromSeed(
              seedColor: const Color(0xFF50BF9A),
              brightness: Brightness.dark,
              primary: const Color(0xFF50BF9A),
              secondary: const Color(0xFFFFDF58),
            ),
          ),
        );
      },
    );
  }
}