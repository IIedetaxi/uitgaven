import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, verifyToken } from "@/lib/auth";

export async function proxy(req: NextRequest) {
  const ok = await verifyToken(req.cookies.get(SESSION_COOKIE)?.value);
  const isLogin = req.nextUrl.pathname === "/login";
  if (!ok && !isLogin) {
    return NextResponse.redirect(new URL("/login", req.url));
  }
  if (ok && isLogin) {
    return NextResponse.redirect(new URL("/", req.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icon.png|apple-icon.png|sw.js|manifest.webmanifest|icons/|offline.html).*)"],
};
