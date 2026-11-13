"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const items = [
  {
    href: "/",
    label: "Vandaag",
    icon: <path d="M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z" />,
  },
  { href: "/overzicht", label: "Overzicht", icon: <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" /> },
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
];

export function BottomNav() {
  const path = usePathname();
  return (
    <nav className="pb-safe fixed inset-x-0 bottom-0 z-20 border-t border-[#2A2622] bg-[#1A1714]/95 backdrop-blur">
      <div className="mx-auto grid max-w-md grid-cols-3">
        {items.map((it) => {
          const active = it.href === "/" ? path === "/" : path.startsWith(it.href);
          return (
            <Link
              key={it.href}
              href={it.href}
              className={`flex h-16 flex-col items-center justify-center gap-1 text-[11px] font-semibold ${
                active ? "text-yellow" : "text-muted"
              }`}
              aria-current={active ? "page" : undefined}
            >
              <svg
                width="22"
                height="22"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.9"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                {it.icon}
              </svg>
              {it.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
