import 'package:flutter/material.dart';

import 'ask_hoa_page.dart';
import 'sell_page.dart';

class MyHome extends StatefulWidget {
  const MyHome({super.key});

  @override
  State<MyHome> createState() => _MyHomeState();
}

class _MyHomeState extends State<MyHome> {
  int _currentIndex = 0;

  final List<Widget> _pages = const [
    HomePageContent(),
    SellPage(),
    AskHoaPage(),
  ];

  final List<String> _titles = const [
    'Helper Hoa',
    'Sell',
    'Ask Hoa',
  ];

  final List<Color> _colors = const [
    Colors.green,
    Colors.orange,
    Colors.blue,
  ];

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text(_titles[_currentIndex]),
        backgroundColor: _colors[_currentIndex],
      ),
      body: IndexedStack(
        index: _currentIndex,
        children: _pages,
      ),
      bottomNavigationBar: BottomNavigationBar(
        currentIndex: _currentIndex,
        selectedItemColor: _colors[_currentIndex],
        items: const [
          BottomNavigationBarItem(
            icon: Icon(Icons.home),
            label: 'Home',
          ),
          BottomNavigationBarItem(
            icon: Icon(Icons.sell),
            label: 'Sell',
          ),
          BottomNavigationBarItem(
            icon: Icon(Icons.question_answer),
            label: 'Ask Hoa',
          ),
        ],
        onTap: (index) {
          setState(() {
            _currentIndex = index;
          });
        },
      ),
    );
  }
}

class HomePageContent extends StatelessWidget {
  const HomePageContent({super.key});

  @override
  Widget build(BuildContext context) {
    return const Center(
      child: Padding(
        padding: EdgeInsets.all(24.0),
        child: Text(
          'Welcome to Helper Hoa',
          textAlign: TextAlign.center,
          style: TextStyle(
            fontSize: 28,
            fontWeight: FontWeight.bold,
          ),
        ),
      ),
    );
  }
}
