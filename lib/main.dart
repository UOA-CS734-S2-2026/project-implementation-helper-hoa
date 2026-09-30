import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import 'features/ask_hoa_page.dart';
import 'features/home_page.dart';
import 'features/invoice_review_page.dart';
import 'features/invoice_success_page.dart';
import 'features/my_home.dart';
import 'features/profile_page.dart';
import 'features/sell_page.dart';
import 'features/settings_page.dart';
import 'features/snap_page.dart';
import 'features/stock_page.dart';
import 'models/invoice_review.dart';
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
              path: '/snap',
              builder: (context, state) => const SnapPage(),
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
              path: '/snap/review',
              builder: (context, state) {
                final invoice = state.extra! as InvoiceReview;

                return InvoiceReviewPage(invoice: invoice);
              },
            ),
          ],
        ),
        GoRoute(
          path: '/snap/success',
          builder: (context, state) {
            final extra = state.extra! as ({int items, int newProducts});
            return InvoiceSuccessPage(
              itemsAdded: extra.items,
              newProducts: extra.newProducts,
            );
          },
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