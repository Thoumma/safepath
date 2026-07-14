import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";

/** @supabase/ssr types `cookies` as a union, so `setAll` gets no contextual
 *  parameter type. Annotate it or the whole callback degrades to `any`. */
type CookieToSet = { name: string; value: string; options?: CookieOptions };

/** Supabase client for Server Components / Route Handlers (reads the session). */
export function createClient() {
  const cookieStore = cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet: CookieToSet[]) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
          } catch {
            // called from a Server Component — safe to ignore, middleware refreshes.
          }
        },
      },
    }
  );
}
