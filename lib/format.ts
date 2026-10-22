// Times are rendered on the server (UTC on Netlify), so pin the business timezone.
export const TIME_ZONE = process.env.NEXT_PUBLIC_APP_TIMEZONE || undefined;

const dateTime = new Intl.DateTimeFormat("en-GB", {
  timeZone: TIME_ZONE,
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
});
const dateOnly = new Intl.DateTimeFormat("en-GB", { timeZone: TIME_ZONE, day: "numeric", month: "short", year: "numeric" });

export const fmtDateTime = (iso: string) => dateTime.format(new Date(iso));
export const fmtDate = (iso: string) => dateOnly.format(new Date(iso));

const rupees = new Intl.NumberFormat("en-PK", { maximumFractionDigits: 2, minimumFractionDigits: 0 });

/** e.g. "Rs 2,500" or "Rs 1,999.50". Supabase returns numeric columns as numbers or strings. */
export function fmtRs(amount: number | string | null | undefined): string {
  const n = Number(amount ?? 0);
  return "Rs " + (Number.isInteger(n) ? rupees.format(n) : n.toLocaleString("en-PK", { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
}

export function timeAgo(iso: string): string {
  const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.round(hrs / 24);
  return `${days}d ago`;
}
