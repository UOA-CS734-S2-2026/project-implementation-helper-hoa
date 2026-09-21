import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../widgets/app_bottom_nav.dart';

class MyHome extends StatelessWidget {
  final Widget child;

  const MyHome({
    super.key,
    required this.child,
  });

  @override
  Widget build(BuildContext context) {
    final location = GoRouterState.of(context).matchedLocation;
    int selectedIndex = 0;

    switch (location) {
      case '/':
        selectedIndex = 0;
        break;
      case '/stock':
        selectedIndex = 1;
        break;
      case '/sell':
        selectedIndex = 2;
        break;
      case '/ask-hoa':
        selectedIndex = 3;
        break;
      case '/profile':
        selectedIndex = 4;
        break;
      default:
        selectedIndex = 0;
    }

    return Scaffold(
      body: child,
      bottomNavigationBar: AppBottomNav(
        selectedIndex: selectedIndex,
        onItemSelected: (index) {
          switch (index) {
            case 0:
              context.go('/');
              break;
            case 1:
              context.go('/stock');
              break;
            case 2:
              context.go('/sell');
              break;
            case 3:
              context.go('/ask-hoa');
              break;
            case 4:
              context.go('/profile');
              break;
          }
        },
      ),
    );
  }
}

class _HomePageContent extends StatelessWidget {
  const _HomePageContent();

  @override
  Widget build(BuildContext context) {
    return SafeArea(
      child: Container(
        width: double.infinity,
        padding: const EdgeInsets.fromLTRB(20, 18, 20, 18),
        decoration: const BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.only(
            bottomLeft: Radius.circular(28),
            bottomRight: Radius.circular(28),
          ),
          boxShadow: [
            BoxShadow(
              color: Colors.black12,
              blurRadius: 10,
              offset: Offset(0, 4),
            ),
          ],
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                SizedBox(
                  width: 154,
                  height: 56,
                  child: Image.asset(
                    'assets/logo.png',
                    fit: BoxFit.contain,
                    alignment: Alignment.centerLeft,
                    errorBuilder: (context, error, stackTrace) {
                      return const Center(
                        child: Icon(
                          Icons.home_repair_service_rounded,
                          size: 30,
                          color: Color(0xFF4E6CD6),
                        ),
                      );
                    },
                  ),
                ),
                PopupMenuButton<String>(
                  offset: const Offset(0, 46),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(16),
                  ),
                  onSelected: (value) {
                    ScaffoldMessenger.of(context).showSnackBar(
                      SnackBar(
                        content: Text(value),
                        behavior: SnackBarBehavior.floating,
                      ),
                    );
                  },
                  itemBuilder: (context) => [
                    const PopupMenuItem(
                      value: 'Notifications',
                      child: Row(
                        children: [
                          Icon(Icons.notifications_none_rounded, color: Color(0xFF4E6CD6)),
                          SizedBox(width: 10),
                          Text('Notifications'),
                        ],
                      ),
                    ),
                    const PopupMenuItem(
                      value: 'Messages',
                      child: Row(
                        children: [
                          Icon(Icons.message_outlined, color: Color(0xFF4E6CD6)),
                          SizedBox(width: 10),
                          Text('Messages'),
                        ],
                      ),
                    ),
                    const PopupMenuItem(
                      value: 'Settings',
                      child: Row(
                        children: [
                          Icon(Icons.settings_outlined, color: Color(0xFF4E6CD6)),
                          SizedBox(width: 10),
                          Text('Settings'),
                        ],
                      ),
                    ),
                  ],
                  child: Container(
                    width: 42,
                    height: 42,
                    decoration: BoxDecoration(
                      color: const Color(0xFFFFDF58),
                      borderRadius: BorderRadius.circular(14),
                    ),
                    child: const Icon(
                      Icons.notifications_none_rounded,
                      color: Color(0xFF4E6CD6),
                      size: 22,
                    ),
                  ),
                ),
              ],
            ),

            
          ],
        ),
      ),
    );
  }

  Widget _featureCard({
    required String title,
    required String subtitle,
    required Color color,
  }) {
    return Container(
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        color: color,
        borderRadius: BorderRadius.circular(22),
      ),
      child: Row(
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  title,
                  style: const TextStyle(
                    fontSize: 18,
                    fontWeight: FontWeight.w700,
                    color: Color(0xFF000000),
                  ),
                ),
                const SizedBox(height: 6),
                Text(
                  subtitle,
                  style: TextStyle(
                    fontSize: 13,
                    color: Colors.grey.shade700,
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(width: 12),
          Container(
            width: 48,
            height: 48,
            decoration: BoxDecoration(
              color: Colors.white.withValues(alpha: 0.8),
              borderRadius: BorderRadius.circular(14),
            ),
            child: const Icon(
              Icons.arrow_forward_rounded,
              color: Color(0xFF4E6CD6),
            ),
          ),
        ],
      ),
    );
  }
}

class _StockPage extends StatelessWidget {
  const _StockPage();

  @override
  Widget build(BuildContext context) {
    return const Scaffold(
      body: Center(child: Text('Stock')),
    );
  }
}

class _SellPage extends StatelessWidget {
  const _SellPage();

  @override
  Widget build(BuildContext context) {
    return const Scaffold(
      body: Center(child: Text('Sell')),
    );
  }
}

class _AskHoaPage extends StatelessWidget {
  const _AskHoaPage();

  @override
  Widget build(BuildContext context) {
    return const Scaffold(
      body: Center(child: Text('Ask Hoa')),
    );
  }
}

class _ProfilePage extends StatelessWidget {
  const _ProfilePage();

  @override
  Widget build(BuildContext context) {
    return const Scaffold(
      body: Center(child: Text('Profile')),
    );
  }
}
