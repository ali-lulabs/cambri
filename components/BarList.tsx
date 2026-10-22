import Link from "next/link";

export type BarItem = { label: string; value: number; href?: string; hint?: string };

/**
 * Single-series horizontal bars (magnitude). One hue, values printed at the end,
 * so the list doubles as its own table. Hover shows the exact share.
 */
export function BarList({ items, unit = "tickets" }: { items: BarItem[]; unit?: string }) {
  const max = Math.max(1, ...items.map((i) => i.value));
  const total = items.reduce((a, b) => a + b.value, 0);
  return (
    <ul className="space-y-2.5">
      {items.map((item) => {
        const pct = (item.value / max) * 100;
        const share = total ? Math.round((item.value / total) * 100) : 0;
        const label = (
          <span className="truncate text-sm text-slate-700 group-hover:text-slate-900">{item.label}</span>
        );
        return (
          <li key={item.label} className="group relative">
            <div className="mb-1 flex items-baseline justify-between gap-3">
              {item.href ? (
                <Link href={item.href} className="min-w-0 truncate hover:underline">
                  {label}
                </Link>
              ) : (
                label
              )}
              <span className="text-sm font-medium tabular-nums text-slate-900">{item.value}</span>
            </div>
            <div className="h-2 rounded-full bg-slate-100">
              <div
                className="h-2 rounded-full bg-brand-600 transition-[width] group-hover:bg-brand-700"
                style={{ width: `${item.value ? Math.max(pct, 2) : 0}%` }}
              />
            </div>
            <span
              role="tooltip"
              className="pointer-events-none absolute -top-8 right-0 z-10 hidden whitespace-nowrap rounded-md bg-slate-900 px-2 py-1 text-xs text-white shadow group-hover:block"
            >
              {item.value} {unit} · {share}% of total{item.hint ? ` · ${item.hint}` : ""}
            </span>
          </li>
        );
      })}
    </ul>
  );
}
