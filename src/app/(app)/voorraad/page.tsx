"use client";

import { PageTitle } from "@/components/ui";
import { StockFull } from "@/components/stock";
import { useSheets } from "@/components/sheets";
import { SyncPill } from "@/components/app-shell";

export default function StockPage() {
  const { openCarton } = useSheets();
  return (
    <>
      <PageTitle
        right={
          <>
            <SyncPill />
            <button
              type="button"
              onClick={openCarton}
              className="border-line bg-surface flex h-10 items-center gap-1.5 rounded-full border px-3.5 text-sm font-semibold transition active:scale-95"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
                <path d="M12 5v14M5 12h14" />
              </svg>
              Slof
            </button>
          </>
        }
      >
        Voorraad
      </PageTitle>
      <StockFull />
    </>
  );
}
