class InvoiceItem {
  const InvoiceItem({
    required this.lineNumber,
    required this.name,
    required this.quantity,
    required this.unit,
    required this.costPrice,
    this.expiryDate,
    this.sellingPrice,
  });

  final int lineNumber;
  final String name;
  final double quantity;
  final String unit;
  final double costPrice;
  final String? expiryDate;
  final double? sellingPrice;

  factory InvoiceItem.fromJson(Map<String, dynamic> json) {
    return InvoiceItem(
      lineNumber: (json['lineNumber'] as num?)?.toInt() ?? 0,
      name: json['name'] as String? ?? '',
      quantity: (json['quantity'] as num?)?.toDouble() ?? 0,
      unit: json['unit'] as String? ?? '',
      costPrice: (json['costPrice'] as num?)?.toDouble() ?? 0,
      expiryDate: json['expiryDate'] as String?,
      sellingPrice: (json['sellingPrice'] as num?)?.toDouble(),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'lineNumber': lineNumber,
      'name': name,
      'quantity': quantity,
      'unit': unit,
      'costPrice': costPrice,
      if (expiryDate != null) 'expiryDate': expiryDate,
      if (sellingPrice != null) 'sellingPrice': sellingPrice,
    };
  }

  InvoiceItem copyWith({
    int? lineNumber,
    String? name,
    double? quantity,
    String? unit,
    double? costPrice,
    String? expiryDate,
    double? sellingPrice,
    bool clearExpiry = false,
    bool clearSellingPrice = false,
  }) {
    return InvoiceItem(
      lineNumber: lineNumber ?? this.lineNumber,
      name: name ?? this.name,
      quantity: quantity ?? this.quantity,
      unit: unit ?? this.unit,
      costPrice: costPrice ?? this.costPrice,
      expiryDate: clearExpiry ? null : (expiryDate ?? this.expiryDate),
      sellingPrice:
          clearSellingPrice ? null : (sellingPrice ?? this.sellingPrice),
    );
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

  InvoiceReview copyWith({
    String? supplierName,
    String? invoiceNumber,
    String? receivedDate,
    List<InvoiceItem>? items,
  }) {
    return InvoiceReview(
      supplierName: supplierName ?? this.supplierName,
      invoiceNumber: invoiceNumber ?? this.invoiceNumber,
      receivedDate: receivedDate ?? this.receivedDate,
      items: items ?? this.items,
    );
  }

  static InvoiceReview fromScan(Map<String, dynamic> extract) {
    final vendor = extract['vendor'];
    final supplierName = vendor is Map ? (vendor['name'] as String? ?? '') : '';

    final rawItems = extract['line_items'];
    final items = rawItems is List
        ? rawItems.whereType<Map>().map(_itemFromScan).toList()
        : <InvoiceItem>[];

    return InvoiceReview(
      supplierName: supplierName.trim(),
      invoiceNumber: (extract['invoice_number'] as String? ?? '').trim(),
      receivedDate: (extract['invoice_date'] as String? ?? '').trim(),
      items: items,
    );
  }

  static InvoiceItem _itemFromScan(Map item) {
    return InvoiceItem(
      lineNumber: 0,
      name: (item['product_name'] as String? ?? '').trim(),
      quantity: (item['quantity'] as num?)?.toDouble() ?? 0,
      unit: 'each',
      costPrice: (item['unit_price'] as num?)?.toDouble() ?? 0,
      expiryDate: null,
    );
  }
}