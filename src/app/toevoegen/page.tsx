import { getCategories, getExpense } from "@/lib/data";
import { toLocalInput } from "@/lib/format";
import { AddForm } from "./add-form";

export const dynamic = "force-dynamic";

export default async function AddPage({ searchParams }: { searchParams: Promise<{ id?: string }> }) {
  const { id } = await searchParams;
  const [cats, expense] = await Promise.all([getCategories(), id ? getExpense(Number(id)) : null]);

  return (
    <main className="pt-safe pb-safe mx-auto flex min-h-dvh max-w-md flex-col px-5">
      <AddForm
        categories={cats.map((c) => ({ id: c.id, name: c.name, color: c.color, def: c.default_amount_cents }))}
        initial={
          expense
            ? {
                id: expense.id,
                cents: expense.amount_cents,
                categoryId: expense.category_id,
                note: expense.note ?? "",
                spentAt: toLocalInput(expense.spent_at),
              }
            : { id: null, cents: 0, categoryId: null, note: "", spentAt: toLocalInput(new Date()) }
        }
      />
    </main>
  );
}
