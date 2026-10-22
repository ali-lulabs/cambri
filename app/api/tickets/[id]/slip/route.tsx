import { NextResponse, type NextRequest } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import QRCode from "qrcode";
import { getProfile } from "@/lib/auth";
import { getTicket } from "@/lib/tickets/queries";
import { COMPANY_NAME } from "@/lib/brand";
import { Slip } from "@/lib/pdf/Slip";

export const runtime = "nodejs";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const profile = await getProfile();
  if (!profile || profile.role === "rep") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  const type = req.nextUrl.searchParams.get("type") === "return" ? "return" : "pickup";
  const result = await getTicket(id);
  if (!result) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const { ticket, events } = result;

  if ((type === "pickup" && !ticket.pickup) || (type === "return" && !ticket.ret)) {
    return NextResponse.json({ error: "No dispatcher assigned for this slip yet" }, { status: 409 });
  }

  const issuedEvent = [...events].reverse().find((e) => e.to_status === (type === "pickup" ? "PICKUP_SCHEDULED" : "RETURN_SCHEDULED"));
  const origin = process.env.NEXT_PUBLIC_SITE_URL || req.nextUrl.origin;
  const verifyUrl = `${origin}/verify/${ticket.verify_token}`;
  const qrDataUrl = await QRCode.toDataURL(verifyUrl, { margin: 0, width: 320, errorCorrectionLevel: "M" });

  const pdf = await renderToBuffer(
    <Slip
      type={type}
      ticket={ticket}
      company={COMPANY_NAME}
      qrDataUrl={qrDataUrl}
      verifyUrl={verifyUrl}
      issuedAt={issuedEvent?.created_at ?? ticket.updated_at}
      issuedBy={issuedEvent?.actor?.full_name ?? "Support"}
    />,
  );

  return new Response(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${ticket.ticket_no}-${type}-slip.pdf"`,
      "Cache-Control": "no-store",
    },
  });
}
