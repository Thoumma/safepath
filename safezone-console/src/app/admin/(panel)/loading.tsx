/**
 * Route-group Suspense boundary: the sidebar stays put and the content pane
 * swaps to this skeleton the moment a tab is clicked, instead of freezing on
 * the previous page until the server render (auth + queries) completes.
 */
export default function Loading() {
  return (
    <div aria-busy="true" aria-live="polite">
      {/* PageHeader silhouette */}
      <div className="border-b border-border px-6 py-5">
        <div className="h-6 w-40 animate-pulse rounded-sm bg-muted" />
        <div className="mt-2 h-3 w-64 animate-pulse rounded-sm bg-muted" />
      </div>

      <div className="space-y-8 p-6">
        <section className="grid gap-6 sm:grid-cols-2 lg:grid-cols-5">
          <div className="h-28 animate-pulse rounded-sm border border-border bg-muted lg:col-span-2" />
          <div className="h-28 animate-pulse rounded-sm border border-border bg-muted" />
          <div className="h-28 animate-pulse rounded-sm border border-border bg-muted" />
          <div className="h-28 animate-pulse rounded-sm border border-border bg-muted" />
        </section>

        <section className="space-y-px">
          <div className="h-14 animate-pulse rounded-sm border border-border bg-muted" />
          <div className="h-14 animate-pulse rounded-sm border border-border bg-muted" />
          <div className="h-14 animate-pulse rounded-sm border border-border bg-muted" />
          <div className="h-14 animate-pulse rounded-sm border border-border bg-muted" />
        </section>

        <section>
          <div className="h-96 animate-pulse rounded-sm border border-border bg-muted" />
        </section>
      </div>
    </div>
  );
}
