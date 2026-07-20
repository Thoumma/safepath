import 'dart:async';

import 'package:flutter/material.dart';

import '../models/guardian.dart';
import '../services/guardian_service.dart';
import '../widgets/guardian_map.dart';

/// Full-screen version of the Guardian map — the expand target of the small
/// map embedded at the top of the Guardian tab.
///
/// Reloads on the same 15s cadence the tab uses while anyone is live, so a
/// contact can leave this open and watch the pin move. Data comes from
/// [GuardianService.load], which returns nothing in decoy mode — if this
/// screen is somehow reached under duress it renders an empty map, exactly
/// like a user nobody trusts yet.
class GuardianMapScreen extends StatefulWidget {
  const GuardianMapScreen({super.key});

  @override
  State<GuardianMapScreen> createState() => _GuardianMapScreenState();
}

class _GuardianMapScreenState extends State<GuardianMapScreen> {
  List<Guardian> _guardians = const [];
  bool _loading = true;
  Timer? _timer;

  @override
  void initState() {
    super.initState();
    _load();
    _timer = Timer.periodic(const Duration(seconds: 15), (_) => _load());
  }

  @override
  void dispose() {
    _timer?.cancel();
    super.dispose();
  }

  Future<void> _load() async {
    final r = await GuardianService.instance.load();
    if (!mounted) return;
    setState(() {
      _guardians = r.state == GuardianState.ok
          ? r.guardians.where((g) => g.hasAnyLocation).toList()
          : const [];
      _loading = false;
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('ແຜນທີ່ຄົນໄວ້ໃຈ')),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : _guardians.isEmpty
              ? Center(
                  child: Padding(
                    padding: const EdgeInsets.all(32),
                    child: Text(
                      'ບໍ່ມີຕຳແໜ່ງໃຫ້ສະແດງ',
                      textAlign: TextAlign.center,
                      style: Theme.of(context).textTheme.bodyMedium,
                    ),
                  ),
                )
              : GuardianMap(guardians: _guardians),
    );
  }
}
