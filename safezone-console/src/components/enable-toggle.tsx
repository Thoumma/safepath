import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

/**
 * An on/off setting whose state is readable without decoding a checkbox.
 *
 * A bare checkbox states "checked", which is not the same as telling a duty
 * officer *this integration is live*. So the state is spelled out in a colored
 * pill next to it — green ເປີດ / ON, quiet grey ປິດ / OFF — following the same
 * loudness rule as the rest of the console: color carries information.
 *
 * The pill flips instantly with the checkbox through Tailwind's `peer`
 * variants, i.e. pure CSS. That keeps this a server component: no client
 * bundle, no state, and it still works inside a plain server-action <form>.
 */
export function EnableToggle({
  id,
  name = "enabled",
  defaultChecked,
  lo,
  en,
  hint,
}: {
  id: string;
  name?: string;
  defaultChecked: boolean;
  lo: string;
  en?: string;
  hint?: string;
}) {
  return (
    <div>
      <div className="flex flex-wrap items-center gap-2.5">
        <input
          id={id}
          name={name}
          type="checkbox"
          defaultChecked={defaultChecked}
          // `peer` drives the two pills below; accent-success so the control
          // itself is green when live, not the neutral navy of every other box.
          className="peer size-4 accent-success"
        />
        <Label htmlFor={id}>
          <span lang="lo" className="font-lao leading-lao">
            {lo}
          </span>
        </Label>

        {/* Exactly one of these is ever visible. */}
        <StatePill
          className="hidden bg-success text-success-foreground peer-checked:inline-flex"
          lo="ເປີດ"
          en="ON"
        />
        <StatePill
          className="inline-flex border border-border bg-muted text-muted-foreground peer-checked:hidden"
          lo="ປິດ"
          en="OFF"
        />
      </div>

      {hint && (
        <p lang="lo" className="mt-1.5 font-lao text-xs leading-lao text-muted-foreground">
          {hint}
        </p>
      )}
      {en && <span className="sr-only">{en}</span>}
    </div>
  );
}

function StatePill({ className, lo, en }: { className: string; lo: string; en: string }) {
  return (
    <span
      className={cn(
        "items-center gap-1 rounded-sm px-2 py-0.5 text-2xs font-bold uppercase tracking-wider",
        className
      )}
    >
      <span lang="lo" className="font-lao">
        {lo}
      </span>
      <span className="font-mono opacity-80">{en}</span>
    </span>
  );
}
