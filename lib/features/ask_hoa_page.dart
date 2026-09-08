import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../theme_extensions.dart';

class AskHoaPage extends StatefulWidget {
  const AskHoaPage({super.key});

  @override
  State<AskHoaPage> createState() => _AskHoaPageState();
}

class _AskHoaPageState extends State<AskHoaPage> {
  final TextEditingController _controller = TextEditingController();
  final List<Map<String, dynamic>> _messages = [
    {
      'text':
          'Hi! I need help checking which products are almost out of stock.',
      'isUser': true,
    },
    {
      'text':
          'Sure — I can help. Organic Rice, Fresh Milk, and Tomatoes are currently low on stock.',
      'isUser': false,
    },
    {
      'text': 'Can you suggest a restock plan for this week?',
      'isUser': true,
    },
    {
      'text':
          'Yes. I recommend replenishing Organic Rice and Fresh Milk first, then Tomatoes based on last week’s sales trend.',
      'isUser': false,
    },
  ];

  void _sendMessage() {
    final text = _controller.text.trim();
    if (text.isEmpty) return;

    setState(() {
      _messages.add({
        'text': text,
        'isUser': true,
      });

      _messages.add({
        'text': _generatePlaceholderReply(text),
        'isUser': false,
      });
    });

    _controller.clear();
  }

  String _generatePlaceholderReply(String userText) {
    final lower = userText.toLowerCase();

    if (lower.contains('stock') || lower.contains('restock')) {
      return 'I recommend checking Organic Rice, Fresh Milk, and Tomatoes first. They are the most likely to run low this week.';
    }

    if (lower.contains('sale') || lower.contains('sales')) {
      return 'Your sales trend looks healthy. I suggest focusing on high-demand items and monitoring expiry dates for perishable stock.';
    }

    if (lower.contains('expire') || lower.contains('expiry')) {
      return 'Fresh Milk and Yogurt are the fastest expiring items. Consider discounting or prioritising their sale before the weekend.';
    }

    if (lower.contains('hello') || lower.contains('hi')) {
      return 'Hello! I can help with inventory alerts, sales trends, and restocking suggestions.';
    }

    return 'Thanks for your message. I can help with stock levels, sales trends, restock suggestions, and expiry checks.';
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: SafeArea(
        child: Column(
          children: [
            Padding(
              padding: const EdgeInsets.fromLTRB(20, 18, 20, 14),
              child: Row(
                children: [
                  GestureDetector(
                    onTap: () => context.go('/'),
                    child: Container(
                      width: 40,
                      height: 40,
                      decoration: BoxDecoration(
                        color: context.cardBackground,
                        borderRadius: BorderRadius.circular(12),
                        boxShadow: [
                          BoxShadow(
                            color: Colors.black.withValues(alpha: 0.04),
                            blurRadius: 8,
                            offset: const Offset(0, 2),
                          ),
                        ],
                      ),
                      child: const Icon(
                        Icons.arrow_back_ios_new_rounded,
                        color: Color(0xFF4E6CD6),
                        size: 18,
                      ),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Text(
                    'Ask Hoa',
                    style: TextStyle(
                      fontSize: 28,
                      fontWeight: FontWeight.w800,
                      color: context.primaryText,
                    ),
                  ),
                ],
              ),
            ),

            Expanded(
              child: Padding(
                padding: const EdgeInsets.symmetric(horizontal: 16),
                child: ListView.builder(
                  padding: const EdgeInsets.only(top: 8, bottom: 14),
                  itemCount: _messages.length,
                  itemBuilder: (context, index) {
                    final msg = _messages[index];
                    final isUser = msg['isUser'] as bool;
                    final text = msg['text'] as String;

                    return Align(
                      alignment:
                          isUser ? Alignment.centerRight : Alignment.centerLeft,
                      child: Container(
                        margin: const EdgeInsets.only(bottom: 12),
                        padding: const EdgeInsets.symmetric(
                          horizontal: 14,
                          vertical: 12,
                        ),
                        constraints: BoxConstraints(
                          maxWidth: MediaQuery.of(context).size.width * 0.72,
                        ),
                        decoration: BoxDecoration(
                          color: isUser
                              ? const Color(0xFF4E6CD6)
                              : context.cardBackground,
                          borderRadius: BorderRadius.only(
                            topLeft: const Radius.circular(18),
                            topRight: const Radius.circular(18),
                            bottomLeft: Radius.circular(isUser ? 18 : 6),
                            bottomRight: Radius.circular(isUser ? 6 : 18),
                          ),
                          boxShadow: [
                            BoxShadow(
                              color: Colors.black.withValues(alpha: 0.04),
                              blurRadius: 8,
                              offset: const Offset(0, 3),
                            ),
                          ],
                        ),
                        child: Text(
                          text,
                          style: TextStyle(
                            color: isUser ? Colors.white : context.primaryText,
                            fontSize: 14,
                            height: 1.45,
                          ),
                        ),
                      ),
                    );
                  },
                ),
              ),
            ),

            Container(
              padding: const EdgeInsets.fromLTRB(16, 12, 16, 18),
              decoration: BoxDecoration(
                color: context.cardBackground,
                boxShadow: const [
                  BoxShadow(
                    color: Colors.black12,
                    blurRadius: 12,
                    offset: Offset(0, -2),
                  ),
                ],
              ),
              child: Row(
                children: [
                  Expanded(
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 14),
                      height: 52,
                      decoration: BoxDecoration(
                        color: context.subtleFill,
                        borderRadius: BorderRadius.circular(16),
                      ),
                      child: TextField(
                        controller: _controller,
                        onSubmitted: (_) => _sendMessage(),
                        decoration: InputDecoration(
                          border: InputBorder.none,
                          hintText: 'Type a message...',
                          hintStyle: TextStyle(
                            color: context.secondaryText,
                            fontSize: 14,
                          ),
                          contentPadding: const EdgeInsets.symmetric(vertical: 14),
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(width: 12),
                  GestureDetector(
                    onTap: _sendMessage,
                    child: Container(
                      width: 52,
                      height: 52,
                      decoration: BoxDecoration(
                        color: const Color(0xFF4E6CD6),
                        borderRadius: BorderRadius.circular(16),
                      ),
                      child: const Icon(
                        Icons.send_rounded,
                        color: Colors.white,
                        size: 22,
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}
