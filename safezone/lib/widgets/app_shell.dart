import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../theme.dart';

/// The bottom-navigation shell: Home, Guardian, About.
///
/// ## Why Home is a tab
///
/// The SOS button lives on Home. If Home were not a tab, then after opening
/// About there would be no visible one-tap route back to the panic button —
/// only a back gesture. In an emergency app that is not an acceptable
/// navigation model, so Home is the first tab and the default.
///
/// ## What is deliberately NOT in this shell
///
/// `/sos`, `/lock`, `/setup`, `/otp` are declared as top-level routes, so they
/// render *over* the shell with no bottom bar:
///
/// - `/sos` — nobody tabs away in the middle of confirming an emergency.
/// - `/lock`, `/setup`, `/otp` — the auth gate must not be escapable via a tab.
///
/// `/passport`, `/contact`, `/profile` are also outside: they are drill-downs
/// pushed from Home, and they get a back button instead.
class AppShell extends StatelessWidget {
  final StatefulNavigationShell navigationShell;

  const AppShell({super.key, required this.navigationShell});

  @override
  Widget build(BuildContext context) {
    final colors = context.colors;

    return Scaffold(
      body: navigationShell,
      bottomNavigationBar: NavigationBar(
        selectedIndex: navigationShell.currentIndex,
        onDestinationSelected: (i) => navigationShell.goBranch(
          i,
          // Tapping the tab you are already on returns to that branch's root,
          // which is the standard expectation.
          initialLocation: i == navigationShell.currentIndex,
        ),
        backgroundColor: colors.surfaceContainer,
        indicatorColor: colors.primaryContainer,
        destinations: const [
          NavigationDestination(
            icon: Icon(Icons.home_outlined),
            selectedIcon: Icon(Icons.home),
            label: 'ໜ້າຫຼັກ',
          ),
          NavigationDestination(
            icon: Icon(Icons.shield_outlined),
            selectedIcon: Icon(Icons.shield),
            label: 'ຜູ້ໄວ້ໃຈ',
          ),
          NavigationDestination(
            icon: Icon(Icons.info_outline),
            selectedIcon: Icon(Icons.info),
            label: 'ກ່ຽວກັບ',
          ),
        ],
      ),
    );
  }
}
