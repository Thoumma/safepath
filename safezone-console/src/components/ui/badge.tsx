import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Swiss tag: squared (2px), flat, uppercase, letterspaced. The old
 * `rounded-full` pill with a `/15` translucent fill read as decoration and
 * failed contrast; a tag here is a label, and labels are legible.
 */
export function Badge({ className, ...props }: React.HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-sm px-1.5 py-0.5",
        "text-2xs font-semibold uppercase leading-none tracking-wide",
        className
      )}
      {...props}
    />
  );
}
