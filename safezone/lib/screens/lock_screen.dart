import 'dart:async';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../services/auth_service.dart';
import '../theme.dart';
import '../widgets/primary_button.dart';

/// Lock screen shown when an account exists but the session is locked.
/// Routes to OTP when a real-password login comes from an unknown device.
class LockScreen extends StatefulWidget {
  const LockScreen({super.key});

  @override
  State<LockScreen> createState() => _LockScreenState();
}

class _LockScreenState extends State<LockScreen> {
  final _password = TextEditingController();
  bool _busy = false;
  String? _error;
  Duration _lockout = Duration.zero;
  Timer? _lockoutTimer;

  @override
  void initState() {
    super.initState();
    // A lockout set before an app restart must still be enforced on screen.
    AuthService.instance.lockoutRemaining().then((left) {
      if (mounted && left > Duration.zero) _startLockoutCountdown(left);
    });
  }

  @override
  void dispose() {
    _lockoutTimer?.cancel();
    _password.dispose();
    super.dispose();
  }

  void _startLockoutCountdown(Duration initial) {
    _lockoutTimer?.cancel();
    setState(() {
      _lockout = initial;
      _error = null;
    });
    _lockoutTimer = Timer.periodic(const Duration(seconds: 1), (_) async {
      final left = await AuthService.instance.lockoutRemaining();
      if (!mounted) return;
      setState(() => _lockout = left);
      if (left == Duration.zero) _lockoutTimer?.cancel();
    });
  }

  String _formatLockout(Duration d) {
    final m = d.inMinutes;
    final s = (d.inSeconds % 60).toString().padLeft(2, '0');
    return '$m:$s';
  }

  Future<void> _submit() async {
    if (_lockout > Duration.zero) return;
    if (_password.text.isEmpty) {
      setState(() => _error = 'ກະລຸນາໃສ່ລະຫັດຜ່ານ');
      return;
    }
    setState(() {
      _busy = true;
      _error = null;
    });

    final result = await AuthService.instance.login(_password.text);
    if (!mounted) return;
    setState(() => _busy = false);

    switch (result) {
      case LoginResult.unlockedReal:
      case LoginResult.unlockedFakeDecoy:
        // Router redirect (refreshListenable) takes us home automatically;
        // go explicitly too so the lock screen is replaced.
        context.go('/');
        break;
      case LoginResult.needsOtp:
        await AuthService.instance.sendOtp();
        if (mounted) context.go('/otp');
        break;
      case LoginResult.noContact:
        setState(() => _error =
            'ອຸປະກອນໃໝ່ຕ້ອງຢືນຢັນຜ່ານ OTP ແຕ່ຍັງບໍ່ໄດ້ຕັ້ງ Trusted Contact.');
        break;
      case LoginResult.wrongPassword:
        setState(() => _error = 'ລະຫັດຜ່ານບໍ່ຖືກຕ້ອງ');
        // The failure may have just tripped the throttle.
        final left = await AuthService.instance.lockoutRemaining();
        if (mounted && left > Duration.zero) _startLockoutCountdown(left);
        break;
      case LoginResult.lockedOut:
        final left = await AuthService.instance.lockoutRemaining();
        if (mounted) _startLockoutCountdown(left);
        break;
    }
  }

  @override
  Widget build(BuildContext context) {
    final colors = context.colors;
    final text = context.text;

    return Scaffold(
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Icon(Icons.lock_outline, color: colors.primary, size: 56),
              const SizedBox(height: 16),
              Text(
                'SafeZone',
                textAlign: TextAlign.center,
                style: text.displaySmall!.copyWith(
                  fontSize: 24,
                  fontWeight: FontWeight.w700,
                  color: colors.primary,
                ),
              ),
              const SizedBox(height: 4),
              Text(
                'ໃສ່ລະຫັດຜ່ານເພື່ອເຂົ້າໃຊ້',
                textAlign: TextAlign.center,
                style: text.bodyMedium,
              ),
              const SizedBox(height: 32),
              TextField(
                controller: _password,
                obscureText: true,
                onSubmitted: (_) => _submit(),
                decoration: const InputDecoration(hintText: 'ລະຫັດຜ່ານ'),
              ),
              if (_error != null) ...[
                const SizedBox(height: 12),
                Text(
                  _error!,
                  style: text.labelMedium!.copyWith(
                    fontSize: 13,
                    color: context.tokens.criticalInk,
                  ),
                ),
              ],
              const SizedBox(height: 24),
              if (_busy)
                Center(
                  child: CircularProgressIndicator(color: colors.primary),
                )
              else if (_lockout > Duration.zero)
                Column(
                  children: [
                    Icon(Icons.timer_outlined,
                        color: context.tokens.criticalInk, size: 28),
                    const SizedBox(height: 8),
                    Text(
                      'ໃສ່ລະຫັດຜິດຫຼາຍເກີນໄປ',
                      textAlign: TextAlign.center,
                      style: text.bodyMedium!.copyWith(
                        color: context.tokens.criticalInk,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      'ລອງໃໝ່ໄດ້ໃນ ${_formatLockout(_lockout)}',
                      textAlign: TextAlign.center,
                      style: text.bodyMedium,
                    ),
                  ],
                )
              else
                PrimaryButton(
                  label: 'ເຂົ້າສູ່ລະບົບ',
                  icon: Icons.login,
                  onPressed: _submit,
                ),
            ],
          ),
        ),
      ),
    );
  }
}
