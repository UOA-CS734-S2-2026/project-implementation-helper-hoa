import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../theme_extensions.dart';
import '../models/inventory_alert.dart';
import '../services/inventory_alert_api_service.dart';

class HomePage extends StatefulWidget {
  const HomePage({super.key});

  @override
  State<HomePage> createState() => _HomePageState();
}

class _HomePageState extends State<HomePage> {
  final InventoryAlertApiService _alertApi = InventoryAlertApiService();

  List<InventoryAlert> _alerts = [];
  Object? _alertError;
  bool _isLoadingAlerts = true;

  @override
  void initState() {
    super.initState();
    _loadInventoryAlerts();
  }

  Future<void> _loadInventoryAlerts() async {
    setState(() {
      _isLoadingAlerts = true;
      _alertError = null;
    });

    try {
      final alerts = await _alertApi.getAlerts();

      if (!mounted) {
        return;
      }

      setState(() {
        _alerts = alerts;
        _isLoadingAlerts = false;
      });
    } catch (error) {
      if (!mounted) {
        return;
      }

      setState(() {
        _alertError = error;
        _isLoadingAlerts = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    

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
                        Tooltip(
                          message: 'Profile',
                          child: InkWell(
                            onTap: () => context.go('/profile'),
                            borderRadius: BorderRadius.circular(14),
                            child: Container(
                              width: 42,
                              height: 42,
                              decoration: BoxDecoration(
                                color: const Color(0xFFFFDF58),
                                borderRadius: BorderRadius.circular(14),
                              ),
                              child: const Icon(
                                Icons.person_outline_rounded,
                                color: Color(0xFF4E6CD6),
                                size: 23,
                              ),
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
                          onPressed: _loadInventoryAlerts,
                          child: const Text(
                            'Refresh',
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
                      height: 380,
                      child: _buildAlertContent(context),
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

  Widget _buildAlertContent(BuildContext context) {
    if (_isLoadingAlerts) {
      return const Center(
        child: CircularProgressIndicator(
          color: Color(0xFF4E6CD6),
        ),
      );
    }

    if (_alertError != null) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Text(
              'Could not load inventory alerts.\n$_alertError',
              textAlign: TextAlign.center,
              style: TextStyle(color: context.secondaryText, fontSize: 12),
            ),
            const SizedBox(height: 12),
            OutlinedButton.icon(
              onPressed: _loadInventoryAlerts,
              icon: const Icon(Icons.refresh_rounded),
              label: const Text('Retry'),
            ),
          ],
        ),
      );
    }

    if (_alerts.isEmpty) {
      return Center(
        child: Text(
          'No inventory alerts.',
          style: TextStyle(
            color: context.secondaryText,
            fontWeight: FontWeight.w600,
          ),
        ),
      );
    }

    return RefreshIndicator(
      onRefresh: _loadInventoryAlerts,
      child: ListView.separated(
        padding: EdgeInsets.zero,
        physics: const AlwaysScrollableScrollPhysics(),
        itemCount: _alerts.length,
        separatorBuilder: (_, __) => const SizedBox(height: 10),
        itemBuilder: (context, index) {
          return _buildAlertCard(context, _alerts[index]);
        },
      ),
    );
  }

  Widget _buildAlertCard(BuildContext context, InventoryAlert alert) {
    final isUrgent = alert.severity == 'urgent';
    final isVeryLow = alert.severity == 'very_low';
    final accent = isUrgent
        ? const Color(0xFFE74C3C)
        : isVeryLow
            ? const Color(0xFFF59E0B)
            : const Color(0xFF4E6CD6);

    final expiryText = alert.daysUntilExpiry == null
        ? 'No expiry date'
        : alert.daysUntilExpiry! < 0
            ? 'Expired ${alert.daysUntilExpiry!.abs()} days ago'
            : alert.daysUntilExpiry == 0
                ? 'Expires today'
                : alert.daysUntilExpiry == 1
                    ? 'Expires tomorrow'
                    : 'Expires in ${alert.daysUntilExpiry} days';

    final status = switch (alert.severity) {
      'urgent' => 'Urgent',
      'very_low' => 'Very low',
      'low' => 'Low',
      'expiring_soon' => 'Expiring soon',
      _ => 'Alert',
    };

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
              isUrgent ? Icons.warning_amber_rounded : Icons.info_outline_rounded,
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
                        alert.productName,
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
                        status,
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
                  '${alert.quantityRemaining} ${alert.unitOfMeasure} left',
                  style: TextStyle(
                    fontSize: 13,
                    fontWeight: FontWeight.w700,
                    color: context.primaryText,
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  expiryText,
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
  }
}