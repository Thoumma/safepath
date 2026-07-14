import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart' show AuthException;

import '../models/user_profile.dart';
import '../services/auth_service.dart';
import '../services/phone_identity.dart';
import '../services/profile_store.dart';
import '../services/profile_sync.dart';
import '../theme.dart';
import '../widgets/primary_button.dart';

/// The user's own identity: name, passport number, verified phone.
///
/// Optional by design. The app works fully without it — SOS still reaches the
/// trusted contact over SMS, which needs no network. A profile only *adds* the
/// embassy case and the Guardian tab. Never force it, never gate setup on it:
/// a traveller on a dead SIM must still be able to create an account.
class ProfileScreen extends StatefulWidget {
  const ProfileScreen({super.key});

  @override
  State<ProfileScreen> createState() => _ProfileScreenState();
}

class _ProfileScreenState extends State<ProfileScreen> {
  final _formKey = GlobalKey<FormState>();
  final _name = TextEditingController();
  final _passport = TextEditingController();
  final _phone = TextEditingController();
  final _code = TextEditingController();

  UserProfile? _existing;
  bool _codeSent = false;
  bool _busy = false;
  String? _error;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    // Decoy mode never reveals the real identity. An attacker who forced the
    // fake password must not learn the user's name or passport number.
    if (AuthService.instance.isDecoy) return;

    final p = await ProfileStore.instance.load();
    if (p != null && mounted) {
      setState(() {
        _existing = p;
        _name.text = p.fullName;
        _passport.text = p.passportNo;
        _phone.text = p.phone;
      });
    }
  }

  @override
  void dispose() {
    _name.dispose();
    _passport.dispose();
    _phone.dispose();
    _code.dispose();
    super.dispose();
  }

  Future<void> _sendCode() async {
    if (!_formKey.currentState!.validate()) return;
    setState(() {
      _busy = true;
      _error = null;
    });

    // Save locally first. Even if the SMS never arrives, the details are kept
    // and the user does not have to retype them.
    await ProfileStore.instance.save(UserProfile(
      fullName: _name.text.trim(),
      passportNo: _passport.text.trim().toUpperCase(),
      phone: _phone.text.trim(),
      phoneVerified: false,
    ));

    try {
      await PhoneIdentity.instance.sendCode(_phone.text.trim());
      if (mounted) setState(() => _codeSent = true);
    } on AuthException catch (e) {
      if (mounted) setState(() => _error = 'ສົ່ງລະຫັດບໍ່ສຳເລັດ: ${e.message}');
    } catch (_) {
      if (mounted) {
        setState(() => _error = 'ສົ່ງລະຫັດບໍ່ສຳເລັດ. ກວດເບີໂທ ແລະ ອິນເຕີເນັດ.');
      }
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _verify() async {
    setState(() {
      _busy = true;
      _error = null;
    });

    try {
      final ok = await PhoneIdentity.instance
          .verifyCode(_phone.text.trim(), _code.text.trim());
      if (!ok) {
        if (mounted) setState(() => _error = 'ລະຫັດບໍ່ຖືກຕ້ອງ.');
        return;
      }

      final saved = (await ProfileStore.instance.load())!;
      await ProfileStore.instance.save(saved.copyWith(phoneVerified: true));

      // Push the citizen + contact set up, so an SOS can open a real case and
      // the Guardian tab has something to read.
      await ProfileSync.instance.syncAll();

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('ຢືນຢັນເບີໂທແລ້ວ')),
        );
        Navigator.of(context).pop(true);
      }
    } on AuthException catch (e) {
      if (mounted) setState(() => _error = 'ຢືນຢັນບໍ່ສຳເລັດ: ${e.message}');
    } catch (_) {
      if (mounted) setState(() => _error = 'ຢືນຢັນບໍ່ສຳເລັດ. ກະລຸນາລອງໃໝ່.');
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final colors = context.colors;
    final tokens = context.tokens;
    final text = context.text;
    final verified = _existing?.phoneVerified ?? false;

    return Scaffold(
      appBar: AppBar(title: const Text('ຂໍ້ມູນຂອງທ່ານ')),
      body: SafeArea(
        child: SingleChildScrollView(
          child: Padding(
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
                        Text('ເປັນຫຍັງຕ້ອງມີຂໍ້ມູນນີ້?', style: text.titleMedium),
                        const SizedBox(height: 6),
                        Text(
                          'ເມື່ອທ່ານກົດ SOS ສະຖານທູດຕ້ອງຮູ້ວ່າທ່ານແມ່ນໃຜ '
                          'ຈຶ່ງຈະຊ່ວຍໄດ້. ຖ້າບໍ່ຕື່ມ ແອັບຍັງສົ່ງ SMS '
                          'ຫາຜູ້ຊ່ວຍເຫຼືອຂອງທ່ານໄດ້ຕາມປົກກະຕິ.',
                          style: text.bodyMedium,
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 24),

                  if (verified) ...[
                    Row(
                      children: [
                        Icon(Icons.verified_outlined,
                            color: tokens.success, size: 20),
                        const SizedBox(width: 8),
                        Expanded(
                          child: Text(
                            'ຢືນຢັນເບີໂທແລ້ວ',
                            style: text.labelLarge!
                                .copyWith(color: tokens.successInk),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 16),
                  ],

                  Text('ຊື່ ແລະ ນາມສະກຸນ', style: text.labelLarge),
                  const SizedBox(height: 8),
                  TextFormField(
                    controller: _name,
                    enabled: !_codeSent,
                    decoration: const InputDecoration(hintText: 'ໃສ່ຊື່ເຕັມ'),
                    validator: (v) => (v == null || v.trim().isEmpty)
                        ? 'ກະລຸນາໃສ່ຊື່'
                        : null,
                  ),
                  const SizedBox(height: 16),

                  Text('ເລກພາສປອດ', style: text.labelLarge),
                  const SizedBox(height: 8),
                  TextFormField(
                    controller: _passport,
                    enabled: !_codeSent,
                    textCapitalization: TextCapitalization.characters,
                    decoration: const InputDecoration(hintText: 'ຕົວຢ່າງ P1234567'),
                    validator: (v) => (v == null || v.trim().isEmpty)
                        ? 'ກະລຸນາໃສ່ເລກພາສປອດ'
                        : null,
                  ),
                  const SizedBox(height: 16),

                  Text('ເບີໂທຂອງທ່ານ', style: text.labelLarge),
                  const SizedBox(height: 8),
                  TextFormField(
                    controller: _phone,
                    enabled: !_codeSent,
                    keyboardType: TextInputType.phone,
                    decoration:
                        const InputDecoration(hintText: '+85620xxxxxxxx'),
                    validator: (v) {
                      final s = v?.trim() ?? '';
                      if (s.isEmpty) return 'ກະລຸນາໃສ່ເບີໂທ';
                      if (!s.startsWith('+')) return 'ຕ້ອງຂຶ້ນຕົ້ນດ້ວຍ + (ຕົວຢ່າງ +856…)';
                      return null;
                    },
                  ),

                  if (_codeSent) ...[
                    const SizedBox(height: 24),
                    Text('ລະຫັດທີ່ສົ່ງທາງ SMS', style: text.labelLarge),
                    const SizedBox(height: 8),
                    TextFormField(
                      controller: _code,
                      keyboardType: TextInputType.number,
                      decoration: const InputDecoration(hintText: '6 ຕົວເລກ'),
                    ),
                  ],

                  if (_error != null) ...[
                    const SizedBox(height: 16),
                    Text(
                      _error!,
                      style: text.bodyMedium!.copyWith(color: tokens.critical),
                    ),
                  ],

                  const SizedBox(height: 24),
                  if (_busy)
                    const Center(child: CircularProgressIndicator())
                  else if (!_codeSent)
                    PrimaryButton(
                      label: 'ສົ່ງລະຫັດຢືນຢັນ',
                      icon: Icons.sms_outlined,
                      onPressed: _sendCode,
                    )
                  else ...[
                    PrimaryButton(
                      label: 'ຢືນຢັນ',
                      icon: Icons.check,
                      onPressed: _verify,
                    ),
                    const SizedBox(height: 12),
                    PrimaryButton(
                      label: 'ແກ້ໄຂເບີໂທ',
                      isSecondary: true,
                      onPressed: () => setState(() {
                        _codeSent = false;
                        _error = null;
                        _code.clear();
                      }),
                    ),
                  ],
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}
