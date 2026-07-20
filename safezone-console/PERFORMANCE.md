# Console performance notes

Measured 2026-07-20 against the live deployment (safepath.ywei.online).

## The one number that mattered

```
X-Vercel-Id: sin1::iad1::…
DATABASE_URL: aws-0-ap-southeast-2.pooler.supabase.com
```

The serverless functions were running in **iad1 (Washington DC)** while the
Supabase database and auth live in **ap-southeast-2 (Sydney)**, and the users
are in **Laos**. Every Prisma query and every `supabase.auth.getUser()` call
crossed the Pacific and came back — roughly **200 ms per round trip** — and an
admin page makes several of them in sequence.

Before: home TTFB **4.1 s** cold, **1.5–1.8 s** warm. Nothing cached
(`Cache-Control: private, no-store`, `X-Vercel-Cache: MISS`).

## What was changed

1. **`vercel.json` → `regions: ["syd1"]`** — put the compute next to the data.
   This is the single biggest win: it removes a trans-Pacific round trip from
   *every* query, not just one. Sydney beats Singapore here because these pages
   are query-heavy: several sequential DB hops cost more than the one extra hop
   to the browser.

2. **The public site is cached again.** `(public)/layout.tsx` was
   `force-dynamic` solely to read one donation setting, which forced the whole
   public website (Home / About / Contact / Report) to render per request and
   defeated the CDN. It is now ISR (`revalidate`), so Lao visitors are served
   from the Singapore edge instead of a US function. Staff toggling donations
   still takes effect immediately — the settings action calls `revalidatePath`.

3. **One auth round trip per admin request instead of two.** The middleware
   called `supabase.auth.getUser()` (a network call to Sydney) and then
   `requireStaff()` did it again on the page. The middleware is now optimistic:
   it checks for the session cookie and lets `requireStaff()` — which every
   page *and* every server action already calls — do the real verification.
   Same security outcome, one less Pacific crossing.

4. **Firebase is lazy.** `lib/firebase.ts` statically imported
   `firebase/app` + `firebase/analytics`, and `<FirebaseAnalytics />` sits in
   the root layout, so that bundle shipped on every route including the public
   site. The imports now happen inside the async function, after mount, so
   analytics is a lazily-fetched chunk rather than part of first load.

5. **Smaller map payloads.** `/admin/map` could serialize ~7,600 breadcrumb
   rows into the client (400 per open case, 720 per journey) on a page that
   re-renders every 15 s. Capped at 120 points per trail — past roughly 100 a
   polyline gains no visible detail — and narrowed with `select` to the three
   columns the map actually draws with.

### Considered and rejected

**Making the middleware auth check optimistic** (cookie presence only, leaving
verification to `requireStaff()`). It removes a second `getUser()` round trip
and is safe on its own terms — every admin page *and* every server action
calls `requireStaff()` independently, so a forged cookie still gets bounced.
But the middleware's `getUser()` is also what **refreshes the session**, and
only `/admin/inbox` mounts a browser Supabase client that could refresh
instead. Dropping it would sign staff out roughly hourly. After the region
change that call costs ~10 ms rather than ~200 ms, so the saving no longer
justifies the regression.

## Verification

`next build` after the change reports `/`, `/about`, `/contact`, `/report`,
`/data` and `/donate` as `○ (Static)` — previously all `ƒ (Dynamic)` — and
emits real prerendered HTML for each. Firebase now lands in its own lazy
chunks, leaving the root layout chunk at ~4 kB.

**The region change only takes effect on the next deploy**, and the public-page
speedup only after the CDN has a prerendered copy. Re-measure with:

```bash
curl -s -o /dev/null -w "TTFB=%{time_starttransfer}s\n" https://safepath.ywei.online/
curl -sI https://safepath.ywei.online/ | grep -iE "x-vercel-cache|x-vercel-id"
```

Expect `X-Vercel-Cache: HIT` and an `X-Vercel-Id` whose second segment is
`syd1` rather than `iad1`.

## Still worth doing

- **Check the Vercel plan supports `regions`.** On Hobby a single region is
  allowed; if the deploy rejects it, delete `vercel.json` and set the region in
  the Vercel dashboard instead (Project → Settings → Functions → Region).
- `/admin/map` and `/admin/inbox` poll every 15 s. That is a full RSC re-render
  per tick. If it shows up in usage, move those two to a lightweight JSON route
  and patch the client state instead of re-rendering the page.
- Consider Prisma Accelerate or a connection pooler closer to the functions if
  the region change is ever reverted.
