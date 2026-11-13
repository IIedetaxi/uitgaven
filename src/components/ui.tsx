import Link from "next/link";
import { eur, time } from "@/lib/format";
import type { Expense } from "@/lib/data";

export function PageTitle({ children, right }: { children: React.ReactNode; right?: React.ReactNode }) {
  return (
    <header className="flex items-end justify-between pt-6">
      <h1 className="font-display text-[34px] leading-none font-bold tracking-tight">{children}</h1>
      {right}
    </header>
  );
}

export function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <section className={`border-line bg-surface rounded-[20px] border ${className}`}>{children}</section>;
}

export function CatBadge({ name, color }: { name: string | null; color: string | null }) {
  const c = color ?? "#6B645A";
  return (
    <span
      className="flex size-9 shrink-0 items-center justify-center rounded-xl text-[13px] font-bold"
      style={{ background: `${c}26`, color: c }}
      aria-hidden="true"
    >
      {(name ?? "?").slice(0, 2)}
    </span>
  );
}

export function ExpenseRow({ e, showDate }: { e: Expense; showDate?: boolean }) {
  const when = showDate
    ? new Intl.DateTimeFormat("nl-NL", { timeZone: "Europe/Amsterdam", weekday: "short", day: "numeric", month: "short" }).format(new Date(e.spent_at)) + " · " + time(e.spent_at)
    : time(e.spent_at);
  return (
    <Link
      href={e.carton_id ? "/voorraad" : `/toevoegen?id=${e.id}`}
      className="flex items-center gap-3 border-b border-[#2A2622] px-3.5 py-3 last:border-b-0 active:bg-surface-2"
    >
      <CatBadge name={e.cat_name} color={e.cat_color} />
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="truncate text-[15px] font-medium">{e.cat_name ?? "Geen categorie"}</span>
        <span className="text-muted truncate text-xs">
          {when}
          {e.note ? ` · ${e.note}` : ""}
        </span>
      </span>
      <span className="font-display text-base font-semibold">{eur(e.amount_cents)}</span>
    </Link>
  );
}

export function IconButtonLink({ href, label, children }: { href: string; label: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      aria-label={label}
      className="border-line bg-surface flex size-11 items-center justify-center rounded-full border"
    >
      {children}
    </Link>
  );
}

export const COLORS = ["#F2C230", "#E5533D", "#F0A35E", "#9AD77E", "#7CC4F0", "#D9A0E0", "#A39B8F", "#5FD3C0"];
