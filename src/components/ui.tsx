"use client";

import type { Category, Expense } from "@/lib/types";
import { eur, fmtTime } from "@/lib/stats";

export const COLORS = ["#F2C230", "#E5533D", "#F0A35E", "#9AD77E", "#7CC4F0", "#D9A0E0", "#A39B8F", "#5FD3C0"];

export function PageTitle({ children, sub, right }: { children: React.ReactNode; sub?: string; right?: React.ReactNode }) {
  return (
    <header className="flex items-end justify-between gap-3 pt-5">
      <div className="flex min-w-0 flex-col gap-0.5">
        {sub && <span className="text-muted text-[13px] font-medium">{sub}</span>}
        <h1 className="font-display truncate text-[32px] leading-none font-bold tracking-tight">{children}</h1>
      </div>
      {right && <div className="flex shrink-0 items-center gap-2">{right}</div>}
    </header>
  );
}

export function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <section className={`border-line bg-surface rounded-[20px] border ${className}`}>{children}</section>;
}

export function CatBadge({ cat, size = 36 }: { cat: Pick<Category, "name" | "color"> | null | undefined; size?: number }) {
  const c = cat?.color ?? "#6B645A";
  return (
    <span
      className="flex shrink-0 items-center justify-center rounded-xl text-[13px] font-bold"
      style={{ background: `${c}26`, color: c, width: size, height: size }}
      aria-hidden="true"
    >
      {(cat?.name ?? "?").slice(0, 2)}
    </span>
  );
}

export function ExpenseRow({ e, cat, onClick }: { e: Expense; cat: Category | undefined; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-3 border-b border-[#2A2622] px-3.5 py-3 text-left transition-colors last:border-b-0 active:bg-surface-2"
    >
      <CatBadge cat={cat} />
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="truncate text-[15px] font-medium">{cat?.name ?? "Geen categorie"}</span>
        <span className="text-muted truncate text-xs">
          {fmtTime(e.spent_at)}
          {e.note ? ` · ${e.note}` : ""}
        </span>
      </span>
      <span className="font-display text-base font-semibold">{eur(e.amount_cents)}</span>
    </button>
  );
}

export function Segmented<T extends string>({
  options,
  value,
  onChange,
  label,
}: {
  options: { k: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
  label: string;
}) {
  const idx = Math.max(0, options.findIndex((o) => o.k === value));
  return (
    <div role="tablist" aria-label={label} className="border-line bg-surface relative grid rounded-[14px] border p-1" style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}>
      <span
        className="bg-yellow absolute top-1 bottom-1 left-1 rounded-[10px] transition-transform duration-250 ease-out"
        style={{ width: `calc((100% - 8px) / ${options.length})`, transform: `translateX(${idx * 100}%)` }}
        aria-hidden="true"
      />
      {options.map((o) => (
        <button
          key={o.k}
          type="button"
          role="tab"
          aria-selected={o.k === value}
          onClick={() => onChange(o.k)}
          className={`relative z-10 h-9 rounded-[10px] text-sm font-semibold transition-colors ${o.k === value ? "text-bg" : "text-muted"}`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Stepper({ value, onChange, min, max, label }: { value: number; onChange: (n: number) => void; min: number; max: number; label: string }) {
  const btn = "bg-surface-2 flex size-11 items-center justify-center rounded-xl text-xl font-semibold active:scale-95 transition disabled:opacity-30";
  return (
    <div className="flex items-center gap-2" role="group" aria-label={label}>
      <button type="button" className={btn} onClick={() => onChange(Math.max(min, value - 1))} disabled={value <= min} aria-label={`${label} minder`}>
        −
      </button>
      <span className="font-display w-10 text-center text-2xl font-bold" aria-live="polite">
        {value}
      </span>
      <button type="button" className={btn} onClick={() => onChange(Math.min(max, value + 1))} disabled={value >= max} aria-label={`${label} meer`}>
        +
      </button>
    </div>
  );
}

export const fieldCls =
  "border-line bg-surface-2 placeholder:text-faint h-12 w-full rounded-xl border px-3.5 text-[16px] outline-none transition-colors focus:border-yellow";
export const labelCls = "text-muted text-xs font-semibold tracking-wider uppercase";

export function Empty({ children }: { children: React.ReactNode }) {
  return <div className="border-line text-muted rounded-[20px] border border-dashed p-6 text-center text-sm">{children}</div>;
}

export function Icon({ d, size = 20, className = "" }: { d: string; size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={className}>
      <path d={d} />
    </svg>
  );
}
