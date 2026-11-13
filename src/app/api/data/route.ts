import { NextResponse } from "next/server";
import { ensureSchema, getSql } from "@/lib/db";
import type { AppData } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await ensureSchema();
    const q = getSql();
    const [categories, expenses, cartons, packs] = await q.transaction(
      [
        q`SELECT id::float8 AS id, name, color, default_amount_cents, system_key, sort
          FROM categories ORDER BY sort, name`,
        q`SELECT id::float8 AS id, amount_cents, category_id::float8 AS category_id, note,
                 spent_at, carton_id::float8 AS carton_id
          FROM expenses ORDER BY spent_at DESC, id DESC`,
        q`SELECT id::float8 AS id, label, packs_total, price_cents, bought_at
          FROM cartons ORDER BY bought_at, id`,
        q`SELECT id::float8 AS id, carton_id::float8 AS carton_id, position, used_at
          FROM packs ORDER BY carton_id, position`,
      ],
      { readOnly: true },
    );
    const iso = (d: unknown) => (d == null ? null : new Date(d as string).toISOString());
    const data: AppData = {
      categories: categories as AppData["categories"],
      expenses: (expenses as AppData["expenses"]).map((e) => ({ ...e, spent_at: iso(e.spent_at)! })),
      cartons: (cartons as AppData["cartons"]).map((c) => ({ ...c, bought_at: iso(c.bought_at)! })),
      packs: (packs as AppData["packs"]).map((p) => ({ ...p, used_at: iso(p.used_at) })),
    };
    return NextResponse.json(data, { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Kon gegevens niet laden" }, { status: 500 });
  }
}
