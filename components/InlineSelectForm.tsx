"use client";

import { useActionState, useState } from "react";
import type { FormState } from "@/app/actions/auth";
import { Select } from "./ui";

/** A select with a Save button that appears once the value changes. */
export function InlineSelectForm({
  action,
  hidden,
  name,
  options,
  defaultValue,
  label,
}: {
  action: (prev: FormState, f: FormData) => Promise<FormState>;
  hidden: Record<string, string>;
  name: string;
  options: { value: string; label: string }[];
  defaultValue: string;
  label: string;
}) {
  const [state, formAction, pending] = useActionState(action, undefined);
  const [value, setValue] = useState(defaultValue);
  const dirty = value !== defaultValue;
  return (
    <form action={formAction} className="min-w-44">
      {Object.entries(hidden).map(([k, v]) => (
        <input key={k} type="hidden" name={k} value={v} />
      ))}
      <div className="flex items-center gap-2">
        <Select name={name} value={value} onChange={(e) => setValue(e.target.value)} aria-label={label} className="h-8 text-sm">
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </Select>
        {dirty && (
          <button type="submit" disabled={pending} className="text-sm font-medium text-brand-700 hover:underline disabled:opacity-50">
            {pending ? "…" : "Save"}
          </button>
        )}
      </div>
      {state?.error && <p className="mt-1 max-w-56 text-xs text-red-700">{state.error}</p>}
    </form>
  );
}
