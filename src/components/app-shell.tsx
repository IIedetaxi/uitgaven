"use client";

import { usePathname } from "next/navigation";
import { ToastProvider } from "./toast";
import { SheetsProvider } from "./sheets";
import { BottomNav } from "./bottom-nav";
import { StoreProvider, useStore } from "@/lib/store";

function Skeleton() {
  return (
    <div className="flex flex-col gap-5 pt-5" aria-busy="true" aria-label="Laden">
      <div className="flex flex-col gap-2">
        <div className="bg-surface h-3.5 w-36 animate-pulse rounded" />
        <div className="bg-surface h-8 w-44 animate-pulse rounded-lg" />
      </div>
      <div className="bg-surface h-11 animate-pulse rounded-[14px]" />
      <div className="h-[190px] animate-pulse rounded-3xl bg-[#3A3020]" />
      <div className="bg-surface h-[150px] animate-pulse rounded-[20px]" />
      <div className="bg-surface h-[220px] animate-pulse rounded-[20px]" />
    </div>
  );
}

function DataGate({ children }: { children: React.ReactNode }) {
  const { data, loadError, reload } = useStore();
  const path = usePathname();
  if (!data) {
    if (loadError) {
      return (
        <div className="flex flex-col items-center gap-3 pt-32 text-center">
          <span className="bg-red/15 text-red flex size-14 items-center justify-center rounded-2xl text-2xl font-bold">!</span>
          <h1 className="font-display text-2xl font-bold">Kon gegevens niet laden</h1>
          <p className="text-muted max-w-xs text-sm">{loadError}. Controleer je verbinding en probeer het opnieuw.</p>
          <button type="button" onClick={() => reload().catch(() => {})} className="bg-yellow text-bg mt-2 h-12 rounded-2xl px-6 font-bold">
            Opnieuw proberen
          </button>
        </div>
      );
    }
    return <Skeleton />;
  }
  return (
    <div key={path} className="animate-page flex flex-col gap-5">
      {children}
    </div>
  );
}

export function SyncPill() {
  const { sync, pending } = useStore();
  if (sync === "idle" && pending === 0) return null;
  const offline = sync === "offline";
  const err = sync === "error";
  return (
    <span
      className={`flex h-8 items-center gap-1.5 rounded-full px-2.5 text-xs font-semibold ${
        offline ? "bg-[#2A2622] text-muted" : err ? "bg-red/15 text-red" : "bg-[#2A2622] text-muted"
      }`}
      role="status"
    >
      <span className={`size-1.5 rounded-full ${offline ? "bg-muted" : err ? "bg-red" : "bg-yellow animate-pulse"}`} />
      {offline ? `Offline${pending ? ` · ${pending}` : ""}` : err ? "Opnieuw proberen…" : "Opslaan…"}
    </span>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <ToastProvider>
      <StoreProvider>
        <SheetsProvider>
          <main className="pt-safe mx-auto flex min-h-dvh max-w-md flex-col px-5 pb-36">
            <DataGate>{children}</DataGate>
          </main>
          <BottomNav />
        </SheetsProvider>
      </StoreProvider>
    </ToastProvider>
  );
}
