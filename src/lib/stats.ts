import { TZDate } from "@date-fns/tz";
import {
  addDays,
  addMonths,
  addWeeks,
  addYears,
  differenceInCalendarDays,
  getDaysInMonth,
  getISOWeek,
  startOfDay,
  startOfMonth,
  startOfWeek,
  startOfYear,
} from "date-fns";
import type { AppData, Carton, Category, Expense, Pack } from "./types";

export const TZ = "Europe/Amsterdam";
export type PeriodKind = "dag" | "week" | "maand" | "jaar";
export const PERIODS: { k: PeriodKind; label: string }[] = [
  { k: "dag", label: "Dag" },
  { k: "week", label: "Week" },
  { k: "maand", label: "Maand" },
  { k: "jaar", label: "Jaar" },
];

const WEEKDAYS = ["Ma", "Di", "Wo", "Do", "Vr", "Za", "Zo"];
const WEEKDAYS_LONG = ["Maandag", "Dinsdag", "Woensdag", "Donderdag", "Vrijdag", "Zaterdag", "Zondag"];
const MONTHS = ["J", "F", "M", "A", "M", "J", "J", "A", "S", "O", "N", "D"];
export const MONTHS_LONG = [
  "januari", "februari", "maart", "april", "mei", "juni",
  "juli", "augustus", "september", "oktober", "november", "december",
];

const eurFmt = new Intl.NumberFormat("nl-NL", { style: "currency", currency: "EUR" });
export const eur = (cents: number) => eurFmt.format((cents || 0) / 100).replace(/ /g, " ");
export const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
export const num = (n: number, d = 1) =>
  n.toLocaleString("nl-NL", { minimumFractionDigits: d, maximumFractionDigits: d });

const fmt = (opts: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat("nl-NL", { timeZone: TZ, ...opts });
export const fmtTime = (d: string | Date) => fmt({ hour: "2-digit", minute: "2-digit" }).format(new Date(d));
export const fmtDayLong = (d: string | Date) => cap(fmt({ weekday: "long", day: "numeric", month: "long" }).format(new Date(d)));
export const fmtDayShort = (d: string | Date) => fmt({ day: "numeric", month: "short" }).format(new Date(d));

/** "2026-11-13T19:42" in Amsterdamse tijd */
export function toLocalInput(d: string | Date) {
  return new Intl.DateTimeFormat("sv-SE", {
    timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit",
  }).format(new Date(d)).replace(" ", "T");
}
export function fromLocalInput(v: string): string {
  const m = v.match(/^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2}))?/);
  if (!m) return new Date().toISOString();
  const [, y, mo, d, h, mi] = m;
  return new TZDate(+y, +mo - 1, +d, h ? +h : 12, mi ? +mi : 0, 0, 0, TZ).toISOString();
}
export function dayKey(d: string | Date) {
  return new Intl.DateTimeFormat("sv-SE", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(d));
}

export const nowTz = () => new TZDate(Date.now(), TZ);

function daysElapsed(s: Date, e: Date) {
  const now = nowTz();
  if (now < s) return 1;
  if (now < e) return differenceInCalendarDays(now, s) + 1;
  return Math.max(1, differenceInCalendarDays(e, s));
}

function sum(list: Expense[], s: Date, e: Date) {
  const a = s.getTime(), b = e.getTime();
  let t = 0;
  for (const x of list) {
    const ms = Date.parse(x.spent_at);
    if (ms >= a && ms < b) t += x.amount_cents;
  }
  return t;
}

export type PeriodData = ReturnType<typeof periodData>;

export function periodData(data: AppData, kind: PeriodKind, offset: number) {
  const now = nowTz();
  let start: Date, end: Date, prevStart: Date, label: string, title: string, prevLabel: string;
  let bucketLabels: string[];
  let bucketOf: (d: TZDate) => number;

  switch (kind) {
    case "dag":
      start = addDays(startOfDay(now), offset);
      end = addDays(start, 1);
      prevStart = addDays(start, -1);
      label = offset === 0 ? "Vandaag" : offset === -1 ? "Gisteren" : fmtDayLong(start);
      title = offset === 0 ? "vandaag" : offset === -1 ? "gisteren" : fmtDayShort(start);
      prevLabel = "gisteren";
      bucketLabels = ["00", "03", "06", "09", "12", "15", "18", "21"];
      bucketOf = (d) => Math.floor(d.getHours() / 3);
      break;
    case "week":
      start = addWeeks(startOfWeek(now, { weekStartsOn: 1 }), offset);
      end = addWeeks(start, 1);
      prevStart = addWeeks(start, -1);
      label = `Week ${getISOWeek(start)} · ${fmtDayShort(start)} – ${fmtDayShort(addDays(end, -1))}`;
      title = offset === 0 ? "deze week" : offset === -1 ? "vorige week" : `week ${getISOWeek(start)}`;
      prevLabel = "vorige week";
      bucketLabels = WEEKDAYS;
      bucketOf = (d) => differenceInCalendarDays(d, start);
      break;
    case "maand": {
      start = addMonths(startOfMonth(now), offset);
      end = addMonths(start, 1);
      prevStart = addMonths(start, -1);
      label = cap(`${MONTHS_LONG[start.getMonth()]} ${start.getFullYear()}`);
      title = offset === 0 ? "deze maand" : MONTHS_LONG[start.getMonth()];
      prevLabel = "vorige maand";
      const n = getDaysInMonth(start);
      bucketLabels = Array.from({ length: n }, (_, i) => (i === 0 || (i + 1) % 5 === 0 ? String(i + 1) : ""));
      bucketOf = (d) => d.getDate() - 1;
      break;
    }
    case "jaar":
      start = addYears(startOfYear(now), offset);
      end = addYears(start, 1);
      prevStart = addYears(start, -1);
      label = String(start.getFullYear());
      title = offset === 0 ? "dit jaar" : String(start.getFullYear());
      prevLabel = "vorig jaar";
      bucketLabels = MONTHS;
      bucketOf = (d) => d.getMonth();
      break;
  }

  const isCurrent = now >= start && now < end;
  const prevEnd = isCurrent ? new Date(prevStart.getTime() + (now.getTime() - start.getTime())) : start;

  const a = start.getTime(), b = end.getTime();
  const rows = data.expenses.filter((e) => {
    const ms = Date.parse(e.spent_at);
    return ms >= a && ms < b;
  });
  const total = rows.reduce((s, e) => s + e.amount_cents, 0);
  const count = rows.length;
  const prevTotal = sum(data.expenses, prevStart, prevEnd);

  // Gemiddelden tellen vanaf de eerste uitgave ooit (als die later is dan de periodestart).
  const firstMs = data.expenses.length ? Math.min(...data.expenses.map((e) => Date.parse(e.spent_at))) : null;
  const eff = (s: Date) => {
    if (firstMs == null) return s;
    const f = startOfDay(new TZDate(firstMs, TZ));
    return f > s ? f : s;
  };
  const daysFrom = (s: Date, e: Date) => daysElapsed(eff(s), e);
  const monthsFrom = (s: Date, e: Date) => Math.max(1, daysFrom(s, e) / 30.44);

  const buckets = bucketLabels.map(() => 0);
  for (const e of rows) {
    const i = bucketOf(new TZDate(e.spent_at, TZ));
    if (i >= 0 && i < buckets.length) buckets[i] += e.amount_cents;
  }
  const currentBucket = isCurrent ? bucketOf(now) : -1;

  const catById = new Map(data.categories.map((c) => [c.id, c]));
  const catMap = new Map<string, { id: number | null; name: string; color: string; cents: number; count: number }>();
  for (const e of rows) {
    const c = e.category_id != null ? catById.get(e.category_id) : undefined;
    const k = String(c?.id ?? "none");
    const cur = catMap.get(k) ?? { id: c?.id ?? null, name: c?.name ?? "Geen categorie", color: c?.color ?? "#6B645A", cents: 0, count: 0 };
    cur.cents += e.amount_cents;
    cur.count++;
    catMap.set(k, cur);
  }
  const categories = [...catMap.values()].sort((x, y) => y.cents - x.cents);

  let delta: { text: string; short: string; up: boolean } | null = null;
  if (prevTotal > 0) {
    const pct = Math.round(((total - prevTotal) / prevTotal) * 100);
    const sign = pct > 0 ? "+" : pct < 0 ? "−" : "±";
    delta = { text: `${sign}${Math.abs(pct)}% vs ${prevLabel}`, short: `${sign}${Math.abs(pct)}%`, up: pct > 0 };
  }

  const days = daysFrom(start, end);
  const perDay = Math.round(total / days);
  const maxIdx = buckets.reduce((best, v, i) => (v > buckets[best] ? i : best), 0);

  const yStart = startOfYear(start), yEnd = addYears(yStart, 1);
  const mStart = startOfMonth(start), mEnd = addMonths(mStart, 1);
  const stats: { k: string; v: string }[] = [];

  if (kind === "dag") {
    const mTotal = sum(data.expenses, mStart, mEnd);
    stats.push(
      { k: "Aantal uitgaven", v: String(count) },
      { k: "Gem. per uitgave", v: count ? eur(Math.round(total / count)) : "—" },
      { k: "Grootste uitgave", v: count ? eur(Math.max(...rows.map((r) => r.amount_cents))) : "—" },
      { k: `Gem. per dag (${MONTHS_LONG[mStart.getMonth()]})`, v: eur(Math.round(mTotal / daysFrom(mStart, mEnd))) },
    );
  } else if (kind === "week") {
    const yTotal = sum(data.expenses, yStart, yEnd);
    stats.push(
      { k: "Gem. per dag", v: eur(perDay) },
      { k: "Aantal uitgaven", v: String(count) },
      { k: `Gem. per week (${yStart.getFullYear()})`, v: eur(Math.round(yTotal / Math.max(1, daysFrom(yStart, yEnd) / 7))) },
      { k: "Duurste dag", v: total ? WEEKDAYS_LONG[maxIdx] : "—" },
    );
  } else if (kind === "maand") {
    const yTotal = sum(data.expenses, yStart, yEnd);
    stats.push(
      { k: "Gem. per dag", v: eur(perDay) },
      { k: "Gem. per week", v: eur(perDay * 7) },
      { k: `Gem. per maand (${yStart.getFullYear()})`, v: eur(Math.round(yTotal / monthsFrom(yStart, yEnd))) },
      isCurrent
        ? { k: "Prognose maand", v: eur(total + perDay * (getDaysInMonth(start) - now.getDate())) }
        : { k: "Aantal uitgaven", v: String(count) },
    );
  } else {
    stats.push(
      { k: "Gem. per maand", v: eur(Math.round(total / monthsFrom(start, end))) },
      { k: "Gem. per week", v: eur(Math.round(total / Math.max(1, days / 7))) },
      { k: "Gem. per dag", v: eur(perDay) },
      { k: "Duurste maand", v: total ? cap(MONTHS_LONG[maxIdx]) : "—" },
    );
  }

  // Compacte kerncijfers voor de kaart op het beginscherm
  const wStart = startOfWeek(now, { weekStartsOn: 1 });
  const hero: { k: string; v: string }[] =
    kind === "dag"
      ? [
          { k: "Deze week", v: eur(sum(data.expenses, wStart, addWeeks(wStart, 1))) },
          { k: "Deze maand", v: eur(sum(data.expenses, startOfMonth(now), addMonths(startOfMonth(now), 1))) },
          { k: "Gem. / dag", v: eur(Math.round(sum(data.expenses, startOfMonth(now), addMonths(startOfMonth(now), 1)) / daysFrom(startOfMonth(now), addMonths(startOfMonth(now), 1)))) },
        ]
      : kind === "week"
        ? [stats[0], { k: "Gem. / week", v: stats[2].v }, { k: "Duurste dag", v: stats[3].v }]
        : kind === "maand"
          ? [stats[0], { k: "Gem. / maand", v: stats[2].v }, stats[3]]
          : [stats[0], stats[1], stats[2]];

  return {
    kind, offset, label, title, total, count, delta, isCurrent,
    bars: buckets.map((cents, i) => ({ label: bucketLabels[i], cents, current: i === currentBucket })),
    stats, hero, categories,
    expenses: rows.sort((x, y) => Date.parse(y.spent_at) - Date.parse(x.spent_at) || y.id - x.id),
  };
}

/** Groepeer uitgaven per dag (nieuwste eerst) */
export function groupByDay(list: Expense[]) {
  const groups: { key: string; label: string; total: number; items: Expense[] }[] = [];
  const todayKey = dayKey(new Date());
  const yKey = dayKey(addDays(new Date(), -1));
  for (const e of list) {
    const k = dayKey(e.spent_at);
    let g = groups[groups.length - 1];
    if (!g || g.key !== k) {
      g = { key: k, label: k === todayKey ? "Vandaag" : k === yKey ? "Gisteren" : fmtDayLong(e.spent_at), total: 0, items: [] };
      groups.push(g);
    }
    g.total += e.amount_cents;
    g.items.push(e);
  }
  return groups;
}

// ---------- Voorraad ----------

export type CartonView = Carton & { packs: Pack[]; used: number };

export function stockData(data: AppData) {
  const packsBy = new Map<number, Pack[]>();
  for (const p of data.packs) {
    const arr = packsBy.get(p.carton_id) ?? [];
    arr.push(p);
    packsBy.set(p.carton_id, arr);
  }
  const all: CartonView[] = [...data.cartons]
    .sort((a, b) => Date.parse(a.bought_at) - Date.parse(b.bought_at) || a.id - b.id)
    .map((c) => {
      const packs = (packsBy.get(c.id) ?? []).sort((a, b) => a.position - b.position);
      return { ...c, packs, used: packs.filter((p) => p.used_at).length };
    });
  const open = all.filter((c) => c.used < c.packs.length);
  const empty = all.filter((c) => c.packs.length > 0 && c.used >= c.packs.length).reverse();
  const left = open.reduce((s, c) => s + c.packs.length - c.used, 0);

  const since = Date.now() - 14 * 864e5;
  const recent = data.packs.filter((p) => p.used_at && Date.parse(p.used_at) >= since);
  let perDay = 0;
  if (recent.length) {
    const first = Math.min(...recent.map((p) => Date.parse(p.used_at!)));
    const span = Math.min(14, Math.max(1, Math.ceil((Date.now() - first) / 864e5)));
    perDay = recent.length / span;
  }
  const today = dayKey(new Date());
  const usedToday = data.packs.filter((p) => p.used_at && dayKey(p.used_at) === today).length;
  const next = open[0]?.packs.find((p) => !p.used_at) ?? null;
  const last = data.cartons.length ? [...data.cartons].sort((a, b) => b.id - a.id)[0] : null;

  return {
    open, empty, left, perDay, usedToday, next, last,
    daysLeft: perDay > 0 ? Math.floor(left / perDay) : null,
  };
}

export function sortedCategories(cats: Category[]) {
  return [...cats].sort((a, b) => a.sort - b.sort || a.name.localeCompare(b.name));
}
