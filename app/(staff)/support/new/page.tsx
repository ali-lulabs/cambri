import { getMyStores, requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { ProductModel } from "@/lib/types";
import { ComplaintForm } from "@/app/rep/new/ComplaintForm";
import { Alert, Card, PageHeader } from "@/components/ui";

/** Area reps (and managers) log a complaint on behalf of a store. */
export default async function NewStaffTicket() {
  await requireRole(["area_rep", "manager"]);
  const stores = await getMyStores();
  const supabase = await createClient();
  const { data } = await supabase.from("product_models").select("*").eq("active", true).order("model_code");

  return (
    <div className="max-w-xl">
      <PageHeader title="New ticket" subtitle="Log a faulty product reported by one of your stores." />
      {stores.length === 0 ? (
        <Alert tone="info">No stores are assigned to you yet. Ask a manager to assign your stores.</Alert>
      ) : (
        <Card className="p-5">
          <ComplaintForm products={(data ?? []) as ProductModel[]} stores={stores} cancelHref="/support" />
        </Card>
      )}
    </div>
  );
}
