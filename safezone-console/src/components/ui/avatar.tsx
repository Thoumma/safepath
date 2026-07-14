import * as React from "react";
import { cn } from "@/lib/utils";

/** Squared initials block. A circle is a decorative choice; this is a label. */
export function Avatar({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      aria-hidden
      className={cn(
        "grid size-10 shrink-0 place-items-center rounded-sm border border-border bg-muted",
        "text-sm font-bold uppercase text-foreground",
        className
      )}
    >
      {children}
    </div>
  );
}
