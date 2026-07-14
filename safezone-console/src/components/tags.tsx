import { Badge } from "@/components/ui/badge";
import { SEVERITY, STATUS, type SeverityKey, type StatusKey } from "@/lib/constants";
import { cn } from "@/lib/utils";

/**
 * Squared, flat, uppercase. No pills, no translucent low-contrast fills.
 * The Lao label is the primary signal; the English rides as a small-caps
 * annotation inside the same tag.
 */
export function SeverityBadge({ value, className }: { value: SeverityKey; className?: string }) {
  const s = SEVERITY[value];
  return (
    <Badge className={cn(s.badge, className)}>
      <span lang="lo" className="font-lao">
        {s.lo}
      </span>
      <span lang="en" className="opacity-70">
        {s.en}
      </span>
    </Badge>
  );
}

export function StatusBadge({ value, className }: { value: StatusKey; className?: string }) {
  const s = STATUS[value];
  return (
    <Badge className={cn(s.badge, className)}>
      <span lang="lo" className="font-lao">
        {s.lo}
      </span>
    </Badge>
  );
}
