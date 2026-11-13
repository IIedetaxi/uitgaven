"use client";

import { useEffect, useRef, useState } from "react";

/** Bottom sheet met in/uit-animatie, sluit via achtergrond, Escape of naar beneden vegen. */
export function Sheet({
  open,
  onClose,
  title,
  children,
  left,
  right,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  left?: React.ReactNode;
  right?: React.ReactNode;
}) {
  const [mounted, setMounted] = useState(open);
  const [shown, setShown] = useState(false);
  const [drag, setDrag] = useState(0);
  const startY = useRef<number | null>(null);

  useEffect(() => {
    if (open) {
      setMounted(true);
      const r = requestAnimationFrame(() => requestAnimationFrame(() => setShown(true)));
      return () => cancelAnimationFrame(r);
    }
    setShown(false);
    const t = setTimeout(() => setMounted(false), 260);
    return () => clearTimeout(t);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!mounted) return null;

  return (
    <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label={title}>
      <div
        className={`absolute inset-0 bg-black/60 transition-opacity duration-250 ${shown ? "opacity-100" : "opacity-0"}`}
        onClick={onClose}
      />
      <div
        className="pb-safe absolute inset-x-0 bottom-0 mx-auto flex max-h-[94dvh] max-w-md flex-col rounded-t-[28px] border-t border-line bg-[#1A1714] shadow-[0_-12px_40px_rgba(0,0,0,0.5)]"
        style={{
          transform: shown ? `translateY(${drag}px)` : "translateY(100%)",
          transition: startY.current != null ? "none" : "transform 260ms cubic-bezier(.2,.8,.2,1)",
        }}
      >
        <div
          className="flex shrink-0 cursor-grab flex-col gap-2 px-5 pt-2.5 pb-2 touch-none"
          onPointerDown={(e) => {
            startY.current = e.clientY;
            (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
          }}
          onPointerMove={(e) => {
            if (startY.current != null) setDrag(Math.max(0, e.clientY - startY.current));
          }}
          onPointerUp={() => {
            const d = drag;
            startY.current = null;
            setDrag(0);
            if (d > 90) onClose();
          }}
          onPointerCancel={() => {
            startY.current = null;
            setDrag(0);
          }}
        >
          <div className="mx-auto h-[5px] w-10 rounded-full bg-[#3A352F]" />
          <div className="grid grid-cols-[1fr_auto_1fr] items-center">
            <div className="justify-self-start">
              {left ?? (
                <button type="button" onClick={onClose} className="text-muted -ml-1 h-10 px-1 text-[15px] font-medium">
                  Annuleer
                </button>
              )}
            </div>
            <h2 className="text-[17px] font-semibold">{title}</h2>
            <div className="justify-self-end">{right}</div>
          </div>
        </div>
        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain px-5 pb-4">{children}</div>
      </div>
    </div>
  );
}
