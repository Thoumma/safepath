# Plan: Port the console design tokens into the Flutter theme

**Source of truth**: `safezone-console/src/app/globals.css` (tokens) + `.design/response-console/DESIGN_BRIEF.md` (intent)
**Target**: `safezone/lib/theme.dart` (+ the widgets and screens that bypass it)
**Status**: implemented (2026-07-14). Tasks 1–12 done; radius resolved to **8px**.
Task 13 (drive it on a device) is still open — no emulator available, so every screen
was instead rendered headlessly in both themes (`test/design_preview_test.dart` →
`test/goldens/`).

> **Correction to §4.** The claim that the app has "little Latin" so Archivo can be
> deferred is **wrong**, and the golden render proved it. The static Noto Sans Lao is a
> 92-codepoint Lao-only subset: **no Latin, no digits**. "SafeZone", "SOS", "Trusted
> Contact", `+85620…`, the OTP digits and the maps URL all rendered as tofu. A Latin face
> is not optional. Archivo ships **variable-only** from Google Fonts, and Flutter's pubspec
> weight mapping cannot interpolate a variable axis without per-style `FontVariation` —
> it would silently render every weight at 400. So the Latin companion is **Noto Sans**
> (static, sibling superfamily, harmonised metrics), subset to 202 codepoints. All six
> faces total 206KB, under the 600KB this plan budgeted.

---

## 1. What this is, and what it is not

The console and the app are two surfaces of one product, so they should share **one color system, one type ramp, one motion scale, and one accessibility floor**. They should *not* share a personality wholesale.

The console is an operations tool: a duty officer, possibly at 2am, triaging a queue. Swiss (rigid grid, flat, squared, dense, clinical) is right for that.

The app is held by a Lao traveller who is frightened and abroad. The same *rules* apply — color is information, red means emergency, contrast is non-negotiable — but "clinical and dense" is the wrong register, and a couple of Swiss reflexes are actively wrong here:

- **The SOS button must stay a circle.** A round, physical, thumb-sized target is an affordance — it reads as a panic button, the way a real alarm does. Squaring it because "Swiss is squared" would be applying a rule past the point where it means anything. It keeps the circle; it loses the drop shadow (`Color(0x20C42B33)` in `sos_button.dart:92`), which is decoration.
- **The bilingual small-caps device does not port.** The console needs it because embassy/VFI/SafePath staff and judges read English. Per `CLAUDE.md`, the app's UI is Lao-only. No annotation layer.

So: **port the tokens, port the rules, do not port the density.**

**Open decision (needs your call):** the app currently uses 12px corner radius throughout (19 instances of `circular(12)`). The console dropped to 2px. Options are (a) go to 2px for a single visual language, (b) keep the app at a softer 8px so it stays reassuring in the hand, or (c) split the difference at 4px. My recommendation is **(b) 8px** — the app is not a control room, and a 2px radius on a phone reads as harsh rather than precise. Flagging it because it's a taste call, not a correctness one.

---

## 2. The core architectural problem

Flutter has no CSS custom properties. The console's tokens are ~60 variables; Flutter's `ThemeData`/`ColorScheme` only models a fraction of them (primary, error, surface, etc.). There is nowhere in stock Material to put *severity surface/ink pairs*, *rule weights*, *motion durations*, or a *spacing scale*.

**The idiomatic answer is a `ThemeExtension`.** One class, `SafeZoneTokens extends ThemeExtension<SafeZoneTokens>`, attached to both light and dark `ThemeData`, holding everything Material doesn't model. Widgets read it via `Theme.of(context).extension<SafeZoneTokens>()!`.

This matters more than it sounds: the current `AppColors` is a bag of **static consts**, which is why dark mode is impossible today. A `static const emergency` cannot change when the theme changes. Every one of the ~85 `AppColors.*` references across 11 files is a hardcoded light-mode value. **Dark mode is not a theme edit; it is the removal of `AppColors` as a static class.** That is the single biggest task in this port and the reason to sequence carefully.

---

## 3. Token mapping

| Console token | Flutter home | Notes |
| --- | --- | --- |
| `--background`, `--card`, `--foreground` | `ColorScheme.surface` / `surfaceContainer` / `onSurface` | Material 3 names; `scaffoldBackgroundColor` follows. |
| `--primary` (navy) | `ColorScheme.primary` | Already correct. In dark it must **lighten** (`208 52% 62%`) — navy on near-black fails contrast. |
| `--critical` / `--critical-ink` / `--critical-foreground` | `SafeZoneTokens.critical*` | `ColorScheme.error` maps to `critical`; the **ink** variant has no Material slot. |
| `--success` / `--success-ink` | `SafeZoneTokens.success*` | Material 3 has no success role at all. |
| `--high` / `--high-ink` | `SafeZoneTokens.high*` | **Port even though the app has no severity model yet** — it's what "pending/warning" states should use instead of inventing a color later. |
| `--low`, `--muted-foreground` | `SafeZoneTokens.muted`, replaces `pendingDisabled` | |
| `--border`, `--border-strong` | `ColorScheme.outlineVariant` / `outline` | |
| `--rule-hairline/medium/heavy` (1/2/4px) | `SafeZoneTokens.ruleHair/rule/bar` | |
| `--radius` | `SafeZoneTokens.radius` → every `BorderRadius` | See the open decision in §1. |
| `--text-2xs … --text-4xl` | `TextTheme` (`labelSmall`…`displayLarge`) | |
| `--leading-lao: 1.75` | `TextStyle.height: 1.75` | **Load-bearing.** Lao tone marks stack above the x-height and collide at 1.5. |
| `--tracking-*` | `TextStyle.letterSpacing` | |
| `--duration-*`, `--easing-*` | `SafeZoneTokens.durationFast/Normal`, `Curves.easeInOut` | Replaces the magic `milliseconds: 1800` / `100` literals. |
| `--space-1 … --space-10` | `SafeZoneTokens.space*` | Optional; low value. Flutter code reads fine with literal `SizedBox(height: 16)`. **Recommend skipping** rather than adding ceremony for its own sake. |
| `font-variant-numeric: tabular-nums` | `FontFeature.tabularFigures()` | For any countdown/timer/coords. |
| `.annotation`, `.label-eyebrow` | — | **Do not port.** Console-only (see §1). |
| `#8A5CC0` (the purple) | — | Does not exist in the app. Nothing to remove. |

---

## 4. Fonts — the one decision with a wrong answer

The console loads **Archivo** (grotesque, Latin + numerals) and **JetBrains Mono** via `next/font/google`. The app's `pubspec.yaml` declares **no fonts at all** — `theme.dart` just names `'Noto Sans Lao'` in a `fontFamilyFallback` list and hopes the OS has it. On a stock Android device, it very often does not, and the app silently falls back to Roboto, which has poor Lao coverage.

Two options:

1. **`google_fonts` package** — fetches fonts **over the network at runtime** and caches them.
2. **Bundle the `.ttf` files** in `assets/fonts/` and declare them in `pubspec.yaml`.

**This must be option 2, and it is not a preference.** SafeZone is an emergency app used by travellers abroad — the exact population that is roaming, on a dead SIM, or on hostile wifi. A design system that requires a network round-trip to render its own text is broken in precisely the scenario the app exists for. Bundling costs ~600KB and removes the failure mode entirely. It also fixes the pre-existing Lao-fallback bug above, which is arguably the most consequential thing in this whole port: **right now the app's Lao text may not be rendering in a Lao-designed face at all.**

Fonts to bundle: `NotoSansLao` (Regular/Medium/Bold) — non-negotiable, it carries every UI string. `Archivo` is optional for the app (there is little Latin), so **defer it** unless numerals start appearing.

---

## 5. Dark mode

The app has none: `main.dart:29` passes only `theme: AppTheme.light`. Port the console's **cool-slate** dark palette (per the `frontend-design` skill, Swiss takes a cool ground), add `AppTheme.dark`, and wire `darkTheme:` + `themeMode: ThemeMode.system` in `main.dart`.

Two app-specific hazards the console never had:

- **The passport screen shows a decrypted passport photo.** Verify it reads correctly on a dark ground and that no container assumes a white backdrop.
- **The camera/image-picker surfaces** are platform UI and will not follow the app theme. Check the seams.

Reduced motion: Flutter's equivalent of `prefers-reduced-motion` is `MediaQuery.disableAnimationsOf(context)`. The SOS pulse **must** respect it — it is a large, repeating, red animation next to the word "emergency", which is a genuine photosensitivity/vestibular hazard.

---

## 6. Task list (ordered — later tasks depend on earlier ones)

**Foundation**
1. Bundle `NotoSansLao` TTFs in `assets/fonts/`, declare in `pubspec.yaml`, set `fontFamily` on both themes. Verify Lao renders in the real face (this fixes a live bug).
2. Write `SafeZoneTokens extends ThemeExtension<SafeZoneTokens>` — signal pairs, rule weights, radius, durations.
3. Rewrite `theme.dart`: light + dark `ThemeData`, both carrying the extension. Full type ramp with `height: 1.75` on Lao body styles.
4. `main.dart`: add `darkTheme` + `themeMode: ThemeMode.system`.

**Migration (the bulk of the work)**
5. Delete the static `AppColors` class. Migrate all ~85 references across 11 files to `Theme.of(context)` / the extension. Highest-density files first: `sos_screen.dart` (24), `contact_screen.dart` (18), `passport_screen.dart` (15), `home_screen.dart` (14).
6. Kill the two hardcoded colors: `sos_screen.dart:240` `Color(0xFFFDF2F2)` (a pink tint that will look broken on a dark ground) and `sos_button.dart:92` the red drop shadow.
7. Centralize radius: 19×`circular(12)`, 4×`circular(8)`, 3×`circular(16)`, 1×`circular(24)` → the token. A theme change won't reach these otherwise.

**Widgets**
8. `sos_button.dart` — keep the circle, drop the shadow, token red, token durations, and **gate the pulse on `disableAnimationsOf`**.
9. `primary_button.dart` — token radius/colors; replace the `milliseconds: 100` literal.
10. `status_tile.dart` — success/muted from the extension, not `AppColors.pendingDisabled`.

**Verification**
11. `flutter analyze` clean; `flutter test` passes.
12. Contrast-check every pair in **both** themes with a real checker. Note: the console's ratios were computed by hand from relative luminance and have not been tool-verified — do not inherit them on trust. The known trap is amber: white-on-amber is 2.96:1 and fails AA.
13. Run the app in light and dark, drive the SOS flow end-to-end.

---

## 7. Risks

- **Task 5 is a wide, mechanical, error-prone diff** touching every screen. It is also where dark mode actually comes from. Do it as its own commit, separate from the token definitions, so a bad merge is easy to isolate.
- **`ColorScheme.fromSeed` will silently override explicit colors.** The current theme calls `fromSeed(seedColor: primary, ...)` and then passes overrides. M3 can still derive tones that fight the brand palette. Prefer an explicit `ColorScheme(...)` constructor over `fromSeed` so navy/red/emerald are exactly the specified values.
- Dark mode changes the passport-viewing surface — a security-adjacent screen. Nothing here touches crypto or `PassportStore`, but the temp-file share flow should be re-driven once, as a matter of course.

## 8. Out of scope

- Any change to `CryptoService`, `PassportStore`, `SosService`, or the security model.
- New screens, new features, restructured navigation.
- The console (done) and the `response-console/index.html` prototype (dead).
