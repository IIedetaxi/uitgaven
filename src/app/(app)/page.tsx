"use client";

import Link from "next/link";
import { useMemo } from "react";
import { PageTitle, Segmented } from "@/components/ui";
import { SyncPill } from "@/components/app-shell";
import { StockCompact } from "@/components/stock";
import { ExpenseList } from "@/components/expense-list";
import { useData } from "@/lib/store";
import { useActions } from "@/lib/use-actions";
import { usePersisted } from "@/lib/use-persisted";
import { PERIODS, eur, fmtDayLong, periodData, sortedCategories, type PeriodKind } from "@/lib/stats";

export default function HomePage() {
  const data = useData();
  const actions = useActions();
  const [kind, setKind] = usePersisted<PeriodKind>("uitgaven:home-period", "dag");
  const p = useMemo(() => periodData(data, kind, 0), [data, kind]);
  const quick = useMemo(() => sortedCategories(data.categories).filter((c) => c.default_amount_cents != null), [data.categories]);

  return (
    <>
      <PageTitle sub={fmtDayLong(new Date())} right={<SyncPill />}>
        Uitgaven
      </PageTitle>

      <Segmented label="Periode" options={PERIODS} value={kind} onChange={setKind} />

      <section className="bg-yellow text-bg flex flex-col gap-3.5 rounded-3xl p-5 shadow-[0_12px_32px_rgba(242,194,48,0.12)]">
        <div className="flex items-center justify-between gap-2">
          <span className="text-[13px] font-semibold tracking-wider uppercase">Uitgegeven {p.title}</span>
          <span className="rounded-full bg-black/10 px-2.5 py-1 text-[13px] font-semibold">
            {p.count} {p.count === 1 ? "uitgave" : "uitgaven"}
          </span>
        </div>
        <div className="flex items-end justify-between gap-2">
          <div key={`${kind}-${p.total}`} className="font-display animate-pop text-[48px] leading-none font-bold tracking-tight">
            {eur(p.total)}
          </div>
          {p.delta && (
            <span className="mb-1 rounded-full bg-black/10 px-2 py-0.5 text-xs font-bold" title={p.delta.text}>
              {p.delta.up ? "▲" : "▼"} {p.delta.short}
            </span>
          )}
        </div>
        <div className="grid grid-cols-3 gap-2 border-t border-black/15 pt-3">
          {p.hero.map((s) => (
            <div key={s.k} className="flex min-w-0 flex-col gap-0.5">
              <span className="truncate text-xs font-medium">{s.k}</span>
              <span className="font-display truncate text-[16px] font-bold">{s.v}</span>
            </div>
          ))}
        </div>
      </section>

      {quick.length > 0 && (
        <section className="flex flex-col gap-2">
          <h2 className="text-muted px-1 text-[13px] font-semibold">Snel toevoegen</h2>
          <div className="-mx-5 flex gap-2 overflow-x-auto px-5 pb-1 [scrollbar-width:none]">
            {quick.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => actions.quickAdd(c)}
                className="border-line bg-surface flex h-11 shrink-0 items-center gap-2 rounded-full border pr-4 pl-3 text-sm font-semibold transition active:scale-95 active:bg-surface-2"
              >
                <span className="size-2.5 rounded-full" style={{ background: c.color }} aria-hidden="true" />
                {c.name}
                <span className="text-muted font-medium">{eur(c.default_amount_cents!)}</span>
              </button>
            ))}
            <Link href="/categorieen" className="text-muted flex h-11 shrink-0 items-center rounded-full border border-dashed border-[#4A443C] px-4 text-sm font-semibold">
              + Snelknop
            </Link>
          </div>
        </section>
      )}

      <StockCompact />

      <section className="flex flex-col gap-2.5">
        <div className="flex items-baseline justify-between px-1">
          <h2 className="text-[15px] font-semibold">Uitgaven {p.title}</h2>
          <Link href={`/overzicht?p=${kind}`} className="text-yellow text-[13px] font-semibold">
            Details ›
          </Link>
        </div>
        <ExpenseList expenses={p.expenses} limit={kind === "dag" ? 50 : 25} empty={`Nog niets uitgegeven ${p.title}. Tik op + om iets toe te voegen.`} />
      </section>
    </>
  );
}
