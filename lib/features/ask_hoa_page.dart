import 'package:flutter/material.dart';

class AskHoaPage extends StatefulWidget {
  const AskHoaPage({super.key});

  @override
  State<AskHoaPage> createState() => _AskHoaPageState();
}

class _AskHoaPageState extends State<AskHoaPage> {
  final TextEditingController _questionController = TextEditingController();

  @override
  void dispose() {
    _questionController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.all(20.0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            'Ask a question',
            style: TextStyle(fontSize: 28, fontWeight: FontWeight.bold),
          ),
          const SizedBox(height: 20),
          TextField(
            controller: _questionController,
            maxLines: 5,
            decoration: const InputDecoration(
              border: OutlineInputBorder(),
              labelText: 'Write your question',
            ),
          ),
          const SizedBox(height: 20),
          ElevatedButton(
            onPressed: () {
              final question = _questionController.text.trim();

              if (question.isEmpty) {
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(content: Text('Please write a question.')),
                );
                return;
              }

              ScaffoldMessenger.of(context).showSnackBar(
                SnackBar(content: Text('Question sent: $question')),
              );
            },
            child: const Text('Send'),
          ),
        ],
      ),
    );
  }
}
