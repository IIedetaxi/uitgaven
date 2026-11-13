"use client";

import { useMemo } from "react";
import { Card, CatBadge, PageTitle } from "@/components/ui";
import { useSheets } from "@/components/sheets";
import { useData } from "@/lib/store";
import { eur, sortedCategories } from "@/lib/stats";
import { logout } from "@/app/actions";

export default function CategoriesPage() {
  const data = useData();
  const { openCategory } = useSheets();
  const cats = useMemo(() => sortedCategories(data.categories), [data.categories]);
  const counts = useMemo(() => {
    const m = new Map<number, number>();
    for (const e of data.expenses) if (e.category_id != null) m.set(e.category_id, (m.get(e.category_id) ?? 0) + 1);
    return m;
  }, [data.expenses]);

  return (
    <>
      <PageTitle
        right={
          <button
            type="button"
            onClick={() => openCategory()}
            className="bg-yellow text-bg flex h-10 items-center gap-1.5 rounded-full px-3.5 text-sm font-bold transition active:scale-95"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true">
              <path d="M12 5v14M5 12h14" />
            </svg>
            Nieuw
          </button>
        }
      >
        Categorieën
      </PageTitle>

      <p className="text-muted -mt-2 px-1 text-sm">Geef een categorie een standaardbedrag om hem als snelknop op het beginscherm te krijgen.</p>

      <Card className="flex flex-col overflow-hidden">
        {cats.map((c) => (
          <button
            key={c.id}
            type="button"
            onClick={() => openCategory(c)}
            className="flex items-center gap-3 border-b border-[#2A2622] px-3.5 py-3 text-left transition-colors last:border-b-0 active:bg-surface-2"
          >
            <CatBadge cat={c} />
            <span className="flex min-w-0 flex-1 flex-col">
              <span className="text-[15px] font-medium">{c.name}</span>
              <span className="text-muted text-xs">
                {counts.get(c.id) ?? 0} uitgaven
                {c.system_key === "cigarettes" ? " · sloffen" : ""}
              </span>
            </span>
            {c.default_amount_cents != null && (
              <span className="bg-yellow/15 text-yellow rounded-full px-2.5 py-1 text-xs font-bold">⚡ {eur(c.default_amount_cents)}</span>
            )}
            <svg className="text-muted" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
              <path d="M9 6l6 6-6 6" />
            </svg>
          </button>
        ))}
      </Card>

      <form
        action={logout}
        className="mt-4"
        onSubmit={() => {
          try {
            Object.keys(localStorage).filter((k) => k.startsWith("uitgaven:")).forEach((k) => localStorage.removeItem(k));
          } catch {}
        }}
      >
        <button type="submit" className="border-line text-muted h-12 w-full rounded-[14px] border text-sm font-semibold">
          Uitloggen
        </button>
      </form>
    </>
  );
}
