"use client";

import { useState } from "react";
import { Input, cn } from "./ui";

/** "Under warranty" vs "Out of warranty + amount" picker. */
export function WarrantyFields({
  defaultWarranty = null,
  defaultAmount = null,
}: {
  defaultWarranty?: boolean | null;
  defaultAmount?: number | null;
}) {
  const [choice, setChoice] = useState<"yes" | "no" | null>(
    defaultWarranty === null ? null : defaultWarranty ? "yes" : "no",
  );

  return (
    <fieldset className="space-y-3">
      <legend className="mb-1.5 text-sm font-medium text-slate-700">Warranty</legend>
      <div className="grid grid-cols-2 gap-2">
        {(
          [
            ["yes", "Under warranty", "Free repair"],
            ["no", "Out of warranty", "Customer pays"],
          ] as const
        ).map(([value, label, hint]) => (
          <label
            key={value}
            className={cn(
              "cursor-pointer rounded-lg px-3 py-2.5 ring-1 ring-inset transition-colors",
              choice === value ? "bg-brand-50 ring-2 ring-brand-500" : "bg-white ring-slate-300 hover:bg-slate-50",
            )}
          >
            <input
              type="radio"
              name="warranty"
              value={value}
              required
              checked={choice === value}
              onChange={() => setChoice(value)}
              className="sr-only"
            />
            <span className="block text-sm font-medium text-slate-900">{label}</span>
            <span className="block text-xs text-slate-500">{hint}</span>
          </label>
        ))}
      </div>
      {choice === "no" && (
        <div className="space-y-1.5">
          <label htmlFor="charge_amount" className="block text-sm font-medium text-slate-700">
            Amount to charge
          </label>
          <div className="relative">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-500">Rs</span>
            <Input
              id="charge_amount"
              name="charge_amount"
              inputMode="decimal"
              required
              autoFocus
              defaultValue={defaultAmount ?? ""}
              placeholder="e.g. 2500"
              className="pl-9 tabular-nums"
            />
          </div>
        </div>
      )}
    </fieldset>
  );
}
