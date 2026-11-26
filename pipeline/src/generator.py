"""Generate 10 new junk items with Gemini structured output, fetch legal images, add to zukan.db.

Usage:  python src/generator.py [--count 10] [--dry-run]
Requires GEMINI_API_KEY (Python 3.9+, google-genai, pydantic).
"""
from __future__ import annotations

import argparse
import os
import re
import sys
import time
from typing import List

sys.path.insert(0, os.path.dirname(__file__))

try:
    from dotenv import load_dotenv

    load_dotenv(os.path.join(os.path.dirname(__file__), "..", ".env"))
except Exception:
    pass

from pydantic import BaseModel, Field  # noqa: E402

from db import CATEGORIES, connect, existing_slugs_and_prices, upsert_item  # noqa: E402
from image_fetcher import fetch_image  # noqa: E402

SLUG_RE = re.compile(r"^[a-z0-9]+(?:-[a-z0-9]+)*$")


class GeneratedItem(BaseModel):
    slug: str = Field(description="URL slug, lowercase ascii and hyphens only, e.g. broken-ps2-controller")
    title: str
    subtitle: str = Field(description="状態補足")
    category: str = Field(description="Exactly one of: " + " / ".join(CATEGORIES))
    average_price: int = Field(description="平均売却価格(円) 300〜15000")
    min_price: int
    max_price: int
    overseas_price_jpy: int
    why_it_sells: str = Field(description="なぜゴミでも売れるのか。意外性のある豆知識(100〜200字)")
    selling_tips: str
    listing_template: str = Field(description="ジャンク表記を含む出品用説明文")
    mercari_search_keyword: str
    image_search_keyword_en: str = Field(description="Wikimedia Commons検索用の英語キーワード(商品の一般名・型番)")


class GeneratedBatch(BaseModel):
    items: List[GeneratedItem]


def build_prompt(count: int, titles: List[str], prices: List[int]) -> str:
    return (
        "あなたはフリマ・オークション相場に詳しい古物商です。『ゴミやジャンク品に見えるのに意外と高く売れる』"
        "アイテムを{n}件、日本のフリマ相場(メルカリ/ヤフオク)の実態に即して提案してください。\n"
        "条件:\n- カテゴリは次のいずれか: {c}\n- average_priceは300〜15000円で、既存価格と被らない値にする\n"
        "- min_price <= average_price <= max_price\n- 実在する商品の一般名(特定の個人や権利侵害に当たるものは不可)\n"
        "- 偽造品・違法品・盗品・医薬品・危険物は不可\n- 価格は推定の目安であり、断定的な保証表現は避ける\n"
        "- 既存アイテムと重複しないこと。\n既存タイトル: {t}\n既存価格: {p}"
    ).format(n=count, c="/".join(CATEGORIES), t=" | ".join(titles), p=sorted(prices))


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--count", type=int, default=10)
    ap.add_argument("--dry-run", action="store_true")
    args = ap.parse_args()

    key = os.environ.get("GEMINI_API_KEY")
    if not key:
        sys.exit("GEMINI_API_KEY が未設定です。pipeline/.env に設定してください。")

    from google import genai
    from google.genai import types

    conn = connect()
    slugs, prices, titles = existing_slugs_and_prices(conn)
    client = genai.Client(api_key=key)
    resp = client.models.generate_content(
        model=os.environ.get("GEMINI_MODEL", "gemini-2.5-flash"),
        contents=build_prompt(args.count, titles, list(prices)),
        config=types.GenerateContentConfig(
            response_mime_type="application/json",
            response_schema=GeneratedBatch,
            temperature=1.0,
        ),
    )
    batch = resp.parsed if getattr(resp, "parsed", None) else GeneratedBatch.model_validate_json(resp.text)

    added = 0
    for it in batch.items:
        if not SLUG_RE.match(it.slug) or it.slug in slugs or it.title in titles:
            print("skip (slug/title invalid or duplicate): {}".format(it.slug))
            continue
        if it.category not in CATEGORIES:
            it.category = "趣味・日用品"
        if not (0 < it.min_price <= it.average_price <= it.max_price):
            print("skip (price range invalid): {}".format(it.slug))
            continue
        while it.average_price in prices:  # keep prices distinct for the quiz
            it.average_price += 10
        it.max_price = max(it.max_price, it.average_price)
        img = fetch_image(it.mercari_search_keyword, it.image_search_keyword_en)
        row = it.model_dump()
        row.pop("image_search_keyword_en")
        row.update(img)
        print("+ [{}] {} ¥{} ({})".format(img["image_source_type"], it.title, it.average_price, it.category))
        if not args.dry_run:
            upsert_item(conn, row)
        slugs.add(it.slug)
        prices.add(it.average_price)
        titles.append(it.title)
        added += 1
        time.sleep(0.4)
    print("Added {} items{}.".format(added, " (dry-run)" if args.dry_run else ""))


if __name__ == "__main__":
    main()
