"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { login } from "@/app/actions";

const KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "⌫", "0", "OK"];

export function LoginPad() {
  const [pin, setPin] = useState("");
  const [state, action, pending] = useActionState(login, undefined);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state?.error) setPin("");
  }, [state]);

  function press(k: string) {
    if (pending) return;
    if (k === "⌫") return setPin((p) => p.slice(0, -1));
    if (k === "OK") return formRef.current?.requestSubmit();
    setPin((p) => (p.length < 12 ? p + k : p));
  }

  return (
    <form ref={formRef} action={action} className="flex w-full flex-1 flex-col items-center gap-7">
      <input type="hidden" name="pin" value={pin} />
      <div className="flex flex-col items-center gap-1.5">
        <h1 className="font-display text-[28px] font-bold">Welkom terug</h1>
        <p className={state?.error ? "text-red" : "text-muted"} role="status">
          {pending ? "Controleren…" : state?.error ?? "Voer je PIN in"}
        </p>
      </div>
      <div className="flex h-4 gap-4" aria-label={`${pin.length} cijfers ingevoerd`}>
        {Array.from({ length: Math.max(4, pin.length) }).map((_, i) => (
          <span
            key={i}
            className={`size-4 rounded-full ${i < pin.length ? "bg-yellow" : "border-2 border-[#4A443C]"}`}
          />
        ))}
      </div>
      <div className="mt-auto mb-6 grid w-full grid-cols-3 gap-3.5">
        {KEYS.map((k) => (
          <button
            key={k}
            type="button"
            onClick={() => press(k)}
            aria-label={k === "⌫" ? "Wis" : k === "OK" ? "Inloggen" : k}
            className={`font-display h-[68px] rounded-full text-[26px] font-semibold active:scale-95 transition ${
              k === "OK" ? "bg-yellow text-bg text-xl" : "bg-surface-2"
            }`}
          >
            {k}
          </button>
        ))}
      </div>
    </form>
  );
}
