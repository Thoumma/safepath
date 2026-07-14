import 'package:flutter/material.dart';
import '../theme.dart';

class PrimaryButton extends StatefulWidget {
  final String label;
  final VoidCallback onPressed;
  final IconData? icon;
  final Color? color;
  final bool isSecondary;

  const PrimaryButton({
    super.key,
    required this.label,
    required this.onPressed,
    this.icon,
    this.color,
    this.isSecondary = false,
  });

  @override
  State<PrimaryButton> createState() => _PrimaryButtonState();
}

class _PrimaryButtonState extends State<PrimaryButton> {
  double _scale = 1.0;

  void _onTapDown(TapDownDetails details) {
    setState(() => _scale = 0.98);
  }

  void _onTapUp(TapUpDetails details) {
    setState(() => _scale = 1.0);
  }

  void _onTapCancel() {
    setState(() => _scale = 1.0);
  }

  @override
  Widget build(BuildContext context) {
    final colors = context.colors;

    final defaultBg = widget.isSecondary
        ? Colors.transparent
        : (widget.color ?? colors.primary);

    final defaultFg =
        widget.isSecondary ? colors.primary : colors.onPrimary;

    final borderSide = widget.isSecondary
        ? BorderSide(color: colors.outlineVariant, width: SafeZoneTokens.rule)
        : BorderSide.none;

    return GestureDetector(
      onTapDown: _onTapDown,
      onTapUp: _onTapUp,
      onTapCancel: _onTapCancel,
      onTap: widget.onPressed,
      child: AnimatedScale(
        scale: _scale,
        duration: SafeZoneTokens.durationInstant,
        curve: SafeZoneTokens.easing,
        child: SizedBox(
          width: double.infinity,
          height: 52,
          child: OutlinedButton(
            style: OutlinedButton.styleFrom(
              backgroundColor: defaultBg,
              foregroundColor: defaultFg,
              side: borderSide,
              shape: const RoundedRectangleBorder(
                borderRadius: SafeZoneTokens.borderRadius,
              ),
              padding: const EdgeInsets.symmetric(horizontal: 24),
              elevation: 0,
            ),
            onPressed: widget.onPressed,
            child: Row(
              mainAxisAlignment: MainAxisAlignment.center,
              mainAxisSize: MainAxisSize.min,
              children: [
                if (widget.icon != null) ...[
                  Icon(widget.icon, size: 20, color: defaultFg),
                  const SizedBox(width: 8),
                ],
                Text(
                  widget.label,
                  style: context.text.labelLarge!.copyWith(
                    fontSize: 16,
                    color: defaultFg,
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
