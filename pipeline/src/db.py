"""SQLite schema and helpers. Plain SQL only so it can move to Cloudflare D1 later."""
from __future__ import annotations

import os
import sqlite3
from datetime import datetime
from typing import Any, Dict, List, Optional

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
DB_PATH = os.environ.get("ZUKAN_DB_PATH") or os.path.join(ROOT, "data", "zukan.db")

CATEGORIES = [
    "レトロゲーム",
    "家電・PCパーツ",
    "空き箱・紙袋",
    "カメラ・レンズ",
    "オーディオ",
    "趣味・日用品",
]

SCHEMA = """
CREATE TABLE IF NOT EXISTS items (
    id INTEGER PRIMARY KEY,
    slug TEXT UNIQUE NOT NULL,
    title TEXT NOT NULL,
    subtitle TEXT,
    category TEXT NOT NULL,
    average_price INTEGER NOT NULL,
    min_price INTEGER NOT NULL,
    max_price INTEGER NOT NULL,
    overseas_price_jpy INTEGER,
    why_it_sells TEXT,
    selling_tips TEXT,
    listing_template TEXT,
    mercari_search_keyword TEXT,
    image_url TEXT,
    image_source_type TEXT CHECK (image_source_type IN ('rakuten','wikimedia','fallback')),
    image_attribution TEXT,
    affiliate_product_url TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_items_category ON items(category);
CREATE INDEX IF NOT EXISTS idx_items_price ON items(average_price);
"""

FIELDS = [
    "slug", "title", "subtitle", "category", "average_price", "min_price", "max_price",
    "overseas_price_jpy", "why_it_sells", "selling_tips", "listing_template",
    "mercari_search_keyword", "image_url", "image_source_type", "image_attribution",
    "affiliate_product_url",
]


def now() -> str:
    return datetime.now().isoformat(timespec="seconds")


def connect(path: Optional[str] = None) -> sqlite3.Connection:
    path = path or DB_PATH
    os.makedirs(os.path.dirname(path), exist_ok=True)
    conn = sqlite3.connect(path)
    conn.row_factory = sqlite3.Row
    conn.executescript(SCHEMA)
    return conn


def upsert_item(conn: sqlite3.Connection, item: Dict[str, Any]) -> None:
    # Portable upsert (no ON CONFLICT: works on old SQLite and on D1 alike)
    ts = now()
    values = [item.get(f) for f in FIELDS]
    row = conn.execute("SELECT id FROM items WHERE slug = ?", (item["slug"],)).fetchone()
    if row:
        sets = ", ".join("{} = ?".format(f) for f in FIELDS if f != "slug")
        conn.execute(
            "UPDATE items SET {}, updated_at = ? WHERE slug = ?".format(sets),
            [item.get(f) for f in FIELDS if f != "slug"] + [ts, item["slug"]],
        )
    else:
        marks = ", ".join("?" for _ in FIELDS)
        conn.execute(
            "INSERT INTO items ({}, created_at, updated_at) VALUES ({}, ?, ?)".format(", ".join(FIELDS), marks),
            values + [ts, ts],
        )
    conn.commit()

def all_items(conn: sqlite3.Connection) -> List[sqlite3.Row]:
    return conn.execute("SELECT * FROM items ORDER BY id").fetchall()


def existing_slugs_and_prices(conn: sqlite3.Connection):
    rows = all_items(conn)
    return {r["slug"] for r in rows}, {r["average_price"] for r in rows}, [r["title"] for r in rows]

