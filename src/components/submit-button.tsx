"use client";

import { useFormStatus } from "react-dom";

export function SubmitButton({ children, className }: { children: React.ReactNode; className?: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className={
        className ??
        "bg-yellow text-bg h-14 rounded-2xl text-[17px] font-bold active:scale-[0.98] transition disabled:opacity-50"
      }
    >
      {pending ? "Bezig…" : children}
    </button>
  );
}
