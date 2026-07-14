import { Bilingual } from "@/components/bilingual";
import { ThemeToggle } from "@/components/theme-toggle";

/**
 * The top rule of the grid. Lao title at heading scale, English as the
 * small-caps annotation, hairline rule beneath. No backdrop blur — a header
 * that dissolves into the content is a header that stops holding the grid.
 */
export function PageHeader({
  lo,
  en,
  sub,
  actions,
}: {
  lo: string;
  en: string;
  sub?: string;
  actions?: React.ReactNode;
}) {
  return (
    <header className="sticky top-0 z-10 border-b border-border bg-background">
      <div className="flex items-end justify-between gap-4 px-6 py-5">
        <div>
          <Bilingual lo={lo} en={en} loClassName="text-xl font-semibold tracking-tightest" />
          {sub && (
            <p lang="lo" className="mt-1 font-lao text-xs leading-lao text-muted-foreground">
              {sub}
            </p>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {actions}
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
