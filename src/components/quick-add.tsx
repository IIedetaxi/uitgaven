"use client";

import { useState, useTransition } from "react";
import { quickAdd } from "@/app/actions";

export function QuickAdd({ id, name, color, amount }: { id: number; name: string; color: string; amount: string }) {
  const [pending, start] = useTransition();
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() =>
        start(async () => {
          await quickAdd(id);
          setDone(true);
          setTimeout(() => setDone(false), 1200);
        })
      }
      className="border-line bg-surface flex h-11 shrink-0 items-center gap-2 rounded-full border pr-4 pl-3 text-sm font-semibold active:scale-95 transition disabled:opacity-60"
    >
      <span className="size-2.5 rounded-full" style={{ background: color }} aria-hidden="true" />
      {done ? "Toegevoegd ✓" : name}
      {!done && <span className="text-muted font-medium">{amount}</span>}
    </button>
  );
}
