// Werkt in zowel de proxy als server actions (Web Crypto).
export const SESSION_COOKIE = "uitgaven_session";
export const SESSION_DAYS = 365;

function secret() {
  const s = process.env.AUTH_SECRET || (process.env.APP_PIN ? `pin:${process.env.APP_PIN}` : "");
  if (!s) throw new Error("AUTH_SECRET en APP_PIN ontbreken");
  return s;
}

async function hmac(data: string) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret()),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(data));
  return Array.from(new Uint8Array(sig), (b) => b.toString(16).padStart(2, "0")).join("");
}

export async function createToken() {
  const exp = Date.now() + SESSION_DAYS * 864e5;
  return `${exp}.${await hmac(String(exp))}`;
}

export async function verifyToken(token: string | undefined) {
  if (!token) return false;
  const [exp, sig] = token.split(".");
  if (!exp || !sig || Number(exp) < Date.now()) return false;
  const expected = await hmac(exp);
  if (expected.length !== sig.length) return false;
  let diff = 0;
  for (let i = 0; i < sig.length; i++) diff |= expected.charCodeAt(i) ^ sig.charCodeAt(i);
  return diff === 0;
}

export function pinMatches(pin: string) {
  const real = process.env.APP_PIN ?? "";
  if (!real) return false;
  if (pin.length !== real.length) return false;
  let diff = 0;
  for (let i = 0; i < pin.length; i++) diff |= pin.charCodeAt(i) ^ real.charCodeAt(i);
  return diff === 0;
}
