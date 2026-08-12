import 'package:flutter/material.dart';

import 'features/my_home.dart';

void main() {
  runApp(const MyApp());
}

class MyApp extends StatelessWidget {
  const MyApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Helper Hoa',
      theme: ThemeData(
        colorScheme: ColorScheme.fromSeed(
          seedColor: const Color.fromARGB(255, 94, 181, 97),
        ),
        useMaterial3: true,
      ),
      home: const MyHome(),
    );
  }
}