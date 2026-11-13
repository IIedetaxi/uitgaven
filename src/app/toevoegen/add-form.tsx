"use client";

import Link from "next/link";
import { useRef, useState, useTransition } from "react";
import { useFormStatus } from "react-dom";
import { deleteExpense, saveExpense } from "@/app/actions";

type Cat = { id: number; name: string; color: string; def: number | null };
type Initial = { id: number | null; cents: number; categoryId: number | null; note: string; spentAt: string };

const KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "00", "0", "⌫"];

function fmt(cents: number) {
  const e = Math.floor(cents / 100);
  const c = String(cents % 100).padStart(2, "0");
  return `${e.toLocaleString("nl-NL")},${c}`;
}

function SaveButton({ disabled }: { disabled: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={disabled || pending}
      className="bg-yellow text-bg h-14 rounded-2xl text-[17px] font-bold active:scale-[0.98] transition disabled:opacity-40"
    >
      {pending ? "Opslaan…" : "Opslaan"}
    </button>
  );
}

export function AddForm({ categories, initial }: { categories: Cat[]; initial: Initial }) {
  const [raw, setRaw] = useState(initial.cents ? String(initial.cents) : "");
  const [cat, setCat] = useState<number | null>(initial.categoryId ?? categories[0]?.id ?? null);
  const [showDate, setShowDate] = useState(false);
  const [deleting, startDelete] = useTransition();
  const autoFilled = useRef<string | null>(null);
  const cents = parseInt(raw || "0", 10);

  function press(k: string) {
    autoFilled.current = null;
    if (k === "⌫") return setRaw((r) => r.slice(0, -1));
    setRaw((r) => (r.length >= 7 ? r : (r + k).replace(/^0+/, "")));
  }

  function pick(c: Cat) {
    setCat(c.id);
    // Standaardbedrag invullen als er nog niets (of alleen een eerder standaardbedrag) staat.
    if (c.def != null && (!raw || raw === autoFilled.current)) {
      setRaw(String(c.def));
      autoFilled.current = String(c.def);
    }
  }

  const time = initial.spentAt.slice(11, 16);
  const isToday = initial.spentAt.slice(0, 10) === new Date().toLocaleDateString("sv-SE", { timeZone: "Europe/Amsterdam" });

  return (
    <form action={saveExpense} className="flex flex-1 flex-col gap-4 py-3">
      <input type="hidden" name="id" value={initial.id ?? ""} />
      <input type="hidden" name="cents" value={cents || ""} />
      <input type="hidden" name="category_id" value={cat ?? ""} />

      <div className="flex items-center justify-between">
        <Link href="/" className="text-muted py-2.5 pr-3 text-[15px] font-medium">
          Annuleer
        </Link>
        <h1 className="text-[17px] font-semibold">{initial.id ? "Uitgave bewerken" : "Nieuwe uitgave"}</h1>
        {initial.id ? (
          <button
            type="button"
            disabled={deleting}
            onClick={() => {
              if (confirm("Deze uitgave verwijderen?")) startDelete(() => deleteExpense(initial.id!));
            }}
            className="text-red py-2.5 pl-3 text-[15px] font-medium"
          >
            Verwijder
          </button>
        ) : (
          <span className="w-16" />
        )}
      </div>

      <div className="flex flex-col items-center gap-2 py-2">
        <div
          className={`font-display text-[60px] leading-none font-bold tracking-tight ${cents ? "text-ink" : "text-faint"}`}
          aria-live="polite"
        >
          € {fmt(cents)}
        </div>
        {showDate ? (
          <input
            type="datetime-local"
            name="spent_at"
            defaultValue={initial.spentAt}
            className="border-line bg-surface-2 h-10 rounded-full border px-4 text-sm"
          />
        ) : (
          <>
            <input type="hidden" name="spent_at" value={initial.id ? initial.spentAt : ""} />
            <button
              type="button"
              onClick={() => setShowDate(true)}
              className="border-line bg-surface-2 text-muted flex h-9 items-center gap-1.5 rounded-full border px-3 text-[13px] font-medium"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                <circle cx="12" cy="12" r="9" />
                <path d="M12 7v5l3 2" />
              </svg>
              {initial.id && !isToday ? initial.spentAt.replace("T", " ") : `Vandaag${initial.id ? `, ${time}` : ", nu"}`}
            </button>
          </>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <span className="text-muted text-xs font-semibold tracking-wider uppercase">Categorie</span>
        <div className="flex flex-wrap gap-2">
          {categories.map((c) => {
            const on = c.id === cat;
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => pick(c)}
                aria-pressed={on}
                className={`flex min-h-10 items-center gap-1.5 rounded-full border px-3.5 text-sm font-semibold transition ${
                  on ? "border-yellow bg-yellow text-bg" : "border-line bg-surface-2"
                }`}
              >
                {!on && <span className="size-2 rounded-full" style={{ background: c.color }} aria-hidden="true" />}
                {c.name}
                {c.def != null && (
                  <span className={on ? "font-medium opacity-70" : "text-muted font-medium"}>€{fmt(c.def)}</span>
                )}
              </button>
            );
          })}
          <Link
            href="/categorieen"
            className="text-muted flex min-h-10 items-center rounded-full border border-dashed border-[#4A443C] px-3.5 text-sm font-semibold"
          >
            + Nieuw
          </Link>
        </div>
      </div>

      <label className="flex flex-col gap-1.5">
        <span className="text-muted text-xs font-semibold tracking-wider uppercase">Notitie</span>
        <input
          type="text"
          name="note"
          defaultValue={initial.note}
          placeholder="Bijv. AH, station, cadeau…"
          className="border-line bg-surface-2 placeholder:text-faint h-11 rounded-xl border px-3.5 text-[15px] outline-none focus:border-yellow"
        />
      </label>

      <div className="mt-auto grid grid-cols-3 gap-2">
        {KEYS.map((k) => (
          <button
            key={k}
            type="button"
            onClick={() => press(k)}
            aria-label={k === "⌫" ? "Wis" : k}
            className="font-display bg-surface-2 h-[52px] rounded-[14px] text-2xl font-semibold active:scale-95 active:bg-line transition"
          >
            {k}
          </button>
        ))}
      </div>
      <SaveButton disabled={!cents} />
    </form>
  );
}
