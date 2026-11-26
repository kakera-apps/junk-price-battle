"""Sync existing items in data/zukan.db with real Rakuten Ichiba API data (images, affiliate URLs, prices).

Usage:
  python pipeline/src/rakuten_sync.py                # sync all items (images + used/junk prices)
  python pipeline/src/rakuten_sync.py --images-only  # update images & affiliate URLs only
  python pipeline/src/rakuten_sync.py --only-missing # only items not yet sourced from Rakuten
  python pipeline/src/rakuten_sync.py --dry-run      # preview without writing DB
"""
from __future__ import annotations

import argparse
import os
import sys
import time

sys.path.insert(0, os.path.dirname(__file__))

from db import all_items, connect, upsert_item  # noqa: E402
from rakuten_client import fetch_market_data, is_configured  # noqa: E402


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--images-only", action="store_true", help="Do not update prices")
    ap.add_argument("--only-missing", action="store_true", help="Skip items already using Rakuten images")
    ap.add_argument("--dry-run", action="store_true", help="Print updates without saving to DB")
    ap.add_argument("--limit", type=int, default=0, help="Max items to process (0 = all)")
    args = ap.parse_args()

    if not is_configured():
        sys.exit("RAKUTEN_APP_ID が未設定です。pipeline/.env または環境変数に設定してください。")

    conn = connect()
    rows = [dict(r) for r in all_items(conn)]
    used_prices = {r["average_price"] for r in rows}

    updated_img = 0
    updated_price = 0
    processed = 0

    for row in rows:
        if args.only_missing and row.get("image_source_type") == "rakuten":
            continue
        if args.limit and processed >= args.limit:
            break
        processed += 1

        kw = row.get("mercari_search_keyword") or row["title"]
        data = fetch_market_data(kw)
        if not data:
            print("[  miss] {}".format(row["slug"]))
            time.sleep(1.05)
            continue

        changed = False
        if data.get("image_url"):
            row["image_url"] = data["image_url"]
            row["image_source_type"] = "rakuten"
            row["image_attribution"] = "楽天市場"
            row["affiliate_product_url"] = data["affiliate_product_url"]
            updated_img += 1
            changed = True

        p = data.get("prices")
        price_note = "price:keep"
        if p and not args.images_only:
            old_avg = row["average_price"]
            used_prices.discard(old_avg)
            new_avg = p["average_price"]
            while new_avg in used_prices:
                new_avg += 10
            used_prices.add(new_avg)
            row["min_price"] = min(p["min_price"], new_avg)
            row["average_price"] = new_avg
            row["max_price"] = max(p["max_price"], new_avg)
            updated_price += 1
            changed = True
            price_note = "price:¥{}->¥{} ({}件)".format(old_avg, new_avg, data["hits"])

        print("[  sync] {} | kw={} | {}".format(row["slug"], data["matched_keyword"], price_note))
        if changed and not args.dry_run:
            upsert_item(conn, row)
        time.sleep(1.05)

    print(
        "\nDone. processed={}, images_updated={}, prices_updated={}{}".format(
            processed, updated_img, updated_price, " (dry-run)" if args.dry_run else ""
        )
    )


if __name__ == "__main__":
    main()
