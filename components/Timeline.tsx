import { EVENT_LABEL, STATUS_TONE } from "@/lib/tickets/status";
import { fmtDateTime } from "@/lib/format";
import type { TicketEvent } from "@/lib/types";
import { ROLE_LABEL } from "@/lib/roles";
import { cn } from "./ui";

const DOT: Record<string, string> = {
  amber: "bg-amber-500",
  blue: "bg-blue-500",
  violet: "bg-violet-500",
  teal: "bg-teal-500",
  green: "bg-emerald-500",
  red: "bg-red-500",
};

/** Audit trail: who did what, and when. Newest first. */
export function Timeline({ events }: { events: TicketEvent[] }) {
  const items = [...events].reverse();
  return (
    <ol className="relative space-y-5">
      {items.map((e, i) => (
        <li key={e.id} className="relative flex gap-3">
          {i < items.length - 1 && <span className="absolute left-[5px] top-4 h-[calc(100%+0.5rem)] w-px bg-slate-200" aria-hidden />}
          <span
            className={cn(
              "mt-1.5 size-[11px] shrink-0 rounded-full ring-4 ring-white",
              e.kind === "payment" ? "bg-emerald-500" : e.kind === "warranty" ? "bg-orange-400" : DOT[STATUS_TONE[e.to_status]],
            )}
            aria-hidden
          />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-baseline justify-between gap-x-3">
              <p className="text-sm font-medium text-slate-900">
                {e.kind === "status" || !e.kind ? EVENT_LABEL[e.to_status] : e.note}
              </p>
              <time className="text-xs tabular-nums text-slate-500" dateTime={e.created_at}>
                {fmtDateTime(e.created_at)}
              </time>
            </div>
            <p className="text-xs text-slate-500">
              {e.actor ? `${e.actor.full_name} · ${ROLE_LABEL[e.actor.role]}` : "System"}
            </p>
            {e.note && e.kind === "status" && (
              <p className="mt-1.5 rounded-md bg-slate-50 px-2.5 py-1.5 text-sm text-slate-700">{e.note}</p>
            )}
          </div>
        </li>
      ))}
    </ol>
  );
}
