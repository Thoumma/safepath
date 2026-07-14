# SafeZone UI/UX Redesign Implementation Plan

This plan details the redesign of the SafeZone Flutter MVP application to deliver a **calm, trustworthy, civic-grade** look and feel — the visual language of an official safety tool (think embassy / Red Cross), not a gaming or crypto app. The goal is a design that reads as intentionally human-crafted, performs well on low-end phones, and stays legible outdoors in sunlight.

> Design intent: deliberately avoid the dark-glassmorphism + neon-glow aesthetic. Flat solid color, high contrast, and restraint are what make this feel premium and credible for a safety product.

## Design System & Theme

We will replace the default Flutter Material design with a cohesive, light, high-contrast civic aesthetic.

*   **Colors**:
    *   **Background**: Warm off-white paper (`#F6F4EF`) — high contrast, sunlight-readable.
    *   **Surface / Cards**: Pure white (`#FFFFFF`) with a 1px warm border (`#E2DDD3`). Solid fills, no transparency or blur.
    *   **Primary**: Passport Navy (`#15324E`) for headers, primary actions, and trusted-status accents.
    *   **Emergency Accent**: Solid Signal Red (`#C42B33`) for the SOS action only — flat, never a gradient.
    *   **Success Accent**: Trust Emerald (`#2E7D5B`) for "configured" status.
    *   **Neutrals**: Text ink `#2A2620`, muted label `#6B6256`, pending/disabled `#A89D8B`.
*   **Visual Elements**:
    *   **Flat fills only**: No `LinearGradient`, no `BackdropFilter`, no glassmorphism, no neon drop shadows.
    *   **Borders & radius**: 1px solid warm borders; corner radius 12px for tiles, 16px for the SOS block, 28px for the outer app frame. No rounded corners on single-sided borders.
    *   **Elevation**: At most one soft functional shadow on the SOS block; everything else is border-defined.
    *   **Icons**: Single-line outline icons (`Icons.*_outlined`), consistent 18–24px sizing.
*   **Typography**:
    *   Lao-first font stack: `Noto Sans Lao` (or `Phetsarath OT`) for Lao, with a clean humanist sans fallback.
    *   Large, legible sizes; two weights only (regular 400, medium 500). Sentence case, never ALL CAPS (except the word "SOS").
*   **Micro-Animations** (restrained and purposeful):
    *   A single slow pulse ring behind the SOS button (one ring, ~1.5s, low opacity) — calm, not alarming.
    *   Subtle 0.98 scale feedback on button tap.
    *   Gentle fade-in for status checkmarks and the passport preview.

---

## Proposed Changes

### Core & Custom Widgets

#### [NEW] [theme.dart](file:///c:/Users/ASUS/Claude/Projects/SafeZone/safezone/lib/theme.dart)
A central design-token file. Defines `AppColors` (the flat palette above) and an `AppTheme.light` `ThemeData` with the navy `ColorScheme`, off-white scaffold background, white card theme with 1px borders, input decoration theme, and text theme using the Lao-first font. Single source of truth for all colors and radii — no hard-coded hex in screens.

#### [NEW] [status_tile.dart](file:///c:/Users/ASUS/Claude/Projects/SafeZone/safezone/lib/widgets/status_tile.dart)
A reusable row widget for the Home dashboard: leading rounded icon chip, label, and a trailing status indicator — solid emerald check when configured, muted grey dashed circle when pending. Flat surfaces, no glow.

#### [NEW] [sos_button.dart](file:///c:/Users/ASUS/Claude/Projects/SafeZone/safezone/lib/widgets/sos_button.dart)
The hero emergency control: a large, solid Signal Red block/circle with a single slow pulse ring driven by an `AnimationController`. Big tap target, clear "SOS" label and helper text. Restrained motion — conveys "active and ready" without anxiety-inducing strobing.

#### [MODIFY] [primary_button.dart](file:///c:/Users/ASUS/Claude/Projects/SafeZone/safezone/lib/widgets/primary_button.dart)
Redesign `PrimaryButton` to use flat solid fills (navy for normal actions, Signal Red for emergency), a 1px border variant for secondary actions, 12px radius, and a subtle 0.98 tap-scale. Remove any gradient/glow.

#### [MODIFY] [main.dart](file:///c:/Users/ASUS/Claude/Projects/SafeZone/safezone/lib/main.dart)
Wire `AppTheme.light` from `theme.dart` into `MaterialApp.router`. Navy app bars with off-white foreground, light scaffold background, Material 3 enabled.

---

### Screens

#### [MODIFY] [home_screen.dart](file:///c:/Users/ASUS/Claude/Projects/SafeZone/safezone/lib/screens/home_screen.dart)
*   Navy header band with shield icon, app name, and a one-line Lao tagline.
*   Replace the status card with a white dashboard card using two `StatusTile`s (passport, trusted contact).
*   Two flat quick-action tiles ("ສະແກນພາສປອດ", "ເພີ່ມຄົນໄວ້ໃຈ").
*   Anchor the bottom with the solid red `SosButton` block.

#### [MODIFY] [passport_screen.dart](file:///c:/Users/ASUS/Claude/Projects/SafeZone/safezone/lib/screens/passport_screen.dart)
*   Display the passport image inside a clean white rounded container with a 1px border.
*   When empty, show a calm dashed "alignment frame" placeholder in navy/grey (no neon) to guide framing.
*   Flat camera / gallery action buttons; fade-in the preview on save.

#### [MODIFY] [contact_screen.dart](file:///c:/Users/ASUS/Claude/Projects/SafeZone/safezone/lib/screens/contact_screen.dart)
*   White text fields with 1px borders and a navy focused-border state (no glow).
*   Clear labels and hints; validation errors shown in Signal Red with a small inline icon.
*   Full-width navy save button.

#### [MODIFY] [sos_screen.dart](file:///c:/Users/ASUS/Claude/Projects/SafeZone/safezone/lib/screens/sos_screen.dart)
*   Use `SosButton` as the centered hero element.
*   Confirmation dialog: white, rounded, flat — navy "cancel" / red "send".
*   Loading: simple centered progress with a reassuring Lao status line.
*   Success: emerald check (fade-in) + a clean white "location card" showing the contact name and a tappable Google Maps URL.
*   Error states (no GPS / no contact / no passport): readable Signal Red message, no crash.

---

## Verification Plan

### Automated Tests
*   Run `flutter analyze` to verify no syntactic or semantic errors are introduced.
*   Run `flutter test` to ensure the existing widget/smoke test continues to pass.

### Manual Verification
*   Compile and preview on a mobile emulator/simulator and a real device.
*   Check text contrast and legibility against the off-white background in bright light.
*   Verify tap-scale feedback, the single SOS pulse ring runs smoothly, and status fade-ins feel calm.
*   Confirm performance is smooth on a low-end device (flat fills should render with no jank — a key reason for avoiding `BackdropFilter`).

### Accessibility
*   Minimum 44x44 tap targets on all actions, especially SOS.
*   Body text ≥ 16px; ensure WCAG AA contrast for text on navy and on white.
*   Provide semantic labels for icon-only controls.
