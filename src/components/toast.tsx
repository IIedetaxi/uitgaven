"use client";

import { createContext, useCallback, useContext, useRef, useState } from "react";

type ToastKind = "success" | "error" | "info";
type Toast = {
  id: number;
  message: string;
  kind: ToastKind;
  action?: { label: string; onClick: () => void };
  leaving?: boolean;
};
type ToastInput = Omit<Toast, "id" | "leaving"> & { duration?: number };

const Ctx = createContext<(t: ToastInput) => void>(() => {});
export const useToast = () => useContext(Ctx);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const seq = useRef(0);

  const dismiss = useCallback((id: number) => {
    setToasts((ts) => ts.map((t) => (t.id === id ? { ...t, leaving: true } : t)));
    setTimeout(() => setToasts((ts) => ts.filter((t) => t.id !== id)), 220);
  }, []);

  const show = useCallback(
    ({ duration, ...t }: ToastInput) => {
      const id = ++seq.current;
      setToasts((ts) => [...ts.slice(-2), { ...t, id }]);
      setTimeout(() => dismiss(id), duration ?? (t.action ? 5000 : t.kind === "error" ? 4500 : 2200));
      if (t.kind !== "error" && typeof navigator !== "undefined" && "vibrate" in navigator) navigator.vibrate?.(8);
    },
    [dismiss],
  );

  return (
    <Ctx.Provider value={show}>
      {children}
      <div
        className="pointer-events-none fixed inset-x-0 z-[60] mx-auto flex max-w-md flex-col gap-2 px-4"
        style={{ bottom: "calc(max(env(safe-area-inset-bottom), 12px) + 84px)" }}
        aria-live="polite"
      >
        {toasts.map((t) => (
          <div
            key={t.id}
            role={t.kind === "error" ? "alert" : "status"}
            className={`pointer-events-auto flex min-h-12 items-center gap-3 rounded-2xl border px-4 py-2.5 text-[15px] shadow-[0_12px_32px_rgba(0,0,0,0.5)] ${
              t.leaving ? "animate-toast-out" : "animate-toast-in"
            } ${t.kind === "error" ? "border-red/40 bg-[#2A1714]" : "border-line bg-[#26221E]"}`}
          >
            <span
              className={`flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                t.kind === "error" ? "bg-red text-white" : t.kind === "success" ? "bg-yellow text-bg" : "bg-surface-2 text-muted"
              }`}
              aria-hidden="true"
            >
              {t.kind === "error" ? "!" : t.kind === "success" ? "✓" : "i"}
            </span>
            <span className="flex-1">{t.message}</span>
            {t.action && (
              <button
                type="button"
                onClick={() => {
                  t.action!.onClick();
                  dismiss(t.id);
                }}
                className="text-yellow -mr-1 h-9 shrink-0 rounded-lg px-2 text-sm font-bold"
              >
                {t.action.label}
              </button>
            )}
          </div>
        ))}
      </div>
    </Ctx.Provider>
  );
}
