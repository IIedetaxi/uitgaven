"use server";

import { TZDate } from "@date-fns/tz";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { SESSION_COOKIE, SESSION_DAYS, createToken, pinMatches } from "@/lib/auth";
import { ensureSchema, sql } from "@/lib/db";
import { TZ, parseCents } from "@/lib/format";

function refresh() {
  revalidatePath("/", "layout");
}

/** "2026-11-13T19:42" of "2026-11-13" (Amsterdamse tijd) → ISO UTC */
function localToIso(v: FormDataEntryValue | null, fallbackNow = true): string {
  const s = String(v ?? "").trim();
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2}))?/);
  if (!m) return fallbackNow ? new Date().toISOString() : "";
  const [, y, mo, d, h, mi] = m;
  return new TZDate(+y, +mo - 1, +d, h ? +h : 12, mi ? +mi : 0, 0, 0, TZ).toISOString();
}

const toInt = (v: FormDataEntryValue | null) => {
  const n = parseInt(String(v ?? ""), 10);
  return Number.isFinite(n) ? n : null;
};

// ---------- Auth ----------

export async function login(_prev: { error?: string } | undefined, formData: FormData) {
  const pin = String(formData.get("pin") ?? "");
  if (!pinMatches(pin)) {
    await new Promise((r) => setTimeout(r, 700));
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

// ---------- Uitgaven ----------

export async function saveExpense(formData: FormData) {
  await ensureSchema();
  const id = toInt(formData.get("id"));
  const cents = toInt(formData.get("cents"));
  const categoryId = toInt(formData.get("category_id"));
  const note = String(formData.get("note") ?? "").trim() || null;
  const spentAt = localToIso(formData.get("spent_at"));
  if (!cents || cents <= 0) throw new Error("Bedrag ontbreekt");

  if (id) {
    await sql`UPDATE expenses SET amount_cents = ${cents}, category_id = ${categoryId}, note = ${note}, spent_at = ${spentAt}
              WHERE id = ${id}`;
  } else {
    await sql`INSERT INTO expenses (amount_cents, category_id, note, spent_at)
              VALUES (${cents}, ${categoryId}, ${note}, ${spentAt})`;
  }
  refresh();
  redirect("/");
}

export async function quickAdd(categoryId: number) {
  await ensureSchema();
  await sql`INSERT INTO expenses (amount_cents, category_id)
            SELECT default_amount_cents, id FROM categories
            WHERE id = ${categoryId} AND default_amount_cents IS NOT NULL`;
  refresh();
}

export async function deleteExpense(id: number) {
  await ensureSchema();
  await sql`DELETE FROM expenses WHERE id = ${id}`;
  refresh();
  redirect("/");
}

// ---------- Voorraad ----------

export async function takePack() {
  await ensureSchema();
  await sql`UPDATE packs SET used_at = now() WHERE id = (
              SELECT p.id FROM packs p JOIN cartons c ON c.id = p.carton_id
              WHERE p.used_at IS NULL
              ORDER BY c.bought_at, c.id, p.position LIMIT 1)`;
  refresh();
}

export async function togglePack(id: number) {
  await ensureSchema();
  await sql`UPDATE packs SET used_at = CASE WHEN used_at IS NULL THEN now() ELSE NULL END WHERE id = ${id}`;
  refresh();
}

export async function addCartons(formData: FormData) {
  await ensureSchema();
  const count = Math.min(20, Math.max(1, toInt(formData.get("count")) ?? 1));
  const packs = Math.min(40, Math.max(1, toInt(formData.get("packs")) ?? 10));
  const price = parseCents(formData.get("price")) ?? 0;
  const label = String(formData.get("label") ?? "").trim() || null;
  const boughtAt = localToIso(formData.get("bought_at"));

  for (let i = 0; i < count; i++) {
    // Eén atomair statement: slof + pakjes + uitgave (in categorie Sigaretten)
    await sql`
      WITH c AS (
        INSERT INTO cartons (label, packs_total, price_cents, bought_at)
        VALUES (${label}, ${packs}, ${price}, ${boughtAt})
        RETURNING id
      ), p AS (
        INSERT INTO packs (carton_id, position)
        SELECT c.id, g FROM c, generate_series(1, ${packs}::int) AS g
      )
      INSERT INTO expenses (amount_cents, category_id, note, spent_at, carton_id)
      SELECT ${price}, (SELECT id FROM categories WHERE system_key = 'cigarettes'),
             ${"Slof" + (label ? ` ${label}` : "")}, ${boughtAt}, c.id
      FROM c WHERE ${price}::int > 0`;
  }
  refresh();
  redirect("/voorraad");
}

export async function deleteCarton(id: number) {
  await ensureSchema();
  // Pakjes en de gekoppelde uitgave gaan via ON DELETE CASCADE mee.
  await sql`DELETE FROM cartons WHERE id = ${id}`;
  refresh();
}

// ---------- Categorieën ----------

export async function saveCategory(formData: FormData) {
  await ensureSchema();
  const id = toInt(formData.get("id"));
  const name = String(formData.get("name") ?? "").trim();
  const color = /^#[0-9a-fA-F]{6}$/.test(String(formData.get("color"))) ? String(formData.get("color")) : "#F2C230";
  const amount = parseCents(formData.get("default_amount"));
  if (!name) return;
  if (id) {
    await sql`UPDATE categories SET name = ${name}, color = ${color}, default_amount_cents = ${amount} WHERE id = ${id}`;
  } else {
    await sql`INSERT INTO categories (name, color, default_amount_cents, sort)
              VALUES (${name}, ${color}, ${amount}, (SELECT COALESCE(MAX(sort), 0) + 1 FROM categories WHERE sort < 99))`;
  }
  refresh();
}

export async function deleteCategory(id: number) {
  await ensureSchema();
  await sql`DELETE FROM categories WHERE id = ${id} AND system_key IS NULL`;
  refresh();
}
