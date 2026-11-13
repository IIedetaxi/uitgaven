import Link from "next/link";
import { getCategories, getStock, getTodayData } from "@/lib/data";
import { cap, dateLong, eur } from "@/lib/format";
import { Card, ExpenseRow, IconButtonLink } from "@/components/ui";
import { QuickAdd } from "@/components/quick-add";
import { Stock } from "@/components/stock";

export default async function TodayPage() {
  const [d, cats, stock] = await Promise.all([getTodayData(), getCategories(), getStock()]);
  const quick = cats.filter((c) => c.default_amount_cents != null);

  return (
    <>
      <header className="flex items-end justify-between pt-6">
        <div className="flex flex-col gap-0.5">
          <span className="text-muted text-[13px] font-medium">{cap(dateLong(new Date()))}</span>
          <h1 className="font-display text-[34px] leading-none font-bold tracking-tight">Vandaag</h1>
        </div>
        <IconButtonLink href="/categorieen" label="Categorieën en instellingen">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M4 6h16M4 12h10M4 18h6" />
            <circle cx="18" cy="16" r="3" />
          </svg>
        </IconButtonLink>
      </header>

      <section className="bg-yellow text-bg flex flex-col gap-3.5 rounded-3xl p-5">
        <div className="flex items-center justify-between">
          <span className="text-[13px] font-semibold tracking-wider uppercase">Uitgegeven vandaag</span>
          <span className="rounded-full bg-black/10 px-2.5 py-1 text-[13px] font-semibold">
            {d.today.length} {d.today.length === 1 ? "uitgave" : "uitgaven"}
          </span>
        </div>
        <div className="font-display text-[52px] leading-none font-bold tracking-tight">{eur(d.todayTotal)}</div>
        <div className="grid grid-cols-3 gap-2 border-t border-black/15 pt-3">
          {[
            ["Deze week", d.week],
            ["Deze maand", d.month],
            ["Gem. / dag", d.avgDay],
          ].map(([k, v]) => (
            <div key={k as string} className="flex flex-col gap-0.5">
              <span className="text-xs font-medium">{k}</span>
              <span className="font-display text-[17px] font-bold">{eur(v as number)}</span>
            </div>
          ))}
        </div>
      </section>

      {quick.length > 0 && (
        <section className="flex flex-col gap-2">
          <h2 className="text-muted text-[13px] font-semibold">Snel toevoegen</h2>
          <div className="-mx-5 flex gap-2 overflow-x-auto px-5 pb-1 [scrollbar-width:none]">
            {quick.map((c) => (
              <QuickAdd key={c.id} id={c.id} name={c.name} color={c.color} amount={eur(c.default_amount_cents!)} />
            ))}
          </div>
        </section>
      )}

      <Stock cartons={stock.open} perDay={stock.perDay} perDayText={stock.perDayText} variant="compact" />

      <section className="flex flex-col gap-2.5">
        <h2 className="text-muted text-[15px] font-semibold">Vandaag</h2>
        {d.today.length ? (
          <Card className="flex flex-col overflow-hidden">
            {d.today.map((e) => (
              <ExpenseRow key={e.id} e={e} />
            ))}
          </Card>
        ) : (
          <div className="border-line text-muted rounded-[20px] border border-dashed p-6 text-center text-sm">
            Nog niets uitgegeven vandaag.
          </div>
        )}
      </section>

      <Link
        href="/toevoegen"
        aria-label="Uitgave toevoegen"
        className="bg-yellow text-bg fixed right-5 bottom-[calc(max(env(safe-area-inset-bottom),12px)+80px)] z-30 flex size-16 items-center justify-center rounded-full shadow-[0_8px_24px_rgba(0,0,0,0.45)] active:scale-95 transition"
      >
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true">
          <path d="M12 5v14M5 12h14" />
        </svg>
      </Link>
    </>
  );
}
