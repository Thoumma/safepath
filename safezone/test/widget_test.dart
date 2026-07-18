import 'package:flutter_test/flutter_test.dart';
import 'package:safezone/main.dart';

void main() {
  testWidgets('boots to the welcome screen when no account exists',
      (WidgetTester tester) async {
    // AuthService starts un-setup; the router now shows the first-run welcome
    // (which then hands off to /setup) rather than dropping straight into the
    // password form.
    await tester.pumpWidget(const SafeZoneApp());
    await tester.pumpAndSettle();

    // Assert on the welcome header tagline, which is always visible — the
    // "ເລີ່ມນຳໃຊ້" CTA sits in a ListView below the fold on the small default
    // test surface, so the lazy list never builds it.
    expect(find.text('ແອັບຊ່ວຍປົກປ້ອງຄົນລາວໃນຕ່າງປະເທດ'), findsOneWidget);
  });
}
