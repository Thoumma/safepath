# Design Brief: SafeZone Response Console

## Problem

A Lao traveller in Bangkok has pressed SOS. Somewhere on the other end, a duty officer at the Lao Embassy — or a caseworker at VFI or SafePath — has a browser tab open. That officer is not a power user. They may be on shift at 2am, they may be handling three cases at once, and the thing they need to know in the first two seconds is: **is anyone dying, and where are they?**

The current console answers that question, but it makes the officer work for it. Every case row looks like every other case row. The severity of a case is carried by a 4px colored border and a pill badge that sits at the same visual weight as the citizen's name, the timestamp, and a chevron. Emoji stand in for an icon system (🚨 📁 ⏱️ ✅). Numbers that matter — the count of new SOS cases — render at the same size as the label above them. Nothing in the layout tells the eye where to land first, so the officer has to read the whole screen to triage it.

The human friction is this: **in an emergency the interface makes you read, when it should make you see.**

## Solution

A console where the visual system *is* the triage. A critical case does not merely carry a red badge; it occupies the screen differently — heavier rule, larger type, higher position, red used at a scale nothing else is allowed to use. A resolved case recedes. The officer's eye is pulled down a strict grid from most urgent to least, and the number that matters most on the page is the largest thing on it.

Color is never decorative. Red appears in exactly one circumstance: something is wrong right now. If red is on the screen, someone needs help.

## Experience Principles

1. **Severity over symmetry** — A dashboard where every card is the same size is a dashboard that has no opinion. Hierarchy is allocated by urgency, not by grid convenience. The "new SOS" count is not one of four equal stat cards; it is the headline.
2. **Color is information, never decoration** — Red is reserved for active emergency. Amber for in-progress. Emerald for resolved. Navy is structure. Nothing in the UI is colored to look nice, so when color appears it *means* something. This is the rule that makes the console readable at a glance and it is the first rule an "AI-styled" UI breaks.
3. **The grid holds under pressure** — Rules, alignment, and a fixed spatial module do the work that shadows and rounded cards currently pretend to do. A structure the officer can trust at 2am beats a structure that looks pleasant at 2pm.

## Aesthetic Direction

- **Philosophy**: **Swiss / International Typographic.** Rigid grid, dramatic scale contrast, rules (horizontal lines) as structural elements, flatness, high contrast. No gradients. No shadows. No decorative rounding. Chosen because an emergency operations console has the same job as Swiss signage: convey critical information to a stressed reader with zero ambiguity.
- **Tone**: Authoritative, clinical, calm under load. Institutional in the way a control room is institutional — this is a government/NGO life-safety tool, not a SaaS product.
- **Reference points**: Swiss rail and airport signage (Frutiger/Univers wayfinding); Bloomberg Terminal's information density and tabular discipline; Linear's restraint in chrome and its refusal to decorate; NASA/mission-control status boards where one number dominates.
- **Anti-references**: The generic AI dashboard — purple/indigo gradients, Inter, evenly-sized rounded cards with soft drop shadows, emoji as iconography, every metric given equal visual weight. Also: consumer-app friendliness. This console should not feel warm, playful, or "approachable." Also: dark-glassmorphism "cyber ops" cosplay — the seriousness is real, not aesthetic.

## Existing Patterns

The console is built and these are the starting vocabulary. The brief **extends** them; it does not restart.

- **Typography**: `Noto_Sans_Lao` via `next/font/google`, loaded as `--font-noto-lao` and used for everything, Latin included. There is no display font, no mono, and no type ramp — sizes are ad-hoc Tailwind utilities (`text-lg`, `text-xs`, `text-[11px]`, `text-[10px]`).
- **Colors**: A real palette already exists in `globals.css` as shadcn-style HSL triplets and it is good: paper `#F6F4EF`, navy `#15324E`, signal red `#C42B33`, trust emerald `#2E7D5B`, border `#E2DDD3`. It mirrors the Flutter app's theme. **No dark mode.** Amber (`amber-500`) leaks in raw from Tailwind in `constants.ts` rather than being a token.
- **Spacing**: No scale. Ad-hoc: `p-6`, `p-4`, `p-3`, `space-y-5`, `space-y-2.5`, `gap-2.5`. `--radius: 0.75rem` (12px) — too round for Swiss.
- **Components**: `ui/` has hand-rolled lean versions of shadcn primitives (button with cva variants incl. a custom `success`, card, badge, input, label, table, textarea, avatar, separator). Domain components: `app-sidebar`, `page-header`, `stat-card`, `case-row`, `case-actions`, `realtime-inbox`, `reports-charts`, `tags`. Icons are `lucide-react` — already correct, just used inconsistently alongside emoji.
- **Content model**: `constants.ts` holds Lao-first `SEVERITY` / `STATUS` / `PARTNER` / `NAV` maps with the Tailwind classes baked in. This is the right place to enforce the color-is-information rule — it is the single choke point for severity styling.
- **Charts**: `recharts` (reports page). Must be brought into the token system; default recharts colors are a classic generic-AI tell.

## Bilingual System (decided)

Lao is the primary language; English is the annotation. Instead of inline dual strings (`"ພາບລວມ · Dashboard"`), the pairing becomes typographic:

- **Lao** — full size, primary weight, `--font-lao`.
- **English** — one step down, uppercase, letterspaced (`--tracking-wide`), muted color. This is the classic Swiss all-caps subhead, and it turns a localization constraint into the signature device of the system.

This requires splitting the dual strings in `constants.ts` (they are already stored as separate `lo` / `en` keys — the components just concatenate them, so this is a component-level change, not a data change).

## Component Inventory

| Component | Status | Notes |
| --- | --- | --- |
| Design tokens (`globals.css`) | **Modify** | Extend the existing palette into a full system: type ramp, spacing scale, motion, elevation-by-rule, plus a **cool-slate** dark palette (the `frontend-design` skill assigns cool grounds to Swiss; warm charcoal is the Scandinavian option). Promote amber to a token. Drop radius toward 0–4px. |
| `tailwind.config.ts` | **Modify** | Wire new token families (fonts, tracking, tabular numerals, spacing) into `theme.extend`. Remove the accordion keyframes if unused; keep `pulse-ring` for live SOS. |
| Font loading (`layout.tsx`) | **Modify** | Add a grotesque display/UI face for Latin + numerals, and a mono for refs/timestamps/coordinates. Noto Sans Lao stays as the Lao face. |
| `Bilingual` label | **New** | One primitive that renders Lao + small-caps English. Replaces every `"lo · en"` concatenation. |
| `PageHeader` | **Modify** | Becomes the top rule of the grid: Lao title at display scale, English small-caps, hairline rule beneath, dark-mode toggle mounted here. |
| `StatCard` → `StatBlock` | **Modify** | De-card it. Swiss: no border box, no shadow — a hairline rule, a small-caps label, and a very large tabular number. The New-SOS block gets a dominant size class the others cannot use. |
| `CaseRow` | **Modify** | The core triage object. Severity becomes a heavy left rule + type weight, not a pastel pill. Tabular timestamps and ref numbers in mono. Resolved cases desaturate rather than just dropping opacity. |
| `SeverityBadge` / `StatusBadge` | **Modify** | Squared, flat, uppercase, letterspaced. No `rounded-full` pills, no translucent `/15` fills at low contrast — must hit WCAG AA. |
| `AppSidebar` | **Modify** | Rules instead of rounded active pills. Active state = filled navy block with a hard edge. The inbox count badge is the one place a number may be red in the chrome. |
| `Card` | **Modify** | Radius toward 2px, hairline border, no shadow — or dissolved entirely into ruled sections where a box adds nothing. |
| `Button` | **Modify** | Squared corners, tighter radius, uppercase small-caps on primary actions. Keep the cva variant API as-is (incl. `success`). |
| `ThemeToggle` | **New** | Sets `[data-theme]`, persists to localStorage, honors `prefers-color-scheme`. |
| `reports-charts` | **Modify** | Recharts restyled to tokens: flat bars, hairline axes, no default palette, tabular figures, categorical colors drawn from the semantic set only. |
| `login` page | **Modify** | Currently a centered rounded card — the most generic screen in the app. Rebuild as an asymmetric Swiss composition. First impression for judges. |
| Empty states | **Modify** | `"ບໍ່ມີ ເຄສ ດ່ວນ ໃນ ຂະນະ ນີ້ 🎉"` — the party emoji goes. An empty SOS queue is a *good* state and should be stated calmly, not celebrated. |

## Key Interactions

- **A new SOS arrives** (`realtime-inbox`, Supabase realtime) — the row enters at the top of the queue. The existing `pulse-ring` animation is the right instinct but must be reserved: it fires **only** for `CRITICAL`, and it stops once the case leaves `NEW`. A permanently pulsing UI is noise, and noise in an emergency console is a defect.
- **Triage scan** — the officer's eye enters at the New-SOS number (largest element), moves down the ruled queue in severity order. No hover-hunting required to establish urgency; severity is legible in the static state.
- **Case row hover/focus** — a hard edge shift, not a soft lift. No shadow bloom, no scale transform. Focus-visible must be a real, high-contrast ring — this is keyboard-operable software.
- **Status change** (`case-actions`) — the row's color state changes immediately and the change is the feedback. Red → amber → emerald is a state machine the officer can read from across the room.
- **Theme toggle** — instant swap via CSS variables. No transition on color (a fading dashboard reads as a broken dashboard).

## Responsive Behavior

Mobile-first per the skill, but honest about the use case: this is a desk tool, and the mobile case is a duty officer checking the queue on a phone.

- **375px** — single column. Sidebar collapses to a bottom tab bar or drawer (44px minimum touch targets). Stat blocks stack, New-SOS stays dominant. Case rows drop the chevron and ref column; severity rule, name, location, and elapsed time survive.
- **768px** — two-column stat row; sidebar becomes an icon rail.
- **1280px+** — full grid: persistent 224px sidebar, four-column stat row with the New-SOS block spanning wider than its siblings (grid asymmetry is Swiss, not a bug).
- Body text never below 16px on mobile. Line lengths held to 45–75ch — mostly moot here since this is tabular, not prose.

## Accessibility Requirements

- **Contrast**: WCAG AA minimum (4.5:1 body, 3:1 large text and UI boundaries) in **both** themes. The current translucent badge fills (`bg-destructive/15 text-destructive`) and `text-amber-700` on paper are the likely failures and must be re-derived, not eyeballed.
- **Color is never the sole channel** for severity — every severity carries a text label (already true via the Lao/English badges) *and* a distinct rule weight. An officer with deuteranopia must be able to triage this screen.
- **Keyboard**: full tab traversal of the queue; case rows are already `<Link>`s, so semantics are sound. Visible `:focus-visible` ring at 3:1 against both surfaces.
- **Motion**: `prefers-reduced-motion` disables `pulse-ring` entirely and swaps it for a static high-contrast marker. A pulsing element is a genuine problem for vestibular and photosensitive users, and this one pulses next to the word "emergency."
- **Screen reader**: the New-SOS count needs `aria-live="polite"` so an arriving case is announced, not just animated.
- `lang="lo"` is set on `<html>`; English annotation spans should carry `lang="en"` so a screen reader doesn't read English through a Lao voice.

## Out of Scope

- Backend, Prisma schema, Supabase auth/RLS, seeding, migrations. **No `npm install`, no `db:push`, no Supabase calls** — the environment can't reach them and the user is running those separately.
- The Flutter app (`safezone/`). It is phase two: the token system defined here gets ported into `theme.dart` after the console lands.
- The static `response-console/index.html` prototype at the repo root.
- New features, new routes, new data. This is a redesign of what exists. If a screen is missing, the brief does not invent it.
- Copywriting. Lao strings stay as they are except where a string is itself the design defect (the emoji).
