import 'package:flutter/material.dart';
import 'router.dart';
import 'theme.dart';
import 'services/auth_service.dart';
import 'services/passport_store.dart';
import 'services/sos_server.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();

  // Proactive cleanup: if a previous passport share left a decrypted copy in
  // the temp dir (e.g. after a crash), wipe it before showing any UI.
  await PassportStore.instance.clearTempFiles();

  // Builds the Supabase client for the SOS server channel. Does not touch the
  // network, and swallows its own failures — the app must still boot (and SOS
  // must still work over SMS) with no connectivity or no config.
  await SosServer.instance.init();

  // Load whether an account already exists so the router can redirect to
  // setup vs. lock on first frame.
  await AuthService.instance.loadState();

  runApp(const SafeZoneApp());
}

class SafeZoneApp extends StatelessWidget {
  const SafeZoneApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp.router(
      title: 'SafeZone',
      debugShowCheckedModeBanner: false,
      theme: AppTheme.light,
      darkTheme: AppTheme.dark,
      themeMode: ThemeMode.system,
      routerConfig: appRouter,
    );
  }
}
