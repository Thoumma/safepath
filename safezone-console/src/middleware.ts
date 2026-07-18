import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/** @supabase/ssr types `cookies` as a union, so `setAll` gets no contextual
 *  parameter type. Annotate it or the whole callback degrades to `any`. */
type CookieToSet = { name: string; value: string; options?: CookieOptions };

/**
 * Only the `/admin` staff area needs a cookie session. Everything else is
 * public by design:
 *  - the public report website (`/`, `/about`, `/contact`, `/report`) — a
 *    bystander must be able to report trafficking with no account;
 *  - `/api/report` — the public intake for those reports;
 *  - `/api/sos` and `/api/me/*` — called by the mobile app, which has no browser
 *    cookie; it authenticates with a Supabase bearer token carrying a verified
 *    phone claim (see `lib/app-auth.ts`).
 *
 * So we invert the old default-deny: gate `/admin` (except its login page) and
 * skip the Supabase round-trip entirely for public traffic.
 */
const ADMIN_LOGIN = "/admin/login";

export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;
  const inAdmin = path === "/admin" || path.startsWith("/admin/");
  if (!inAdmin) return NextResponse.next();

  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: CookieToSet[]) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isLogin = path === ADMIN_LOGIN;

  if (!user && !isLogin) {
    const url = request.nextUrl.clone();
    url.pathname = ADMIN_LOGIN;
    return NextResponse.redirect(url);
  }
  if (user && isLogin) {
    const url = request.nextUrl.clone();
    url.pathname = "/admin";
    return NextResponse.redirect(url);
  }
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
