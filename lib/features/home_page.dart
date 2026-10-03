import 'package:flutter/material.dart';
import '../services/inventory_alert_service.dart';
import '../theme_extensions.dart';
import 'inventory_page.dart';

class HomePage extends StatefulWidget {
  const HomePage({super.key});

  @override
  State<HomePage> createState() => _HomePageState();
}

class _HomePageState extends State<HomePage> {
  final _alertService = InventoryAlertService();
  late Future<List<InventoryAlert>> _alertsFuture;

  @override
  void initState() {
    super.initState();
    _alertsFuture = _alertService.fetchAlerts();
  }

  Future<void> _reloadAlerts() async {
    final future = _alertService.fetchAlerts();
    setState(() => _alertsFuture = future);
    try {
      await future;
    } catch (_) {
      // Error is rendered by the FutureBuilder.
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: SafeArea(
        child: RefreshIndicator(
          onRefresh: _reloadAlerts,
          child: SingleChildScrollView(
            physics: const AlwaysScrollableScrollPhysics(),
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
                        ],
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
                          onSubmitted: (value) {
                            Navigator.push(
                              context,
                              MaterialPageRoute(
                                builder: (context) =>
                                    InventoryPage(search: value),
                              ),
                            );
                          },
                          decoration: InputDecoration(
                            hintText: 'Search products, orders...',
                            hintStyle: TextStyle(color: Colors.grey.shade500),
                            prefixIcon: const Icon(Icons.search,
                                color: Color(0xFF4E6CD6)),
                            filled: true,
                            fillColor: context.cardBackground,
                            border: OutlineInputBorder(
                              borderRadius: BorderRadius.circular(18),
                              borderSide: BorderSide(
                                color: const Color(0xFF4E6CD6)
                                    .withValues(alpha: 0.2),
                              ),
                            ),
                            enabledBorder: OutlineInputBorder(
                              borderRadius: BorderRadius.circular(18),
                              borderSide: BorderSide(
                                color: const Color(0xFF4E6CD6)
                                    .withValues(alpha: 0.2),
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
                    ],
                  ),
                ),
                Padding(
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
                          TextButton.icon(
                            onPressed: _reloadAlerts,
                            icon: const Icon(
                              Icons.refresh_rounded,
                              size: 18,
                              color: Color(0xFF4E6CD6),
                            ),
                            label: const Text(
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
                      FutureBuilder<List<InventoryAlert>>(
                        future: _alertsFuture,
                        builder: (context, snapshot) {
                          if (snapshot.connectionState !=
                              ConnectionState.done) {
                            return const Padding(
                              padding: EdgeInsets.symmetric(vertical: 24),
                              child: Center(child: CircularProgressIndicator()),
                            );
                          }

                          if (snapshot.hasError) {
                            return _AlertsMessage(
                              icon: Icons.cloud_off_rounded,
                              message: snapshot.error
                                  .toString()
                                  .replaceFirst('Exception: ', ''),
                              actionLabel: 'Retry',
                              onAction: _reloadAlerts,
                            );
                          }

                          final alerts = snapshot.data ?? const [];
                          if (alerts.isEmpty) {
                            return const _AlertsMessage(
                              icon: Icons.check_circle_outline_rounded,
                              message: 'All stock levels look healthy.',
                            );
                          }

                          return ListView.separated(
                            shrinkWrap: true,
                            padding: EdgeInsets.zero,
                            physics: const NeverScrollableScrollPhysics(),
                            itemCount: alerts.length,
                            separatorBuilder: (_, __) =>
                                const SizedBox(height: 10),
                            itemBuilder: (context, index) => _AlertCard(
                              key: ValueKey(alerts[index].productId),
                              alert: alerts[index],
                            ),
                          );
                        },
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

Color _levelColor(String level) {
  switch (level) {
    case 'Urgent':
      return const Color(0xFFE74C3C);
    case 'Very low':
      return const Color(0xFFF97316);
    case 'Low':
      return const Color(0xFFF59E0B);
    case 'Expiring soon':
      return const Color(0xFF8B5CF6);
    default:
      return const Color(0xFF4E6CD6);
  }
}

String _formatDate(DateTime? date) {
  if (date == null) return '—';
  const months = [
    'Jan',
    'Feb',
    'Mar',
    'Apr',
    'May',
    'Jun',
    'Jul',
    'Aug',
    'Sep',
    'Oct',
    'Nov',
    'Dec',
  ];
  final local = date.toLocal();
  return '${local.day} ${months[local.month - 1]} ${local.year}';
}

String _formatQty(num value) => value == value.roundToDouble()
    ? value.toInt().toString()
    : value.toString();

String _expiryLabel(int? days) {
  if (days == null) return 'No expiry date';
  if (days < 0) return 'Expired ${-days} day${days == -1 ? '' : 's'} ago';
  if (days == 0) return 'Expires today';
  return 'Expires in $days day${days == 1 ? '' : 's'}';
}

class _AlertsMessage extends StatelessWidget {
  const _AlertsMessage({
    required this.icon,
    required this.message,
    this.actionLabel,
    this.onAction,
  });

  final IconData icon;
  final String message;
  final String? actionLabel;
  final VoidCallback? onAction;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: context.cardBackground,
        borderRadius: BorderRadius.circular(16),
      ),
      child: Row(
        children: [
          Icon(icon, color: const Color(0xFF4E6CD6)),
          const SizedBox(width: 12),
          Expanded(
            child: Text(
              message,
              style: TextStyle(color: context.secondaryText, fontSize: 13),
            ),
          ),
          if (actionLabel != null)
            TextButton(onPressed: onAction, child: Text(actionLabel!)),
        ],
      ),
    );
  }
}

class _AlertCard extends StatefulWidget {
  const _AlertCard({super.key, required this.alert});

  final InventoryAlert alert;

  @override
  State<_AlertCard> createState() => _AlertCardState();
}

class _AlertCardState extends State<_AlertCard> {
  bool _expanded = false;

  @override
  Widget build(BuildContext context) {
    final alert = widget.alert;
    final accent = _levelColor(alert.level);
    final urgent = alert.level == 'Urgent';
    final unit = alert.unitOfMeasure;

    return Material(
      color: context.cardBackground,
      borderRadius: BorderRadius.circular(16),
      elevation: 0,
      shadowColor: Colors.black12,
      child: InkWell(
        borderRadius: BorderRadius.circular(16),
        onTap: () => setState(() => _expanded = !_expanded),
        child: Container(
          padding: const EdgeInsets.all(12),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(16),
            border: Border.all(
              color: _expanded
                  ? accent.withValues(alpha: 0.5)
                  : Colors.transparent,
            ),
            boxShadow: [
              BoxShadow(
                color: Colors.black.withValues(alpha: 0.04),
                blurRadius: 8,
                offset: const Offset(0, 3),
              ),
            ],
          ),
          child: AnimatedSize(
            duration: const Duration(milliseconds: 200),
            curve: Curves.easeInOut,
            alignment: Alignment.topCenter,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Container(
                      width: 38,
                      height: 38,
                      decoration: BoxDecoration(
                        color: accent.withValues(alpha: 0.14),
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: Icon(
                        urgent
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
                                  alert.name,
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
                                  alert.level,
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
                            '${_formatQty(alert.totalStock)} ${unit}s left',
                            style: TextStyle(
                              fontSize: 13,
                              fontWeight: FontWeight.w700,
                              color: context.primaryText,
                            ),
                          ),
                          const SizedBox(height: 2),
                          Text(
                            _expiryLabel(alert.daysToExpiry),
                            style: TextStyle(
                              fontSize: 11.5,
                              color: context.secondaryText,
                            ),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(width: 4),
                    Icon(
                      _expanded
                          ? Icons.expand_less_rounded
                          : Icons.expand_more_rounded,
                      color: context.secondaryText,
                    ),
                  ],
                ),
                if (_expanded) _buildDetails(context, alert, accent),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildDetails(
    BuildContext context,
    InventoryAlert alert,
    Color accent,
  ) {
    final vendors = <String, AlertVendor>{
      for (final batch in alert.batches)
        if (batch.vendor != null) batch.vendor!.name: batch.vendor!,
    };

    return Padding(
      padding: const EdgeInsets.only(top: 12),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Divider(height: 1, color: accent.withValues(alpha: 0.2)),
          const SizedBox(height: 10),
          if (alert.reasons.isNotEmpty) ...[
            Wrap(
              spacing: 6,
              runSpacing: 6,
              children: alert.reasons
                  .map(
                    (reason) => Chip(
                      label: Text(reason),
                      labelStyle: TextStyle(
                        fontSize: 11,
                        color: accent,
                        fontWeight: FontWeight.w600,
                      ),
                      backgroundColor: accent.withValues(alpha: 0.08),
                      side: BorderSide.none,
                      visualDensity: VisualDensity.compact,
                      materialTapTargetSize: MaterialTapTargetSize.shrinkWrap,
                    ),
                  )
                  .toList(),
            ),
            const SizedBox(height: 10),
          ],
          _DetailRow(label: 'SKU', value: alert.sku),
          _DetailRow(label: 'Category', value: alert.category),
          _DetailRow(
            label: 'Remaining stock',
            value: '${_formatQty(alert.totalStock)} ${alert.unitOfMeasure}(s)',
          ),
          _DetailRow(
            label: 'Reorder point',
            value:
                '${_formatQty(alert.reorderPoint)} ${alert.unitOfMeasure}(s)',
          ),
          _DetailRow(
            label: 'Nearest expiry',
            value: _formatDate(alert.nearestExpiry),
          ),
          _DetailRow(
            label: 'Selling price',
            value: '\$${alert.sellingPrice.toStringAsFixed(2)}',
          ),
          const SizedBox(height: 8),
          Text(
            'Vendor',
            style: TextStyle(
              fontSize: 12,
              fontWeight: FontWeight.w700,
              color: context.primaryText,
            ),
          ),
          const SizedBox(height: 4),
          if (vendors.isEmpty)
            Text(
              'No vendor on record',
              style: TextStyle(fontSize: 12, color: context.secondaryText),
            )
          else
            ...vendors.values.map(
              (vendor) => Padding(
                padding: const EdgeInsets.only(bottom: 4),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      vendor.name,
                      style: TextStyle(
                        fontSize: 13,
                        fontWeight: FontWeight.w600,
                        color: context.primaryText,
                      ),
                    ),
                    if (vendor.phone != null || vendor.email != null)
                      Text(
                        [vendor.phone, vendor.email]
                            .whereType<String>()
                            .join('  •  '),
                        style: TextStyle(
                          fontSize: 11.5,
                          color: context.secondaryText,
                        ),
                      ),
                  ],
                ),
              ),
            ),
          if (alert.batches.isNotEmpty) ...[
            const SizedBox(height: 8),
            Text(
              'Batches',
              style: TextStyle(
                fontSize: 12,
                fontWeight: FontWeight.w700,
                color: context.primaryText,
              ),
            ),
            const SizedBox(height: 4),
            ...alert.batches.map(
              (batch) => Container(
                width: double.infinity,
                margin: const EdgeInsets.only(bottom: 6),
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(
                  color: accent.withValues(alpha: 0.05),
                  borderRadius: BorderRadius.circular(10),
                ),
                child: Text(
                  '${batch.batchNumber}  •  ${_formatQty(batch.quantity)} '
                  '${alert.unitOfMeasure}(s)\n'
                  'Received ${_formatDate(batch.receivedDate)}  •  '
                  'Expires ${_formatDate(batch.expirationDate)}\n'
                  'Invoice ${batch.invoiceNumber.isEmpty ? '—' : batch.invoiceNumber}',
                  style: TextStyle(
                    fontSize: 11.5,
                    height: 1.4,
                    color: context.secondaryText,
                  ),
                ),
              ),
            ),
          ],
        ],
      ),
    );
  }
}

class _DetailRow extends StatelessWidget {
  const _DetailRow({required this.label, required this.value});

  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 2),
      child: Row(
        children: [
          SizedBox(
            width: 120,
            child: Text(
              label,
              style: TextStyle(fontSize: 12, color: context.secondaryText),
            ),
          ),
          Expanded(
            child: Text(
              value.isEmpty ? '—' : value,
              style: TextStyle(
                fontSize: 12,
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
