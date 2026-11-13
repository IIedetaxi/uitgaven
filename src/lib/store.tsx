"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { useToast } from "@/components/toast";
import type { AppData, Op, QueuedOp, SyncResult } from "./types";

const DATA_KEY = "uitgaven:data:v2";
const QUEUE_KEY = "uitgaven:queue:v2";

let lastId = 0;
/** Unieke, oplopende id's die de client zelf uitdeelt (veilig binnen 2^53). */
export function newId() {
  lastId = Math.max(lastId + 1, Date.now() * 1000);
  return lastId;
}

const byDateDesc = (a: { spent_at: string; id: number }, b: { spent_at: string; id: number }) =>
  Date.parse(b.spent_at) - Date.parse(a.spent_at) || b.id - a.id;

export function applyOp(d: AppData, op: Op): AppData {
  switch (op.type) {
    case "expense.upsert": {
      const rest = d.expenses.filter((e) => e.id !== op.expense.id);
      return { ...d, expenses: [...rest, op.expense].sort(byDateDesc) };
    }
    case "expense.delete":
      return { ...d, expenses: d.expenses.filter((e) => e.id !== op.id) };
    case "category.upsert": {
      const existing = d.categories.find((c) => c.id === op.category.id);
      const cat = { ...op.category, system_key: existing?.system_key ?? null };
      return { ...d, categories: [...d.categories.filter((c) => c.id !== cat.id), cat] };
    }
    case "category.delete":
      return {
        ...d,
        categories: d.categories.filter((c) => c.id !== op.id || c.system_key),
        expenses: d.expenses.map((e) => (e.category_id === op.id ? { ...e, category_id: null } : e)),
      };
    case "carton.add":
      if (d.cartons.some((c) => c.id === op.carton.id)) return d;
      return {
        ...d,
        cartons: [...d.cartons, op.carton],
        packs: [...d.packs, ...op.packs],
        expenses: op.expense ? [...d.expenses, op.expense].sort(byDateDesc) : d.expenses,
      };
    case "carton.delete":
      return {
        ...d,
        cartons: d.cartons.filter((c) => c.id !== op.id),
        packs: d.packs.filter((p) => p.carton_id !== op.id),
        expenses: d.expenses.filter((e) => e.carton_id !== op.id),
      };
    case "pack.set":
      return { ...d, packs: d.packs.map((p) => (p.id === op.id ? { ...p, used_at: op.used_at } : p)) };
  }
}

type SyncState = "idle" | "syncing" | "offline" | "error";

type Store = {
  data: AppData | null;
  loadError: string | null;
  sync: SyncState;
  pending: number;
  dispatch: (op: Op) => void;
  reload: () => Promise<void>;
};

const Ctx = createContext<Store | null>(null);

export function useStore() {
  const s = useContext(Ctx);
  if (!s) throw new Error("StoreProvider ontbreekt");
  return s;
}
/** Data is gegarandeerd aanwezig binnen <DataGate>. */
export function useData() {
  return useStore().data as AppData;
}

function readLS<T>(key: string): T | null {
  try {
    const v = localStorage.getItem(key);
    return v ? (JSON.parse(v) as T) : null;
  } catch {
    return null;
  }
}
function writeLS(key: string, v: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(v));
  } catch {}
}

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const toast = useToast();
  const [data, setData] = useState<AppData | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [sync, setSync] = useState<SyncState>("idle");
  const [pending, setPending] = useState(0);

  const queue = useRef<QueuedOp[]>([]);
  const inFlight = useRef(false);
  const retryTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dataRef = useRef<AppData | null>(null);
  const qseq = useRef(0);

  const commitData = useCallback((d: AppData) => {
    dataRef.current = d;
    setData(d);
    writeLS(DATA_KEY, d);
  }, []);

  const saveQueue = useCallback(() => {
    writeLS(QUEUE_KEY, queue.current);
    setPending(queue.current.length);
  }, []);

  const goLogin = () => {
    window.location.href = "/login";
  };

  const reload = useCallback(async () => {
    try {
      const res = await fetch("/api/data", { cache: "no-store" });
      if (res.status === 401) return goLogin();
      if (!res.ok) throw new Error((await res.json().catch(() => null))?.error ?? "Serverfout");
      let fresh = (await res.json()) as AppData;
      // Wijzigingen die nog niet gesynchroniseerd zijn, opnieuw toepassen.
      for (const q of queue.current) fresh = applyOp(fresh, q.op);
      commitData(fresh);
      setLoadError(null);
    } catch (e) {
      if (!dataRef.current) setLoadError(e instanceof Error ? e.message : "Kon niet laden");
      throw e;
    }
  }, [commitData]);

  const flush = useCallback(async (): Promise<void> => {
    if (inFlight.current || queue.current.length === 0) return;
    if (retryTimer.current) {
      clearTimeout(retryTimer.current);
      retryTimer.current = null;
    }
    inFlight.current = true;
    setSync("syncing");
    const batch = queue.current.slice(0, 50);
    try {
      const res = await fetch("/api/sync", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ops: batch }),
      });
      if (res.status === 401) return goLogin();
      if (!res.ok) throw new Error("server");
      const { results } = (await res.json()) as { results: SyncResult[] };
      const done = new Set(results.map((r) => r.qid));
      const failed = results.filter((r): r is Extract<SyncResult, { ok: false }> => !r.ok);
      queue.current = queue.current.filter((q) => !done.has(q.qid));
      saveQueue();
      if (failed.length) {
        toast({ kind: "error", message: `Niet opgeslagen: ${failed[0].error}` });
        await reload().catch(() => {});
      }
      inFlight.current = false;
      if (results.length < batch.length) {
        // Server had een tijdelijke fout halverwege
        setSync("error");
        retryTimer.current = setTimeout(() => void flush(), 8000);
      } else if (queue.current.length) {
        void flush();
      } else {
        setSync("idle");
      }
    } catch {
      inFlight.current = false;
      setSync(navigator.onLine ? "error" : "offline");
      retryTimer.current = setTimeout(() => void flush(), navigator.onLine ? 8000 : 20000);
    }
  }, [reload, saveQueue, toast]);

  const dispatch = useCallback(
    (op: Op) => {
      const cur = dataRef.current;
      if (!cur) return;
      commitData(applyOp(cur, op));
      queue.current.push({ qid: Date.now() * 100 + (qseq.current++ % 100), op });
      saveQueue();
      void flush();
    },
    [commitData, flush, saveQueue],
  );

  // Opstarten: direct uit cache, daarna verversen + wachtrij versturen.
  useEffect(() => {
    queue.current = readLS<QueuedOp[]>(QUEUE_KEY) ?? [];
    setPending(queue.current.length);
    const cached = readLS<AppData>(DATA_KEY);
    if (cached) {
      dataRef.current = cached;
      setData(cached);
    }
    (async () => {
      await flush().catch(() => {});
      await reload().catch(() => {});
    })();

    const onOnline = () => {
      setSync((s) => (s === "offline" ? "idle" : s));
      void flush().then(() => reload().catch(() => {}));
    };
    const onOffline = () => setSync("offline");
    const onVisible = () => {
      if (document.visibilityState === "visible") {
        void flush().then(() => {
          if (!queue.current.length) reload().catch(() => {});
        });
      }
    };
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
      document.removeEventListener("visibilitychange", onVisible);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const value = useMemo(
    () => ({ data, loadError, sync, pending, dispatch, reload }),
    [data, loadError, sync, pending, dispatch, reload],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
