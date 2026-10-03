class InventoryAlert {
  const InventoryAlert({
    required this.productId,
    required this.productName,
    required this.vendorName,
    required this.totalSold,
    required this.quantityRemaining,
    required this.unitOfMeasure,
    required this.reorderPoint,
    required this.nearestExpiryDate,
    required this.daysUntilExpiry,
    required this.severity,
    required this.reasons,
  });

  final String productId;
  final String productName;
  final String? vendorName;
  final num totalSold;
  final num quantityRemaining;
  final String unitOfMeasure;
  final num reorderPoint;
  final DateTime? nearestExpiryDate;
  final int? daysUntilExpiry;
  final String severity;
  final List<String> reasons;

  factory InventoryAlert.fromJson(Map<String, dynamic> json) {
    return InventoryAlert(
      productId: json['productId'] as String? ?? '',
      productName: json['productName'] as String? ?? 'Unknown product',
      vendorName: json['vendorName'] as String?,
      totalSold: json['totalSold'] as num? ?? 0,
      quantityRemaining: json['quantityRemaining'] as num? ?? 0,
      unitOfMeasure: json['unitOfMeasure'] as String? ?? '',
      reorderPoint: json['reorderPoint'] as num? ?? 0,
      nearestExpiryDate: json['nearestExpiryDate'] == null
          ? null
          : DateTime.parse(json['nearestExpiryDate'] as String),
      daysUntilExpiry: (json['daysUntilExpiry'] as num?)?.toInt(),
      severity: json['severity'] as String? ?? 'low',
      reasons: (json['reasons'] as List<dynamic>?)
              ?.map((r) => r as String)
              .toList() ??
          [],
    );
  }
}
