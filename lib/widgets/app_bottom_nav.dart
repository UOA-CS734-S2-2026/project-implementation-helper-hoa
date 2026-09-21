import 'package:flutter/material.dart';

class AppBottomNav extends StatelessWidget {
  final int selectedIndex;
  final ValueChanged<int> onItemSelected;

  const AppBottomNav({
    super.key,
    required this.selectedIndex,
    required this.onItemSelected,
  });

  @override
  Widget build(BuildContext context) {
    final blue = const Color(0xFF4E6CD6);
    final yellow = const Color(0xFFFFDF58);

    return Container(
      width: double.infinity,
      height: 82,
      color: yellow,
      child: SafeArea(
        top: false,
        child: Row(
          children: [
            _navItem(
              index: 0,
              label: 'Home',
              selected: selectedIndex == 0,
              normalIcon: Icons.home_outlined,
              selectedIcon: Icons.home_rounded,
              onTap: onItemSelected,
              blue: blue,
            ),
            _navItem(
              index: 1,
              label: 'Stock',
              selected: selectedIndex == 1,
              normalIcon: Icons.inventory_2_outlined,
              selectedIcon: Icons.inventory_2_rounded,
              onTap: onItemSelected,
              blue: blue,
            ),
            _navItem(
              index: 2,
              label: 'Sell',
              selected: selectedIndex == 2,
              normalIcon: Icons.sell_outlined,
              selectedIcon: Icons.sell_rounded,
              onTap: onItemSelected,
              blue: blue,
            ),
            _navItem(
              index: 3,
              label: 'Ask Hoa',
              selected: selectedIndex == 3,
              normalIcon: Icons.chat_bubble_outline_rounded,
              selectedIcon: Icons.chat_bubble_rounded,
              onTap: onItemSelected,
              blue: blue,
            ),
            _navItem(
              index: 4,
              label: 'Search',
              selected: selectedIndex == 4,
              normalIcon: Icons.search_outlined,
              selectedIcon: Icons.search_rounded,
              onTap: onItemSelected,
              blue: blue,
            ),
          ],
        ),
      ),
    );
  }

  Widget _navItem({
    required int index,
    required String label,
    required bool selected,
    required IconData normalIcon,
    required IconData selectedIcon,
    required ValueChanged<int> onTap,
    required Color blue,
  }) {
    return Expanded(
      child: InkWell(
        onTap: () => onTap(index),
        splashColor: Colors.transparent,
        highlightColor: Colors.transparent,
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 180),
          curve: Curves.easeOut,
          margin: const EdgeInsets.symmetric(horizontal: 6, vertical: 10),
          padding: const EdgeInsets.symmetric(vertical: 8),
          decoration: selected
              ? BoxDecoration(
                  color: Colors.white.withValues(alpha: 0.22),
                  borderRadius: BorderRadius.circular(18),
                )
              : null,
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(
                selected ? selectedIcon : normalIcon,
                color: blue,
                size: 24,
                opticalSize: 24,
              ),
              const SizedBox(height: 4),
              Text(
                label,
                style: TextStyle(
                  fontSize: 11,
                  fontWeight: selected ? FontWeight.w700 : FontWeight.w500,
                  color: blue,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}