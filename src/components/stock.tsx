"use client";

import Link from "next/link";
import { startTransition, useOptimistic } from "react";
import { deleteCarton, takePack, togglePack } from "@/app/actions";
import { PackIcon } from "./pack";
import type { Carton } from "@/lib/data";

type Act = { type: "take" } | { type: "toggle"; id: number };

function reducer(cartons: Carton[], act: Act): Carton[] {
  if (act.type === "toggle") {
    return cartons.map((c) => {
      if (!c.packs.some((p) => p.id === act.id)) return c;
      const packs = c.packs.map((p) => (p.id === act.id ? { ...p, used: !p.used } : p));
      return { ...c, packs, used: packs.filter((p) => p.used).length };
    });
  }
  let done = false;
  return cartons.map((c) => {
    if (done) return c;
    const i = c.packs.findIndex((p) => !p.used);
    if (i === -1) return c;
    done = true;
    const packs = c.packs.map((p, j) => (j === i ? { ...p, used: true } : p));
    return { ...c, packs, used: c.used + 1 };
  });
}

const fmtDate = (d: string) =>
  new Intl.DateTimeFormat("nl-NL", { timeZone: "Europe/Amsterdam", day: "numeric", month: "short" }).format(new Date(d));
const fmtEur = (c: number) =>
  new Intl.NumberFormat("nl-NL", { style: "currency", currency: "EUR" }).format(c / 100).replace(/ /g, " ");

export function Stock({
  cartons,
  perDay,
  perDayText,
  variant,
}: {
  cartons: Carton[];
  perDay: number;
  perDayText: string;
  variant: "compact" | "full";
}) {
  const [list, dispatch] = useOptimistic(cartons, reducer);
  const left = list.reduce((s, c) => s + c.packs.filter((p) => !p.used).length, 0);
  const daysLeft = perDay > 0 ? Math.floor(left / perDay) : null;

  const take = () =>
    startTransition(async () => {
      dispatch({ type: "take" });
      await takePack();
    });
  const toggle = (id: number) =>
    startTransition(async () => {
      dispatch({ type: "toggle", id });
      await togglePack(id);
    });

  const takeButton = (big: boolean) => (
    <button
      type="button"
      onClick={take}
      disabled={left === 0}
      className={
        big
          ? "bg-red flex h-14 items-center justify-center gap-2.5 rounded-2xl text-[17px] font-bold text-white active:scale-[0.98] transition disabled:opacity-40"
          : "flex h-11 items-center justify-center gap-2 rounded-xl bg-[#2A2622] text-[15px] font-semibold active:scale-[0.98] transition disabled:opacity-40"
      }
    >
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={big ? "currentColor" : "#E5533D"} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <rect x="6" y="3" width="12" height="18" rx="2" />
        <path d="M6 8h12" />
      </svg>
      Pak er 1
    </button>
  );

  if (variant === "compact") {
    const current = list.find((c) => c.packs.some((p) => !p.used));
    return (
      <section className="border-line bg-surface flex flex-col gap-3 rounded-[20px] border p-4">
        <div className="flex items-baseline justify-between">
          <Link href="/voorraad" className="text-[15px] font-semibold">
            Voorraad ›
          </Link>
          <span className="text-muted text-[13px]">
            {left} pakjes{daysLeft != null ? ` · ±${daysLeft} dagen` : ""}
          </span>
        </div>
        {current ? (
          <>
            <div className="flex items-center gap-2">
              <div className="flex min-w-0 flex-1 flex-wrap gap-1">
                {current.packs.map((p) => (
                  <button key={p.id} type="button" onClick={() => toggle(p.id)} aria-label={`Pakje ${p.position}${p.used ? ", gebruikt" : ""}`}>
                    <PackIcon used={p.used} className="h-[31px] w-[22px]" />
                  </button>
                ))}
              </div>
              <span className="text-yellow shrink-0 text-[13px] font-semibold">
                {current.packs.filter((p) => p.used).length}/{current.packs_total}
              </span>
            </div>
            {takeButton(false)}
          </>
        ) : (
          <Link href="/voorraad/nieuw" className="flex h-11 items-center justify-center rounded-xl bg-[#2A2622] text-[15px] font-semibold">
            + Slof toevoegen
          </Link>
        )}
      </section>
    );
  }

  return (
    <>
      <section className="grid grid-cols-3 gap-2">
        <div className="bg-yellow text-bg flex flex-col gap-0.5 rounded-2xl p-3">
          <span className="text-xs font-semibold">Op voorraad</span>
          <span className="font-display text-[26px] leading-tight font-bold">{left}</span>
          <span className="text-xs font-medium">pakjes</span>
        </div>
        <div className="border-line bg-surface flex flex-col gap-0.5 rounded-2xl border p-3">
          <span className="text-muted text-xs font-medium">Gemiddeld</span>
          <span className="font-display text-[26px] leading-tight font-bold">{perDayText}</span>
          <span className="text-muted text-xs">pakjes / dag</span>
        </div>
        <div className="border-line bg-surface flex flex-col gap-0.5 rounded-2xl border p-3">
          <span className="text-muted text-xs font-medium">Genoeg voor</span>
          <span className="font-display text-[26px] leading-tight font-bold">{daysLeft != null ? `±${daysLeft}` : "—"}</span>
          <span className="text-muted text-xs">dagen</span>
        </div>
      </section>

      {takeButton(true)}
      <p className="text-muted -mt-2 text-center text-xs">
        Pakt het eerstvolgende pakje uit de oudste slof. Tik op een pakje om het te wisselen.
      </p>

      {list.length === 0 && (
        <div className="border-line text-muted rounded-[20px] border border-dashed p-6 text-center text-sm">
          Nog geen voorraad. Voeg een slof toe om te beginnen.
        </div>
      )}

      {list.map((c) => {
        const used = c.packs.filter((p) => p.used).length;
        const status = used === 0 ? ["Vol", "#24361F", "#9AD77E"] : used >= c.packs_total ? ["Op", "#3A2320", "#F08A78"] : ["Open", "#3A3020", "#F2C230"];
        return (
          <section key={c.id} className="border-line bg-surface flex flex-col gap-3 rounded-[20px] border p-4">
            <div className="flex items-start justify-between gap-2">
              <div className="flex min-w-0 flex-col gap-0.5">
                <span className="text-[15px] font-semibold">{c.label ? `Slof ${c.label}` : `Slof #${c.id}`}</span>
                <span className="text-muted text-xs">
                  Gekocht {fmtDate(c.bought_at)}
                  {c.price_cents > 0 ? ` · ${fmtEur(c.price_cents)} · geboekt als uitgave` : ""}
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
                  onClick={() => toggle(p.id)}
                  aria-label={`Pakje ${p.position}${p.used ? ", gebruikt" : ", vol"}`}
                  className="flex justify-center py-1 active:scale-95 transition"
                >
                  <PackIcon used={p.used} />
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2.5">
              <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-[#2A2622]">
                <div className="bg-red h-full rounded-full transition-all" style={{ width: `${(used / c.packs_total) * 100}%` }} />
              </div>
              <span className="text-muted text-[13px] font-semibold">
                {used}/{c.packs_total} gebruikt
              </span>
              <DeleteCartonButton id={c.id} />
            </div>
          </section>
        );
      })}
    </>
  );
}

export function DeleteCartonButton({ id }: { id: number }) {
  return (
    <button
      type="button"
      aria-label="Slof verwijderen"
      onClick={() => {
        if (confirm("Slof verwijderen? De bijbehorende uitgave wordt ook verwijderd.")) {
          startTransition(() => deleteCarton(id));
        }
      }}
      className="text-muted flex size-9 items-center justify-center rounded-full active:bg-surface-2"
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13" />
      </svg>
    </button>
  );
}
