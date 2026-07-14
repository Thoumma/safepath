import 'dart:typed_data';
import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import 'package:share_plus/share_plus.dart';
import '../theme.dart';
import '../services/auth_service.dart';
import '../services/passport_store.dart';
import '../widgets/primary_button.dart';

class PassportScreen extends StatefulWidget {
  const PassportScreen({super.key});

  @override
  State<PassportScreen> createState() => _PassportScreenState();
}

class _PassportScreenState extends State<PassportScreen> {
  Uint8List? _preview;
  bool _loading = false;

  @override
  void initState() {
    super.initState();
    _loadExisting();
  }

  Future<void> _loadExisting() async {
    // Decoy mode never reveals the real passport.
    if (AuthService.instance.isDecoy) return;
    final bytes = await PassportStore.instance.loadPassport();
    if (mounted) setState(() => _preview = bytes);
  }

  Future<void> _pick(ImageSource source) async {
    setState(() => _loading = true);
    try {
      final picker = ImagePicker();
      final file = await picker.pickImage(source: source, imageQuality: 85);
      if (file == null) return;
      final bytes = await file.readAsBytes();
      await PassportStore.instance.savePassport(bytes);
      if (mounted) {
        setState(() => _preview = bytes);
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('ບັນທຶກພາສປອດແບບ encrypted ແລ້ວ')),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('ເກີດຂໍ້ຜິດພາດ: $e'),
            backgroundColor: context.tokens.critical,
          ),
        );
      }
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  /// Sharing the passport is a deliberate, manual act — it is no longer part of
  /// the SOS flow. The plaintext copy exists only for the duration of the share
  /// sheet and is deleted in the `finally`, so the vault's guarantee holds.
  Future<void> _sharePassport() async {
    final colors = context.colors;
    final tokens = context.tokens;
    final text = context.text;

    final ok = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: colors.surfaceContainer,
        surfaceTintColor: Colors.transparent,
        shape: RoundedRectangleBorder(
          borderRadius: SafeZoneTokens.borderRadius,
          side: BorderSide(
            color: colors.outlineVariant,
            width: SafeZoneTokens.ruleHair,
          ),
        ),
        title: Text('ສົ່ງສຳເນົາພາສປອດ?', style: text.titleLarge),
        content: Text(
          'ສົ່ງສຳເນົາພາສປອດຂອງທ່ານອອກໄປບໍ?',
          style: text.bodyMedium,
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx, false),
            child: const Text('ຍົກເລີກ'),
          ),
          FilledButton(
            style: FilledButton.styleFrom(
              backgroundColor: tokens.critical,
              foregroundColor: tokens.onCritical,
              shape: const RoundedRectangleBorder(
                borderRadius: SafeZoneTokens.borderRadius,
              ),
            ),
            onPressed: () => Navigator.pop(ctx, true),
            child: const Text('ສົ່ງ'),
          ),
        ],
      ),
    );
    if (ok != true) return;

    setState(() => _loading = true);
    try {
      final path = await PassportStore.instance.exportDecryptedTemp();
      if (path == null) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('ຍັງບໍ່ໄດ້ບັນທຶກພາສປອດ.')),
          );
        }
        return;
      }
      await Share.shareXFiles(
        [XFile(path)],
        text: 'SafeZone — ສຳເນົາພາສປອດ',
      );
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('ເກີດຂໍ້ຜິດພາດ: $e'),
            backgroundColor: context.tokens.critical,
          ),
        );
      }
    } finally {
      // Runs on every path, including the early return above.
      await PassportStore.instance.clearTempFiles();
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final colors = context.colors;
    final tokens = context.tokens;
    final text = context.text;

    return Scaffold(
      appBar: AppBar(
        title: const Text('ຕູ້ເຊຟພາສປອດ'),
      ),
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(24.0),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              // Info Banner
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
                    Icon(Icons.info_outline, color: colors.primary, size: 20),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Text(
                        'ຂໍ້ມູນພາສປອດຈະຖືກເຂົ້າລະຫັດ AES-256 ແລະ ບັນທຶກໄວ້ໃນເຄື່ອງຂອງເຈົ້າເທົ່ານັ້ນ.',
                        style: text.bodySmall,
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 20),

              // Passport Image / Scanner Frame
              Expanded(
                child: Center(
                  child: Container(
                    width: double.infinity,
                    decoration: BoxDecoration(
                      color: colors.surfaceContainer,
                      borderRadius: SafeZoneTokens.borderRadius,
                      border: Border.all(
                        color: colors.outlineVariant,
                        width: SafeZoneTokens.ruleHair,
                      ),
                    ),
                    padding: const EdgeInsets.all(16),
                    child: AnimatedSwitcher(
                      duration: SafeZoneTokens.durationNormal,
                      switchInCurve: SafeZoneTokens.easing,
                      switchOutCurve: SafeZoneTokens.easing,
                      child: _preview != null
                          ? ClipRRect(
                              borderRadius: SafeZoneTokens.borderRadius,
                              child: Image.memory(
                                _preview!,
                                fit: BoxFit.contain,
                              ),
                            )
                          : CustomPaint(
                              painter: DashedBorderPainter(
                                color: tokens.low,
                                strokeWidth: 1.5,
                              ),
                              child: Center(
                                child: Padding(
                                  padding: const EdgeInsets.all(24.0),
                                  child: Column(
                                    mainAxisSize: MainAxisSize.min,
                                    children: [
                                      Icon(
                                        Icons.badge_outlined,
                                        color: tokens.muted,
                                        size: 64,
                                      ),
                                      const SizedBox(height: 16),
                                      Text(
                                        'ຍັງບໍ່ມີພາສປອດທີ່ບັນທຶກໄວ້',
                                        style: text.titleMedium,
                                      ),
                                      const SizedBox(height: 8),
                                      Text(
                                        'ວາງພາສປອດໃຫ້ພໍດີກັບກອບ ເພື່ອຖ່າຍຮູບ',
                                        textAlign: TextAlign.center,
                                        style: text.bodySmall,
                                      ),
                                    ],
                                  ),
                                ),
                              ),
                            ),
                    ),
                  ),
                ),
              ),
              const SizedBox(height: 20),

              if (_loading) ...[
                LinearProgressIndicator(
                  color: colors.primary,
                  backgroundColor: colors.outlineVariant,
                ),
                const SizedBox(height: 16),
              ],

              // Action Buttons
              PrimaryButton(
                label: 'ຖ່າຍຮູບພາສປອດ',
                icon: Icons.camera_alt_outlined,
                onPressed: () => _pick(ImageSource.camera),
              ),
              const SizedBox(height: 12),
              PrimaryButton(
                label: 'ເລືອກຈາກຄັງຮູບ',
                icon: Icons.photo_library_outlined,
                isSecondary: true,
                onPressed: () => _pick(ImageSource.gallery),
              ),

              // Only offered when there is a passport to send. In decoy mode
              // _preview is never populated, so this stays hidden.
              if (_preview != null) ...[
                const SizedBox(height: 12),
                PrimaryButton(
                  label: 'ສົ່ງສຳເນົາພາສປອດ',
                  icon: Icons.ios_share,
                  isSecondary: true,
                  onPressed: _sharePassport,
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }
}

class DashedBorderPainter extends CustomPainter {
  final Color color;
  final double strokeWidth;

  DashedBorderPainter({
    required this.color,
    required this.strokeWidth,
  });

  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()
      ..color = color
      ..strokeWidth = strokeWidth
      ..style = PaintingStyle.stroke;
      
    final path = Path();
    final rrect = RRect.fromRectAndRadius(
      Rect.fromLTWH(0, 0, size.width, size.height),
      const Radius.circular(SafeZoneTokens.radius),
    );
    path.addRRect(rrect);

    const double dashWidth = 8.0;
    const double dashSpace = 6.0;
    
    for (final pathMetric in path.computeMetrics()) {
      double distance = 0.0;
      while (distance < pathMetric.length) {
        const length = dashWidth;
        final extractPath = pathMetric.extractPath(distance, distance + length);
        canvas.drawPath(extractPath, paint);
        distance += length + dashSpace;
      }
    }
  }

  @override
  bool shouldRepaint(covariant DashedBorderPainter oldDelegate) {
    // The colour is theme-derived, so it changes on a light/dark switch.
    return oldDelegate.color != color || oldDelegate.strokeWidth != strokeWidth;
  }
}
