import { APP_NAME, COMPANY_NAME } from "@/lib/brand";
import { cn } from "./ui";

export function Logo({ inverted = false, compact = false }: { inverted?: boolean; compact?: boolean }) {
  return (
    <div className="flex items-center gap-2.5">
      <span
        className={cn(
          "grid size-8 place-items-center rounded-lg text-sm font-bold",
          inverted ? "bg-white/15 text-white" : "bg-brand-700 text-white",
        )}
        aria-hidden
      >
        {COMPANY_NAME.charAt(0)}
      </span>
      {!compact && (
        <div className="leading-tight">
          <p className={cn("text-sm font-semibold", inverted ? "text-white" : "text-slate-900")}>{COMPANY_NAME}</p>
          <p className={cn("text-xs", inverted ? "text-brand-100" : "text-slate-500")}>{APP_NAME}</p>
        </div>
      )}
    </div>
  );
}
