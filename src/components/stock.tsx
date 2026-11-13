"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { PackIcon } from "./pack";
import { useSheets } from "./sheets";
import { useData } from "@/lib/store";
import { useActions } from "@/lib/use-actions";
import { eur, fmtDayShort, num, stockData, type CartonView } from "@/lib/stats";

function TakeButton({ big, disabled, onClick }: { big?: boolean; disabled: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={
        big
          ? "bg-red flex h-14 items-center justify-center gap-2.5 rounded-2xl text-[17px] font-bold text-white shadow-[0_8px_20px_rgba(229,83,61,0.25)] transition active:scale-[0.97] disabled:opacity-40 disabled:shadow-none"
          : "flex h-11 items-center justify-center gap-2 rounded-xl bg-[#2A2622] text-[15px] font-semibold transition active:scale-[0.97] disabled:opacity-40"
      }
    >
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={big ? "currentColor" : "#E5533D"} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <rect x="6" y="3" width="12" height="18" rx="2" />
        <path d="M6 8h12" />
      </svg>
      Pak er 1
    </button>
  );
}

export function StockCompact() {
  const data = useData();
  const actions = useActions();
  const { openCarton } = useSheets();
  const s = useMemo(() => stockData(data), [data]);
  const current = s.open[0];

  return (
    <section className="border-line bg-surface flex flex-col gap-3 rounded-[20px] border p-4">
      <div className="flex items-baseline justify-between gap-2">
        <Link href="/voorraad" className="text-[15px] font-semibold">
          Voorraad <span className="text-muted">›</span>
        </Link>
        <span className="text-muted text-[13px]">
          {s.left} {s.left === 1 ? "pakje" : "pakjes"}
          {s.daysLeft != null ? ` · ±${s.daysLeft} ${s.daysLeft === 1 ? "dag" : "dagen"}` : ""}
          {s.usedToday ? ` · ${s.usedToday} vandaag` : ""}
        </span>
      </div>
      {current ? (
        <>
          <div className="flex items-center gap-2">
            <div className="flex min-w-0 flex-1 flex-wrap gap-1">
              {current.packs.map((p) => (
                <button key={p.id} type="button" onClick={() => actions.togglePack(p)} aria-label={`Pakje ${p.position}${p.used_at ? ", gebruikt" : ""}`} className="transition active:scale-90">
                  <PackIcon used={!!p.used_at} className="h-[31px] w-[22px]" />
                </button>
              ))}
            </div>
            <span className="text-yellow shrink-0 text-[13px] font-semibold">
              {current.used}/{current.packs.length}
            </span>
          </div>
          <TakeButton disabled={!s.next} onClick={() => actions.takePack(s.next)} />
        </>
      ) : (
        <button type="button" onClick={openCarton} className="flex h-11 items-center justify-center rounded-xl bg-[#2A2622] text-[15px] font-semibold active:scale-[0.97] transition">
          + Slof toevoegen
        </button>
      )}
    </section>
  );
}

function CartonCard({ c }: { c: CartonView }) {
  const actions = useActions();
  const [confirm, setConfirm] = useState(false);
  const status = c.used === 0 ? ["Vol", "#24361F", "#9AD77E"] : c.used >= c.packs.length ? ["Op", "#3A2320", "#F08A78"] : ["Open", "#3A3020", "#F2C230"];
  return (
    <section className="border-line bg-surface flex flex-col gap-3 rounded-[20px] border p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 flex-col gap-0.5">
          <span className="text-[15px] font-semibold">{c.label ? `Slof ${c.label}` : "Slof"}</span>
          <span className="text-muted text-xs">
            Gekocht {fmtDayShort(c.bought_at)}
            {c.price_cents > 0 ? ` · ${eur(c.price_cents)} geboekt` : ""}
          </span>
        </div>
        <span className="rounded-full px-2.5 py-1 text-xs font-bold" style={{ background: status[1], color: status[2] }}>
          {status[0]}
        </span>
      </div>
      <div className="grid grid-cols-5 gap-2">
        {c.packs.map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => actions.togglePack(p)}
            aria-label={`Pakje ${p.position}${p.used_at ? ", gebruikt" : ", vol"}`}
            className="flex justify-center py-1 transition active:scale-90"
          >
            <PackIcon used={!!p.used_at} />
          </button>
        ))}
      </div>
      <div className="flex items-center gap-2.5">
        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-[#2A2622]">
          <div className="bg-red h-full rounded-full transition-all duration-300" style={{ width: `${(c.used / Math.max(1, c.packs.length)) * 100}%` }} />
        </div>
        <span className="text-muted text-[13px] font-semibold">
          {c.used}/{c.packs.length}
        </span>
        <button
          type="button"
          onClick={() => {
            if (!confirm) {
              setConfirm(true);
              setTimeout(() => setConfirm(false), 3000);
              return;
            }
            actions.deleteCarton(c);
          }}
          aria-label="Slof verwijderen"
          className={`flex h-9 items-center justify-center rounded-full px-2.5 text-xs font-semibold transition ${confirm ? "bg-red text-white" : "text-muted"}`}
        >
          {confirm ? (
            "Verwijderen?"
          ) : (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13" />
            </svg>
          )}
        </button>
      </div>
    </section>
  );
}

export function StockFull() {
  const data = useData();
  const actions = useActions();
  const { openCarton } = useSheets();
  const s = useMemo(() => stockData(data), [data]);

  return (
    <>
      <section className="grid grid-cols-3 gap-2">
        <div className="bg-yellow text-bg flex flex-col gap-0.5 rounded-2xl p-3">
          <span className="text-xs font-semibold">Op voorraad</span>
          <span className="font-display text-[26px] leading-tight font-bold">{s.left}</span>
          <span className="text-xs font-medium">pakjes</span>
        </div>
        <div className="border-line bg-surface flex flex-col gap-0.5 rounded-2xl border p-3">
          <span className="text-muted text-xs font-medium">Gemiddeld</span>
          <span className="font-display text-[26px] leading-tight font-bold">{num(s.perDay)}</span>
          <span className="text-muted text-xs">pakjes / dag</span>
        </div>
        <div className="border-line bg-surface flex flex-col gap-0.5 rounded-2xl border p-3">
          <span className="text-muted text-xs font-medium">Genoeg voor</span>
          <span className="font-display text-[26px] leading-tight font-bold">{s.daysLeft != null ? `±${s.daysLeft}` : "—"}</span>
          <span className="text-muted text-xs">dagen</span>
        </div>
      </section>

      <TakeButton big disabled={!s.next} onClick={() => actions.takePack(s.next)} />
      <p className="text-muted -mt-2 text-center text-xs">
        {s.usedToday ? `Vandaag ${s.usedToday} ${s.usedToday === 1 ? "pakje" : "pakjes"} gepakt. ` : ""}Tik op een pakje om het om te zetten.
      </p>

      {s.open.length === 0 && (
        <button type="button" onClick={openCarton} className="border-line text-muted rounded-[20px] border border-dashed p-8 text-center text-sm">
          Nog geen voorraad.
          <span className="text-yellow mt-1 block font-semibold">+ Voeg een slof toe</span>
        </button>
      )}

      {s.open.map((c) => (
        <CartonCard key={c.id} c={c} />
      ))}

      {s.empty.length > 0 && (
        <details className="border-line group rounded-[16px] border border-dashed">
          <summary className="text-muted flex h-12 cursor-pointer items-center justify-center gap-1 text-sm font-semibold">
            {s.empty.length} lege {s.empty.length === 1 ? "slof" : "sloffen"}
            <span className="transition group-open:rotate-90">›</span>
          </summary>
          <div className="flex flex-col gap-3 p-3 pt-0">
            {s.empty.map((c) => (
              <CartonCard key={c.id} c={c} />
            ))}
          </div>
        </details>
      )}
    </>
  );
}
