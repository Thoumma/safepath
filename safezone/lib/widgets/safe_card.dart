import 'package:flutter/material.dart';
import '../theme.dart';

/// The one bordered panel used across the app.
///
/// Every screen had re-implemented the same `Container(decoration: BoxDecoration(
/// color: surfaceContainer, borderRadius, hairline border))` inline. This
/// collapses that into a single widget so the card looks identical everywhere
/// and a change lands in one place. Matches the console's "panel, not a card"
/// language — a hairline rule, soft 8px corners, no shadow.
class SafeCard extends StatelessWidget {
  final Widget child;
  final EdgeInsetsGeometry padding;

  /// When set, the whole card is tappable with a matching ink ripple.
  final VoidCallback? onTap;

  /// Override the border colour (e.g. a token's critical/high edge for an
  /// emphasis card). Defaults to the hairline outline.
  final Color? borderColor;
  final double? borderWidth;

  /// Override the fill (e.g. a tinted alert card). Defaults to surfaceContainer.
  final Color? backgroundColor;

  const SafeCard({
    super.key,
    required this.child,
    this.padding = const EdgeInsets.all(16),
    this.onTap,
    this.borderColor,
    this.borderWidth,
    this.backgroundColor,
  });

  @override
  Widget build(BuildContext context) {
    final colors = context.colors;
    final decoration = BoxDecoration(
      color: backgroundColor ?? colors.surfaceContainer,
      borderRadius: SafeZoneTokens.borderRadius,
      border: Border.all(
        color: borderColor ?? colors.outlineVariant,
        width: borderWidth ?? SafeZoneTokens.ruleHair,
      ),
    );

    if (onTap == null) {
      return Container(
        padding: padding,
        decoration: decoration,
        child: child,
      );
    }

    // A tappable card clips its ripple to the same radius as the border.
    return Material(
      color: backgroundColor ?? colors.surfaceContainer,
      borderRadius: SafeZoneTokens.borderRadius,
      child: InkWell(
        onTap: onTap,
        borderRadius: SafeZoneTokens.borderRadius,
        child: Container(
          padding: padding,
          decoration: BoxDecoration(
            borderRadius: SafeZoneTokens.borderRadius,
            border: Border.all(
              color: borderColor ?? colors.outlineVariant,
              width: borderWidth ?? SafeZoneTokens.ruleHair,
            ),
          ),
          child: child,
        ),
      ),
    );
  }
}
