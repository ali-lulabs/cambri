import { fmtRs } from "@/lib/format";
import { cn } from "./ui";

type Props = {
  under_warranty: boolean | null;
  charge_amount: number | null;
  payment_received_at: string | null;
  className?: string;
};

/** Small chip: "Warranty", or "Rs 2,500 · Unpaid/Paid". Nothing until support decides. */
export function ChargeBadge({ under_warranty, charge_amount, payment_received_at, className }: Props) {
  if (under_warranty === null) return null;
  if (under_warranty) {
    return (
      <span className={cn("inline-flex items-center whitespace-nowrap rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600 ring-1 ring-inset ring-slate-200", className)}>
        Warranty
      </span>
    );
  }
  const paid = !!payment_received_at;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset",
        paid ? "bg-emerald-50 text-emerald-800 ring-emerald-200" : "bg-orange-50 text-orange-800 ring-orange-200",
        className,
      )}
    >
      {fmtRs(charge_amount)} · {paid ? "Paid" : "Unpaid"}
    </span>
  );
}
