import Link from "next/link";
import { getPeriodData, type PeriodKind } from "@/lib/data";
import { eur } from "@/lib/format";
import { Card, ExpenseRow, PageTitle } from "@/components/ui";

const TABS: { k: PeriodKind; label: string }[] = [
  { k: "dag", label: "Dag" },
  { k: "week", label: "Week" },
  { k: "maand", label: "Maand" },
  { k: "jaar", label: "Jaar" },
];

export default async function OverviewPage({ searchParams }: { searchParams: Promise<{ p?: string; o?: string }> }) {
  const sp = await searchParams;
  const kind: PeriodKind = TABS.some((t) => t.k === sp.p) ? (sp.p as PeriodKind) : "week";
  const offset = Math.min(0, parseInt(sp.o ?? "0", 10) || 0);
  const d = await getPeriodData(kind, offset);
  const max = Math.max(1, ...d.bars.map((b) => b.cents));
  const catMax = Math.max(1, ...d.categories.map((c) => c.cents));
  const href = (o: number) => `/overzicht?p=${kind}${o ? `&o=${o}` : ""}`;

  return (
    <>
      <PageTitle>Overzicht</PageTitle>

      <nav className="border-line bg-surface grid grid-cols-4 gap-1 rounded-[14px] border p-1" aria-label="Periode">
        {TABS.map((t) => (
          <Link
            key={t.k}
            href={`/overzicht?p=${t.k}`}
            aria-current={t.k === kind ? "page" : undefined}
            className={`flex h-10 items-center justify-center rounded-[10px] text-sm font-semibold ${
              t.k === kind ? "bg-yellow text-bg" : "text-muted"
            }`}
          >
            {t.label}
          </Link>
        ))}
      </nav>

      <div className="-my-1 flex items-center justify-between">
        <Link href={href(offset - 1)} aria-label="Vorige periode" className="text-muted flex size-11 items-center justify-center rounded-full">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
            <path d="M15 6l-6 6 6 6" />
          </svg>
        </Link>
        <span className="text-[15px] font-semibold">{d.label}</span>
        {offset < 0 ? (
          <Link href={href(offset + 1)} aria-label="Volgende periode" className="text-muted flex size-11 items-center justify-center rounded-full">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
              <path d="M9 6l6 6-6 6" />
            </svg>
          </Link>
        ) : (
          <span className="size-11" />
        )}
      </div>

      <Card className="flex flex-col gap-4 p-[18px]">
        <div className="flex items-end justify-between gap-2">
          <div className="flex flex-col gap-1">
            <span className="text-muted text-xs font-semibold tracking-wider uppercase">Totaal</span>
            <span className="font-display text-[40px] leading-none font-bold tracking-tight">{eur(d.total)}</span>
          </div>
          {d.delta && (
            <span
              className="rounded-full bg-[#2A2622] px-2.5 py-1 text-right text-xs font-semibold"
              style={{ color: d.delta.up ? "#F0A35E" : "#8CC9F2" }}
            >
              {d.delta.text}
            </span>
          )}
        </div>
        <div className="flex h-[140px] items-end gap-1" role="img" aria-label="Uitgaven per deel van de periode">
          {d.bars.map((b, i) => (
            <div key={i} className="flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-1.5">
              <div
                className="w-full max-w-7 rounded-md"
                title={eur(b.cents)}
                style={{
                  height: `${b.cents ? Math.max(4, Math.round((b.cents / max) * 112)) : 4}px`,
                  background: b.cents === 0 ? "#2A2622" : b.current ? "#F2C230" : "#6B5A2A",
                }}
              />
              <span className="text-muted h-3 text-[10px] leading-3 font-medium">{b.label}</span>
            </div>
          ))}
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
        <Card className="flex flex-col gap-3 p-4">
          <h2 className="text-[15px] font-semibold">Per categorie</h2>
          {d.categories.map((c) => (
            <div key={c.name} className="flex flex-col gap-1.5">
              <div className="flex justify-between text-sm">
                <span className="flex items-center gap-2">
                  <span className="size-2.5 rounded-full" style={{ background: c.color }} aria-hidden="true" />
                  {c.name}
                </span>
                <span className="font-semibold">
                  {eur(c.cents)} <span className="text-muted font-medium">· {Math.round((c.cents / Math.max(1, d.total)) * 100)}%</span>
                </span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-[#2A2622]">
                <div className="h-full rounded-full" style={{ width: `${(c.cents / catMax) * 100}%`, background: c.color }} />
              </div>
            </div>
          ))}
        </Card>
      )}

      {(kind === "dag" || kind === "week") && d.expenses.length > 0 && (
        <section className="flex flex-col gap-2.5">
          <h2 className="text-muted text-[15px] font-semibold">Uitgaven</h2>
          <Card className="flex flex-col overflow-hidden">
            {d.expenses.map((e) => (
              <ExpenseRow key={e.id} e={e} showDate={kind === "week"} />
            ))}
          </Card>
        </section>
      )}
    </>
  );
}
