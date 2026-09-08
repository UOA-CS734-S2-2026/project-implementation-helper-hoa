class Item {
  final String name;
  final String index;
  final String category;
  final String price;
  final String expireDate;
  final String quantity;
  final String urgencyMessage;
  final int urgencyLevel;

  Item({
    required this.name,
    required this.index, 
    required this.category,
    required this.price,
    this.expireDate = '',
    required this.quantity,
    required this.urgencyMessage,
    required this.urgencyLevel,
  });
}