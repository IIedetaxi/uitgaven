"use client";

import { useMemo, useState } from "react";
import { Card, Empty, ExpenseRow } from "./ui";
import { useSheets } from "./sheets";
import { useData } from "@/lib/store";
import { eur, groupByDay } from "@/lib/stats";
import type { Expense } from "@/lib/types";

export function ExpenseList({ expenses, empty, limit = 40 }: { expenses: Expense[]; empty: string; limit?: number }) {
  const data = useData();
  const { openExpense } = useSheets();
  const [showAll, setShowAll] = useState(false);
  const cats = useMemo(() => new Map(data.categories.map((c) => [c.id, c])), [data.categories]);
  const shown = showAll ? expenses : expenses.slice(0, limit);
  const groups = useMemo(() => groupByDay(shown), [shown]);

  if (!expenses.length) return <Empty>{empty}</Empty>;

  return (
    <div className="flex flex-col gap-4">
      {groups.map((g) => (
        <section key={g.key} className="flex flex-col gap-2">
          <div className="flex items-baseline justify-between px-1">
            <h3 className="text-muted text-[13px] font-semibold">{g.label}</h3>
            <span className="text-muted text-[13px] font-semibold">{eur(g.total)}</span>
          </div>
          <Card className="flex flex-col overflow-hidden">
            {g.items.map((e) => (
              <ExpenseRow key={e.id} e={e} cat={e.category_id != null ? cats.get(e.category_id) : undefined} onClick={() => openExpense(e)} />
            ))}
          </Card>
        </section>
      ))}
      {!showAll && expenses.length > limit && (
        <button type="button" onClick={() => setShowAll(true)} className="border-line text-muted h-12 rounded-[14px] border text-sm font-semibold">
          Toon alle {expenses.length} uitgaven
        </button>
      )}
    </div>
  );
}
