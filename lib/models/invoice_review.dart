class InvoiceItem {
  const InvoiceItem({
    required this.lineNumber,
    required this.name,
    required this.quantity,
    required this.unit,
    required this.costPrice,
    required this.expiryDate,
  });

  final int lineNumber;
  final String name;
  final double quantity;
  final String unit;
  final double costPrice;
  final String expiryDate;

  factory InvoiceItem.fromJson(Map<String, dynamic> json) {
    return InvoiceItem(
      lineNumber: (json['lineNumber'] as num?)?.toInt() ?? 0,
      name: json['name'] as String? ?? '',
      quantity: (json['quantity'] as num?)?.toDouble() ?? 0,
      unit: json['unit'] as String? ?? '',
      costPrice: (json['costPrice'] as num?)?.toDouble() ?? 0,
      expiryDate: json['expiryDate'] as String? ?? '',
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'lineNumber': lineNumber,
      'name': name,
      'quantity': quantity,
      'unit': unit,
      'costPrice': costPrice,
      'expiryDate': expiryDate,
    };
  }
}

class InvoiceReview {
  const InvoiceReview({
    required this.supplierName,
    required this.invoiceNumber,
    required this.receivedDate,
    required this.items,
  });

  final String supplierName;
  final String invoiceNumber;
  final String receivedDate;
  final List<InvoiceItem> items;
}
