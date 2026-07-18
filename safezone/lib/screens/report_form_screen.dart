import 'dart:io';
import 'dart:typed_data';

import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:image_picker/image_picker.dart';

import '../config/console_config.dart';
import '../config/report_content.dart';
import '../models/traffik_report.dart';
import '../services/location_service.dart';
import '../services/report_service.dart';
import '../theme.dart';
import '../widgets/primary_button.dart';
import '../widgets/safe_card.dart';

/// One attached evidence photo: its uploaded storage [path] and [thumb] bytes
/// for the local preview.
class _Attachment {
  final String path;
  final Uint8List thumb;
  const _Attachment(this.path, this.thumb);
}

const _maxPhotos = 3;

/// The report form. Only category + description are required; everything else
/// lowers or removes friction. Anonymous by default — the contact field is
/// opt-in.
class ReportFormScreen extends StatefulWidget {
  const ReportFormScreen({super.key});

  @override
  State<ReportFormScreen> createState() => _ReportFormScreenState();
}

class _ReportFormScreenState extends State<ReportFormScreen> {
  String? _category;
  final _description = TextEditingController();
  final _place = TextEditingController();
  final _contact = TextEditingController();
  bool _attachGps = false;

  final List<_Attachment> _photos = [];
  bool _uploadingPhoto = false;

  bool _sending = false;
  ReportOutcome? _outcome;
  String? _error;

  @override
  void dispose() {
    _description.dispose();
    _place.dispose();
    _contact.dispose();
    super.dispose();
  }

  static const _mimeByExt = {
    'jpg': 'image/jpeg',
    'jpeg': 'image/jpeg',
    'png': 'image/png',
    'webp': 'image/webp',
  };

  Future<void> _pickPhoto(ImageSource source) async {
    if (_photos.length >= _maxPhotos || _uploadingPhoto) return;
    final messenger = ScaffoldMessenger.of(context);
    setState(() => _uploadingPhoto = true);
    XFile? file;
    try {
      file = await ImagePicker().pickImage(source: source, imageQuality: 85);
      if (file == null) return;
      final bytes = await file.readAsBytes();
      final ext = file.path.split('.').last.toLowerCase();
      final contentType = _mimeByExt[ext] ?? 'image/jpeg';

      final path = await ReportService.instance.uploadPhoto(bytes, contentType);
      if (path == null) {
        messenger.showSnackBar(
          const SnackBar(content: Text('ອັບໂຫຼດຮູບບໍ່ໄດ້ — ຈະສົ່ງລາຍງານໂດຍບໍ່ມີຮູບນັ້ນ')),
        );
        return;
      }
      if (mounted) setState(() => _photos.add(_Attachment(path, bytes)));
    } catch (_) {
      messenger.showSnackBar(
        const SnackBar(content: Text('ອັບໂຫຼດຮູບບໍ່ໄດ້ — ຈະສົ່ງລາຍງານໂດຍບໍ່ມີຮູບນັ້ນ')),
      );
    } finally {
      // The picker leaves a plaintext copy in the app cache; drop it once the
      // bytes are uploaded (same hygiene as the passport flow).
      if (file != null) {
        try {
          await File(file.path).delete();
        } catch (_) {}
      }
      if (mounted) setState(() => _uploadingPhoto = false);
    }
  }

  Future<void> _submit() async {
    final messenger = ScaffoldMessenger.of(context);
    if (_category == null) {
      setState(() => _error = 'ກະລຸນາເລືອກປະເພດ');
      return;
    }
    if (_description.text.trim().isEmpty) {
      setState(() => _error = 'ກະລຸນາຂຽນລາຍລະອຽດ');
      return;
    }

    setState(() {
      _sending = true;
      _error = null;
    });

    // Optional GPS. A failure to get a fix must not block the report — it is
    // one optional field, so we just drop it and send the rest.
    double? lat, lng;
    if (_attachGps) {
      final loc = await LocationService.instance
          .getCurrentLocation(timeLimit: const Duration(seconds: 10));
      lat = loc.position?.latitude;
      lng = loc.position?.longitude;
      if (loc.position == null && mounted) {
        messenger.showSnackBar(
          const SnackBar(content: Text('ດຶງຕຳແໜ່ງບໍ່ໄດ້ — ສົ່ງໂດຍບໍ່ມີ GPS')),
        );
      }
    }

    final outcome = await ReportService.instance.submit(TraffikReport(
      category: _category!,
      description: _description.text.trim(),
      locationText: _place.text.trim().isEmpty ? null : _place.text.trim(),
      lat: lat,
      lng: lng,
      reporterContact:
          _contact.text.trim().isEmpty ? null : _contact.text.trim(),
      photoUrls: _photos.map((p) => p.path).toList(),
    ));

    if (!mounted) return;
    setState(() {
      _sending = false;
      if (outcome.status == ReportStatus.sent) {
        _outcome = outcome;
      } else {
        _error = switch (outcome.status) {
          ReportStatus.offline => 'ບໍ່ມີເນັດ — ກະລຸນາລອງໃໝ່ເມື່ອມີສັນຍານ.',
          ReportStatus.notConfigured => 'ຍັງບໍ່ເປີດໃຊ້ການສົ່ງ.',
          _ => 'ສົ່ງບໍ່ສຳເລັດ. ກະລຸນາລອງໃໝ່.',
        };
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('ລາຍງານການຄ້າມະນຸດ')),
      body: SafeArea(
        top: false,
        child: _outcome != null ? _success() : _form(),
      ),
    );
  }

  Widget _success() {
    final tokens = context.tokens;
    final text = context.text;
    final refNo = _outcome?.refNo;

    return Padding(
      padding: const EdgeInsets.all(24),
      child: Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(Icons.check_circle, color: tokens.success, size: 64),
            const SizedBox(height: 16),
            Text('ຂອບໃຈ. ພວກເຮົາໄດ້ຮັບແລ້ວ.',
                textAlign: TextAlign.center, style: text.titleLarge),
            const SizedBox(height: 8),
            Text(
              'ທີມງານຈະກວດເບິ່ງລາຍງານຂອງທ່ານ.',
              textAlign: TextAlign.center,
              style: text.bodyMedium,
            ),
            if (refNo != null) ...[
              const SizedBox(height: 20),
              SafeCard(
                child: Column(
                  children: [
                    Text('ເລກອ້າງອີງ', style: text.labelMedium),
                    const SizedBox(height: 4),
                    Text(refNo, style: text.titleMedium),
                  ],
                ),
              ),
            ],
            const SizedBox(height: 28),
            PrimaryButton(
              label: 'ສຳເລັດ',
              icon: Icons.done,
              onPressed: () => context.pop(),
            ),
          ],
        ),
      ),
    );
  }

  Widget _form() {
    final colors = context.colors;
    final tokens = context.tokens;
    final text = context.text;

    return ListView(
      padding: const EdgeInsets.all(20),
      children: [
        Text('ປະເພດ', style: text.titleSmall ?? text.titleMedium),
        const SizedBox(height: 4),
        Text('ບໍ່ແນ່ໃຈກໍເລືອກ “ອື່ນໆ” ໄດ້.', style: text.bodySmall),
        const SizedBox(height: 12),
        Wrap(
          spacing: 8,
          runSpacing: 8,
          children: [
            for (final c in kReportCategories)
              ChoiceChip(
                label: Text(c.lo),
                avatar: Icon(c.icon, size: 18),
                selected: _category == c.key,
                onSelected: (_) => setState(() {
                  _category = c.key;
                  _error = null;
                }),
              ),
          ],
        ),

        const SizedBox(height: 24),
        Text('ເກີດຫຍັງຂຶ້ນ?', style: text.titleSmall ?? text.titleMedium),
        const SizedBox(height: 4),
        Text('ບອກສິ່ງທີ່ທ່ານເຫັນ ຫຼື ໄດ້ຍິນ ເທົ່າທີ່ຮູ້.', style: text.bodySmall),
        const SizedBox(height: 12),
        TextField(
          controller: _description,
          maxLines: 5,
          maxLength: 5000,
          decoration: const InputDecoration(
            hintText: 'ຕົວຢ່າງ: ເຫັນຄົນງານເບິ່ງຄືຖືກຄວບຄຸມ ແລະ ອອກໄປບໍ່ໄດ້...',
            alignLabelWithHint: true,
          ),
        ),

        const SizedBox(height: 8),
        Text('ຢູ່ໃສ? (ຖ້າຮູ້)', style: text.titleSmall ?? text.titleMedium),
        const SizedBox(height: 12),
        TextField(
          controller: _place,
          decoration: const InputDecoration(
            hintText: 'ສະຖານທີ່ / ຈຸດສັງເກດ (ຕົວຢ່າງ: ໃກ້ຕະຫຼາດ...)',
            prefixIcon: Icon(Icons.place_outlined),
          ),
        ),
        const SizedBox(height: 8),
        SafeCard(
          padding: const EdgeInsets.symmetric(horizontal: 8),
          child: SwitchListTile(
            contentPadding: const EdgeInsets.symmetric(horizontal: 8),
            title: const Text('ແນບຕຳແໜ່ງ GPS ປັດຈຸບັນ'),
            subtitle: Text('ຊ່ວຍໃຫ້ທີມງານຮູ້ຈຸດເກີດເຫດ', style: text.bodySmall),
            value: _attachGps,
            onChanged: (v) => setState(() => _attachGps = v),
          ),
        ),

        if (ConsoleConfig.isConfigured) ...[
          const SizedBox(height: 16),
          Text('ແນບຮູບ (ຖ້າມີ)', style: text.titleSmall ?? text.titleMedium),
          const SizedBox(height: 4),
          Text('ສູງສຸດ $_maxPhotos ຮູບ. ຮູບເປັນຄວາມລັບ — ມີແຕ່ທີມງານເຫັນ.',
              style: text.bodySmall),
          const SizedBox(height: 12),
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: [
              for (final p in _photos)
                Stack(
                  children: [
                    ClipRRect(
                      borderRadius: BorderRadius.circular(8),
                      child: Image.memory(p.thumb,
                          width: 76, height: 76, fit: BoxFit.cover),
                    ),
                    Positioned(
                      top: 2,
                      right: 2,
                      child: GestureDetector(
                        onTap: () => setState(() => _photos.remove(p)),
                        child: CircleAvatar(
                          radius: 11,
                          backgroundColor: colors.surface,
                          child: Icon(Icons.close, size: 14, color: colors.onSurface),
                        ),
                      ),
                    ),
                  ],
                ),
              if (_photos.length < _maxPhotos)
                _AddPhotoButton(
                  busy: _uploadingPhoto,
                  onCamera: () => _pickPhoto(ImageSource.camera),
                  onGallery: () => _pickPhoto(ImageSource.gallery),
                ),
            ],
          ),
        ],

        const SizedBox(height: 20),
        // Anonymity, stated plainly, with the opt-in contact beneath it.
        SafeCard(
          backgroundColor: tokens.high.withAlpha(20),
          borderColor: tokens.high,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Icon(Icons.visibility_off_outlined,
                      size: 18, color: tokens.highInk),
                  const SizedBox(width: 8),
                  Text('ບໍ່ຕ້ອງໃສ່ຊື່', style: text.labelLarge),
                ],
              ),
              const SizedBox(height: 6),
              Text(
                'ໂດຍປົກກະຕິ ລາຍງານນີ້ບໍ່ເປີດເຜີຍຊື່. ຖ້າຢາກໃຫ້ພວກເຮົາຕິດຕໍ່ກັບ '
                'ໃສ່ອີເມວ ຫຼື ເບີໂທ (ບໍ່ບັງຄັບ).',
                style: text.bodySmall,
              ),
              const SizedBox(height: 12),
              TextField(
                controller: _contact,
                decoration: const InputDecoration(
                  hintText: 'ອີເມວ ຫຼື ເບີໂທ (ບໍ່ບັງຄັບ)',
                  prefixIcon: Icon(Icons.alternate_email),
                  filled: true,
                ),
              ),
            ],
          ),
        ),

        if (_error != null) ...[
          const SizedBox(height: 16),
          Row(
            children: [
              Icon(Icons.error_outline, size: 18, color: colors.error),
              const SizedBox(width: 8),
              Expanded(
                child: Text(_error!,
                    style: text.bodyMedium!.copyWith(color: colors.error)),
              ),
            ],
          ),
        ],

        const SizedBox(height: 24),
        PrimaryButton(
          label: _sending ? 'ກຳລັງສົ່ງ...' : 'ສົ່ງລາຍງານ',
          icon: Icons.send_outlined,
          // PrimaryButton takes a non-null VoidCallback; guard re-entry instead
          // of disabling, so a double-tap while sending is a no-op.
          onPressed: () {
            if (!_sending) _submit();
          },
        ),
        const SizedBox(height: 8),
        Center(child: Text('ເປັນຄວາມລັບ ແລະ ປອດໄພ', style: text.bodySmall)),
        const SizedBox(height: 16),
      ],
    );
  }
}

/// A 76×76 "add photo" tile. Tapping offers camera or gallery; shows a spinner
/// while an upload is in flight.
class _AddPhotoButton extends StatelessWidget {
  const _AddPhotoButton({
    required this.busy,
    required this.onCamera,
    required this.onGallery,
  });

  final bool busy;
  final VoidCallback onCamera;
  final VoidCallback onGallery;

  Future<void> _choose(BuildContext context) async {
    final source = await showModalBottomSheet<ImageSource>(
      context: context,
      builder: (ctx) => SafeArea(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            ListTile(
              leading: const Icon(Icons.photo_camera_outlined),
              title: const Text('ຖ່າຍຮູບ'),
              onTap: () => Navigator.pop(ctx, ImageSource.camera),
            ),
            ListTile(
              leading: const Icon(Icons.photo_library_outlined),
              title: const Text('ເລືອກຈາກຄັງຮູບ'),
              onTap: () => Navigator.pop(ctx, ImageSource.gallery),
            ),
          ],
        ),
      ),
    );
    if (source == ImageSource.camera) onCamera();
    if (source == ImageSource.gallery) onGallery();
  }

  @override
  Widget build(BuildContext context) {
    final colors = context.colors;
    return InkWell(
      onTap: busy ? null : () => _choose(context),
      borderRadius: BorderRadius.circular(8),
      child: Container(
        width: 76,
        height: 76,
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(8),
          border: Border.all(color: colors.outline),
        ),
        child: busy
            ? const Center(
                child: SizedBox(
                  width: 20,
                  height: 20,
                  child: CircularProgressIndicator(strokeWidth: 2),
                ),
              )
            : Icon(Icons.add_a_photo_outlined, color: colors.onSurfaceVariant),
      ),
    );
  }
}
