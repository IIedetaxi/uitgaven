import Link from "next/link";
import { addCartons } from "@/app/actions";
import { getStock } from "@/lib/data";
import { centsToInput, toLocalInput } from "@/lib/format";
import { SubmitButton } from "@/components/submit-button";

export default async function NewCartonPage() {
  const { last } = await getStock();
  const field = "border-line bg-surface-2 h-12 rounded-xl border px-3.5 text-[16px] outline-none focus:border-yellow w-full";
  const lbl = "text-muted text-xs font-semibold tracking-wider uppercase";

  return (
    <>
      <header className="flex items-center justify-between pt-4">
        <Link href="/voorraad" className="text-muted py-2.5 pr-3 text-[15px] font-medium">
          Annuleer
        </Link>
        <h1 className="text-[17px] font-semibold">Slof toevoegen</h1>
        <span className="w-16" />
      </header>

      <form action={addCartons} className="flex flex-col gap-4">
        <div className="grid grid-cols-2 gap-3">
          <label className="flex flex-col gap-1.5">
            <span className={lbl}>Aantal sloffen</span>
            <input name="count" type="number" inputMode="numeric" min={1} max={20} defaultValue={1} className={field} />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className={lbl}>Pakjes per slof</span>
            <input name="packs" type="number" inputMode="numeric" min={1} max={40} defaultValue={last?.packs_total ?? 10} className={field} />
          </label>
        </div>
        <label className="flex flex-col gap-1.5">
          <span className={lbl}>Prijs per slof (€)</span>
          <input
            name="price"
            type="text"
            inputMode="decimal"
            placeholder="0,00"
            defaultValue={last ? centsToInput(last.price_cents) : ""}
            className={field}
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className={lbl}>Naam (optioneel)</span>
          <input name="label" type="text" placeholder="Bijv. Geel" defaultValue={last?.label ?? ""} className={field} />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className={lbl}>Gekocht op</span>
          <input name="bought_at" type="datetime-local" defaultValue={toLocalInput(new Date())} className={field} />
        </label>

        <div className="border-line bg-surface flex gap-3 rounded-2xl border p-3.5 text-sm">
          <span className="bg-red/15 text-red flex size-9 shrink-0 items-center justify-center rounded-xl font-bold" aria-hidden="true">
            €
          </span>
          <p className="text-muted">
            De prijs wordt per slof automatisch geboekt als uitgave in de categorie <strong className="text-ink">Sigaretten</strong>. Verwijder je de slof, dan verdwijnt die uitgave ook.
          </p>
        </div>

        <SubmitButton>Toevoegen</SubmitButton>
      </form>
    </>
  );
}
