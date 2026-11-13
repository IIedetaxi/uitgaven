"use client";

import { Suspense, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Card, PageTitle, Segmented } from "@/components/ui";
import { ExpenseList } from "@/components/expense-list";
import { useData } from "@/lib/store";
import { PERIODS, eur, periodData, type PeriodKind } from "@/lib/stats";

function Overview() {
  const data = useData();
  const router = useRouter();
  const sp = useSearchParams();
  const kind: PeriodKind = PERIODS.some((t) => t.k === sp.get("p")) ? (sp.get("p") as PeriodKind) : "week";
  const offset = Math.min(0, parseInt(sp.get("o") ?? "0", 10) || 0);
  const [catFilter, setCatFilter] = useState<string | null>(null);
  const d = useMemo(() => periodData(data, kind, offset), [data, kind, offset]);
  const max = Math.max(1, ...d.bars.map((b) => b.cents));
  const catMax = Math.max(1, ...d.categories.map((c) => c.cents));

  const go = (k: PeriodKind, o: number) => {
    setCatFilter(null);
    router.replace(`/overzicht?p=${k}${o ? `&o=${o}` : ""}`, { scroll: false });
  };
  const list = catFilter == null ? d.expenses : d.expenses.filter((e) => String(e.category_id ?? "none") === catFilter);

  // Vegen links/rechts om van periode te wisselen
  const [touchX, setTouchX] = useState<number | null>(null);

  return (
    <>
      <PageTitle>Overzicht</PageTitle>
      <Segmented label="Periode" options={PERIODS} value={kind} onChange={(k) => go(k, 0)} />

      <div className="-my-1 flex items-center justify-between">
        <button type="button" onClick={() => go(kind, offset - 1)} aria-label="Vorige periode" className="text-muted flex size-11 items-center justify-center rounded-full active:bg-surface">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
            <path d="M15 6l-6 6 6 6" />
          </svg>
        </button>
        <button type="button" onClick={() => offset && go(kind, 0)} className="flex flex-col items-center">
          <span className="text-[15px] font-semibold">{d.label}</span>
          {offset < 0 && <span className="text-yellow text-[11px] font-semibold">Terug naar nu</span>}
        </button>
        <button
          type="button"
          onClick={() => go(kind, offset + 1)}
          disabled={offset >= 0}
          aria-label="Volgende periode"
          className="text-muted flex size-11 items-center justify-center rounded-full active:bg-surface disabled:opacity-20"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
            <path d="M9 6l6 6-6 6" />
          </svg>
        </button>
      </div>

      <Card className="flex flex-col gap-4 p-[18px]">
        <div
          className="flex flex-col gap-4"
          onTouchStart={(e) => setTouchX(e.touches[0].clientX)}
          onTouchEnd={(e) => {
            if (touchX == null) return;
            const dx = e.changedTouches[0].clientX - touchX;
            setTouchX(null);
            if (dx > 60) go(kind, offset - 1);
            else if (dx < -60 && offset < 0) go(kind, offset + 1);
          }}
        >
          <div className="flex items-end justify-between gap-2">
            <div className="flex flex-col gap-1">
              <span className="text-muted text-xs font-semibold tracking-wider uppercase">Totaal · {d.count} uitgaven</span>
              <span key={`${kind}${offset}`} className="font-display animate-pop text-[40px] leading-none font-bold tracking-tight">
                {eur(d.total)}
              </span>
            </div>
            {d.delta && (
              <span className="rounded-full bg-[#2A2622] px-2.5 py-1 text-right text-xs font-semibold" style={{ color: d.delta.up ? "#F0A35E" : "#8CC9F2" }}>
                {d.delta.text}
              </span>
            )}
          </div>
          <div className="flex h-[140px] items-end gap-1" role="img" aria-label="Uitgaven per deel van de periode">
            {d.bars.map((b, i) => (
              <div key={i} className="flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-1.5">
                <div
                  className="w-full max-w-7 origin-bottom rounded-md transition-all duration-300 ease-out"
                  title={eur(b.cents)}
                  style={{
                    height: `${b.cents ? Math.max(4, Math.round((b.cents / max) * 112)) : 4}px`,
                    background: b.cents === 0 ? "#2A2622" : b.current ? "#F2C230" : "#8A7434",
                  }}
                />
                <span className="text-muted h-3 text-[10px] leading-3 font-medium">{b.label}</span>
              </div>
            ))}
          </div>
        </div>
      </Card>

      <section className="grid grid-cols-2 gap-2.5">
        {d.stats.map((s) => (
          <Card key={s.k} className="flex flex-col gap-1 rounded-2xl p-3.5">
            <span className="text-muted text-xs font-medium">{s.k}</span>
            <span className="font-display text-xl font-bold">{s.v}</span>
          </Card>
        ))}
      </section>

      {d.categories.length > 0 && (
        <Card className="flex flex-col gap-1 p-2">
          <h2 className="px-2 pt-2 pb-1 text-[15px] font-semibold">Per categorie</h2>
          {d.categories.map((c) => {
            const key = String(c.id ?? "none");
            const on = catFilter === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => setCatFilter(on ? null : key)}
                aria-pressed={on}
                className={`flex flex-col gap-1.5 rounded-xl p-2 text-left transition ${on ? "bg-surface-2" : ""} ${catFilter && !on ? "opacity-45" : ""}`}
              >
                <div className="flex w-full justify-between text-sm">
                  <span className="flex items-center gap-2">
                    <span className="size-2.5 rounded-full" style={{ background: c.color }} aria-hidden="true" />
                    {c.name}
                    <span className="text-muted text-xs">×{c.count}</span>
                  </span>
                  <span className="font-semibold">
                    {eur(c.cents)} <span className="text-muted font-medium">· {Math.round((c.cents / Math.max(1, d.total)) * 100)}%</span>
                  </span>
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-[#2A2622]">
                  <div className="h-full rounded-full transition-all duration-300" style={{ width: `${(c.cents / catMax) * 100}%`, background: c.color }} />
                </div>
              </button>
            );
          })}
        </Card>
      )}

      <section className="flex flex-col gap-2.5">
        <h2 className="px-1 text-[15px] font-semibold">
          Uitgaven{catFilter ? ` · ${d.categories.find((c) => String(c.id ?? "none") === catFilter)?.name}` : ""}
        </h2>
        <ExpenseList expenses={list} empty="Geen uitgaven in deze periode." />
      </section>
    </>
  );
}

export default function OverviewPage() {
  return (
    <Suspense>
      <Overview />
    </Suspense>
  );
}
