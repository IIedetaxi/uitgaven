export type Category = {
  id: number;
  name: string;
  color: string;
  default_amount_cents: number | null;
  system_key: string | null;
  sort: number;
};

export type Expense = {
  id: number;
  amount_cents: number;
  category_id: number | null;
  note: string | null;
  spent_at: string; // ISO
  carton_id: number | null;
};

export type Carton = {
  id: number;
  label: string | null;
  packs_total: number;
  price_cents: number;
  bought_at: string; // ISO
};

export type Pack = {
  id: number;
  carton_id: number;
  position: number;
  used_at: string | null;
};

export type AppData = {
  categories: Category[];
  expenses: Expense[];
  cartons: Carton[];
  packs: Pack[];
};

export type Op =
  | { type: "expense.upsert"; expense: Expense }
  | { type: "expense.delete"; id: number }
  | { type: "category.upsert"; category: Omit<Category, "system_key"> }
  | { type: "category.delete"; id: number }
  | { type: "carton.add"; carton: Carton; packs: Pack[]; expense: Expense | null }
  | { type: "carton.delete"; id: number }
  | { type: "pack.set"; id: number; used_at: string | null };

export type QueuedOp = { qid: number; op: Op };

export type SyncResult = { qid: number; ok: true } | { qid: number; ok: false; error: string };
