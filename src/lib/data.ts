import "server-only";
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
import { ensureSchema, sql } from "./db";
import { TZ, cap, dateShort, eur, num } from "./format";

export type Category = {
  id: number;
  name: string;
  color: string;
  default_amount_cents: number | null;
  system_key: string | null;
  sort: number;
};

export type Expense = {
  id: number;
  amount_cents: number;
  note: string | null;
  spent_at: string;
  category_id: number | null;
  carton_id: number | null;
  cat_name: string | null;
  cat_color: string | null;
};

export type Pack = { id: number; position: number; used: boolean };
export type Carton = {
  id: number;
  label: string | null;
  packs_total: number;
  price_cents: number;
  bought_at: string;
  used: number;
  packs: Pack[];
};

const iso = (d: Date) => new Date(d.getTime()).toISOString();
const nowTz = () => new TZDate(Date.now(), TZ);

// ---------- Categorieën ----------

export async function getCategories(): Promise<Category[]> {
  await ensureSchema();
  return (await sql`SELECT id, name, color, default_amount_cents, system_key, sort
                    FROM categories ORDER BY sort, name`) as Category[];
}

// ---------- Uitgaven ----------

export async function getExpense(id: number): Promise<Expense | null> {
  await ensureSchema();
  const rows = (await sql`
    SELECT e.id, e.amount_cents, e.note, e.spent_at, e.category_id, e.carton_id,
           c.name AS cat_name, c.color AS cat_color
    FROM expenses e LEFT JOIN categories c ON c.id = e.category_id
    WHERE e.id = ${id}`) as Expense[];
  return rows[0] ?? null;
}

async function expensesBetween(start: Date, end: Date): Promise<Expense[]> {
  return (await sql`
    SELECT e.id, e.amount_cents, e.note, e.spent_at, e.category_id, e.carton_id,
           c.name AS cat_name, c.color AS cat_color
    FROM expenses e LEFT JOIN categories c ON c.id = e.category_id
    WHERE e.spent_at >= ${iso(start)} AND e.spent_at < ${iso(end)}
    ORDER BY e.spent_at DESC, e.id DESC`) as Expense[];
}

/** Aantal (deels) verstreken kalenderdagen in [s, e) t.o.v. nu */
function daysElapsed(s: Date, e: Date) {
  const now = nowTz();
  if (now < s) return 1;
  if (now < e) return differenceInCalendarDays(now, s) + 1;
  return Math.max(1, differenceInCalendarDays(e, s));
}

/** Begin van een gemiddelde: periodestart, of de dag van de allereerste uitgave als die later is. */
function effStart(s: Date, first: string | null) {
  if (!first) return s;
  const f = startOfDay(new TZDate(first, TZ));
  return f > s ? f : s;
}

// ---------- Vandaag ----------

export async function getTodayData() {
  await ensureSchema();
  const now = nowTz();
  const dStart = startOfDay(now);
  const wStart = startOfWeek(now, { weekStartsOn: 1 });
  const mStart = startOfMonth(now);
  const [agg] = (await sql`
    SELECT
      COALESCE(SUM(amount_cents) FILTER (WHERE spent_at >= ${iso(wStart)}), 0)::int AS week,
      COALESCE(SUM(amount_cents) FILTER (WHERE spent_at >= ${iso(mStart)}), 0)::int AS month,
      (SELECT MIN(spent_at) FROM expenses) AS first
    FROM expenses
    WHERE spent_at >= ${iso(wStart < mStart ? wStart : mStart)} AND spent_at <= now() + interval '1 day'`) as {
    week: number;
    month: number;
    first: string | null;
  }[];
  const today = await expensesBetween(dStart, addDays(dStart, 1));
  const todayTotal = today.reduce((s, e) => s + e.amount_cents, 0);
  const avgDay = Math.round(agg.month / daysElapsed(effStart(mStart, agg.first), addMonths(mStart, 1)));
  return { today, todayTotal, week: agg.week, month: agg.month, avgDay };
}

// ---------- Overzicht ----------

export type PeriodKind = "dag" | "week" | "maand" | "jaar";

const WEEKDAYS = ["Ma", "Di", "Wo", "Do", "Vr", "Za", "Zo"];
const WEEKDAYS_LONG = ["Maandag", "Dinsdag", "Woensdag", "Donderdag", "Vrijdag", "Zaterdag", "Zondag"];
const MONTHS = ["J", "F", "M", "A", "M", "J", "J", "A", "S", "O", "N", "D"];
const MONTHS_LONG = [
  "Januari", "Februari", "Maart", "April", "Mei", "Juni",
  "Juli", "Augustus", "September", "Oktober", "November", "December",
];

export async function getPeriodData(kind: PeriodKind, offset: number) {
  await ensureSchema();
  const now = nowTz();

  let start: Date, end: Date, prevStart: Date, label: string, prevLabel: string;
  let bucketLabels: string[];
  let bucketOf: (d: TZDate) => number;

  switch (kind) {
    case "dag": {
      start = addDays(startOfDay(now), offset);
      end = addDays(start, 1);
      prevStart = addDays(start, -1);
      label =
        offset === 0 ? "Vandaag" : offset === -1 ? "Gisteren" :
        cap(new Intl.DateTimeFormat("nl-NL", { timeZone: TZ, weekday: "long", day: "numeric", month: "short" }).format(start));
      prevLabel = "vorige dag";
      bucketLabels = ["00", "03", "06", "09", "12", "15", "18", "21"];
      bucketOf = (d) => Math.floor(d.getHours() / 3);
      break;
    }
    case "week": {
      start = addWeeks(startOfWeek(now, { weekStartsOn: 1 }), offset);
      end = addWeeks(start, 1);
      prevStart = addWeeks(start, -1);
      label = `Week ${getISOWeek(start)} · ${dateShort(start)} – ${dateShort(addDays(end, -1))}`;
      prevLabel = "vorige week";
      bucketLabels = WEEKDAYS;
      bucketOf = (d) => differenceInCalendarDays(d, start);
      break;
    }
    case "maand": {
      start = addMonths(startOfMonth(now), offset);
      end = addMonths(start, 1);
      prevStart = addMonths(start, -1);
      label = `${MONTHS_LONG[start.getMonth()]} ${start.getFullYear()}`;
      prevLabel = "vorige maand";
      const n = getDaysInMonth(start);
      bucketLabels = Array.from({ length: n }, (_, i) => (i === 0 || (i + 1) % 5 === 0 ? String(i + 1) : ""));
      bucketOf = (d) => d.getDate() - 1;
      break;
    }
    case "jaar": {
      start = addYears(startOfYear(now), offset);
      end = addYears(start, 1);
      prevStart = addYears(start, -1);
      label = String(start.getFullYear());
      prevLabel = "vorig jaar";
      bucketLabels = MONTHS;
      bucketOf = (d) => d.getMonth();
      break;
    }
  }

  const isCurrent = now >= start && now < end;
  // Bij een lopende periode vergelijken we met hetzelfde stuk van de vorige periode.
  const prevEnd = isCurrent ? new Date(prevStart.getTime() + (now.getTime() - start.getTime())) : start;

  const yStart = startOfYear(start);
  const yEnd = addYears(yStart, 1);
  const mStart = startOfMonth(start);
  const mEnd = addMonths(mStart, 1);
  const lo = [yStart, prevStart].sort((a, b) => a.getTime() - b.getTime())[0];

  const [rows, aggRows] = await Promise.all([
    expensesBetween(start, end),
    sql`
      SELECT
        COALESCE(SUM(amount_cents) FILTER (WHERE spent_at >= ${iso(yStart)} AND spent_at < ${iso(yEnd)}), 0)::int AS year_total,
        COALESCE(SUM(amount_cents) FILTER (WHERE spent_at >= ${iso(mStart)} AND spent_at < ${iso(mEnd)}), 0)::int AS month_total,
        COALESCE(SUM(amount_cents) FILTER (WHERE spent_at >= ${iso(prevStart)} AND spent_at < ${iso(prevEnd)}), 0)::int AS prev_total,
        (SELECT MIN(spent_at) FROM expenses) AS first
      FROM expenses
      WHERE spent_at >= ${iso(lo)} AND spent_at < ${iso(yEnd > end ? yEnd : end)}`,
  ]);
  const agg = (aggRows as { year_total: number; month_total: number; prev_total: number; first: string | null }[])[0];
  const daysFrom = (s: Date, e: Date) => daysElapsed(effStart(s, agg.first), e);
  const monthsFrom = (s: Date, e: Date) => Math.max(1, daysFrom(s, e) / 30.44);

  const total = rows.reduce((s, e) => s + e.amount_cents, 0);
  const count = rows.length;

  const buckets = bucketLabels.map(() => 0);
  for (const e of rows) {
    const i = bucketOf(new TZDate(e.spent_at, TZ));
    if (i >= 0 && i < buckets.length) buckets[i] += e.amount_cents;
  }
  let currentBucket = -1;
  if (isCurrent) currentBucket = bucketOf(now);

  const catMap = new Map<string, { name: string; color: string; cents: number }>();
  for (const e of rows) {
    const k = String(e.category_id ?? "none");
    const c = catMap.get(k) ?? { name: e.cat_name ?? "Geen categorie", color: e.cat_color ?? "#6B645A", cents: 0 };
    c.cents += e.amount_cents;
    catMap.set(k, c);
  }
  const categories = [...catMap.values()].sort((a, b) => b.cents - a.cents);

  let delta: { text: string; up: boolean } | null = null;
  if (agg.prev_total > 0) {
    const pct = Math.round(((total - agg.prev_total) / agg.prev_total) * 100);
    delta = { text: `${pct > 0 ? "+" : pct < 0 ? "−" : "±"}${Math.abs(pct)}% vs ${prevLabel}`, up: pct > 0 };
  }

  const days = daysFrom(start, end);
  const perDay = Math.round(total / days);
  const maxIdx = buckets.reduce((best, v, i) => (v > buckets[best] ? i : best), 0);
  const stats: { k: string; v: string }[] = [];

  if (kind === "dag") {
    stats.push(
      { k: "Aantal uitgaven", v: String(count) },
      { k: "Gem. per uitgave", v: count ? eur(Math.round(total / count)) : "—" },
      { k: "Grootste uitgave", v: count ? eur(Math.max(...rows.map((r) => r.amount_cents))) : "—" },
      { k: `Gem. per dag (${MONTHS_LONG[mStart.getMonth()].toLowerCase()})`, v: eur(Math.round(agg.month_total / daysFrom(mStart, mEnd))) },
    );
  } else if (kind === "week") {
    const yDays = daysFrom(yStart, yEnd);
    stats.push(
      { k: "Gem. per dag", v: eur(perDay) },
      { k: "Aantal uitgaven", v: String(count) },
      { k: `Gem. per week (${yStart.getFullYear()})`, v: eur(Math.round(agg.year_total / Math.max(1, yDays / 7))) },
      { k: "Duurste dag", v: total ? WEEKDAYS_LONG[maxIdx] : "—" },
    );
  } else if (kind === "maand") {
    stats.push(
      { k: "Gem. per dag", v: eur(perDay) },
      { k: "Gem. per week", v: eur(perDay * 7) },
      { k: `Gem. per maand (${yStart.getFullYear()})`, v: eur(Math.round(agg.year_total / monthsFrom(yStart, yEnd))) },
      isCurrent
        ? { k: "Prognose maand", v: eur(total + perDay * (getDaysInMonth(start) - now.getDate())) }
        : { k: "Aantal uitgaven", v: String(count) },
    );
  } else {
    stats.push(
      { k: "Gem. per maand", v: eur(Math.round(total / monthsFrom(start, end))) },
      { k: "Gem. per week", v: eur(Math.round(total / Math.max(1, days / 7))) },
      { k: "Gem. per dag", v: eur(perDay) },
      { k: "Duurste maand", v: total ? MONTHS_LONG[maxIdx] : "—" },
    );
  }

  return {
    label,
    total,
    count,
    delta,
    bars: buckets.map((cents, i) => ({ label: bucketLabels[i], cents, current: i === currentBucket })),
    stats,
    categories,
    expenses: rows,
    isCurrent,
  };
}

// ---------- Voorraad ----------

export async function getStock() {
  await ensureSchema();
  const cartons = (await sql`
    SELECT c.id, c.label, c.packs_total, c.price_cents, c.bought_at,
           COUNT(p.id) FILTER (WHERE p.used_at IS NOT NULL)::int AS used
    FROM cartons c LEFT JOIN packs p ON p.carton_id = c.id
    GROUP BY c.id
    ORDER BY c.bought_at, c.id`) as Omit<Carton, "packs">[];

  const openIds = cartons.filter((c) => c.used < c.packs_total).map((c) => c.id);
  const packRows = openIds.length
    ? ((await sql`SELECT id, carton_id, position, used_at IS NOT NULL AS used
                  FROM packs WHERE carton_id = ANY(${openIds}) ORDER BY carton_id, position`) as (Pack & {
        carton_id: number;
      })[])
    : [];

  const open: Carton[] = cartons
    .filter((c) => c.used < c.packs_total)
    .map((c) => ({
      ...c,
      packs: packRows.filter((p) => p.carton_id === c.id).map(({ id, position, used }) => ({ id, position, used })),
    }));
  const empty = cartons.filter((c) => c.used >= c.packs_total).reverse();

  const [usage] = (await sql`
    SELECT COUNT(*)::int AS n, MIN(used_at) AS first
    FROM packs WHERE used_at >= now() - interval '14 days'`) as { n: number; first: string | null }[];
  let perDay = 0;
  if (usage.n > 0 && usage.first) {
    const span = Math.min(14, Math.max(1, Math.ceil((Date.now() - new Date(usage.first).getTime()) / 864e5)));
    perDay = usage.n / span;
  }
  const left = open.reduce((s, c) => s + (c.packs_total - c.used), 0);
  const daysLeft = perDay > 0 ? Math.floor(left / perDay) : null;

  const [last] = (await sql`SELECT price_cents, packs_total, label FROM cartons ORDER BY id DESC LIMIT 1`) as {
    price_cents: number;
    packs_total: number;
    label: string | null;
  }[];

  return {
    open,
    empty,
    left,
    perDay,
    perDayText: num(perDay, 1),
    daysLeft,
    last: last ?? null,
  };
}
