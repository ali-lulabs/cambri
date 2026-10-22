"use client";

import { useActionState } from "react";
import type { FormState } from "@/app/actions/auth";

export function DeleteButton({
  action,
  id,
  label = "Remove",
  confirmText,
}: {
  action: (prev: FormState, f: FormData) => Promise<FormState>;
  id: string;
  label?: string;
  confirmText: string;
}) {
  const [state, formAction, pending] = useActionState(action, undefined);
  return (
    <form
      action={formAction}
      onSubmit={(e) => {
        if (!confirm(confirmText)) e.preventDefault();
      }}
      className="text-right"
    >
      <input type="hidden" name="id" value={id} />
      <button type="submit" disabled={pending} className="text-sm font-medium text-red-700 hover:underline disabled:opacity-50">
        {pending ? "…" : label}
      </button>
      {state?.error && <p className="mt-1 max-w-48 text-xs text-red-700">{state.error}</p>}
      {state?.ok && state.message && <p className="mt-1 max-w-48 text-xs text-slate-600">{state.message}</p>}
    </form>
  );
}
