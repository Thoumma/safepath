import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'services/auth_service.dart';
import 'screens/about_screen.dart';
import 'screens/chat_screen.dart';
import 'screens/guardian_map_screen.dart';
import 'screens/guardian_screen.dart';
import 'screens/home_screen.dart';
import 'screens/passport_screen.dart';
import 'screens/profile_screen.dart';
import 'screens/contact_screen.dart';
import 'screens/report_screen.dart';
import 'screens/report_form_screen.dart';
import 'screens/sos_screen.dart';
import 'screens/setup_screen.dart';
import 'screens/lock_screen.dart';
import 'screens/otp_screen.dart';
import 'screens/welcome_screen.dart';
import 'widgets/app_shell.dart';

final _rootKey = GlobalKey<NavigatorState>();

final GoRouter appRouter = GoRouter(
  navigatorKey: _rootKey,
  initialLocation: '/',
  refreshListenable: AuthService.instance,
  redirect: (context, state) {
    final auth = AuthService.instance;
    final loc = state.matchedLocation;
    const authRoutes = {'/setup', '/lock', '/otp'};
    final goingToAuth = authRoutes.contains(loc);

    // No account yet → welcome, then setup. Both are reachable pre-setup; the
    // welcome screen is the first thing a brand-new user sees and hands off to
    // /setup. Any other location is bounced to /welcome.
    if (!auth.isSetup) {
      const preSetup = {'/welcome', '/setup'};
      return preSetup.contains(loc) ? null : '/welcome';
    }

    // Account exists but locked → only auth routes allowed (lock/otp).
    if (!auth.isUnlocked) {
      // Allow staying on /lock or /otp; everything else → /lock.
      if (loc == '/lock' || loc == '/otp') return null;
      return '/lock';
    }

    // Unlocked → keep out of auth routes.
    if (goingToAuth) return '/';
    return null;
  },
  routes: [
    // The three bottom-bar tabs. Home first, so SOS is always one tap away.
    StatefulShellRoute.indexedStack(
      builder: (context, state, navigationShell) =>
          AppShell(navigationShell: navigationShell),
      branches: [
        StatefulShellBranch(routes: [
          GoRoute(path: '/', builder: (context, state) => const HomeScreen()),
        ]),
        StatefulShellBranch(routes: [
          GoRoute(
              path: '/guardian',
              builder: (context, state) => const GuardianScreen()),
        ]),
        StatefulShellBranch(routes: [
          GoRoute(
              path: '/about', builder: (context, state) => const AboutScreen()),
        ]),
        StatefulShellBranch(routes: [
          GoRoute(
              path: '/report',
              builder: (context, state) => const ReportScreen()),
        ]),
      ],
    ),

    // Everything below is a top-level route, so it renders *over* the shell
    // with no bottom bar. That is deliberate:
    //   /sos            — nobody tabs away mid-emergency-confirm.
    //   /setup /lock /otp — the auth gate must not be escapable via a tab.
    //   /passport /contact /profile — drill-downs from Home, with a back button.
    GoRoute(
        parentNavigatorKey: _rootKey,
        path: '/sos',
        builder: (context, state) => const SosScreen()),
    GoRoute(
        parentNavigatorKey: _rootKey,
        path: '/passport',
        builder: (context, state) => const PassportScreen()),
    GoRoute(
        parentNavigatorKey: _rootKey,
        path: '/contact',
        builder: (context, state) => const ContactScreen()),
    GoRoute(
        parentNavigatorKey: _rootKey,
        path: '/profile',
        builder: (context, state) => const ProfileScreen()),
    GoRoute(
        parentNavigatorKey: _rootKey,
        path: '/guardian-map',
        builder: (context, state) => const GuardianMapScreen()),
    GoRoute(
        parentNavigatorKey: _rootKey,
        path: '/chat',
        builder: (context, state) => const ChatScreen()),
    GoRoute(
        parentNavigatorKey: _rootKey,
        path: '/report/new',
        builder: (context, state) => const ReportFormScreen()),
    GoRoute(
        parentNavigatorKey: _rootKey,
        path: '/welcome',
        builder: (context, state) => const WelcomeScreen()),
    GoRoute(
        parentNavigatorKey: _rootKey,
        path: '/setup',
        builder: (context, state) => const SetupScreen()),
    GoRoute(
        parentNavigatorKey: _rootKey,
        path: '/lock',
        builder: (context, state) => const LockScreen()),
    GoRoute(
        parentNavigatorKey: _rootKey,
        path: '/otp',
        builder: (context, state) => const OtpScreen()),
  ],
);
