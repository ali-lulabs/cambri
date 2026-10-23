/** Placeholder shown instantly while a page's data loads. */
export function PageSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="animate-pulse" aria-busy="true" aria-label="Loading">
      <div className="mb-2 h-7 w-48 rounded-md bg-slate-200" />
      <div className="mb-6 h-4 w-72 max-w-full rounded bg-slate-200/70" />
      <div className="space-y-2.5">
        {Array.from({ length: rows }, (_, i) => (
          <div key={i} className="h-16 rounded-xl bg-white ring-1 ring-slate-200" />
        ))}
      </div>
    </div>
  );
}
