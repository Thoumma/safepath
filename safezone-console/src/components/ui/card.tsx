import * as React from "react";
import { Bilingual } from "@/components/bilingual";
import { cn } from "@/lib/utils";

/**
 * A panel, not a card. Hairline rule, 2px corners, no shadow — Swiss builds
 * depth with rules and alignment, and the soft-shadowed rounded card was the
 * loudest generic-SaaS tell in the old console.
 */
const Card = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn("rounded-sm border border-border bg-card text-card-foreground", className)}
      {...props}
    />
  )
);
Card.displayName = "Card";

const CardHeader = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("border-b border-border px-4 py-3", className)} {...props} />
  )
);
CardHeader.displayName = "CardHeader";

const CardTitle = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("flex items-center gap-2 text-sm font-semibold", className)} {...props} />
  )
);
CardTitle.displayName = "CardTitle";

const CardContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => <div ref={ref} className={cn("p-4", className)} {...props} />
);
CardContent.displayName = "CardContent";

/** Panel header carrying the bilingual pair. Replaces the `lo · en` strings. */
function PanelTitle({ lo, en }: { lo: string; en: string }) {
  return (
    <CardHeader>
      <Bilingual lo={lo} en={en} loClassName="text-sm font-semibold" />
    </CardHeader>
  );
}

export { Card, CardHeader, CardTitle, CardContent, PanelTitle };
