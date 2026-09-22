import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../services/chat_api_service.dart';
import '../theme_extensions.dart';

class AskHoaPage extends StatefulWidget {
  const AskHoaPage({super.key});

  @override
  State<AskHoaPage> createState() => _AskHoaPageState();
}

class _AskHoaPageState extends State<AskHoaPage> {
  final TextEditingController _controller = TextEditingController();
  final ChatApiService _chatApiService = ChatApiService();
  final ScrollController _scrollController = ScrollController();

  final List<({String text, bool isUser})> _messages = [
    (
      text:
          'Hello! I\'m Hoa. Ask me about stock levels, sales trends, restock suggestions, or expiring inventory.',
      isUser: false,
    ),
  ];

  bool _isTyping = false;

  Future<void> _sendMessage() async {
    final text = _controller.text.trim();
    if (text.isEmpty || _isTyping) return;

    final history = _messages
        .map(
          (m) => {
            'role': m.isUser ? 'user' : 'assistant',
            'content': m.text,
          },
        )
        .toList();

    setState(() {
      _messages.add((text: text, isUser: true));
      _isTyping = true;
    });
    _controller.clear();
    _scrollToBottom();

    try {
      final reply = await _chatApiService.sendMessage(
        message: text,
        history: history,
      );

      if (!mounted) return;
      setState(() {
        _messages.add((text: reply, isUser: false));
      });
    } catch (error) {
      if (!mounted) return;
      setState(() {
        _messages.add((
          text: 'Sorry, I couldn\'t reach the assistant right now. '
              'Please try again in a moment.',
          isUser: false,
        ));
      });
    } finally {
      if (mounted) {
        setState(() {
          _isTyping = false;
        });
        _scrollToBottom();
      }
    }
  }

  void _scrollToBottom() {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!_scrollController.hasClients) return;
      _scrollController.animateTo(
        _scrollController.position.maxScrollExtent,
        duration: const Duration(milliseconds: 250),
        curve: Curves.easeOut,
      );
    });
  }

  @override
  void dispose() {
    _controller.dispose();
    _scrollController.dispose();
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
                  controller: _scrollController,
                  padding: const EdgeInsets.only(top: 8, bottom: 14),
                  itemCount: _messages.length + (_isTyping ? 1 : 0),
                  itemBuilder: (context, index) {
                    if (_isTyping && index == _messages.length) {
                      return _TypingIndicator(cardBackground: context.cardBackground);
                    }

                    final msg = _messages[index];
                    final isUser = msg.isUser;
                    final text = msg.text;

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
                        onSubmitted: (_) {
                          if (!_isTyping) _sendMessage();
                        },
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
                    onTap: _isTyping ? null : _sendMessage,
                    child: Container(
                      width: 52,
                      height: 52,
                      decoration: BoxDecoration(
                        color: _isTyping
                            ? const Color(0xFF9AA8D8)
                            : const Color(0xFF4E6CD6),
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

class _TypingIndicator extends StatelessWidget {
  const _TypingIndicator({required this.cardBackground});

  final Color cardBackground;

  @override
  Widget build(BuildContext context) {
    return Align(
      alignment: Alignment.centerLeft,
      child: Container(
        margin: const EdgeInsets.only(bottom: 12),
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
        decoration: BoxDecoration(
          color: cardBackground,
          borderRadius: const BorderRadius.only(
            topLeft: Radius.circular(18),
            topRight: Radius.circular(18),
            bottomLeft: Radius.circular(6),
            bottomRight: Radius.circular(18),
          ),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withValues(alpha: 0.04),
              blurRadius: 8,
              offset: const Offset(0, 3),
            ),
          ],
        ),
        child: const Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            _TypingDot(delay: Duration(milliseconds: 0)),
            SizedBox(width: 5),
            _TypingDot(delay: Duration(milliseconds: 180)),
            SizedBox(width: 5),
            _TypingDot(delay: Duration(milliseconds: 360)),
          ],
        ),
      ),
    );
  }
}

class _TypingDot extends StatefulWidget {
  const _TypingDot({required this.delay});

  final Duration delay;

  @override
  State<_TypingDot> createState() => _TypingDotState();
}

class _TypingDotState extends State<_TypingDot> with SingleTickerProviderStateMixin {
  late final AnimationController _controller = AnimationController(
    vsync: this,
    duration: const Duration(milliseconds: 900),
  )..repeat();

  @override
  void initState() {
    super.initState();
    Future.delayed(widget.delay, () {
      if (mounted) _controller.repeat();
    });
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return FadeTransition(
      opacity: Tween<double>(begin: 0.25, end: 1).animate(
        CurvedAnimation(
          parent: _controller,
          curve: Curves.easeInOut,
        ),
      ),
      child: Container(
        width: 7,
        height: 7,
        decoration: const BoxDecoration(
          color: Color(0xFF4E6CD6),
          shape: BoxShape.circle,
        ),
      ),
    );
  }
}