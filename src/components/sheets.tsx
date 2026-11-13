"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { Sheet } from "./sheet";
import { COLORS, Stepper, fieldCls, labelCls } from "./ui";
import { useStore } from "@/lib/store";
import { useActions } from "@/lib/use-actions";
import { eur, fromLocalInput, sortedCategories, stockData, toLocalInput } from "@/lib/stats";
import type { Category, Expense } from "@/lib/types";

type Open =
  | { kind: "expense"; expense?: Expense }
  | { kind: "carton" }
  | { kind: "category"; category?: Category }
  | null;

type SheetsApi = {
  openExpense: (e?: Expense) => void;
  openCarton: () => void;
  openCategory: (c?: Category) => void;
};
const Ctx = createContext<SheetsApi>({ openExpense() {}, openCarton() {}, openCategory() {} });
export const useSheets = () => useContext(Ctx);

export function SheetsProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState<Open>(null);
  // Laatste inhoud vasthouden tijdens de sluit-animatie
  const last = useRef<Open>(null);
  if (open) last.current = open;
  const shown = open ?? last.current;
  const close = useCallback(() => setOpen(null), []);

  const api = useMemo<SheetsApi>(
    () => ({
      openExpense: (expense) => setOpen({ kind: "expense", expense }),
      openCarton: () => setOpen({ kind: "carton" }),
      openCategory: (category) => setOpen({ kind: "category", category }),
    }),
    [],
  );

  return (
    <Ctx.Provider value={api}>
      {children}
      {shown?.kind === "expense" && <ExpenseSheet key={`e-${shown.expense?.id ?? "new"}`} open={open?.kind === "expense"} expense={shown.expense} onClose={close} />}
      {shown?.kind === "carton" && <CartonSheet open={open?.kind === "carton"} onClose={close} />}
      {shown?.kind === "category" && <CategorySheet key={`c-${shown.category?.id ?? "new"}`} open={open?.kind === "category"} category={shown.category} onClose={close} />}
    </Ctx.Provider>
  );
}

// ---------------- Uitgave ----------------

const KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "00", "0", "⌫"];
const fmtCents = (cents: number) => `${Math.floor(cents / 100).toLocaleString("nl-NL")},${String(cents % 100).padStart(2, "0")}`;

function ExpenseSheet({ open, expense, onClose }: { open: boolean; expense?: Expense; onClose: () => void }) {
  const { data } = useStore();
  const actions = useActions();
  const cats = useMemo(() => sortedCategories(data?.categories ?? []).filter((c) => !expense?.carton_id || c.id === expense.category_id), [data, expense]);
  const [raw, setRaw] = useState(expense ? String(expense.amount_cents) : "");
  const [cat, setCat] = useState<number | null>(expense ? expense.category_id : null);
  const [note, setNote] = useState(expense?.note ?? "");
  const [when, setWhen] = useState<string | null>(expense ? toLocalInput(expense.spent_at) : null);
  const [shake, setShake] = useState(false);
  const autoFilled = useRef<string | null>(null);
  const cents = parseInt(raw || "0", 10);
  const isCarton = !!expense?.carton_id;

  function press(k: string) {
    autoFilled.current = null;
    navigator.vibrate?.(4);
    if (k === "⌫") return setRaw((r) => r.slice(0, -1));
    setRaw((r) => (r.length >= 7 ? r : (r + k).replace(/^0+/, "")));
  }

  function pick(c: Category) {
    setCat(c.id);
    if (c.default_amount_cents != null && (!raw || raw === autoFilled.current)) {
      setRaw(String(c.default_amount_cents));
      autoFilled.current = String(c.default_amount_cents);
    }
  }

  function save() {
    if (!cents) {
      setShake(true);
      setTimeout(() => setShake(false), 400);
      return;
    }
    actions.saveExpense({
      id: expense?.id,
      amount_cents: cents,
      category_id: cat,
      note: note.trim() || null,
      spent_at: when ? fromLocalInput(when) : expense?.spent_at ?? new Date().toISOString(),
      carton_id: expense?.carton_id ?? null,
    });
    onClose();
  }

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={expense ? "Uitgave bewerken" : "Nieuwe uitgave"}
      right={
        expense && !isCarton ? (
          <button
            type="button"
            onClick={() => {
              actions.deleteExpense(expense);
              onClose();
            }}
            className="text-red -mr-1 h-10 px-1 text-[15px] font-medium"
          >
            Verwijder
          </button>
        ) : undefined
      }
    >
      <div className="flex flex-col gap-4">
        <div className="flex flex-col items-center gap-2 pt-1">
          <div
            className={`font-display text-[56px] leading-none font-bold tracking-tight transition-colors ${cents ? "text-ink" : "text-faint"} ${shake ? "animate-shake" : ""}`}
            aria-live="polite"
          >
            € {fmtCents(cents)}
          </div>
          {when == null ? (
            <button
              type="button"
              onClick={() => setWhen(toLocalInput(new Date()))}
              className="border-line bg-surface-2 text-muted flex h-9 items-center gap-1.5 rounded-full border px-3 text-[13px] font-medium"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                <circle cx="12" cy="12" r="9" />
                <path d="M12 7v5l3 2" />
              </svg>
              Nu · andere datum?
            </button>
          ) : (
            <input
              type="datetime-local"
              value={when}
              onChange={(e) => setWhen(e.target.value)}
              aria-label="Datum en tijd"
              className="border-line bg-surface-2 h-10 rounded-full border px-4 text-sm"
            />
          )}
          {isCarton && <p className="text-muted text-xs">Deze uitgave hoort bij een slof. Verwijderen gaat via Voorraad.</p>}
        </div>

        <div className="flex flex-col gap-2">
          <span className={labelCls}>Categorie</span>
          <div className="flex flex-wrap gap-2">
            {cats.map((c) => {
              const on = c.id === cat;
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => pick(c)}
                  aria-pressed={on}
                  className={`flex min-h-10 items-center gap-1.5 rounded-full border px-3.5 text-sm font-semibold transition-all active:scale-95 ${
                    on ? "border-yellow bg-yellow text-bg" : "border-line bg-surface-2"
                  }`}
                >
                  {!on && <span className="size-2 rounded-full" style={{ background: c.color }} aria-hidden="true" />}
                  {c.name}
                  {c.default_amount_cents != null && (
                    <span className={on ? "font-medium opacity-70" : "text-muted font-medium"}>€{fmtCents(c.default_amount_cents)}</span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        <input
          type="text"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Notitie (optioneel)"
          aria-label="Notitie"
          enterKeyHint="done"
          className={`${fieldCls} h-11`}
        />

        <div className="grid grid-cols-3 gap-2">
          {KEYS.map((k) => (
            <button
              key={k}
              type="button"
              onClick={() => press(k)}
              aria-label={k === "⌫" ? "Wis" : k}
              className="font-display bg-surface-2 h-[52px] rounded-[14px] text-2xl font-semibold transition active:scale-95 active:bg-line"
            >
              {k}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={save}
          className={`h-14 rounded-2xl text-[17px] font-bold transition active:scale-[0.98] ${cents ? "bg-yellow text-bg" : "bg-surface-2 text-muted"}`}
        >
          {cents ? `Opslaan · ${eur(cents)}` : "Voer een bedrag in"}
        </button>
      </div>
    </Sheet>
  );
}

// ---------------- Slof ----------------

function parseEuro(s: string): number | null {
  const t = s.trim().replace(/\s|€/g, "");
  if (!t) return 0;
  const n = Number(t.includes(",") ? t.replace(/\./g, "").replace(",", ".") : t);
  return Number.isFinite(n) && n >= 0 ? Math.round(n * 100) : null;
}

function CartonSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { data } = useStore();
  const actions = useActions();
  const last = data ? stockData(data).last : null;
  const [count, setCount] = useState(1);
  const [packs, setPacks] = useState(last?.packs_total ?? 10);
  const [price, setPrice] = useState(last?.price_cents ? (last.price_cents / 100).toFixed(2).replace(".", ",") : "");
  const [label, setLabel] = useState(last?.label ?? "");
  const [when, setWhen] = useState(toLocalInput(new Date()));
  const priceCents = parseEuro(price);
  const invalid = priceCents == null;

  useEffect(() => {
    if (open) setWhen(toLocalInput(new Date()));
  }, [open]);

  return (
    <Sheet open={open} onClose={onClose} title="Slof toevoegen">
      <div className="flex flex-col gap-4 pt-1">
        <div className="border-line bg-surface flex items-center justify-between rounded-2xl border p-3 pl-4">
          <span className="text-[15px] font-medium">Aantal sloffen</span>
          <Stepper value={count} onChange={setCount} min={1} max={10} label="Aantal sloffen" />
        </div>
        <div className="border-line bg-surface flex items-center justify-between rounded-2xl border p-3 pl-4">
          <span className="text-[15px] font-medium">Pakjes per slof</span>
          <Stepper value={packs} onChange={setPacks} min={1} max={20} label="Pakjes per slof" />
        </div>
        <label className="flex flex-col gap-1.5">
          <span className={labelCls}>Prijs per slof</span>
          <div className="relative">
            <span className="text-muted pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2">€</span>
            <input
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              inputMode="decimal"
              placeholder="0,00"
              className={`${fieldCls} pl-8 ${invalid ? "border-red" : ""}`}
              aria-invalid={invalid}
            />
          </div>
          {invalid && <span className="text-red text-xs">Ongeldig bedrag</span>}
        </label>
        <label className="flex flex-col gap-1.5">
          <span className={labelCls}>Naam (optioneel)</span>
          <input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Bijv. Geel" className={fieldCls} />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className={labelCls}>Gekocht op</span>
          <input type="datetime-local" value={when} onChange={(e) => setWhen(e.target.value)} className={fieldCls} />
        </label>
        <p className="text-muted bg-surface border-line rounded-2xl border p-3.5 text-sm">
          {priceCents ? (
            <>
              <strong className="text-ink">{eur(priceCents * count)}</strong> wordt geboekt als uitgave in <strong className="text-ink">Sigaretten</strong>. Verwijder je de slof, dan verdwijnt die uitgave ook.
            </>
          ) : (
            "Vul een prijs in, dan wordt die automatisch als uitgave geboekt in Sigaretten."
          )}
        </p>
        <button
          type="button"
          disabled={invalid}
          onClick={() => {
            actions.addCartons({ count, packs, priceCents: priceCents ?? 0, label: label.trim() || null, boughtAt: fromLocalInput(when) });
            onClose();
          }}
          className="bg-yellow text-bg h-14 rounded-2xl text-[17px] font-bold transition active:scale-[0.98] disabled:opacity-40"
        >
          {count === 1 ? "Slof toevoegen" : `${count} sloffen toevoegen`} · {count * packs} pakjes
        </button>
      </div>
    </Sheet>
  );
}

// ---------------- Categorie ----------------

function CategorySheet({ open, category, onClose }: { open: boolean; category?: Category; onClose: () => void }) {
  const actions = useActions();
  const { data } = useStore();
  const [name, setName] = useState(category?.name ?? "");
  const [color, setColor] = useState(category?.color ?? COLORS[0]);
  const [amount, setAmount] = useState(category?.default_amount_cents != null ? (category.default_amount_cents / 100).toFixed(2).replace(".", ",") : "");
  const [confirmDel, setConfirmDel] = useState(false);
  const amountCents = parseEuro(amount);
  const nameTaken = !!data?.categories.some((c) => c.id !== category?.id && c.name.toLowerCase() === name.trim().toLowerCase());
  const valid = name.trim().length > 0 && amountCents != null && !nameTaken;
  const colors = COLORS.includes(color) ? COLORS : [color, ...COLORS];
  const usage = category ? (data?.expenses.filter((e) => e.category_id === category.id).length ?? 0) : 0;

  return (
    <Sheet open={open} onClose={onClose} title={category ? "Categorie bewerken" : "Nieuwe categorie"}>
      <div className="flex flex-col gap-4 pt-1">
        <label className="flex flex-col gap-1.5">
          <span className={labelCls}>Naam</span>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Bijv. Tanken" maxLength={40} className={`${fieldCls} ${nameTaken ? "border-red" : ""}`} />
          {nameTaken && <span className="text-red text-xs">Deze naam bestaat al</span>}
        </label>
        <label className="flex flex-col gap-1.5">
          <span className={labelCls}>Standaardbedrag (optioneel)</span>
          <div className="relative">
            <span className="text-muted pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2">€</span>
            <input value={amount} onChange={(e) => setAmount(e.target.value)} inputMode="decimal" placeholder="Bijv. 3,20" className={`${fieldCls} pl-8 ${amountCents == null ? "border-red" : ""}`} />
          </div>
          <span className="text-muted text-xs">Met een bedrag komt de categorie als snelknop op het beginscherm: één tik en hij staat erin.</span>
        </label>
        <fieldset className="flex flex-col gap-2">
          <legend className={`${labelCls} mb-2`}>Kleur</legend>
          <div className="flex flex-wrap gap-2.5">
            {colors.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setColor(c)}
                aria-label={`Kleur ${c}`}
                aria-pressed={c === color}
                className={`size-10 rounded-full ring-2 ring-offset-2 ring-offset-[#1A1714] transition ${c === color ? "ring-ink scale-105" : "ring-transparent"}`}
                style={{ background: c }}
              />
            ))}
          </div>
        </fieldset>
        <button
          type="button"
          disabled={!valid}
          onClick={() => {
            actions.saveCategory({
              id: category?.id,
              sort: category?.sort,
              name: name.trim(),
              color,
              default_amount_cents: amountCents ? amountCents : null,
            });
            onClose();
          }}
          className="bg-yellow text-bg h-14 rounded-2xl text-[17px] font-bold transition active:scale-[0.98] disabled:opacity-40"
        >
          {category ? "Opslaan" : "Aanmaken"}
        </button>
        {category && !category.system_key && (
          <button
            type="button"
            onClick={() => {
              if (!confirmDel) return setConfirmDel(true);
              actions.deleteCategory(category);
              onClose();
            }}
            className={`h-12 rounded-2xl border text-sm font-semibold transition ${confirmDel ? "bg-red border-red text-white" : "text-red border-[#3A2320]"}`}
          >
            {confirmDel ? `Zeker weten? ${usage ? `(${usage} uitgaven worden “Geen categorie”)` : ""}` : "Categorie verwijderen"}
          </button>
        )}
        {category?.system_key === "cigarettes" && (
          <p className="text-muted text-center text-xs">Sloffen worden in deze categorie geboekt; daarom kan hij niet verwijderd worden.</p>
        )}
      </div>
    </Sheet>
  );
}
