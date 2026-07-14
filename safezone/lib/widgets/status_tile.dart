import 'package:flutter/material.dart';
import '../theme.dart';

class StatusTile extends StatelessWidget {
  final String label;
  final IconData icon;
  final bool isConfigured;
  final VoidCallback? onTap;

  const StatusTile({
    super.key,
    required this.label,
    required this.icon,
    required this.isConfigured,
    this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final colors = context.colors;
    final tokens = context.tokens;

    return InkWell(
      onTap: onTap,
      borderRadius: SafeZoneTokens.borderRadius,
      child: Padding(
        padding: const EdgeInsets.symmetric(vertical: 12, horizontal: 16),
        child: Row(
          children: [
            // Leading Icon Chip
            Container(
              width: 40,
              height: 40,
              decoration: BoxDecoration(
                color: colors.surface,
                borderRadius: SafeZoneTokens.borderRadius,
                border: Border.all(
                  color: colors.outlineVariant,
                  width: SafeZoneTokens.ruleHair,
                ),
              ),
              child: Icon(
                icon,
                color: colors.primary,
                size: 20,
              ),
            ),
            const SizedBox(width: 16),

            // Label
            Expanded(
              child: Text(label, style: context.text.titleMedium),
            ),

            // Trailing Status Indicator. The pending state uses `muted`, not
            // `low` — a status icon carries meaning and needs 3:1, which `low`
            // does not clear.
            Icon(
              isConfigured
                  ? Icons.check_circle
                  : Icons.radio_button_unchecked,
              color: isConfigured ? tokens.success : tokens.muted,
              size: 24,
            ),
          ],
        ),
      ),
    );
  }
}
