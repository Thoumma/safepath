import { Shield } from "lucide-react";
import { LoginForm } from "./login-form";

/**
 * The first screen anyone sees — including judges. A centered rounded card on
 * an empty background is the single most generic layout in software, so this
 * is an asymmetric Swiss composition instead: a navy field carrying the mark
 * and the type, and the form sitting on the paper ground beside it.
 *
 * A Server Component: credentials are handled by a Server Action (see
 * ./actions.ts), so only <LoginForm> ships to the browser.
 */
export default function LoginPage() {
  return (
    <main className="grid min-h-screen lg:grid-cols-[1.1fr_1fr]">
      {/* Left: the field. Type is the composition — no illustration, no
          gradient, no hero image. */}
      <div className="relative flex flex-col justify-between bg-primary p-8 text-primary-foreground lg:p-12">
        <div className="flex items-center gap-2.5">
          <span className="grid size-8 place-items-center border border-primary-foreground/30">
            <Shield aria-hidden className="size-4" />
          </span>
          <span className="text-base font-bold tracking-tightest">SafeZone</span>
        </div>

        <div className="py-12">
          <h1 lang="lo" className="font-lao text-3xl font-bold leading-snug lg:text-4xl">
            ສູນ ຕອບໂຕ້ ເຫດ ສຸກເສີນ
          </h1>
          <p lang="en" className="mt-3 text-2xs font-semibold uppercase tracking-wider text-primary-foreground/70">
            Response Console
          </p>
          <p lang="lo" className="mt-6 max-w-sm font-lao text-sm leading-lao text-primary-foreground/80">
            ຊ່ວຍ ນັກທ່ອງທ່ຽວ ລາວ ທີ່ ຢູ່ ຕ່າງປະເທດ — ສະຖານທູດ · VFI · SafePath
          </p>
        </div>

        {/* A rule, and the partners. Structure, not ornament. */}
        <div className="border-t border-primary-foreground/20 pt-4">
          <span lang="en" className="text-2xs font-semibold uppercase tracking-wider text-primary-foreground/60">
            Lao Embassy · Bangkok
          </span>
        </div>
      </div>

      {/* Right: the form on the paper ground. */}
      <div className="flex items-center bg-background p-8 lg:p-12">
        <div className="w-full max-w-sm">
          <h2 lang="lo" className="font-lao text-lg font-semibold leading-lao">
            ເຂົ້າ ສູ່ ລະບົບ
          </h2>
          <p lang="en" className="annotation">
            Staff sign in
          </p>

          <LoginForm />

          <p lang="lo" className="mt-6 font-lao text-xs leading-lao text-muted-foreground">
            ສ້າງ ຜູ້ໃຊ້ ໃນ Supabase → Authentication ກ່ອນ ເຂົ້າສູ່ລະບົບ
          </p>
        </div>
      </div>
    </main>
  );
}
