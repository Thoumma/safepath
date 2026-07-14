import 'package:flutter_test/flutter_test.dart';
import 'package:safezone/main.dart';

void main() {
  testWidgets('boots to the setup screen when no account exists',
      (WidgetTester tester) async {
    // AuthService starts un-setup; the router should redirect to /setup.
    await tester.pumpWidget(const SafeZoneApp());
    await tester.pumpAndSettle();

    expect(find.text('ຕັ້ງຄ່າລະຫັດຜ່ານ'), findsOneWidget);
  });
}
