"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SESSION_COOKIE, SESSION_DAYS, createToken, pinMatches } from "@/lib/auth";

export async function login(_prev: { error?: string } | undefined, formData: FormData) {
  const pin = String(formData.get("pin") ?? "");
  if (!process.env.APP_PIN) return { error: "APP_PIN is niet ingesteld op de server" };
  if (!pinMatches(pin)) {
    await new Promise((r) => setTimeout(r, 600));
    return { error: "Onjuiste PIN" };
  }
  (await cookies()).set(SESSION_COOKIE, await createToken(), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_DAYS * 86400,
  });
  redirect("/");
}

export async function logout() {
  (await cookies()).delete(SESSION_COOKIE);
  redirect("/login");
}
