import { STATUS_LABEL, STATUS_TONE, type Tone } from "@/lib/tickets/status";
import type { TicketStatus } from "@/lib/types";
import { cn } from "./ui";

const TONES: Record<Tone, string> = {
  amber: "bg-amber-50 text-amber-800 ring-amber-200",
  blue: "bg-blue-50 text-blue-800 ring-blue-200",
  violet: "bg-violet-50 text-violet-800 ring-violet-200",
  teal: "bg-teal-50 text-teal-800 ring-teal-200",
  green: "bg-emerald-50 text-emerald-800 ring-emerald-200",
  red: "bg-red-50 text-red-800 ring-red-200",
};
const DOTS: Record<Tone, string> = {
  amber: "bg-amber-500",
  blue: "bg-blue-500",
  violet: "bg-violet-500",
  teal: "bg-teal-500",
  green: "bg-emerald-500",
  red: "bg-red-500",
};

export function StatusBadge({ status, className }: { status: TicketStatus; className?: string }) {
  const tone = STATUS_TONE[status];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset",
        TONES[tone],
        className,
      )}
    >
      <span className={cn("size-1.5 rounded-full", DOTS[tone])} aria-hidden />
      {STATUS_LABEL[status]}
    </span>
  );
}
