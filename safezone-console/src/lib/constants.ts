// Lao-first labels + the single choke point for severity/status styling.
//
// Swiss rule: color is information, never decoration. Loudness maps to
// urgency — a CRITICAL case is solid red, a RESOLVED case is a quiet outline.
// Every signal carries a text label AND a rule weight, so severity survives
// colorblindness (see DESIGN_BRIEF.md → Accessibility).
//
// `badge` values are solid fills, all contrast-checked ≥4.5:1 against their
// own foreground. Never paint text with the surface value (`bg-high` ink on
// paper is the classic AA failure).

export const SEVERITY = {
  CRITICAL: {
    lo: "ດ່ວນ",
    en: "Critical",
    badge: "bg-critical text-critical-foreground",
    bar: "border-l-bar border-l-critical",
    ink: "text-critical-ink",
    dot: "bg-critical",
  },
  HIGH: {
    lo: "ສູງ",
    en: "High",
    badge: "bg-high text-high-foreground",
    bar: "border-l-bar border-l-high",
    ink: "text-high-ink",
    dot: "bg-high",
  },
  MEDIUM: {
    lo: "ກາງ",
    en: "Medium",
    badge: "bg-medium text-medium-foreground",
    bar: "border-l-rule border-l-medium",
    ink: "text-medium-ink",
    dot: "bg-medium",
  },
  LOW: {
    lo: "ຕ່ຳ",
    en: "Low",
    badge: "bg-muted text-muted-foreground border border-border",
    bar: "border-l-hair border-l-border",
    ink: "text-low-ink",
    dot: "bg-low",
  },
} as const;

export const STATUS = {
  NEW: {
    lo: "ໃໝ່",
    en: "New",
    badge: "bg-critical text-critical-foreground",
    ink: "text-critical-ink",
  },
  IN_PROGRESS: {
    lo: "ກຳລັງ ຊ່ວຍ",
    en: "In progress",
    badge: "bg-high text-high-foreground",
    ink: "text-high-ink",
  },
  RESOLVED: {
    lo: "ແກ້ໄຂ ແລ້ວ",
    en: "Resolved",
    // Quiet by design. A resolved case has no claim on the officer's eye.
    badge: "border border-success text-success-ink bg-transparent",
    ink: "text-success-ink",
  },
} as const;

export const PARTNER = {
  EMBASSY: { lo: "ສະຖານທູດ", en: "Embassy" },
  VFI: { lo: "VFI", en: "VFI" },
  SAFEPATH: { lo: "SafePath", en: "SafePath" },
} as const;

/** KYC verdicts follow the same loudness rule: the state demanding staff
 *  attention (PENDING) is the loud one; a settled VERIFIED is quiet. */
export const KYC = {
  PENDING: {
    lo: "ລໍຖ້າ ກວດສອບ",
    en: "Pending",
    badge: "bg-high text-high-foreground",
  },
  VERIFIED: {
    lo: "ຢືນຢັນ ແລ້ວ",
    en: "Verified",
    badge: "border border-success text-success-ink bg-transparent",
  },
  REJECTED: {
    lo: "ປະຕິເສດ",
    en: "Rejected",
    badge: "bg-critical text-critical-foreground",
  },
} as const;

export type NavItem = {
  href: string;
  lo: string;
  en: string;
  icon: "LayoutDashboard" | "Siren" | "Users" | "BarChart3" | "ShieldCheck" | "ScrollText" | "Settings";
  /** Embassy-only surface: hidden from PARTNER staff. */
  staffOnly?: boolean;
};

export const NAV: readonly NavItem[] = [
  { href: "/dashboard", lo: "ພາບລວມ", en: "Dashboard", icon: "LayoutDashboard" },
  { href: "/inbox", lo: "ສາຍ SOS", en: "SOS Inbox", icon: "Siren" },
  { href: "/citizens", lo: "ພົນລະເມືອງ", en: "Citizens", icon: "Users" },
  { href: "/kyc", lo: "ຢືນຢັນ ຕົວຕົນ", en: "KYC", icon: "ShieldCheck", staffOnly: true },
  { href: "/logs", lo: "ບັນທຶກ ລະບົບ", en: "Activity Log", icon: "ScrollText" },
  { href: "/reports", lo: "ລາຍງານ", en: "Reports", icon: "BarChart3" },
  // Not staffOnly: every role gets account self-service; the page itself
  // hides the system-integration section from PARTNER accounts.
  { href: "/settings", lo: "ຕັ້ງຄ່າ", en: "Settings", icon: "Settings" },
];

/** Categorical chart colors. Drawn from the semantic set only — a chart may
 *  not introduce a hue the rest of the console does not already mean. */
export const CHART = {
  critical: "hsl(var(--critical))",
  high: "hsl(var(--high))",
  medium: "hsl(var(--medium))",
  success: "hsl(var(--success))",
  low: "hsl(var(--low))",
  grid: "hsl(var(--border))",
  axis: "hsl(var(--muted-foreground))",
  surface: "hsl(var(--card))",
  ink: "hsl(var(--foreground))",
} as const;

export const CHART_SERIES = [CHART.critical, CHART.medium, CHART.high, CHART.success, CHART.low];

export type SeverityKey = keyof typeof SEVERITY;
export type StatusKey = keyof typeof STATUS;
export type PartnerKey = keyof typeof PARTNER;
export type KycKey = keyof typeof KYC;
