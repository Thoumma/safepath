// TEMPORARY design-verification harness. Renders each screen in light and dark
// with the real bundled Lao font and writes PNGs to test/goldens/.
// Run: flutter test test/design_preview_test.dart --update-goldens
import 'dart:io';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:safezone/screens/about_screen.dart';
import 'package:safezone/screens/contact_screen.dart';
import 'package:safezone/screens/guardian_screen.dart';
import 'package:safezone/screens/home_screen.dart';
import 'package:safezone/screens/lock_screen.dart';
import 'package:safezone/screens/otp_screen.dart';
import 'package:safezone/screens/passport_screen.dart';
import 'package:safezone/screens/profile_screen.dart';
import 'package:safezone/screens/report_screen.dart';
import 'package:safezone/screens/setup_screen.dart';
import 'package:safezone/screens/sos_screen.dart';
import 'package:safezone/screens/welcome_screen.dart';
import 'package:safezone/services/database_service.dart';
import 'package:safezone/theme.dart';
import 'package:sqflite_common_ffi/sqflite_ffi.dart';

/// Reproduces the chrome `AppShell` puts around a tab, without needing a live
/// `StatefulNavigationShell` (which only go_router can construct).
class _ShellPreview extends StatelessWidget {
  final Widget child;
  const _ShellPreview({required this.child});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: child,
      bottomNavigationBar: NavigationBar(
        selectedIndex: 0,
        onDestinationSelected: (_) {},
        destinations: const [
          NavigationDestination(icon: Icon(Icons.home_outlined), label: 'ໜ້າຫຼັກ'),
          NavigationDestination(icon: Icon(Icons.shield_outlined), label: 'ຜູ້ໄວ້ໃຈ'),
          NavigationDestination(icon: Icon(Icons.info_outline), label: 'ກ່ຽວກັບ'),
        ],
      ),
    );
  }
}

Future<void> _loadFonts() async {
  const families = {
    'Noto Sans Lao': 'NotoSansLao',
    'Noto Sans': 'NotoSansLatin',
  };
  for (final entry in families.entries) {
    final loader = FontLoader(entry.key);
    for (final weight in ['Regular', 'Medium', 'Bold']) {
      loader.addFont(
        File('assets/fonts/${entry.value}-$weight.ttf')
            .readAsBytes()
            .then((b) => ByteData.view(b.buffer)),
      );
    }
    await loader.load();
  }

  // Icons come from the SDK, not from assets/, so the harness has to load them
  // or every Icon renders as a box and masks whatever else is wrong.
  final icons = File(r'C:\flutter\flutter_windows_3.29.3-stable\flutter\bin'
      r'\cache\artifacts\material_fonts\MaterialIcons-Regular.otf');
  if (icons.existsSync()) {
    final loader = FontLoader('MaterialIcons')
      ..addFont(
        icons.readAsBytes().then((b) => ByteData.view(b.buffer)),
      );
    await loader.load();
  }
}

void _stubPlugins() {
  final messenger =
      TestDefaultBinaryMessengerBinding.instance.defaultBinaryMessenger;

  messenger.setMockMethodCallHandler(
    const MethodChannel('plugins.it_nomads.com/flutter_secure_storage'),
    (call) async => switch (call.method) {
      'readAll' => <String, String>{},
      'containsKey' => false,
      _ => null,
    },
  );

  messenger.setMockMethodCallHandler(
    const MethodChannel('plugins.flutter.io/path_provider'),
    (call) async => Directory.systemTemp.createTempSync('safezone_gold').path,
  );
}

void main() {
  setUpAll(() async {
    await _loadFonts();
    _stubPlugins();
    // LockScreen reads the login-throttle state from SQLite in initState.
    sqfliteFfiInit();
    databaseFactory = databaseFactoryFfi;
    DatabaseService.testPathOverride = inMemoryDatabasePath;
  });

  final screens = <String, Widget>{
    'welcome': const WelcomeScreen(),
    'home': const HomeScreen(),
    // Home inside the real bottom-bar chrome. This is the same widget tree the
    // shell builds (Scaffold > body: HomeScreen, bottomNavigationBar), so it is
    // where we actually check the SOS button keeps its clearance above the bar
    // rather than assuming it.
    'home_shell': const _ShellPreview(child: HomeScreen()),
    'guardian': const GuardianScreen(),
    'profile': const ProfileScreen(),
    'about': const AboutScreen(),
    'report': const ReportScreen(),
    'sos': const SosScreen(),
    'passport': const PassportScreen(),
    'contact': const ContactScreen(),
    'setup': const SetupScreen(),
    'lock': const LockScreen(),
    'otp': const OtpScreen(),
  };

  for (final entry in screens.entries) {
    for (final mode in ['light', 'dark']) {
      testWidgets('${entry.key} — $mode', (tester) async {
        tester.view.physicalSize = const Size(1080, 2160);
        tester.view.devicePixelRatio = 3.0;
        addTearDown(tester.view.reset);

        await tester.pumpWidget(
          MaterialApp(
            debugShowCheckedModeBanner: false,
            theme: mode == 'light' ? AppTheme.light : AppTheme.dark,
            home: entry.value,
          ),
        );
        await tester.pump(const Duration(milliseconds: 400));

        await expectLater(
          find.byType(MaterialApp),
          matchesGoldenFile('goldens/${entry.key}_$mode.png'),
        );
      });
    }
  }
}
