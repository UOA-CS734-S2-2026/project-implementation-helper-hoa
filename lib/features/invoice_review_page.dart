import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:go_router/go_router.dart';

import '../models/invoice_review.dart';
import '../services/invoice_api_service.dart';
import '../theme_extensions.dart';

class InvoiceReviewPage extends StatefulWidget {
  const InvoiceReviewPage({
    super.key,
    required this.invoice,
  });

  final InvoiceReview invoice;

  @override
  State<InvoiceReviewPage> createState() => _InvoiceReviewPageState();
}

class _InvoiceReviewPageState extends State<InvoiceReviewPage> {
  static const _blue = Color(0xFF4E6CD6);

  final InvoiceApiService _invoiceApi = InvoiceApiService();

  late String _supplierName;
  late String _invoiceNumber;
  late String _receivedDate;
  late List<InvoiceItem> _items;

  int? _editingIndex;
  bool _isSaving = false;

  // Text editing state for the row currently being edited.
  final TextEditingController _editName = TextEditingController();
  final TextEditingController _editQty = TextEditingController();
  final TextEditingController _editPrice = TextEditingController();
  final TextEditingController _editSalePrice = TextEditingController();

  @override
  void initState() {
    super.initState();
    _supplierName = widget.invoice.supplierName;
    _invoiceNumber = widget.invoice.invoiceNumber;
    _receivedDate = widget.invoice.receivedDate;
    _items = List.of(widget.invoice.items);
  }

  @override
  void dispose() {
    _editName.dispose();
    _editQty.dispose();
    _editPrice.dispose();
    _editSalePrice.dispose();
    super.dispose();
  }

  double get _totalAmount =>
      _items.fold(0.0, (sum, item) => sum + item.quantity * item.costPrice);

  void _startEdit(int index) {
    _editingIndex = index;
    final item = _items[index];
    _editName.text = item.name;
    _editQty.text = _formatQty(item.quantity);
    _editPrice.text = item.costPrice.toStringAsFixed(2);
    _editSalePrice.text =
        item.sellingPrice?.toStringAsFixed(2) ?? '';
    setState(() {});
  }

  void _saveEdit() {
    final index = _editingIndex;
    if (index == null) {
      return;
    }

    final name = _editName.text.trim();
    final qty = double.tryParse(_editQty.text.trim());
    final price = double.tryParse(_editPrice.text.trim());
    final salePrice =
        _editSalePrice.text.trim().isEmpty
            ? null
            : double.tryParse(_editSalePrice.text.trim());

    if (name.isEmpty || qty == null || price == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Product, quantity and cost price are required.'),
          behavior: SnackBarBehavior.floating,
        ),
      );
      return;
    }

    setState(() {
      _items[index] = _items[index].copyWith(
        name: name,
        quantity: qty,
        costPrice: price,
        sellingPrice: salePrice,
        clearSellingPrice: _editSalePrice.text.trim().isEmpty,
      );
      _editingIndex = null;
    });
  }

  void _cancelEdit() {
    setState(() => _editingIndex = null);
  }

  void _deleteItem(int index) {
    setState(() {
      _items.removeAt(index);
      _editingIndex = null;
    });
  }

  void _editField(
    String label,
    String value,
    ValueChanged<String> onSave,
  ) {
    showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (sheetContext) {
        final controller = TextEditingController(text: value);
        return Padding(
          padding: EdgeInsets.only(
            left: 20,
            right: 20,
            top: 20,
            bottom: MediaQuery.of(sheetContext).viewInsets.bottom + 20,
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Text(
                'Edit $label',
                style: const TextStyle(
                  fontSize: 18,
                  fontWeight: FontWeight.w800,
                ),
              ),
              const SizedBox(height: 16),
              TextField(
                controller: controller,
                autofocus: true,
                decoration: InputDecoration(
                  labelText: label,
                  filled: true,
                  fillColor: context.subtleFill,
                  border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(14),
                    borderSide: BorderSide.none,
                  ),
                ),
                onSubmitted: (_) {
                  onSave(controller.text.trim());
                  Navigator.of(sheetContext).pop();
                },
              ),
              const SizedBox(height: 14),
              SizedBox(
                height: 52,
                child: ElevatedButton(
                  style: ElevatedButton.styleFrom(
                    backgroundColor: _blue,
                    foregroundColor: Colors.white,
                  ),
                  onPressed: () {
                    onSave(controller.text.trim());
                    Navigator.of(sheetContext).pop();
                  },
                  child: const Text(
                    'Save',
                    style: TextStyle(fontWeight: FontWeight.w700, fontSize: 16),
                  ),
                ),
              ),
            ],
          ),
        );
      },
    );
  }

  Future<void> _approve() async {
    if (_items.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Add at least one line item to approve.'),
          behavior: SnackBarBehavior.floating,
        ),
      );
      return;
    }

    setState(() => _isSaving = true);

    try {
      final results = await _invoiceApi.saveConfirmedInvoice(
        supplierName: _supplierName,
        invoiceNumber: _invoiceNumber,
        receivedDate: _receivedDate,
        items: _items,
      );

      if (!mounted) {
        return;
      }

      final newProducts = results.where((r) => r.created).length;
      context.pushReplacement(
        '/snap/success',
        extra: (items: _items.length, newProducts: newProducts),
      );
    } catch (error, stackTrace) {
      debugPrint('Approve failed: $error\n$stackTrace');
      if (!mounted) {
        return;
      }
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Could not save the confirmed items. Try again.'),
          behavior: SnackBarBehavior.floating,
        ),
      );
    } finally {
      if (mounted) {
        setState(() => _isSaving = false);
      }
    }
  }

  void _cancel() {
    context.pop();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text(
          'Review Invoice',
          style: TextStyle(fontWeight: FontWeight.w800),
        ),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios_new_rounded, size: 20),
          onPressed: _cancel,
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.share_outlined),
            onPressed: () => _toast('Share coming soon'),
          ),
          PopupMenuButton<String>(
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(14),
            ),
            onSelected: (value) => _toast('$value coming soon'),
            itemBuilder: (context) => const [
              PopupMenuItem(value: 'Export PDF', child: Text('Export PDF')),
              PopupMenuItem(value: 'Duplicate', child: Text('Duplicate')),
            ],
          ),
        ],
      ),
      body: SafeArea(
        child: Column(
          children: [
            _supplierCard(context),
            Expanded(
              child: ListView(
                padding: const EdgeInsets.fromLTRB(16, 0, 16, 16),
                children: [
                  _lineItemsCard(context),
                ],
              ),
            ),
          ],
        ),
      ),
      bottomNavigationBar: SafeArea(
        top: false,
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Row(
            children: [
              Expanded(
                child: SizedBox(
                  height: 54,
                  child: OutlinedButton(
                    onPressed: _isSaving ? null : _cancel,
                    style: OutlinedButton.styleFrom(
                      foregroundColor: _blue,
                      side: const BorderSide(color: _blue, width: 1.4),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(16),
                      ),
                    ),
                    child: const Text(
                      'Cancel',
                      style: TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                  ),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: SizedBox(
                  height: 54,
                  child: ElevatedButton(
                    onPressed: _isSaving ? null : _approve,
                    style: ElevatedButton.styleFrom(
                      backgroundColor: _blue,
                      foregroundColor: Colors.white,
                      elevation: 0,
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(16),
                      ),
                    ),
                    child: _isSaving
                        ? const SizedBox(
                            height: 22,
                            width: 22,
                            child: CircularProgressIndicator(
                              color: Colors.white,
                              strokeWidth: 2,
                            ),
                          )
                        : const Text(
                            'Approve',
                            style: TextStyle(
                              fontSize: 16,
                              fontWeight: FontWeight.w700,
                            ),
                          ),
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _supplierCard(BuildContext context) {
    return Container(
      margin: const EdgeInsets.all(16),
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        color: context.cardBackground,
        borderRadius: BorderRadius.circular(20),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.04),
            blurRadius: 10,
            offset: const Offset(0, 3),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            'Supplier & Invoice Details',
            style: TextStyle(fontSize: 16, fontWeight: FontWeight.w800),
          ),
          const SizedBox(height: 8),
          _detailRow(
            'Supplier Name',
            _supplierName.isEmpty ? 'Unknown supplier' : _supplierName,
            onEdit: () => _editField(
              'Supplier Name',
              _supplierName,
              (value) => setState(() => _supplierName = value),
            ),
          ),
          const Divider(height: 1),
          _detailRow(
            'Invoice Date',
            _receivedDate.isEmpty ? 'Not set' : _receivedDate,
            onEdit: () => _editField(
              'Invoice Date',
              _receivedDate,
              (value) => setState(() => _receivedDate = value),
            ),
          ),
          const Divider(height: 1),
          _detailRow(
            'Invoice Number',
            _invoiceNumber.isEmpty ? 'Not set' : _invoiceNumber,
            onEdit: () => _editField(
              'Invoice Number',
              _invoiceNumber,
              (value) => setState(() => _invoiceNumber = value),
            ),
          ),
        ],
      ),
    );
  }

  Widget _detailRow(String label, String value, {required VoidCallback onEdit}) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 11),
      child: Row(
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  label,
                  style: TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.w700,
                    color: context.secondaryText,
                  ),
                ),
                const SizedBox(height: 3),
                Text(
                  value,
                  style: const TextStyle(
                    fontSize: 15,
                    fontWeight: FontWeight.w700,
                  ),
                ),
              ],
            ),
          ),
          IconButton(
            onPressed: onEdit,
            icon: const Icon(Icons.edit_outlined, color: _blue, size: 20),
            visualDensity: VisualDensity.compact,
            tooltip: 'Edit $label',
          ),
        ],
      ),
    );
  }

  Widget _lineItemsCard(BuildContext context) {
    return Container(
      margin: const EdgeInsets.only(bottom: 8),
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        color: context.cardBackground,
        borderRadius: BorderRadius.circular(20),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.04),
            blurRadius: 10,
            offset: const Offset(0, 3),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            'Extracted Line Items',
            style: TextStyle(fontSize: 16, fontWeight: FontWeight.w800),
          ),
          const SizedBox(height: 12),
          const _TableRow(
            name: 'Prod',
            qty: 'Qty',
            price: 'Price',
            isHeader: true,
          ),
          const Divider(height: 1),
          if (_items.isEmpty)
            Padding(
              padding: const EdgeInsets.symmetric(vertical: 18),
              child: Center(
                child: Text(
                  'No line items',
                  style: TextStyle(color: context.secondaryText),
                ),
              ),
            )
          else
            for (var index = 0; index < _items.length; index++) ...[
              if (_editingIndex == index)
                _editRow(context, index)
              else
                _TableRow(
                  name: _items[index].name,
                  qty: _formatQty(_items[index].quantity),
                  price: '\$${_items[index].costPrice.toStringAsFixed(2)}',
                  onEdit: () => _startEdit(index),
                  onDelete: () => _deleteItem(index),
                ),
              const Divider(height: 1),
            ],
          const SizedBox(height: 14),
          Center(
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 10),
              decoration: BoxDecoration(
                color: _blue.withValues(alpha: 0.1),
                borderRadius: BorderRadius.circular(20),
              ),
              child: Text(
                'Total  \$${_totalAmount.toStringAsFixed(2)}',
                style: const TextStyle(
                  color: _blue,
                  fontSize: 16,
                  fontWeight: FontWeight.w800,
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _editRow(BuildContext context, int index) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 10),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          TextField(
            controller: _editName,
            decoration: const InputDecoration(
              labelText: 'Product',
              isDense: true,
              border: OutlineInputBorder(),
            ),
          ),
          const SizedBox(height: 8),
          Row(
            children: [
              Expanded(
                child: TextField(
                  controller: _editQty,
                  keyboardType:
                      const TextInputType.numberWithOptions(decimal: true),
                  inputFormatters: [FilteringTextInputFormatter.allow(RegExp(r'[0-9.]'))],
                  decoration: const InputDecoration(
                    labelText: 'Qty',
                    isDense: true,
                    border: OutlineInputBorder(),
                  ),
                ),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: TextField(
                  controller: _editPrice,
                  keyboardType:
                      const TextInputType.numberWithOptions(decimal: true),
                  inputFormatters: [FilteringTextInputFormatter.allow(RegExp(r'[0-9.]'))],
                  decoration: const InputDecoration(
                    labelText: 'Cost price',
                    isDense: true,
                    border: OutlineInputBorder(),
                  ),
                ),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: TextField(
                  controller: _editSalePrice,
                  keyboardType:
                      const TextInputType.numberWithOptions(decimal: true),
                  inputFormatters: [FilteringTextInputFormatter.allow(RegExp(r'[0-9.]'))],
                  decoration: const InputDecoration(
                    labelText: 'Sell price',
                    isDense: true,
                    border: OutlineInputBorder(),
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 6),
          Text(
            _editSalePrice.text.isEmpty
                ? 'Set a selling price for newly created products.'
                : '',
            style: TextStyle(
              fontSize: 11.5,
              color: context.secondaryText,
            ),
          ),
          Row(
            mainAxisAlignment: MainAxisAlignment.end,
            children: [
              TextButton(
                onPressed: _cancelEdit,
                child: const Text('Cancel'),
              ),
              const SizedBox(width: 8),
              ElevatedButton(
                onPressed: _saveEdit,
                style: ElevatedButton.styleFrom(
                  backgroundColor: _blue,
                  foregroundColor: Colors.white,
                ),
                child: const Text('Save'),
              ),
            ],
          ),
        ],
      ),
    );
  }

  void _toast(String message) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text(message), behavior: SnackBarBehavior.floating),
    );
  }

  String _formatQty(double value) {
    return value == value.roundToDouble()
        ? value.toStringAsFixed(0)
        : value.toString();
  }
}

class _TableRow extends StatelessWidget {
  const _TableRow({
    required this.name,
    required this.qty,
    required this.price,
    this.isHeader = false,
    this.onEdit,
    this.onDelete,
  });

  static const _blue = Color(0xFF4E6CD6);

  final String name;
  final String qty;
  final String price;
  final bool isHeader;
  final VoidCallback? onEdit;
  final VoidCallback? onDelete;

  @override
  Widget build(BuildContext context) {
    final TextStyle? textStyle = isHeader
        ? TextStyle(
            fontSize: 12,
            fontWeight: FontWeight.w800,
            color: Theme.of(context).colorScheme.onSurfaceVariant,
          )
        : const TextStyle(fontSize: 14, fontWeight: FontWeight.w600);

    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 10),
      child: Row(
        children: [
          Expanded(
            flex: 4,
            child: Text(name, style: textStyle, maxLines: 2,
                overflow: TextOverflow.ellipsis),
          ),
          SizedBox(
            width: 56,
            child: Text(qty, style: textStyle, textAlign: TextAlign.right),
          ),
          SizedBox(
            width: 74,
            child: Text(price, style: textStyle, textAlign: TextAlign.right),
          ),
          if (isHeader)
            const SizedBox(width: 40)
          else ...[
            IconButton(
              onPressed: onEdit,
              icon: const Icon(Icons.edit_outlined, color: _blue, size: 19),
              visualDensity: VisualDensity.compact,
              tooltip: 'Edit row',
            ),
            IconButton(
              onPressed: onDelete,
              icon: Icon(
                Icons.delete_outline_rounded,
                color: Theme.of(context).colorScheme.error,
                size: 20,
              ),
              visualDensity: VisualDensity.compact,
              tooltip: 'Delete row',
            ),
          ],
        ],
      ),
    );
  }
}