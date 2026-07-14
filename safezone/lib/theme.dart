import 'package:flutter/material.dart';

/// Design tokens that Material's [ThemeData]/[ColorScheme] has no slot for.
///
/// Ported from the Response Console (`safezone-console/src/app/globals.css`),
/// so the app and the console share one color system, one type ramp and one
/// accessibility floor. They do not share density: the console is an ops tool,
/// this is an app held by a frightened traveller.
///
/// Rules of the system:
///   - Color is information, never decoration. Red means an active emergency.
///   - Structure is carried by rules (lines) and alignment, not shadows.
///   - Every signal is a PAIR: the surface value fills, the `Ink` value is the
///     only one safe to put text in. Using a surface value for text is the bug
///     that fails AA — white on [high] is 2.96:1.
///
/// Read via `context.tokens`.
@immutable
class SafeZoneTokens extends ThemeExtension<SafeZoneTokens> {
  const SafeZoneTokens({
    required this.critical,
    required this.criticalInk,
    required this.onCritical,
    required this.high,
    required this.highInk,
    required this.onHigh,
    required this.success,
    required this.successInk,
    required this.onSuccess,
    required this.muted,
    required this.low,
  });

  /// Emergency. The only red in the system. Fills and rules.
  final Color critical;

  /// Emergency, as text. Contrast-checked >= 4.5:1 on the page ground.
  final Color criticalInk;

  /// Text/icons placed *on top of* [critical].
  final Color onCritical;

  /// Warning / pending. Fills and rules.
  final Color high;

  /// Warning, as text.
  final Color highInk;

  /// Text on top of [high]. This is INK, never white — see the class doc.
  final Color onHigh;

  /// A good state, stated calmly. Fills and rules.
  final Color success;

  /// A good state, as text.
  final Color successInk;

  /// Text on top of [success].
  final Color onSuccess;

  /// Secondary/label text. Safe for text (>= 4.5:1); use this, not [low].
  final Color muted;

  /// A neutral that recedes. Fills, dividers, disabled tracks — **never text**.
  /// It is 2.30:1 on paper and fails AA. For muted text, use [muted].
  final Color low;

  // --- Geometry and motion -------------------------------------------------
  // Theme-invariant, so they are consts rather than lerped fields.

  /// Hairline rule — 1px. The default border.
  static const double ruleHair = 1;

  /// Medium rule — 2px. Focus, active selection.
  static const double rule = 2;

  /// Heavy rule — 4px. A severity bar.
  static const double bar = 4;

  /// Corner radius. The console squares off at 2px because it is a control
  /// room; the app stays softer at 8px because it is held in the hand.
  static const double radius = 8;

  static const BorderRadius borderRadius =
      BorderRadius.all(Radius.circular(radius));

  static const Duration durationInstant = Duration(milliseconds: 50);
  static const Duration durationFast = Duration(milliseconds: 150);
  static const Duration durationNormal = Duration(milliseconds: 250);
  static const Duration durationSlow = Duration(milliseconds: 400);

  /// The SOS pulse. Slow enough to read as breathing, not flashing.
  static const Duration durationPulse = Duration(milliseconds: 1800);

  /// Functional. No bounce, no overshoot, ever.
  static const Curve easing = Curves.easeInOut;

  @override
  SafeZoneTokens copyWith({
    Color? critical,
    Color? criticalInk,
    Color? onCritical,
    Color? high,
    Color? highInk,
    Color? onHigh,
    Color? success,
    Color? successInk,
    Color? onSuccess,
    Color? muted,
    Color? low,
  }) {
    return SafeZoneTokens(
      critical: critical ?? this.critical,
      criticalInk: criticalInk ?? this.criticalInk,
      onCritical: onCritical ?? this.onCritical,
      high: high ?? this.high,
      highInk: highInk ?? this.highInk,
      onHigh: onHigh ?? this.onHigh,
      success: success ?? this.success,
      successInk: successInk ?? this.successInk,
      onSuccess: onSuccess ?? this.onSuccess,
      muted: muted ?? this.muted,
      low: low ?? this.low,
    );
  }

  @override
  SafeZoneTokens lerp(SafeZoneTokens? other, double t) {
    if (other == null) return this;
    return SafeZoneTokens(
      critical: Color.lerp(critical, other.critical, t)!,
      criticalInk: Color.lerp(criticalInk, other.criticalInk, t)!,
      onCritical: Color.lerp(onCritical, other.onCritical, t)!,
      high: Color.lerp(high, other.high, t)!,
      highInk: Color.lerp(highInk, other.highInk, t)!,
      onHigh: Color.lerp(onHigh, other.onHigh, t)!,
      success: Color.lerp(success, other.success, t)!,
      successInk: Color.lerp(successInk, other.successInk, t)!,
      onSuccess: Color.lerp(onSuccess, other.onSuccess, t)!,
      muted: Color.lerp(muted, other.muted, t)!,
      low: Color.lerp(low, other.low, t)!,
    );
  }

  static const light = SafeZoneTokens(
    critical: Color(0xFFC42B33),
    criticalInk: Color(0xFFB02129),
    onCritical: Color(0xFFFFFFFF),
    high: Color(0xFFE17C09),
    highInk: Color(0xFF934C06),
    onHigh: Color(0xFF2A2620),
    success: Color(0xFF2E7D5B),
    successInk: Color(0xFF226749),
    onSuccess: Color(0xFFFFFFFF),
    muted: Color(0xFF61584C),
    low: Color(0xFFAAA292),
  );

  static const dark = SafeZoneTokens(
    critical: Color(0xFFEA535A),
    criticalInk: Color(0xFFF3777D),
    onCritical: Color(0xFF131920),
    high: Color(0xFFF49A34),
    highInk: Color(0xFFF8B359),
    onHigh: Color(0xFF131920),
    success: Color(0xFF4AB587),
    successInk: Color(0xFF6AC89F),
    onSuccess: Color(0xFF131920),
    muted: Color(0xFFA0A7B1),
    low: Color(0xFF5E6A78),
  );
}

/// Ergonomics: `context.tokens.critical`, `context.colors.surface`.
extension SafeZoneThemeX on BuildContext {
  SafeZoneTokens get tokens => Theme.of(this).extension<SafeZoneTokens>()!;
  ColorScheme get colors => Theme.of(this).colorScheme;
  TextTheme get text => Theme.of(this).textTheme;
}

class AppTheme {
  AppTheme._();

  /// Bundled in `assets/fonts/`, not fetched at runtime — an emergency app
  /// cannot depend on a network round-trip to render its own text.
  ///
  /// Lao is primary: it carries the meaning. But the Lao face is a 92-codepoint
  /// subset with no Latin and no digits, so the wordmark, "SOS", phone numbers,
  /// OTP codes and the maps URL all resolve through the fallback. Both are Noto,
  /// so they share metrics and design.
  static const _font = 'Noto Sans Lao';
  static const _fontFallback = ['Noto Sans'];

  /// Lao tone marks stack above the x-height and collide at 1.5.
  static const _laoLeading = 1.75;

  // --- Light: warm paper ---------------------------------------------------
  static const _lightScheme = ColorScheme(
    brightness: Brightness.light,
    primary: Color(0xFF15324E), // passport navy
    onPrimary: Color(0xFFF6F4EF),
    primaryContainer: Color(0xFF15324E),
    onPrimaryContainer: Color(0xFFF6F4EF),
    secondary: Color(0xFF15324E),
    onSecondary: Color(0xFFF6F4EF),
    error: Color(0xFFC42B33), // signal red
    onError: Color(0xFFFFFFFF),
    errorContainer: Color(0xFFFBE9EA),
    onErrorContainer: Color(0xFFB02129),
    surface: Color(0xFFF6F4EF), // the page ground
    onSurface: Color(0xFF2A2620), // text ink
    surfaceContainer: Color(0xFFFFFFFF), // cards
    surfaceContainerHighest: Color(0xFFEFECE7),
    onSurfaceVariant: Color(0xFF61584C), // muted label
    outline: Color(0xFF2A2620), // border-strong
    outlineVariant: Color(0xFFE2DDD3), // hairline border
  );

  // --- Dark: cool slate ----------------------------------------------------
  // Not an inversion. Swiss takes a cool ground, and it agrees with the navy.
  // Ink drops to off-white — pure white on near-black is harsh at 2am.
  static const _darkScheme = ColorScheme(
    brightness: Brightness.dark,
    primary: Color(0xFF6CA1D0), // navy cannot carry contrast on dark; lift it
    onPrimary: Color(0xFF131920),
    primaryContainer: Color(0xFF243447),
    onPrimaryContainer: Color(0xFFE5E8EB),
    secondary: Color(0xFF6CA1D0),
    onSecondary: Color(0xFF131920),
    error: Color(0xFFEA535A),
    onError: Color(0xFF131920),
    errorContainer: Color(0xFF3A1E22),
    onErrorContainer: Color(0xFFF3777D),
    surface: Color(0xFF131920),
    onSurface: Color(0xFFE5E8EB),
    surfaceContainer: Color(0xFF1A2028), // cards
    surfaceContainerHighest: Color(0xFF242B33),
    onSurfaceVariant: Color(0xFFA0A7B1),
    outline: Color(0xFFE5E8EB),
    outlineVariant: Color(0xFF2F3741),
  );

  static ThemeData get light => _build(_lightScheme, SafeZoneTokens.light);
  static ThemeData get dark => _build(_darkScheme, SafeZoneTokens.dark);

  static ThemeData _build(ColorScheme scheme, SafeZoneTokens tokens) {
    // `ThemeData.fontFamily` only reaches the TextTheme it builds internally.
    // Styles we lift out of `text` here (the app bar title, the snack bar, the
    // input decoration) would keep no family at all and render as tofu, so the
    // family is applied to the ramp itself.
    final text = _textTheme(scheme, tokens).apply(
      fontFamily: _font,
      fontFamilyFallback: _fontFallback,
    );

    return ThemeData(
      useMaterial3: true,
      brightness: scheme.brightness,
      colorScheme: scheme,
      fontFamily: _font,
      fontFamilyFallback: _fontFallback,
      scaffoldBackgroundColor: scheme.surface,
      extensions: [tokens],
      textTheme: text,
      // The chrome uses primaryContainer, not primary. In dark, `primary` is a
      // lifted navy so that it can carry contrast as *text*; using it as a
      // large fill would put a bright band across the top of a night screen.
      appBarTheme: AppBarTheme(
        backgroundColor: scheme.primaryContainer,
        foregroundColor: scheme.onPrimaryContainer,
        centerTitle: true,
        elevation: 0,
        scrolledUnderElevation: 0,
        titleTextStyle:
            text.titleMedium!.copyWith(color: scheme.onPrimaryContainer),
        iconTheme: IconThemeData(color: scheme.onPrimaryContainer),
      ),
      cardTheme: CardThemeData(
        color: scheme.surfaceContainer,
        elevation: 0,
        margin: EdgeInsets.zero,
        shape: RoundedRectangleBorder(
          side: BorderSide(
            color: scheme.outlineVariant,
            width: SafeZoneTokens.ruleHair,
          ),
          borderRadius: SafeZoneTokens.borderRadius,
        ),
      ),
      dividerTheme: DividerThemeData(
        color: scheme.outlineVariant,
        thickness: SafeZoneTokens.ruleHair,
        space: SafeZoneTokens.ruleHair,
      ),
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: scheme.surfaceContainer,
        border: _outline(scheme.outlineVariant, SafeZoneTokens.ruleHair),
        enabledBorder: _outline(scheme.outlineVariant, SafeZoneTokens.ruleHair),
        focusedBorder: _outline(scheme.primary, SafeZoneTokens.rule),
        errorBorder: _outline(scheme.error, SafeZoneTokens.ruleHair),
        focusedErrorBorder: _outline(scheme.error, SafeZoneTokens.rule),
        labelStyle: text.bodyMedium!.copyWith(color: tokens.muted),
        // `muted`, not `low`: hint text is text, and `low` fails AA.
        hintStyle: text.bodyMedium!.copyWith(color: tokens.muted),
        errorStyle: text.bodySmall!.copyWith(color: tokens.criticalInk),
      ),
      filledButtonTheme: FilledButtonThemeData(
        style: FilledButton.styleFrom(
          backgroundColor: scheme.primary,
          foregroundColor: scheme.onPrimary,
          disabledBackgroundColor: tokens.low,
          disabledForegroundColor: scheme.surface,
          shape: const RoundedRectangleBorder(
            borderRadius: SafeZoneTokens.borderRadius,
          ),
          padding: const EdgeInsets.symmetric(vertical: 16, horizontal: 24),
          textStyle: text.labelLarge!.copyWith(fontSize: 16),
        ),
      ),
      textButtonTheme: TextButtonThemeData(
        style: TextButton.styleFrom(
          foregroundColor: scheme.primary,
          textStyle: text.labelLarge,
        ),
      ),
      snackBarTheme: SnackBarThemeData(
        behavior: SnackBarBehavior.floating,
        backgroundColor: scheme.onSurface,
        contentTextStyle: text.bodyMedium!.copyWith(color: scheme.surface),
        shape: const RoundedRectangleBorder(
          borderRadius: SafeZoneTokens.borderRadius,
        ),
      ),
    );
  }

  static OutlineInputBorder _outline(Color color, double width) {
    return OutlineInputBorder(
      borderRadius: SafeZoneTokens.borderRadius,
      borderSide: BorderSide(color: color, width: width),
    );
  }

  /// The console's ramp. Display sizes are tight and tracked-in so one number
  /// can dominate; everything the user actually *reads* is Lao, and carries
  /// [_laoLeading].
  static TextTheme _textTheme(ColorScheme scheme, SafeZoneTokens tokens) {
    final ink = scheme.onSurface;

    return TextTheme(
      displayLarge: TextStyle(
        fontSize: 56,
        height: 1.05,
        letterSpacing: -0.02 * 56,
        fontWeight: FontWeight.w700,
        color: ink,
        fontFeatures: const [FontFeature.tabularFigures()],
      ),
      displayMedium: TextStyle(
        fontSize: 40,
        height: 1.05,
        letterSpacing: -0.02 * 40,
        fontWeight: FontWeight.w700,
        color: ink,
        fontFeatures: const [FontFeature.tabularFigures()],
      ),
      displaySmall: TextStyle(
        fontSize: 28,
        height: 1.25,
        fontWeight: FontWeight.w500,
        color: ink,
      ),
      titleLarge: TextStyle(
        fontSize: 20,
        height: _laoLeading,
        fontWeight: FontWeight.w500,
        color: ink,
      ),
      titleMedium: TextStyle(
        fontSize: 16,
        height: _laoLeading,
        fontWeight: FontWeight.w500,
        color: ink,
      ),
      bodyLarge: TextStyle(
        fontSize: 16,
        height: _laoLeading,
        fontWeight: FontWeight.w400,
        color: ink,
      ),
      bodyMedium: TextStyle(
        fontSize: 14,
        height: _laoLeading,
        fontWeight: FontWeight.w400,
        color: tokens.muted,
      ),
      bodySmall: TextStyle(
        fontSize: 12,
        height: _laoLeading,
        fontWeight: FontWeight.w400,
        color: tokens.muted,
      ),
      labelLarge: TextStyle(
        fontSize: 14,
        height: _laoLeading,
        fontWeight: FontWeight.w500,
        color: ink,
      ),
      labelMedium: TextStyle(
        fontSize: 12,
        height: _laoLeading,
        fontWeight: FontWeight.w500,
        color: tokens.muted,
      ),
      labelSmall: TextStyle(
        fontSize: 11,
        height: _laoLeading,
        fontWeight: FontWeight.w500,
        color: tokens.muted,
      ),
    );
  }
}
