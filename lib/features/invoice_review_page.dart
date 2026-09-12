import 'package:flutter/material.dart';
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
  final InvoiceApiService _invoiceApi = InvoiceApiService();
  late List<bool> _selectedItems;
  bool _isSaving = false;

  @override
  void initState() {
    super.initState();
    _selectedItems = List<bool>.filled(widget.invoice.items.length, true);
  }

  Future<void> _confirmInvoice() async {
    final selectedItems = <InvoiceItem>[];

    for (var index = 0; index < widget.invoice.items.length; index++) {
      if (_selectedItems[index]) {
        selectedItems.add(widget.invoice.items[index]);
      }
    }

    if (selectedItems.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Select at least one item to confirm.'),
        ),
      );
      return;
    }

    setState(() {
      _isSaving = true;
    });

    try {
      await _invoiceApi.saveConfirmedInvoice(
        supplierName: widget.invoice.supplierName,
        invoiceNumber: widget.invoice.invoiceNumber,
        receivedDate: widget.invoice.receivedDate,
        items: selectedItems,
      );

      if (!mounted) {
        return;
      }

      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Confirmed stock items were saved successfully.'),
        ),
      );

      context.go('/stock');
    } catch (_) {
      if (!mounted) {
        return;
      }

      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Could not save the confirmed items. Try again.'),
        ),
      );
    } finally {
      if (mounted) {
        setState(() {
          _isSaving = false;
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Review invoice items'),
      ),
      body: SafeArea(
        child: Column(
          children: [
            Container(
              width: double.infinity,
              margin: const EdgeInsets.all(16),
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: context.cardBackground,
                borderRadius: BorderRadius.circular(12),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    widget.invoice.supplierName.isEmpty
                        ? 'Unknown supplier'
                        : widget.invoice.supplierName,
                    style: TextStyle(
                      color: context.primaryText,
                      fontSize: 18,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                  const SizedBox(height: 6),
                  Text('Invoice: ${widget.invoice.invoiceNumber}'),
                  Text('Received: ${widget.invoice.receivedDate}'),
                ],
              ),
            ),
            Expanded(
              child: ListView.builder(
                itemCount: widget.invoice.items.length,
                itemBuilder: (context, index) {
                  final item = widget.invoice.items[index];

                  return Card(
                    margin: const EdgeInsets.symmetric(
                      horizontal: 16,
                      vertical: 6,
                    ),
                    child: CheckboxListTile(
                      value: _selectedItems[index],
                      controlAffinity: ListTileControlAffinity.leading,
                      activeColor: const Color(0xFF4E6CD6),
                      onChanged: _isSaving
                          ? null
                          : (isSelected) {
                              setState(() {
                                _selectedItems[index] = isSelected ?? false;
                              });
                            },
                      title: Text(
                        item.name,
                        style: const TextStyle(
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                      subtitle: Padding(
                        padding: const EdgeInsets.only(top: 8),
                        child: Text(
                          'Quantity: ${item.quantity.toStringAsFixed(0)} '
                          '${item.unit}\n'
                          'Cost price: \$${item.costPrice.toStringAsFixed(2)}\n'
                          'Expiry date: ${item.expiryDate}',
                        ),
                      ),
                    ),
                  );
                },
              ),
            ),
            Padding(
              padding: const EdgeInsets.all(16),
              child: SizedBox(
                width: double.infinity,
                height: 56,
                child: ElevatedButton(
                  onPressed: _isSaving ? null : _confirmInvoice,
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFF4E6CD6),
                    foregroundColor: Colors.white,
                  ),
                  child: _isSaving
                      ? const SizedBox(
                          height: 24,
                          width: 24,
                          child: CircularProgressIndicator(
                            color: Colors.white,
                            strokeWidth: 2,
                          ),
                        )
                      : const Text(
                          'Confirm selected items',
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
    );
  }
}