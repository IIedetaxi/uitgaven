"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSheets } from "./sheets";

const items = [
  { href: "/", label: "Home", icon: <path d="M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z" /> },
  { href: "/overzicht", label: "Overzicht", icon: <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" /> },
  null,
  {
    href: "/voorraad",
    label: "Voorraad",
    icon: (
      <>
        <rect x="3" y="7" width="18" height="13" rx="2" />
        <path d="M3 11h18M8 7V4h8v3" />
      </>
    ),
  },
  {
    href: "/categorieen",
    label: "Categorieën",
    icon: (
      <>
        <rect x="4" y="4" width="7" height="7" rx="2" />
        <rect x="13" y="4" width="7" height="7" rx="2" />
        <rect x="4" y="13" width="7" height="7" rx="2" />
        <rect x="13" y="13" width="7" height="7" rx="2" />
      </>
    ),
  },
];

export function BottomNav() {
  const path = usePathname();
  const { openExpense } = useSheets();
  return (
    <nav className="pb-safe fixed inset-x-0 bottom-0 z-40 border-t border-[#2A2622] bg-[#1A1714]/90 backdrop-blur-xl">
      <div className="mx-auto grid h-16 max-w-md grid-cols-5 items-center">
        {items.map((it, i) =>
          it ? (
            <Link
              key={it.href}
              href={it.href}
              prefetch
              aria-current={(it.href === "/" ? path === "/" : path.startsWith(it.href)) ? "page" : undefined}
              className="group flex h-full flex-col items-center justify-center gap-1 text-[11px] font-semibold text-muted transition-colors aria-[current=page]:text-yellow"
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="transition-transform group-active:scale-90">
                {it.icon}
              </svg>
              {it.label}
            </Link>
          ) : (
            <div key={i} className="flex justify-center">
              <button
                type="button"
                onClick={() => openExpense()}
                aria-label="Uitgave toevoegen"
                className="bg-yellow text-bg -mt-7 flex size-[60px] items-center justify-center rounded-full shadow-[0_8px_24px_rgba(242,194,48,0.25),0_6px_16px_rgba(0,0,0,0.5)] ring-4 ring-[#141210] transition active:scale-90"
              >
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" aria-hidden="true">
                  <path d="M12 5v14M5 12h14" />
                </svg>
              </button>
            </div>
          ),
        )}
      </div>
    </nav>
  );
}
