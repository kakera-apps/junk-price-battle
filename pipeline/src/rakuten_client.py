"""Rakuten Ichiba Search API client for real market prices, product images, and affiliate URLs.

Uses official Rakuten Web Service (IchibaItem/Search/20220601).
Works with Python 3.7+ standard library (uses httpx if installed).
"""
from __future__ import annotations

import json
import os
import re
import statistics
import time
import urllib.parse
import urllib.request
from typing import Any, Dict, List, Optional, Tuple

try:
    import httpx  # type: ignore
except Exception:  # pragma: no cover
    httpx = None

try:
    from dotenv import load_dotenv  # type: ignore

    load_dotenv(os.path.join(os.path.dirname(__file__), "..", ".env"))
except Exception:
    pass

UA = "JunkPriceBattle/0.1 (https://junk-price-battle.kakera-apps.workers.dev) rakuten-client"
TIMEOUT = 15


def is_configured() -> bool:
    return bool(os.environ.get("RAKUTEN_APP_ID"))


def _get_json(url: str, params: Dict[str, Any]) -> Dict[str, Any]:
    if httpx is not None:
        r = httpx.get(url, params=params, headers={"User-Agent": UA}, timeout=TIMEOUT)
        r.raise_for_status()
        return r.json()
    full = url + "?" + urllib.parse.urlencode(params)
    req = urllib.request.Request(full, headers={"User-Agent": UA})
    with urllib.request.urlopen(req, timeout=TIMEOUT) as resp:
        return json.loads(resp.read().decode("utf-8"))


def search_items(keyword: str, hits: int = 20) -> List[Dict[str, Any]]:
    """Query Rakuten Ichiba Item Search API. Returns raw item dicts (empty list on error)."""
    app_id = os.environ.get("RAKUTEN_APP_ID")
    if not app_id or not keyword:
        return []
    access_key = os.environ.get("RAKUTEN_ACCESS_KEY")
    url = (
        "https://openapi.rakuten.co.jp/ichibams/api/IchibaItem/Search/20220601"
        if access_key
        else "https://app.rakuten.co.jp/services/api/IchibaItem/Search/20220601"
    )
    params: Dict[str, Any] = {
        "applicationId": app_id,
        "keyword": keyword,
        "imageFlag": 1,
        "hits": min(max(hits, 1), 30),
        "availability": 1,
        "format": "json",
        "formatVersion": 2,
    }
    if access_key:
        params["accessKey"] = access_key
    if os.environ.get("RAKUTEN_AFFILIATE_ID"):
        params["affiliateId"] = os.environ["RAKUTEN_AFFILIATE_ID"]

    try:
        data = _get_json(url, params)
    except Exception as e:
        print("  [rakuten] error ({}): {}".format(keyword, e))
        return []
    return [it.get("Item", it) for it in data.get("Items", [])]


def _extract_image(it: Dict[str, Any]) -> Optional[str]:
    imgs = it.get("mediumImageUrls") or []
    if not imgs:
        return None
    first = imgs[0]
    img = first.get("imageUrl") if isinstance(first, dict) else first
    if not img:
        return None
    return re.sub(r"\?_ex=\d+x\d+", "?_ex=400x400", img)


def _summarize_prices(items: List[Dict[str, Any]]) -> Optional[Tuple[int, int, int]]:
    """Return (min_price, median_price, max_price) rounded to 10 yen, trimming extreme outliers."""
    prices = sorted(
        int(it["itemPrice"])
        for it in items
        if isinstance(it.get("itemPrice"), (int, float)) and 100 <= int(it["itemPrice"]) <= 300000
    )
    if len(prices) < 2:
        return None
    # Trim top & bottom 10% when we have enough samples to avoid accessory/placeholder outliers
    if len(prices) >= 6:
        trim = max(1, len(prices) // 10)
        prices = prices[trim:-trim]
    mn = (prices[0] // 10) * 10
    mx = ((prices[-1] + 9) // 10) * 10
    med = int(round(statistics.median(prices) / 10.0)) * 10
    med = max(mn, min(mx, med))
    return mn, med, mx


def fetch_market_data(keyword: str, delay: float = 1.05) -> Optional[Dict[str, Any]]:
    """Fetch real product image, affiliate URL, and (when used/junk matches) market prices.

    Strategy:
      1. Search with the original keyword (usually contains 'ジャンク').
      2. If <2 hits and keyword has 'ジャンク', retry replacing with '中古'.
      3. If still 0 hits, retry stripping 'ジャンク'/'中古' for image+affiliate URL only
         (do NOT overwrite junk price estimates with retail-new prices).
    """
    if not is_configured() or not keyword:
        return None

    queries: List[Tuple[str, bool]] = [(keyword, True)]
    if "ジャンク" in keyword:
        queries.append((keyword.replace("ジャンク", "中古").strip(), True))
    stripped = re.sub(r"\s*(ジャンク|中古)\s*", " ", keyword).strip()
    if stripped and stripped != keyword:
        queries.append((stripped, False))

    best_items: List[Dict[str, Any]] = []
    use_prices = False
    matched_kw = keyword

    for idx, (q, allow_price) in enumerate(queries):
        if idx > 0:
            time.sleep(delay)
        items = search_items(q, hits=20)
        if items:
            best_items = items
            use_prices = allow_price
            matched_kw = q
            # If we got enough used/junk hits, stop early
            if len(items) >= 2 or not allow_price:
                break

    if not best_items:
        return None

    # Pick first item with a valid image
    image_url = None
    affiliate_url = None
    for it in best_items:
        img = _extract_image(it)
        if img:
            image_url = img
            affiliate_url = it.get("affiliateUrl") or it.get("itemUrl")
            break

    result: Dict[str, Any] = {
        "matched_keyword": matched_kw,
        "hits": len(best_items),
        "image_url": image_url,
        "image_source_type": "rakuten" if image_url else None,
        "image_attribution": "楽天市場" if image_url else None,
        "affiliate_product_url": affiliate_url,
        "prices": None,
    }
    if use_prices:
        summary = _summarize_prices(best_items)
        if summary:
            result["prices"] = {
                "min_price": summary[0],
                "average_price": summary[1],
                "max_price": summary[2],
            }
    return result
