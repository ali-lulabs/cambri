import { toggleActive } from "@/app/actions/admin";

export function ActiveToggle({ kind, id, active }: { kind: "products" | "dispatchers"; id: string; active: boolean }) {
  return (
    <form action={toggleActive}>
      <input type="hidden" name="kind" value={kind} />
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="active" value={String(active)} />
      <button
        type="submit"
        className={
          active
            ? "rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-800 ring-1 ring-inset ring-emerald-200 hover:bg-emerald-100"
            : "rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600 ring-1 ring-inset ring-slate-200 hover:bg-slate-200"
        }
        title={active ? "Click to deactivate" : "Click to activate"}
      >
        {active ? "Active" : "Inactive"}
      </button>
    </form>
  );
}
