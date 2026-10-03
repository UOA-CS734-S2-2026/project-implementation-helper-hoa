import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:flutter_dotenv/flutter_dotenv.dart';

import 'features/ask_hoa_page.dart';
import 'features/home_page.dart';
import 'features/invoice_review_page.dart';
import 'features/invoice_success_page.dart';
import 'features/my_home.dart';
import 'features/profile_page.dart';
import 'features/search_page.dart';
import 'features/sell_page.dart';
import 'features/settings_page.dart';
import 'features/snap_page.dart';
import 'features/stock_page.dart';
import 'models/invoice_review.dart';
import 'services/auth_service.dart';
import 'theme_controller.dart';
import 'features/inventory_page.dart';

Future<void> main() async {
  // Restore a stored session before the first frame, so a signed-in user does
  // not see the login screen flash past.
  WidgetsFlutterBinding.ensureInitialized();

  // DevTestTokenProvider reads DEV_TEST_ID_TOKEN from here, so this has to
  // complete before AuthController.restore() looks for a stored token.
  await dotenv.load(fileName: '.env');

  await AuthController.instance.restore();

  runApp(const HelperHoaApp());
}

class HelperHoaApp extends StatefulWidget {
  const HelperHoaApp({super.key});

  @override
  State<HelperHoaApp> createState() => _HelperHoaAppState();
}

class _HelperHoaAppState extends State<HelperHoaApp> {
  late final GoRouter _router;

  @override
  void initState() {
    super.initState();

    // Built once here rather than inside build(): go_router only picks up
    // refreshListenable when the router instance outlives a rebuild.
    _router = GoRouter(
      initialLocation: '/',
      refreshListenable: AuthController.instance,
      redirect: (context, state) {
        final signedIn = AuthController.instance.isSignedIn;
        final onProfile = state.matchedLocation == '/profile';

        // Only bounce signed-out users to the login page. A signed-in user is
        // allowed to stay on /profile, which is where the sign-out control
        // lives, so redirecting them away from it would strand them.
        if (!signedIn && !onProfile) {
          return '/profile';
        }

        return null;
      },
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
            GoRoute(
              path: '/search',
              builder: (context, state) => const SearchPage(),
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
  }

  @override
  Widget build(BuildContext context) {
    return ValueListenableBuilder<ThemeMode>(
      valueListenable: ThemeController.mode,
      builder: (context, themeMode, _) {
        return MaterialApp.router(
          title: 'Helper Hoa',
          debugShowCheckedModeBanner: false,
          routerConfig: _router,
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