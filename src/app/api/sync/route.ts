import { NextResponse } from "next/server";
import { ensureSchema, getSql } from "@/lib/db";
import type { Op, QueuedOp, SyncResult } from "@/lib/types";

export const dynamic = "force-dynamic";

const isNum = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);
const isIso = (v: unknown): v is string => typeof v === "string" && !Number.isNaN(Date.parse(v));
const isColor = (v: unknown) => typeof v === "string" && /^#[0-9a-fA-F]{6}$/.test(v);
const str = (v: unknown, max = 200) => (typeof v === "string" && v.trim() ? v.trim().slice(0, max) : null);

class BadOp extends Error {}
const need = (cond: unknown, msg: string) => {
  if (!cond) throw new BadOp(msg);
};

async function apply(op: Op) {
  const q = getSql();
  switch (op.type) {
    case "expense.upsert": {
      const e = op.expense;
      need(isNum(e?.id) && isNum(e.amount_cents) && e.amount_cents > 0 && e.amount_cents < 1e9, "Ongeldig bedrag");
      need(isIso(e.spent_at), "Ongeldige datum");
      await q`INSERT INTO expenses (id, amount_cents, category_id, note, spent_at, carton_id)
              VALUES (${e.id}, ${Math.round(e.amount_cents)}, ${isNum(e.category_id) ? e.category_id : null},
                      ${str(e.note)}, ${e.spent_at}, ${isNum(e.carton_id) ? e.carton_id : null})
              ON CONFLICT (id) DO UPDATE SET amount_cents = EXCLUDED.amount_cents,
                category_id = EXCLUDED.category_id, note = EXCLUDED.note, spent_at = EXCLUDED.spent_at`;
      return;
    }
    case "expense.delete":
      need(isNum(op.id), "Ongeldig id");
      await q`DELETE FROM expenses WHERE id = ${op.id}`;
      return;
    case "category.upsert": {
      const c = op.category;
      const name = str(c?.name, 40);
      need(isNum(c?.id) && name, "Naam ontbreekt");
      const amount = isNum(c.default_amount_cents) && c.default_amount_cents > 0 ? Math.round(c.default_amount_cents) : null;
      await q`INSERT INTO categories (id, name, color, default_amount_cents, sort)
              VALUES (${c.id}, ${name}, ${isColor(c.color) ? c.color : "#F2C230"}, ${amount}, ${isNum(c.sort) ? c.sort : 50})
              ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, color = EXCLUDED.color,
                default_amount_cents = EXCLUDED.default_amount_cents, sort = EXCLUDED.sort`;
      return;
    }
    case "category.delete":
      need(isNum(op.id), "Ongeldig id");
      await q`DELETE FROM categories WHERE id = ${op.id} AND system_key IS NULL`;
      return;
    case "carton.add": {
      const c = op.carton;
      need(isNum(c?.id) && isNum(c.packs_total) && c.packs_total > 0 && c.packs_total <= 40, "Ongeldige slof");
      need(isIso(c.bought_at) && Array.isArray(op.packs) && op.packs.length === c.packs_total, "Ongeldige slof");
      const ids = op.packs.map((p) => p.id);
      const pos = op.packs.map((p) => p.position);
      const used = op.packs.map((p) => (isIso(p.used_at) ? p.used_at : null));
      need(ids.every(isNum) && pos.every(isNum), "Ongeldige pakjes");
      const e = op.expense;
      const stmts = [
        q`INSERT INTO cartons (id, label, packs_total, price_cents, bought_at)
          VALUES (${c.id}, ${str(c.label, 40)}, ${c.packs_total}, ${isNum(c.price_cents) ? Math.round(c.price_cents) : 0}, ${c.bought_at})
          ON CONFLICT (id) DO NOTHING`,
        q`INSERT INTO packs (id, carton_id, position, used_at)
          SELECT u.id, ${c.id}, u.pos, u.used FROM unnest(${ids}::bigint[], ${pos}::int[], ${used}::timestamptz[]) AS u(id, pos, used)
          ON CONFLICT (id) DO NOTHING`,
      ];
      if (e && isNum(e.id) && isNum(e.amount_cents) && e.amount_cents > 0) {
        stmts.push(
          q`INSERT INTO expenses (id, amount_cents, category_id, note, spent_at, carton_id)
            VALUES (${e.id}, ${Math.round(e.amount_cents)},
                    COALESCE(${isNum(e.category_id) ? e.category_id : null}::bigint, (SELECT id FROM categories WHERE system_key = 'cigarettes')),
                    ${str(e.note)}, ${isIso(e.spent_at) ? e.spent_at : c.bought_at}, ${c.id})
            ON CONFLICT (id) DO NOTHING`,
        );
      }
      await q.transaction(stmts);
      return;
    }
    case "carton.delete":
      need(isNum(op.id), "Ongeldig id");
      await q`DELETE FROM cartons WHERE id = ${op.id}`;
      return;
    case "pack.set":
      need(isNum(op.id), "Ongeldig id");
      await q`UPDATE packs SET used_at = ${isIso(op.used_at) ? op.used_at : null} WHERE id = ${op.id}`;
      return;
    default:
      throw new BadOp("Onbekende actie");
  }
}

export async function POST(req: Request) {
  let body: { ops?: QueuedOp[] };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Ongeldig verzoek" }, { status: 400 });
  }
  const ops = Array.isArray(body.ops) ? body.ops.slice(0, 200) : [];
  try {
    await ensureSchema();
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Database niet bereikbaar" }, { status: 503 });
  }

  const results: SyncResult[] = [];
  for (const { qid, op } of ops) {
    try {
      await apply(op);
      results.push({ qid, ok: true });
    } catch (e) {
      if (e instanceof BadOp) {
        results.push({ qid, ok: false, error: e.message });
      } else {
        // Tijdelijke fout (database): stop hier, client probeert de rest later opnieuw.
        console.error(e);
        break;
      }
    }
  }
  return NextResponse.json({ results }, { headers: { "Cache-Control": "no-store" } });
}
