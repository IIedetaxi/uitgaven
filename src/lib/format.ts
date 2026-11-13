export const TZ = "Europe/Amsterdam";

const eurFmt = new Intl.NumberFormat("nl-NL", { style: "currency", currency: "EUR" });

export function eur(cents: number) {
  return eurFmt.format((cents || 0) / 100).replace(/ /g, " ");
}

/** "12,50" / "12.5" / "12" → 1250 */
export function parseCents(input: FormDataEntryValue | null | undefined): number | null {
  if (input == null) return null;
  const s = String(input).trim().replace(/\s|€/g, "");
  if (!s) return null;
  const normalized = s.includes(",") ? s.replace(/\./g, "").replace(",", ".") : s;
  const n = Number(normalized);
  if (!Number.isFinite(n) || n < 0) return null;
  return Math.round(n * 100);
}

export function centsToInput(cents: number | null | undefined) {
  if (cents == null) return "";
  return (cents / 100).toFixed(2).replace(".", ",");
}

export function time(d: Date | string) {
  return new Intl.DateTimeFormat("nl-NL", { timeZone: TZ, hour: "2-digit", minute: "2-digit" }).format(new Date(d));
}

export function dateLong(d: Date | string) {
  return new Intl.DateTimeFormat("nl-NL", { timeZone: TZ, weekday: "long", day: "numeric", month: "long" }).format(
    new Date(d),
  );
}

export function dateShort(d: Date | string) {
  return new Intl.DateTimeFormat("nl-NL", { timeZone: TZ, day: "numeric", month: "short" }).format(new Date(d));
}

/** Waarde voor <input type="datetime-local"> in Amsterdamse tijd */
export function toLocalInput(d: Date | string) {
  const parts = new Intl.DateTimeFormat("sv-SE", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(d));
  return parts.replace(" ", "T");
}

export function cap(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function num(n: number, digits = 1) {
  return n.toLocaleString("nl-NL", { minimumFractionDigits: digits, maximumFractionDigits: digits });
}
