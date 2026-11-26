import Database from "better-sqlite3";
import path from "path";
import fs from "fs";

export type Item = {
  id: number;
  slug: string;
  title: string;
  subtitle: string | null;
  category: string;
  average_price: number;
  min_price: number;
  max_price: number;
  overseas_price_jpy: number | null;
  why_it_sells: string | null;
  selling_tips: string | null;
  listing_template: string | null;
  mercari_search_keyword: string | null;
  image_url: string | null;
  image_source_type: "rakuten" | "yahoo" | "wikimedia" | "fallback" | null;
  image_attribution: string | null;
  affiliate_product_url: string | null;
};

function dbPath() {
  return process.env.ZUKAN_DB_PATH || path.join(process.cwd(), "..", "data", "zukan.db");
}

function withDb<T>(fn: (db: Database.Database) => T, fallback: T): T {
  const p = dbPath();
  if (!fs.existsSync(p)) return fallback;
  const db = new Database(p, { readonly: true, fileMustExist: true });
  try {
    return fn(db);
  } finally {
    db.close();
  }
}

export function getAllItems(): Item[] {
  return withDb((db) => db.prepare("SELECT * FROM items ORDER BY id").all() as Item[], []);
}

export function getItemBySlug(slug: string): Item | undefined {
  return withDb((db) => db.prepare("SELECT * FROM items WHERE slug = ?").get(slug) as Item | undefined, undefined);
}

export function getCategories(): string[] {
  return withDb(
    (db) => (db.prepare("SELECT DISTINCT category FROM items ORDER BY category").all() as { category: string }[]).map((r) => r.category),
    []
  );
}

export function getRelated(item: Item, limit = 4): Item[] {
  return withDb(
    (db) =>
      db
        .prepare("SELECT * FROM items WHERE category = ? AND slug != ? ORDER BY ABS(average_price - ?) LIMIT ?")
        .all(item.category, item.slug, item.average_price, limit) as Item[],
    []
  );
}
