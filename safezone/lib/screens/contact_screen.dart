import 'dart:async';

import 'package:flutter/material.dart';
import '../models/trusted_contact.dart';
import '../services/auth_service.dart';
import '../services/contact_store.dart';
import '../services/profile_sync.dart';
import '../theme.dart';
import '../widgets/primary_button.dart';
import '../widgets/safe_card.dart';

class ContactScreen extends StatefulWidget {
  const ContactScreen({super.key});

  @override
  State<ContactScreen> createState() => _ContactScreenState();
}

class _ContactScreenState extends State<ContactScreen> {
  final _formKey = GlobalKey<FormState>();
  final _name = TextEditingController();
  final _phone = TextEditingController();
  final _email = TextEditingController();

  List<TrustedContact> _contacts = [];

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    // Decoy mode never reveals real contacts.
    if (AuthService.instance.isDecoy) {
      setState(() => _contacts = []);
      return;
    }
    final list = await ContactStore.instance.loadContacts();
    if (mounted) setState(() => _contacts = list);
  }

  @override
  void dispose() {
    _name.dispose();
    _phone.dispose();
    _email.dispose();
    super.dispose();
  }

  Future<void> _add() async {
    if (!_formKey.currentState!.validate()) return;
    await ContactStore.instance.addContact(TrustedContact(
      name: _name.text.trim(),
      phone: _phone.text.trim(),
      email: _email.text.trim().isEmpty ? null : _email.text.trim(),
    ));
    _name.clear();
    _phone.clear();
    _email.clear();
    FocusManager.instance.primaryFocus?.unfocus();
    await _load();
    // Best-effort and silent: the local list is what SOS actually sends over
    // SMS, so a failed sync must not look like a failed save.
    unawaited(ProfileSync.instance.syncContacts());
    if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('ເພີ່ມຄົນໄວ້ໃຈແລ້ວ')),
      );
    }
  }

  Future<void> _remove(int index) async {
    await ContactStore.instance.removeAt(index);
    await _load();
    unawaited(ProfileSync.instance.syncContacts());
  }

  @override
  Widget build(BuildContext context) {
    final colors = context.colors;
    final tokens = context.tokens;
    final text = context.text;

    return Scaffold(
      appBar: AppBar(title: const Text('ຄົນໄວ້ໃຈ')),
      body: SafeArea(
        child: SingleChildScrollView(
          child: Padding(
            padding: const EdgeInsets.all(24.0),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                // Explanation Card
                Container(
                  padding: const EdgeInsets.all(16),
                  decoration: _cardDecoration(colors),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text('ຄົນໄວ້ໃຈແມ່ນໃຜ?', style: text.titleMedium),
                      const SizedBox(height: 6),
                      Text(
                        'ເມື່ອກົດ SOS, ແອັບຈະສົ່ງ SMS ພ້ອມພິກັດ GPS ແລະ ແບ່ງປັນສຳເນົາພາສປອດ '
                        'ໃຫ້ກັບທຸກຄົນໃນລາຍຊື່ນີ້ທັນທີ. ສາມາດເພີ່ມໄດ້ຫຼາຍຄົນ.',
                        style: text.bodySmall,
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 24),

                // Existing contacts list
                if (_contacts.isEmpty)
                  SafeCard(
                    child: Row(
                      children: [
                        Icon(Icons.group_outlined, color: colors.outline),
                        const SizedBox(width: 12),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text('ຍັງບໍ່ມີຄົນໄວ້ໃຈ', style: text.labelLarge),
                              const SizedBox(height: 2),
                              Text(
                                'ເພີ່ມຄົນທີ່ຈະໄດ້ຮັບ SMS ເມື່ອທ່ານກົດ SOS',
                                style: text.bodySmall,
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                  )
                else
                  ...List.generate(_contacts.length, (i) {
                    final c = _contacts[i];
                    return Container(
                      margin: const EdgeInsets.only(bottom: 12),
                      padding: const EdgeInsets.symmetric(
                          horizontal: 16, vertical: 12),
                      decoration: _cardDecoration(colors),
                      child: Row(
                        children: [
                          Icon(Icons.person_outline, color: colors.primary),
                          const SizedBox(width: 12),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(c.name, style: text.titleMedium),
                                const SizedBox(height: 2),
                                Text(
                                  c.email == null || c.email!.isEmpty
                                      ? c.phone
                                      : '${c.phone} · ${c.email}',
                                  style: text.bodySmall,
                                ),
                              ],
                            ),
                          ),
                          IconButton(
                            icon: Icon(
                              Icons.delete_outline,
                              color: tokens.criticalInk,
                            ),
                            tooltip: 'ລຶບ',
                            onPressed: () => _remove(i),
                          ),
                        ],
                      ),
                    );
                  }),

                const SizedBox(height: 12),
                const Divider(),
                const SizedBox(height: 20),
                Text('ເພີ່ມຄົນໄວ້ໃຈໃໝ່', style: text.titleMedium),
                const SizedBox(height: 16),

                // Add form
                Form(
                  key: _formKey,
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      Text('ຊື່ຄົນໄວ້ໃຈ', style: text.labelLarge),
                      const SizedBox(height: 6),
                      TextFormField(
                        controller: _name,
                        decoration: const InputDecoration(
                          hintText: 'ໃສ່ຊື່ ຫຼື ຊື່ຫຼິ້ນ',
                        ),
                        validator: (v) => (v == null || v.trim().isEmpty)
                            ? 'ກະລຸນາໃສ່ຊື່'
                            : null,
                      ),
                      const SizedBox(height: 20),
                      Text('ເບີໂທລະສັບ (ຕິດຕໍ່ສຸກເສີນ)', style: text.labelLarge),
                      const SizedBox(height: 6),
                      TextFormField(
                        controller: _phone,
                        keyboardType: TextInputType.phone,
                        decoration: const InputDecoration(
                          hintText: '+85620xxxxxxxx',
                        ),
                        validator: (v) {
                          if (v == null || v.trim().isEmpty) {
                            return 'ກະລຸນາໃສ່ເບີໂທ';
                          }
                          if (v.trim().length < 6) {
                            return 'ກະລຸນາໃສ່ເບີໂທທີ່ຖືກຕ້ອງ';
                          }
                          return null;
                        },
                      ),
                      const SizedBox(height: 20),
                      Text('ອີເມວ (ບໍ່ບັງຄັບ)', style: text.labelLarge),
                      const SizedBox(height: 6),
                      TextFormField(
                        controller: _email,
                        keyboardType: TextInputType.emailAddress,
                        decoration: const InputDecoration(
                          hintText: 'example@email.com',
                        ),
                      ),
                      const SizedBox(height: 24),
                      PrimaryButton(
                        label: 'ເພີ່ມລາຍຊື່',
                        icon: Icons.person_add_alt_1_outlined,
                        onPressed: _add,
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  BoxDecoration _cardDecoration(ColorScheme colors) {
    return BoxDecoration(
      color: colors.surfaceContainer,
      borderRadius: SafeZoneTokens.borderRadius,
      border: Border.all(
        color: colors.outlineVariant,
        width: SafeZoneTokens.ruleHair,
      ),
    );
  }
}
