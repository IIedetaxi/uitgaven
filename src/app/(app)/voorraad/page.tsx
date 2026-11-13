import Link from "next/link";
import { getStock } from "@/lib/data";
import { dateShort, eur } from "@/lib/format";
import { PageTitle } from "@/components/ui";
import { DeleteCartonButton, Stock } from "@/components/stock";

export default async function StockPage() {
  const s = await getStock();
  return (
    <>
      <PageTitle
        right={
          <Link
            href="/voorraad/nieuw"
            className="border-line bg-surface flex h-10 items-center gap-1.5 rounded-full border px-3.5 text-sm font-semibold"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
              <path d="M12 5v14M5 12h14" />
            </svg>
            Slof
          </Link>
        }
      >
        Voorraad
      </PageTitle>

      <Stock cartons={s.open} perDay={s.perDay} perDayText={s.perDayText} variant="full" />

      {s.empty.length > 0 && (
        <details className="border-line rounded-[14px] border border-dashed">
          <summary className="text-muted flex h-12 cursor-pointer items-center justify-center text-sm font-semibold">
            {s.empty.length} lege {s.empty.length === 1 ? "slof" : "sloffen"} bekijken
          </summary>
          <ul className="flex flex-col px-3 pb-2">
            {s.empty.map((c) => (
              <li key={c.id} className="flex items-center justify-between border-t border-[#2A2622] py-2 text-sm">
                <span>
                  {c.label ? `Slof ${c.label}` : `Slof #${c.id}`}
                  <span className="text-muted">
                    {" "}
                    · {dateShort(c.bought_at)}
                    {c.price_cents ? ` · ${eur(c.price_cents)}` : ""}
                  </span>
                </span>
                <DeleteCartonButton id={c.id} />
              </li>
            ))}
          </ul>
        </details>
      )}
    </>
  );
}
