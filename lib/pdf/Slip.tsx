import { Document, Image, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import type { TicketFull } from "@/lib/types";
import { TIME_ZONE } from "@/lib/format";

const BRAND = "#163f64";
const MUTED = "#64748b";
const LINE = "#cbd5e1";

const s = StyleSheet.create({
  page: { padding: 28, fontSize: 9.5, fontFamily: "Helvetica", color: "#0f172a" },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", borderBottomWidth: 2, borderBottomColor: BRAND, paddingBottom: 10 },
  company: { fontSize: 13, fontFamily: "Helvetica-Bold", color: BRAND },
  sub: { fontSize: 8.5, color: MUTED, marginTop: 2 },
  title: { fontSize: 12, fontFamily: "Helvetica-Bold", textAlign: "right" },
  slipNo: { fontSize: 10, fontFamily: "Courier-Bold", textAlign: "right", marginTop: 3 },
  banner: { marginTop: 12, padding: 8, backgroundColor: "#eef5fb", borderRadius: 3, fontSize: 9, color: BRAND },
  section: { marginTop: 12 },
  sectionTitle: { fontSize: 8, fontFamily: "Helvetica-Bold", color: MUTED, textTransform: "uppercase", letterSpacing: 0.6, marginBottom: 4 },
  row: { flexDirection: "row", paddingVertical: 3, borderBottomWidth: 0.5, borderBottomColor: "#e2e8f0" },
  label: { width: 110, color: MUTED },
  value: { flex: 1 },
  mono: { fontFamily: "Courier-Bold" },
  twoCol: { flexDirection: "row", gap: 16, marginTop: 12 },
  col: { flex: 1 },
  qrBox: { flexDirection: "row", alignItems: "center", gap: 10, marginTop: 14, padding: 8, borderWidth: 0.75, borderColor: LINE, borderRadius: 3 },
  qr: { width: 74, height: 74 },
  sigs: { flexDirection: "row", gap: 14, marginTop: 22 },
  sig: { flex: 1, borderTopWidth: 0.75, borderTopColor: "#334155", paddingTop: 4, fontSize: 8, color: MUTED },
  footer: { position: "absolute", bottom: 18, left: 28, right: 28, fontSize: 7.5, color: MUTED, textAlign: "center" },
});

function Row({ label, value, mono }: { label: string; value?: string | null; mono?: boolean }) {
  return (
    <View style={s.row}>
      <Text style={s.label}>{label}</Text>
      <Text style={mono ? [s.value, s.mono] : s.value}>{value || "-"}</Text>
    </View>
  );
}

export type SlipProps = {
  type: "pickup" | "return";
  ticket: TicketFull;
  company: string;
  qrDataUrl: string;
  verifyUrl: string;
  issuedAt: string;
  issuedBy: string;
};

export function Slip({ type, ticket: t, company, qrDataUrl, verifyUrl, issuedAt, issuedBy }: SlipProps) {
  const pickup = type === "pickup";
  const d = pickup ? t.pickup : t.ret;
  const issued = new Date(issuedAt).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short", timeZone: TIME_ZONE });
  const returningSerial = t.resolution === "replace" ? t.replacement_serial_no : t.serial_no;

  return (
    <Document title={`${t.ticket_no} ${pickup ? "Pickup" : "Return"} slip`} author={company}>
      <Page size="A5" style={s.page}>
        <View style={s.header}>
          <View>
            <Text style={s.company}>{company}</Text>
            <Text style={s.sub}>After-Sales Service</Text>
          </View>
          <View>
            <Text style={s.title}>{pickup ? "PICKUP AUTHORIZATION" : "RETURN DELIVERY NOTE"}</Text>
            <Text style={s.slipNo}>
              {t.ticket_no}-{pickup ? "P" : "R"}
            </Text>
          </View>
        </View>

        <Text style={s.banner}>
          {pickup
            ? "Please release the faulty unit below to the dispatcher named on this slip."
            : t.resolution === "replace"
              ? "A replacement unit is being delivered for the faulty unit collected earlier."
              : "The repaired unit below is being returned to your store."}
        </Text>

        <View style={s.twoCol}>
          <View style={s.col}>
            <Text style={s.sectionTitle}>Store</Text>
            <Text style={{ fontFamily: "Helvetica-Bold" }}>{t.store.name}</Text>
            <Text>{t.store.retailer}</Text>
            <Text>{[t.store.address, t.store.city].filter(Boolean).join(", ")}</Text>
            {t.store.manager_contact && <Text style={{ color: MUTED, marginTop: 2 }}>{t.store.manager_contact}</Text>}
          </View>
          <View style={s.col}>
            <Text style={s.sectionTitle}>Dispatcher</Text>
            <Text style={{ fontFamily: "Helvetica-Bold" }}>{d?.name ?? "-"}</Text>
            <Text>{d?.phone ?? ""}</Text>
            <Text>{d?.vehicle ?? ""}</Text>
          </View>
        </View>

        <View style={s.section}>
          <Text style={s.sectionTitle}>Product</Text>
          <Row label="Model" value={`${t.product.model_code}  ${t.product.name}`} />
          {pickup ? (
            <Row label="Serial no. (collect)" value={t.serial_no} mono />
          ) : (
            <>
              <Row label="Serial no. (delivered)" value={returningSerial} mono />
              {t.resolution === "replace" && <Row label="Original serial no." value={t.serial_no} mono />}
              <Row label="Resolution" value={t.resolution === "replace" ? "Replaced with new unit" : "Repaired"} />
            </>
          )}
          <Row label="Reported fault" value={t.issue_description} />
          <Row label="Reported by" value={`${t.store_manager_name} (store manager)`} />
        </View>

        <View style={s.section}>
          <Text style={s.sectionTitle}>Authorization</Text>
          <Row label="Approved by" value={t.approver?.full_name} />
          <Row label="Slip issued" value={`${issued} by ${issuedBy}`} />
        </View>

        <View style={s.qrBox}>
          {/* eslint-disable-next-line jsx-a11y/alt-text -- react-pdf Image has no alt */}
          <Image src={qrDataUrl} style={s.qr} />
          <View style={{ flex: 1 }}>
            <Text style={{ fontFamily: "Helvetica-Bold", marginBottom: 2 }}>Scan to verify this slip</Text>
            <Text style={{ color: MUTED, fontSize: 8 }}>Shows the live status of this ticket and the assigned dispatcher.</Text>
            <Text style={{ color: MUTED, fontSize: 7, marginTop: 3 }}>{verifyUrl}</Text>
          </View>
        </View>

        <View style={s.sigs}>
          <Text style={s.sig}>Dispatcher signature</Text>
          <Text style={s.sig}>Store manager signature &amp; stamp</Text>
          <Text style={s.sig}>Date / time</Text>
        </View>

        <Text style={s.footer} fixed>
          {company} · Generated {new Date().toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short", timeZone: TIME_ZONE })} · {t.ticket_no}
        </Text>
      </Page>
    </Document>
  );
}
