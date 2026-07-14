import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../services/auth_service.dart';
import '../theme.dart';
import '../widgets/primary_button.dart';

/// First-run screen: create a real password and a distinct fake (duress)
/// password.
class SetupScreen extends StatefulWidget {
  const SetupScreen({super.key});

  @override
  State<SetupScreen> createState() => _SetupScreenState();
}

class _SetupScreenState extends State<SetupScreen> {
  final _formKey = GlobalKey<FormState>();
  final _real = TextEditingController();
  final _realConfirm = TextEditingController();
  final _fake = TextEditingController();
  bool _saving = false;

  @override
  void dispose() {
    _real.dispose();
    _realConfirm.dispose();
    _fake.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;
    setState(() => _saving = true);
    try {
      await AuthService.instance.setup(_real.text, _fake.text);
      // Setup device is trusted and unlocked directly into normal mode.
      await AuthService.instance.login(_real.text);
      if (mounted) context.go('/');
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  String? _passwordValidator(String? v) {
    if (v == null || v.length < 4) return 'ກະລຸນາໃສ່ຢ່າງໜ້ອຍ 4 ຕົວອັກສອນ';
    return null;
  }

  @override
  Widget build(BuildContext context) {
    final colors = context.colors;
    final text = context.text;

    return Scaffold(
      appBar: AppBar(title: const Text('ຕັ້ງຄ່າລະຫັດຜ່ານ')),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(24),
          child: Form(
            key: _formKey,
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
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text('ລະຫັດຈິງ ແລະ ລະຫັດປອມ', style: text.titleMedium),
                      const SizedBox(height: 6),
                      Text(
                        'ລະຫັດຈິງ = ເຂົ້າໃຊ້ປົກກະຕິ. ລະຫັດປອມ = ໃຊ້ເມື່ອຖືກບັງຄັບ: '
                        'ແອັບຈະສະແດງຕູ້ເປົ່າ ແລະ ສົ່ງສັນຍານ SOS ໃຫ້ Trusted Contact ແບບງຽບໆ.',
                        style: text.bodySmall,
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 24),
                Text('ລະຫັດຈິງ', style: text.labelLarge),
                const SizedBox(height: 6),
                TextFormField(
                  controller: _real,
                  obscureText: true,
                  decoration: const InputDecoration(hintText: 'ໃສ່ລະຫັດຈິງ'),
                  validator: _passwordValidator,
                ),
                const SizedBox(height: 20),
                Text('ຢືນຢັນລະຫັດຈິງ', style: text.labelLarge),
                const SizedBox(height: 6),
                TextFormField(
                  controller: _realConfirm,
                  obscureText: true,
                  decoration:
                      const InputDecoration(hintText: 'ໃສ່ລະຫັດຈິງອີກຄັ້ງ'),
                  validator: (v) =>
                      v != _real.text ? 'ລະຫັດບໍ່ກົງກັນ' : null,
                ),
                const SizedBox(height: 20),
                Text('ລະຫັດປອມ (ສຸກເສີນ)', style: text.labelLarge),
                const SizedBox(height: 6),
                TextFormField(
                  controller: _fake,
                  obscureText: true,
                  decoration: const InputDecoration(hintText: 'ໃສ່ລະຫັດປອມ'),
                  validator: (v) {
                    final base = _passwordValidator(v);
                    if (base != null) return base;
                    if (v == _real.text) return 'ລະຫັດປອມຕ້ອງບໍ່ຄືກັບລະຫັດຈິງ';
                    return null;
                  },
                ),
                const SizedBox(height: 32),
                if (_saving)
                  Center(
                    child: CircularProgressIndicator(color: colors.primary),
                  )
                else
                  PrimaryButton(
                    label: 'ບັນທຶກ ແລະ ເລີ່ມໃຊ້',
                    icon: Icons.lock_outline,
                    onPressed: _submit,
                  ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
