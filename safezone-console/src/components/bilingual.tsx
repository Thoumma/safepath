import { cn } from "@/lib/utils";

/**
 * The signature device of the system.
 *
 * Lao carries the meaning at full size; English rides beneath it as a small,
 * letterspaced, uppercase annotation. This is the Swiss subhead, and it turns
 * the bilingual requirement into the typographic system instead of two
 * languages competing at the same weight.
 *
 * `lang` is set on each span so a screen reader does not read English through
 * a Lao voice.
 */
export function Bilingual({
  lo,
  en,
  className,
  loClassName,
}: {
  lo: string;
  en?: string;
  className?: string;
  loClassName?: string;
}) {
  return (
    <span className={cn("flex flex-col", className)}>
      <span lang="lo" className={cn("font-lao leading-lao", loClassName)}>
        {lo}
      </span>
      {en && (
        <span lang="en" className="annotation">
          {en}
        </span>
      )}
    </span>
  );
}

/** Standalone small-caps English annotation. */
export function Annotation({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <span lang="en" className={cn("annotation", className)}>
      {children}
    </span>
  );
}

/** Uppercase eyebrow label — sits above a display numeral. */
export function Eyebrow({ children, className }: { children: React.ReactNode; className?: string }) {
  return <span className={cn("label-eyebrow", className)}>{children}</span>;
}
