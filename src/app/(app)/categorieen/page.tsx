import { deleteCategory, logout, saveCategory } from "@/app/actions";
import { getCategories, type Category } from "@/lib/data";
import { centsToInput, eur } from "@/lib/format";
import { COLORS, Card, CatBadge, PageTitle } from "@/components/ui";
import { SubmitButton } from "@/components/submit-button";

const field = "border-line bg-surface-2 h-11 w-full rounded-xl border px-3.5 text-[16px] outline-none focus:border-yellow";
const lbl = "text-muted text-xs font-semibold tracking-wider uppercase";

function CategoryFields({ c }: { c?: Category }) {
  const current = c?.color ?? COLORS[0];
  const colors = COLORS.includes(current) ? COLORS : [current, ...COLORS];
  return (
    <>
      {c && <input type="hidden" name="id" value={c.id} />}
      <label className="flex flex-col gap-1.5">
        <span className={lbl}>Naam</span>
        <input name="name" required defaultValue={c?.name} placeholder="Bijv. Tanken" className={field} />
      </label>
      <label className="flex flex-col gap-1.5">
        <span className={lbl}>Standaardbedrag (optioneel)</span>
        <input
          name="default_amount"
          inputMode="decimal"
          placeholder="Bijv. 3,20"
          defaultValue={centsToInput(c?.default_amount_cents)}
          className={field}
        />
        <span className="text-muted text-xs">Met een bedrag verschijnt de categorie als snelknop op Vandaag.</span>
      </label>
      <fieldset className="flex flex-col gap-1.5">
        <legend className={`${lbl} mb-1.5`}>Kleur</legend>
        <div className="flex flex-wrap gap-2">
          {colors.map((col) => (
            <label key={col} className="relative cursor-pointer">
              <input type="radio" name="color" value={col} defaultChecked={col === current} className="peer sr-only" aria-label={col} />
              <span
                className="peer-checked:ring-ink peer-focus-visible:ring-yellow block size-9 rounded-full ring-2 ring-transparent ring-offset-2 ring-offset-[#1E1B18]"
                style={{ background: col }}
              />
            </label>
          ))}
        </div>
      </fieldset>
    </>
  );
}

export default async function CategoriesPage() {
  const cats = await getCategories();
  return (
    <>
      <PageTitle>Categorieën</PageTitle>

      <Card className="p-4">
        <details>
          <summary className="flex cursor-pointer items-center justify-between text-[15px] font-semibold">
            Nieuwe categorie
            <span className="bg-yellow text-bg flex size-8 items-center justify-center rounded-full text-xl leading-none" aria-hidden="true">
              +
            </span>
          </summary>
          <form action={saveCategory} className="mt-4 flex flex-col gap-4">
            <CategoryFields />
            <SubmitButton className="bg-yellow text-bg h-12 rounded-xl font-bold disabled:opacity-50">Aanmaken</SubmitButton>
          </form>
        </details>
      </Card>

      <Card className="flex flex-col overflow-hidden">
        {cats.map((c) => (
          <details key={c.id} className="group border-b border-[#2A2622] last:border-b-0">
            <summary className="flex cursor-pointer items-center gap-3 px-3.5 py-3">
              <CatBadge name={c.name} color={c.color} />
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="text-[15px] font-medium">{c.name}</span>
                <span className="text-muted text-xs">
                  {c.default_amount_cents != null ? `Standaard ${eur(c.default_amount_cents)}` : "Geen standaardbedrag"}
                  {c.system_key === "cigarettes" ? " · sloffen worden hier geboekt" : ""}
                </span>
              </span>
              <svg className="text-muted transition group-open:rotate-90" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                <path d="M9 6l6 6-6 6" />
              </svg>
            </summary>
            <div className="flex flex-col gap-3 px-3.5 pb-4">
              <form action={saveCategory} className="flex flex-col gap-4">
                <CategoryFields c={c} />
                <SubmitButton className="bg-yellow text-bg h-11 rounded-xl font-bold disabled:opacity-50">Opslaan</SubmitButton>
              </form>
              {c.system_key == null && (
                <form action={deleteCategory.bind(null, c.id)}>
                  <button type="submit" className="text-red h-11 w-full rounded-xl border border-[#3A2320] text-sm font-semibold">
                    Verwijderen (uitgaven blijven bewaard)
                  </button>
                </form>
              )}
            </div>
          </details>
        ))}
      </Card>

      <form action={logout}>
        <button type="submit" className="border-line text-muted h-12 w-full rounded-[14px] border text-sm font-semibold">
          Uitloggen
        </button>
      </form>
    </>
  );
}
