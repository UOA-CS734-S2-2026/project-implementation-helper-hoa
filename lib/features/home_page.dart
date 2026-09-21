import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../theme_extensions.dart';

class HomePage extends StatelessWidget {
  const HomePage({super.key});

  @override
  Widget build(BuildContext context) {
    final lowStockItems = [
      {
        'name': 'Organic Rice',
        'qty': '12 bags left',
        'expiry': 'Expires in 3 days',
        'status': 'Very low',
        'severity': 'urgent',
        'color': const Color(0xFFE74C3C),
      },
      {
        'name': 'Fresh Milk',
        'qty': '6 cartons left',
        'expiry': 'Expires in 1 day',
        'status': 'Expiring soon',
        'severity': 'urgent',
        'color': const Color(0xFFE74C3C),
      },
      {
        'name': 'Tomatoes',
        'qty': '8 crates left',
        'expiry': 'Expires in 5 days',
        'status': 'Low',
        'severity': 'watch',
        'color': const Color(0xFFF59E0B),
      },
      {
        'name': 'Chicken Feed',
        'qty': '15 sacks left',
        'expiry': 'Expires in 9 days',
        'status': 'Monitor',
        'severity': 'watch',
        'color': const Color(0xFFF59E0B),
      },
      {
        'name': 'Cabbage',
        'qty': '18 heads left',
        'expiry': 'Expires in 6 days',
        'status': 'Low',
        'severity': 'watch',
        'color': const Color(0xFFF59E0B),
      },
      {
        'name': 'Yogurt',
        'qty': '4 tubs left',
        'expiry': 'Expires in 2 days',
        'status': 'Urgent',
        'severity': 'urgent',
        'color': const Color(0xFFE74C3C),
      },
    ];

    final stats = [
      {
        'label': 'Total sales',
        'value': '\$12.4k',
        'change': '+8.2%',
        'color': const Color(0xFF50BF9A),
      },
      {
        'label': 'Transactions',
        'value': '381',
        'change': '+24',
        'color': const Color(0xFF4E6CD6),
      },
    ];

    return Scaffold(
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.only(bottom: 18),
          child: Column(
            children: [
              Container(
                width: double.infinity,
                padding: const EdgeInsets.fromLTRB(20, 18, 20, 18),
                decoration: BoxDecoration(
                  color: context.cardBackground,
                  boxShadow: const [
                    BoxShadow(
                      color: Colors.black12,
                      blurRadius: 12,
                      offset: Offset(0, 3),
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
                                  Icons.business_center_rounded,
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
                            if (value == 'Settings') {
                              context.go('/settings');
                              return;
                            }

                            ScaffoldMessenger.of(context).showSnackBar(
                              SnackBar(
                                content: Text(value),
                                behavior: SnackBarBehavior.floating,
                              ),
                            );
                          },
                          itemBuilder: (context) => const [
                            PopupMenuItem(
                              value: 'Notifications',
                              child: Row(
                                children: [
                                  Icon(Icons.notifications_none_rounded,
                                      color: Color(0xFF4E6CD6)),
                                  SizedBox(width: 10),
                                  Text('Notifications'),
                                ],
                              ),
                            ),
                            PopupMenuItem(
                              value: 'Messages',
                              child: Row(
                                children: [
                                  Icon(Icons.message_outlined,
                                      color: Color(0xFF4E6CD6)),
                                  SizedBox(width: 10),
                                  Text('Messages'),
                                ],
                              ),
                            ),
                            PopupMenuItem(
                              value: 'Settings',
                              child: Row(
                                children: [
                                  Icon(Icons.settings_outlined,
                                      color: Color(0xFF4E6CD6)),
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

              Padding(
                padding: const EdgeInsets.fromLTRB(20, 18, 20, 0),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Container(
                      width: double.infinity,
                      padding: const EdgeInsets.all(18),
                      decoration: BoxDecoration(
                        borderRadius: BorderRadius.circular(22),
                        gradient: const LinearGradient(
                          colors: [
                            Color(0xFF4E6CD6),
                            Color(0xFF6B7FE4),
                          ],
                          begin: Alignment.topLeft,
                          end: Alignment.bottomRight,
                        ),
                      ),
                      child: Row(
                        children: [
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: const [
                                Text(
                                  'Today’s performance',
                                  style: TextStyle(
                                    color: Colors.white,
                                    fontSize: 16,
                                    fontWeight: FontWeight.w700,
                                  ),
                                ),
                                SizedBox(height: 6),
                                Text(
                                  'Sales are up 14% compared to yesterday',
                                  style: TextStyle(
                                    color: Colors.white70,
                                    fontSize: 12,
                                  ),
                                ),
                              ],
                            ),
                          ),
                          Container(
                            width: 54,
                            height: 54,
                            decoration: BoxDecoration(
                              color: Colors.white.withValues(alpha: 0.18),
                              borderRadius: BorderRadius.circular(16),
                            ),
                            child: const Icon(
                              Icons.trending_up_rounded,
                              color: Colors.white,
                            ),
                          ),
                        ],
                      ),
                    ),

                    const SizedBox(height: 20),

                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text(
                          'Overview',
                          style: TextStyle(
                            fontSize: 20,
                            fontWeight: FontWeight.w700,
                            color: context.primaryText,
                          ),
                        ),
                        Container(
                          padding: const EdgeInsets.symmetric(
                            horizontal: 10,
                            vertical: 6,
                          ),
                          decoration: BoxDecoration(
                            color: const Color(0xFF4E6CD6).withValues(alpha: 0.08),
                            borderRadius: BorderRadius.circular(12),
                          ),
                          child: const Text(
                            'This week',
                            style: TextStyle(
                              color: Color(0xFF4E6CD6),
                              fontWeight: FontWeight.w600,
                              fontSize: 12,
                            ),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 14),

                    GridView.builder(
                      shrinkWrap: true,
                      physics: const NeverScrollableScrollPhysics(),
                      itemCount: stats.length,
                      gridDelegate:
                          const SliverGridDelegateWithFixedCrossAxisCount(
                        crossAxisCount: 2,
                        crossAxisSpacing: 12,
                        mainAxisSpacing: 12,
                        childAspectRatio: 1.5,
                      ),
                      itemBuilder: (context, index) {
                        final item = stats[index];
                        final color = item['color'] as Color;

                        return Container(
                          padding: const EdgeInsets.all(16),
                          decoration: BoxDecoration(
                            color: context.cardBackground,
                            borderRadius: BorderRadius.circular(18),
                            boxShadow: [
                              BoxShadow(
                                color: Colors.black.withValues(alpha: 0.03),
                                blurRadius: 8,
                                offset: const Offset(0, 3),
                              ),
                            ],
                          ),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Row(
                                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                children: [
                                  Text(
                                    item['label'] as String,
                                    style: TextStyle(
                                      fontSize: 12,
                                      color: context.secondaryText,
                                      fontWeight: FontWeight.w600,
                                    ),
                                  ),
                                  Container(
                                    width: 10,
                                    height: 10,
                                    decoration: BoxDecoration(
                                      color: color,
                                      borderRadius: BorderRadius.circular(6),
                                    ),
                                  ),
                                ],
                              ),
                              const SizedBox(height: 12),
                              Text(
                                item['value'] as String,
                                style: TextStyle(
                                  fontSize: 24,
                                  fontWeight: FontWeight.w800,
                                  color: context.primaryText,
                                ),
                              ),
                              const SizedBox(height: 6),
                              Text(
                                item['change'] as String,
                                style: TextStyle(
                                  fontSize: 12,
                                  fontWeight: FontWeight.w700,
                                  color: color,
                                ),
                              ),
                            ],
                          ),
                        );
                      },
                    ),

                    const SizedBox(height: 22),

                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text(
                          'Inventory alerts',
                          style: TextStyle(
                            fontSize: 20,
                            fontWeight: FontWeight.w700,
                            color: context.primaryText,
                          ),
                        ),
                        TextButton(
                          onPressed: () {},
                          child: const Text(
                            'View all',
                            style: TextStyle(
                              color: Color(0xFF4E6CD6),
                              fontWeight: FontWeight.w700,
                            ),
                          ),
                        ),
                      ],
                    ),

                    const SizedBox(height: 10),

                    SizedBox(
                      height: 270,
                      child: ListView.separated(
                        padding: EdgeInsets.zero,
                        physics: const BouncingScrollPhysics(),
                        scrollDirection: Axis.vertical,
                        itemCount: lowStockItems.length,
                        separatorBuilder: (_, __) => const SizedBox(height: 10),
                        itemBuilder: (context, index) {
                          final item = lowStockItems[index];
                          final accent = item['color'] as Color;
                          final urgent = item['severity'] == 'urgent';

                          return Container(
                            padding: const EdgeInsets.all(12),
                            decoration: BoxDecoration(
                              color: context.cardBackground,
                              borderRadius: BorderRadius.circular(16),
                              boxShadow: [
                                BoxShadow(
                                  color: Colors.black.withValues(alpha: 0.04),
                                  blurRadius: 8,
                                  offset: const Offset(0, 3),
                                ),
                              ],
                            ),
                            child: Row(
                              crossAxisAlignment: CrossAxisAlignment.center,
                              children: [
                                Container(
                                  width: 38,
                                  height: 38,
                                  decoration: BoxDecoration(
                                    color: accent.withValues(alpha: 0.14),
                                    borderRadius: BorderRadius.circular(12),
                                  ),
                                  child: Icon(
                                    urgent ? Icons.warning_amber_rounded : Icons.info_outline_rounded,
                                    color: accent,
                                    size: 20,
                                  ),
                                ),
                                const SizedBox(width: 12),
                                Expanded(
                                  child: Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      Row(
                                        children: [
                                          Expanded(
                                            child: Text(
                                              item['name'] as String,
                                              style: TextStyle(
                                                fontSize: 15,
                                                fontWeight: FontWeight.w700,
                                                color: context.primaryText,
                                              ),
                                            ),
                                          ),
                                          Container(
                                            padding: const EdgeInsets.symmetric(
                                              horizontal: 8,
                                              vertical: 4,
                                            ),
                                            decoration: BoxDecoration(
                                              color: accent.withValues(alpha: 0.14),
                                              borderRadius: BorderRadius.circular(8),
                                            ),
                                            child: Text(
                                              item['status'] as String,
                                              style: TextStyle(
                                                color: accent,
                                                fontSize: 9.5,
                                                fontWeight: FontWeight.w800,
                                              ),
                                            ),
                                          ),
                                        ],
                                      ),
                                      const SizedBox(height: 4),
                                      Text(
                                        item['qty'] as String,
                                        style: TextStyle(
                                          fontSize: 13,
                                          fontWeight: FontWeight.w700,
                                          color: context.primaryText,
                                        ),
                                      ),
                                      const SizedBox(height: 2),
                                      Text(
                                        item['expiry'] as String,
                                        style: TextStyle(
                                          fontSize: 11.5,
                                          color: context.secondaryText,
                                        ),
                                      ),
                                    ],
                                  ),
                                ),
                              ],
                            ),
                          );
                        },
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}