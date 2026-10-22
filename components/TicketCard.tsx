import Link from "next/link";
import type { TicketListRow } from "@/lib/tickets/queries";
import { timeAgo } from "@/lib/format";
import { StatusBadge } from "./StatusBadge";
import { ChargeBadge } from "./ChargeBadge";

/** Compact ticket row for phone screens. */
export function TicketCard({ t, href }: { t: TicketListRow; href: string }) {
  return (
    <Link
      href={href}
      className="block rounded-xl bg-white p-4 ring-1 ring-slate-200 transition hover:ring-brand-200 active:bg-slate-50"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-mono text-xs text-slate-500">{t.ticket_no}</p>
          <p className="mt-0.5 truncate font-medium text-slate-900">{t.product?.name}</p>
          <p className="truncate text-sm text-slate-500">S/N {t.serial_no}</p>
        </div>
        <StatusBadge status={t.status} />
      </div>
      <div className="mt-3 flex items-center justify-between gap-2">
        <p className="text-xs text-slate-400">Updated {timeAgo(t.updated_at)}</p>
        <ChargeBadge {...t} />
      </div>
    </Link>
  );
}
