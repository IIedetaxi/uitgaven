import { BottomNav } from "@/components/bottom-nav";

export const dynamic = "force-dynamic";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <main className="pt-safe mx-auto flex max-w-md flex-col gap-5 px-5 pb-32">{children}</main>
      <BottomNav />
    </>
  );
}
