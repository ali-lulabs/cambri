"use client";

import { useActionState, useEffect, useRef, type ReactNode } from "react";
import type { FormState } from "@/app/actions/auth";
import { Alert } from "./ui";

/** Form bound to a server action; shows errors/success and clears inputs after success. */
export function ActionForm({
  action,
  children,
  className,
  resetOnSuccess = true,
}: {
  action: (prev: FormState, f: FormData) => Promise<FormState>;
  children: ReactNode;
  className?: string;
  resetOnSuccess?: boolean;
}) {
  const [state, formAction] = useActionState(action, undefined);
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state?.ok && resetOnSuccess) ref.current?.reset();
  }, [state, resetOnSuccess]);
  return (
    <form ref={ref} action={formAction} className={className}>
      {state?.error && (
        <div className="mb-3">
          <Alert>{state.error}</Alert>
        </div>
      )}
      {state?.ok && state.message && (
        <div className="mb-3">
          <Alert tone="success">{state.message}</Alert>
        </div>
      )}
      {children}
    </form>
  );
}
