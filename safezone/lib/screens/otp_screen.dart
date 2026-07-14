import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../services/auth_service.dart';
import '../theme.dart';
import '../widgets/primary_button.dart';

/// Shown when a real-password login arrives from an unknown device. An OTP has
/// been delivered (via SMS + email composer) to the trusted contact; the user
/// enters it here to approve the new device.
class OtpScreen extends StatefulWidget {
  const OtpScreen({super.key});

  @override
  State<OtpScreen> createState() => _OtpScreenState();
}

class _OtpScreenState extends State<OtpScreen> {
  final _code = TextEditingController();
  bool _busy = false;
  String? _error;

  @override
  void dispose() {
    _code.dispose();
    super.dispose();
  }

  Future<void> _verify() async {
    if (_code.text.trim().isEmpty) {
      setState(() => _error = 'ກະລຸນາໃສ່ລະຫັດ OTP');
      return;
    }
    setState(() {
      _busy = true;
      _error = null;
    });
    final ok = await AuthService.instance.completeOtp(_code.text.trim());
    if (!mounted) return;
    setState(() => _busy = false);
    if (ok) {
      context.go('/');
    } else {
      setState(() => _error = 'ລະຫັດ OTP ບໍ່ຖືກຕ້ອງ ຫຼື ໝົດອາຍຸ');
    }
  }

  Future<void> _resend() async {
    setState(() => _busy = true);
    await AuthService.instance.sendOtp();
    if (!mounted) return;
    setState(() => _busy = false);
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(content: Text('ສົ່ງ OTP ໃໝ່ຫາ Trusted Contact ແລ້ວ')),
    );
  }

  @override
  Widget build(BuildContext context) {
    final colors = context.colors;
    final text = context.text;

    return Scaffold(
      appBar: AppBar(
        title: const Text('ຢືນຢັນອຸປະກອນໃໝ່'),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back),
          onPressed: () {
            AuthService.instance.lock();
            context.go('/lock');
          },
        ),
      ),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(24),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: colors.surfaceContainer,
                  borderRadius: SafeZoneTokens.borderRadius,
                  border: Border.all(
                    color: colors.outlineVariant,
                    width: SafeZoneTokens.ruleHair,
                  ),
                ),
                child: Row(
                  children: [
                    Icon(Icons.verified_user_outlined,
                        color: colors.primary, size: 20),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Text(
                        'ກວດພົບການເຂົ້າໃຊ້ຈາກອຸປະກອນໃໝ່. ພວກເຮົາໄດ້ສົ່ງລະຫັດ OTP '
                        'ຫາ Trusted Contact ຂອງເຈົ້າ ທາງ SMS ແລະ ອີເມວ.',
                        style: text.bodySmall,
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 24),
              Text('ລະຫັດ OTP (6 ໂຕເລກ)', style: text.labelLarge),
              const SizedBox(height: 6),
              TextField(
                controller: _code,
                keyboardType: TextInputType.number,
                maxLength: 6,
                onSubmitted: (_) => _verify(),
                // A code the user reads off one screen and types into another:
                // tabular figures so the digits do not shift width.
                style: text.titleMedium!.copyWith(
                  letterSpacing: 4,
                  fontFeatures: const [FontFeature.tabularFigures()],
                ),
                decoration: const InputDecoration(hintText: '______'),
              ),
              if (_error != null) ...[
                const SizedBox(height: 4),
                Text(
                  _error!,
                  style: text.labelMedium!.copyWith(
                    fontSize: 13,
                    color: context.tokens.criticalInk,
                  ),
                ),
              ],
              const SizedBox(height: 16),
              if (_busy)
                Center(
                  child: CircularProgressIndicator(color: colors.primary),
                )
              else ...[
                PrimaryButton(
                  label: 'ຢືນຢັນ',
                  icon: Icons.check,
                  onPressed: _verify,
                ),
                const SizedBox(height: 12),
                PrimaryButton(
                  label: 'ສົ່ງລະຫັດໃໝ່',
                  icon: Icons.refresh,
                  isSecondary: true,
                  onPressed: _resend,
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }
}
