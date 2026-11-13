import "server-only";
import { neon, neonConfig, type NeonQueryFunction } from "@neondatabase/serverless";

// Alleen voor lokaal testen: wijs de Neon-HTTP-driver naar een eigen endpoint.
if (process.env.NEON_FETCH_ENDPOINT) {
  const endpoint = process.env.NEON_FETCH_ENDPOINT;
  neonConfig.fetchEndpoint = () => endpoint;
}

let _sql: NeonQueryFunction<false, false> | null = null;

function getSql() {
  if (!_sql) {
    const url = process.env.DATABASE_URL ?? process.env.POSTGRES_URL;
    if (!url) throw new Error("DATABASE_URL ontbreekt. Koppel Neon in Vercel of zet hem in .env.local");
    _sql = neon(url);
  }
  return _sql;
}

/** Tagged template: await sql`select ...` */
export const sql = ((strings: TemplateStringsArray, ...values: unknown[]) =>
  getSql()(strings, ...values)) as unknown as NeonQueryFunction<false, false>;

let ready: Promise<void> | null = null;

/** Maakt tabellen aan (idempotent) en zaait standaardcategorieën. Eén keer per cold start. */
export function ensureSchema(): Promise<void> {
  if (!ready) {
    ready = (async () => {
      const q = getSql();
      await q.transaction([
        q`CREATE TABLE IF NOT EXISTS categories (
            id SERIAL PRIMARY KEY,
            name TEXT NOT NULL,
            color TEXT NOT NULL DEFAULT '#F2C230',
            default_amount_cents INTEGER,
            system_key TEXT UNIQUE,
            sort INTEGER NOT NULL DEFAULT 0,
            created_at TIMESTAMPTZ NOT NULL DEFAULT now()
          )`,
        q`CREATE TABLE IF NOT EXISTS cartons (
            id SERIAL PRIMARY KEY,
            label TEXT,
            packs_total INTEGER NOT NULL,
            price_cents INTEGER NOT NULL DEFAULT 0,
            bought_at TIMESTAMPTZ NOT NULL DEFAULT now(),
            created_at TIMESTAMPTZ NOT NULL DEFAULT now()
          )`,
        q`CREATE TABLE IF NOT EXISTS packs (
            id SERIAL PRIMARY KEY,
            carton_id INTEGER NOT NULL REFERENCES cartons(id) ON DELETE CASCADE,
            position INTEGER NOT NULL,
            used_at TIMESTAMPTZ
          )`,
        q`CREATE TABLE IF NOT EXISTS expenses (
            id SERIAL PRIMARY KEY,
            amount_cents INTEGER NOT NULL,
            category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
            note TEXT,
            spent_at TIMESTAMPTZ NOT NULL DEFAULT now(),
            carton_id INTEGER REFERENCES cartons(id) ON DELETE CASCADE,
            created_at TIMESTAMPTZ NOT NULL DEFAULT now()
          )`,
        q`CREATE INDEX IF NOT EXISTS expenses_spent_at_idx ON expenses (spent_at)`,
        q`CREATE INDEX IF NOT EXISTS packs_carton_idx ON packs (carton_id, position)`,
        q`INSERT INTO categories (name, color, default_amount_cents, system_key, sort)
          SELECT * FROM (VALUES
            ('Boodschappen', '#9AD77E', NULL::int, NULL::text, 1),
            ('Koffie',       '#F2C230', 320,       NULL, 2),
            ('Lunch',        '#7CC4F0', NULL,      NULL, 3),
            ('Uit eten',     '#F0A35E', NULL,      NULL, 4),
            ('Vervoer',      '#D9A0E0', NULL,      NULL, 5),
            ('Sigaretten',   '#E5533D', NULL,      'cigarettes', 6),
            ('Overig',       '#A39B8F', NULL,      NULL, 99)
          ) AS v(name, color, default_amount_cents, system_key, sort)
          WHERE NOT EXISTS (SELECT 1 FROM categories)`,
        q`INSERT INTO categories (name, color, system_key, sort)
          SELECT 'Sigaretten', '#E5533D', 'cigarettes', 6
          WHERE NOT EXISTS (SELECT 1 FROM categories WHERE system_key = 'cigarettes')`,
      ]);
    })().catch((e) => {
      ready = null;
      throw e;
    });
  }
  return ready;
}
