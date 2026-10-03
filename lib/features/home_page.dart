import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../theme_extensions.dart';
import '../models/inventory_alert.dart';
import '../services/inventory_alert_api_service.dart';
import 'inventory_page.dart';

class HomePage extends StatefulWidget {
  const HomePage({super.key, this.alertApi});

  final InventoryAlertApiService? alertApi;

  @override
  State<HomePage> createState() => _HomePageState();
}

class _HomePageState extends State<HomePage> {
  late final InventoryAlertApiService _alertApi =
      widget.alertApi ?? InventoryAlertApiService();
  final Set<String> _expandedAlertIds = {};

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

      final sortedAlerts = [...alerts]..sort(
          (a, b) => _severityRank(a.severity).compareTo(
            _severityRank(b.severity),
          ),
        );

      setState(() {
        _alerts = sortedAlerts;
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

  int _severityRank(String severity) {
    return switch (severity) {
      'urgent' => 0,
      'very_low' => 1,
      'low' => 2,
      'expiring_soon' => 3,
      _ => 4,
    };
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: SafeArea(
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
            const SizedBox(height: 16),
            Container(
              decoration: BoxDecoration(
                color: context.cardBackground,
                borderRadius: BorderRadius.circular(18),
                boxShadow: [
                  BoxShadow(
                    color: Colors.black.withValues(alpha: 0.06),
                    blurRadius: 10,
                    offset: const Offset(0, 4),
                  ),
                ],
              ),
              child: TextField(
                textInputAction: TextInputAction.search,
                onSubmitted: (value) {
                  Navigator.push(
                    context,
                    MaterialPageRoute(
                      builder: (context) => InventoryPage(search: value),
                    ),
                  );
                },
                decoration: InputDecoration(
                  hintText: 'Search products, orders...',
                  hintStyle: TextStyle(color: Colors.grey.shade500),
                  prefixIcon:
                      const Icon(Icons.search, color: Color(0xFF4E6CD6)),
                  filled: true,
                  fillColor: context.cardBackground,
                  border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(18),
                    borderSide: BorderSide(
                      color: const Color(0xFF4E6CD6).withValues(alpha: 0.2),
                    ),
                  ),
                  enabledBorder: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(18),
                    borderSide: BorderSide(
                      color: const Color(0xFF4E6CD6).withValues(alpha: 0.2),
                    ),
                  ),
                  focusedBorder: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(18),
                    borderSide: const BorderSide(
                      color: Color(0xFF4E6CD6),
                      width: 1.5,
                    ),
                  ),
                  contentPadding: const EdgeInsets.symmetric(
                    horizontal: 16,
                    vertical: 15,
                  ),
                ),
              ),
            ),
            Expanded(
              child: Padding(
                padding: const EdgeInsets.fromLTRB(20, 18, 20, 0),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
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
                    Expanded(
                      child: _buildAlertContent(context),
                    ),
                  ],
                ),
              ),
            ),
          ],
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
    final isExpanded = _expandedAlertIds.contains(alert.productId);
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

    return InkWell(
      onTap: () => setState(() {
        if (isExpanded) {
          _expandedAlertIds.remove(alert.productId);
        } else {
          _expandedAlertIds.add(alert.productId);
        }
      }),
      borderRadius: BorderRadius.circular(8),
      child: Container(
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          color: context.cardBackground,
          borderRadius: BorderRadius.circular(8),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withValues(alpha: 0.04),
              blurRadius: 8,
              offset: const Offset(0, 3),
            ),
          ],
        ),
        child: Column(
          children: [
            Row(
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
                    isUrgent
                        ? Icons.warning_amber_rounded
                        : Icons.info_outline_rounded,
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
                const SizedBox(width: 8),
                Icon(
                  isExpanded
                      ? Icons.expand_less_rounded
                      : Icons.expand_more_rounded,
                  color: context.secondaryText,
                ),
              ],
            ),
            if (isExpanded) ...[
              const Divider(height: 24),
              _alertDetail(
                  context, 'Vendor', alert.vendorName ?? 'Not available'),
              _alertDetail(context, 'Total sold',
                  '${alert.totalSold} ${alert.unitOfMeasure}'),
              _alertDetail(
                context,
                'Expiration date',
                alert.nearestExpiryDate == null
                    ? 'Not available'
                    : MaterialLocalizations.of(context).formatCompactDate(
                        alert.nearestExpiryDate!,
                      ),
              ),
              _alertDetail(context, 'Reorder point',
                  '${alert.reorderPoint} ${alert.unitOfMeasure}'),
            ],
          ],
        ),
      ),
    );
  }

  Widget _alertDetail(BuildContext context, String label, String value) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 6),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
            width: 112,
            child: Text(label, style: TextStyle(color: context.secondaryText)),
          ),
          Expanded(
            child: Text(
              value,
              style: TextStyle(
                fontWeight: FontWeight.w600,
                color: context.primaryText,
              ),
            ),
          ),
        ],
      ),
    );
  }
}
