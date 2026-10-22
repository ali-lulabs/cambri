import { STAGES, stageIndex } from "@/lib/tickets/status";
import type { TicketStatus } from "@/lib/types";
import { cn } from "./ui";

/** Five-step progress bar: Review → Pickup → At plant → Return → Delivered. */
export function StageProgress({ status }: { status: TicketStatus }) {
  if (status === "REJECTED") {
    return (
      <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-800 ring-1 ring-inset ring-red-200">
        This request was rejected and is closed.
      </div>
    );
  }
  const current = stageIndex(status);
  const done = status === "DELIVERED";
  return (
    <ol className="grid grid-cols-5 gap-1.5" aria-label="Progress">
      {STAGES.map((s, i) => {
        const complete = i < current || done;
        const active = i === current && !done;
        return (
          <li key={s.key} className="min-w-0">
            <div
              className={cn(
                "h-1.5 rounded-full",
                complete ? "bg-brand-600" : active ? "bg-brand-200 animate-pulse" : "bg-slate-200",
              )}
            />
            <p
              className={cn(
                "mt-1.5 truncate text-[11px] sm:text-xs",
                complete || active ? "font-medium text-slate-800" : "text-slate-400",
              )}
              aria-current={active ? "step" : undefined}
            >
              {s.label}
            </p>
          </li>
        );
      })}
    </ol>
  );
}
