"use client";

import { useMemo } from "react";
import { useToast } from "@/components/toast";
import { newId, useStore } from "./store";
import { eur } from "./stats";
import type { Category, Expense, Pack } from "./types";
import type { CartonView } from "./stats";

/** Alle acties: direct lokaal zichtbaar, op de achtergrond opgeslagen, met melding (en waar zinvol: ongedaan maken). */
export function useActions() {
  const { data, dispatch } = useStore();
  const toast = useToast();

  return useMemo(() => {
    const catName = (id: number | null) => data?.categories.find((c) => c.id === id)?.name ?? "Uitgave";

    return {
      saveExpense(e: Omit<Expense, "id" | "carton_id"> & { id?: number; carton_id?: number | null }) {
        const isNew = !e.id;
        const expense: Expense = { carton_id: null, ...e, id: e.id ?? newId() };
        dispatch({ type: "expense.upsert", expense });
        toast({
          kind: "success",
          message: isNew ? `${catName(expense.category_id)} ${eur(expense.amount_cents)} toegevoegd` : "Uitgave bijgewerkt",
          action: isNew ? { label: "Ongedaan maken", onClick: () => dispatch({ type: "expense.delete", id: expense.id }) } : undefined,
        });
      },

      quickAdd(cat: Category) {
        if (cat.default_amount_cents == null) return;
        const expense: Expense = {
          id: newId(),
          amount_cents: cat.default_amount_cents,
          category_id: cat.id,
          note: null,
          spent_at: new Date().toISOString(),
          carton_id: null,
        };
        dispatch({ type: "expense.upsert", expense });
        toast({
          kind: "success",
          message: `${cat.name} ${eur(expense.amount_cents)} toegevoegd`,
          action: { label: "Ongedaan maken", onClick: () => dispatch({ type: "expense.delete", id: expense.id }) },
        });
      },

      deleteExpense(e: Expense) {
        dispatch({ type: "expense.delete", id: e.id });
        toast({
          kind: "info",
          message: "Uitgave verwijderd",
          action: { label: "Ongedaan maken", onClick: () => dispatch({ type: "expense.upsert", expense: e }) },
        });
      },

      takePack(next: Pack | null) {
        if (!next) {
          toast({ kind: "error", message: "Geen pakjes meer op voorraad" });
          return;
        }
        dispatch({ type: "pack.set", id: next.id, used_at: new Date().toISOString() });
        toast({
          kind: "success",
          message: "Pakje gepakt",
          action: { label: "Ongedaan maken", onClick: () => dispatch({ type: "pack.set", id: next.id, used_at: null }) },
        });
      },

      togglePack(p: Pack) {
        dispatch({ type: "pack.set", id: p.id, used_at: p.used_at ? null : new Date().toISOString() });
        if (typeof navigator !== "undefined") navigator.vibrate?.(6);
      },

      addCartons(o: { count: number; packs: number; priceCents: number; label: string | null; boughtAt: string }) {
        const cigs = data?.categories.find((c) => c.system_key === "cigarettes");
        for (let i = 0; i < o.count; i++) {
          const cartonId = newId();
          const packs: Pack[] = Array.from({ length: o.packs }, (_, j) => ({
            id: newId(),
            carton_id: cartonId,
            position: j + 1,
            used_at: null,
          }));
          const expense: Expense | null =
            o.priceCents > 0
              ? {
                  id: newId(),
                  amount_cents: o.priceCents,
                  category_id: cigs?.id ?? null,
                  note: `Slof${o.label ? ` ${o.label}` : ""}`,
                  spent_at: o.boughtAt,
                  carton_id: cartonId,
                }
              : null;
          dispatch({
            type: "carton.add",
            carton: { id: cartonId, label: o.label, packs_total: o.packs, price_cents: o.priceCents, bought_at: o.boughtAt },
            packs,
            expense,
          });
        }
        const word = o.count === 1 ? "Slof" : `${o.count} sloffen`;
        toast({
          kind: "success",
          message: o.priceCents > 0 ? `${word} toegevoegd · ${eur(o.priceCents * o.count)} geboekt` : `${word} toegevoegd`,
        });
      },

      deleteCarton(c: CartonView) {
        const expense = data?.expenses.find((e) => e.carton_id === c.id) ?? null;
        const { packs, used: _used, ...carton } = c;
        void _used;
        dispatch({ type: "carton.delete", id: c.id });
        toast({
          kind: "info",
          message: expense ? "Slof en uitgave verwijderd" : "Slof verwijderd",
          action: { label: "Ongedaan maken", onClick: () => dispatch({ type: "carton.add", carton, packs, expense }) },
        });
      },

      saveCategory(c: Omit<Category, "id" | "system_key" | "sort"> & { id?: number; sort?: number }) {
        const isNew = !c.id;
        const maxSort = Math.max(0, ...(data?.categories ?? []).filter((x) => x.sort < 99).map((x) => x.sort));
        dispatch({
          type: "category.upsert",
          category: { id: c.id ?? newId(), name: c.name, color: c.color, default_amount_cents: c.default_amount_cents, sort: c.sort ?? maxSort + 1 },
        });
        toast({ kind: "success", message: isNew ? `Categorie “${c.name}” aangemaakt` : "Categorie opgeslagen" });
      },

      deleteCategory(c: Category) {
        dispatch({ type: "category.delete", id: c.id });
        toast({ kind: "info", message: `Categorie “${c.name}” verwijderd` });
      },
    };
  }, [data, dispatch, toast]);
}
