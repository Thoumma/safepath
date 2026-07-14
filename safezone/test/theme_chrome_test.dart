// Verifies the theme's chrome styles carry the bundled font families.
// These are the styles lifted out of the TextTheme (app bar title, input
// label/hint, snack bar), which do NOT inherit ThemeData.fontFamily.
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:safezone/theme.dart';

void main() {
  for (final entry in {'light': AppTheme.light, 'dark': AppTheme.dark}.entries) {
    test('${entry.key}: chrome text styles name the bundled families', () {
      final theme = entry.value;

      final styles = <String, TextStyle?>{
        'appBar.title': theme.appBarTheme.titleTextStyle,
        'input.label': theme.inputDecorationTheme.labelStyle,
        'input.hint': theme.inputDecorationTheme.hintStyle,
        'input.error': theme.inputDecorationTheme.errorStyle,
        'snackBar.content': theme.snackBarTheme.contentTextStyle,
        'textTheme.bodyLarge': theme.textTheme.bodyLarge,
        'textTheme.labelLarge': theme.textTheme.labelLarge,
      };

      for (final s in styles.entries) {
        expect(s.value?.fontFamily, 'Noto Sans Lao',
            reason: '${s.key} must render Lao');
        expect(s.value?.fontFamilyFallback, contains('Noto Sans'),
            reason: '${s.key} must fall back to a face with Latin + digits');
      }
    });
  }

  test('the extension is attached to both themes', () {
    expect(AppTheme.light.extension<SafeZoneTokens>(), isNotNull);
    expect(AppTheme.dark.extension<SafeZoneTokens>(), isNotNull);
  });
}
