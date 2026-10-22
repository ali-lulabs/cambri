import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui";
import type { ProductModel } from "@/lib/types";
import { ComplaintForm } from "./ComplaintForm";

export default async function NewComplaint() {
  const supabase = await createClient();
  const { data } = await supabase.from("product_models").select("*").eq("active", true).order("model_code");

  return (
    <>
      <Link href="/rep" className="mb-3 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-800">
        <ChevronLeft className="size-4" aria-hidden /> Back
      </Link>
      <h1 className="mb-1 text-xl font-semibold text-slate-900">Log a faulty product</h1>
      <p className="mb-5 text-sm text-slate-500">Support will review it and arrange a pickup.</p>
      <Card className="p-5">
        <ComplaintForm products={(data ?? []) as ProductModel[]} />
      </Card>
    </>
  );
}
