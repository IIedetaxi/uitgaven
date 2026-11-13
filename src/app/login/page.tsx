import { LoginPad } from "./login-pad";

export const metadata = { title: "Inloggen · Uitgaven" };

export default function LoginPage() {
  return (
    <main className="pt-safe pb-safe mx-auto flex min-h-dvh max-w-md flex-col items-center gap-7 px-8 pt-24">
      <img src="/icons/icon-192.png" alt="" width={72} height={72} className="rounded-[22px]" />
      <LoginPad />
    </main>
  );
}
