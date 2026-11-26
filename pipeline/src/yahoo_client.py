"""Yahoo! Shopping Item Search API v3 client (used/junk prices, official images, product URLs).

Uses official Yahoo! JAPAN Web Service:
  https://shopping.yahooapis.jp/ShoppingWebService/V3/itemSearch
Requires YAHOO_CLIENT_ID (free on Yahoo! JAPAN Developer Network).
Optional ValueCommerce affiliate wrapping via YAHOO_VC_SID and YAHOO_VC_PID.
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

ENDPOINT = "https://shopping.yahooapis.jp/ShoppingWebService/V3/itemSearch"
UA = "JunkPriceBattle/0.1 (https://junk-price-battle.kakera-apps.workers.dev) yahoo-client"
TIMEOUT = 15


def is_configured() -> bool:
    return bool(os.environ.get("YAHOO_CLIENT_ID"))


def _get_json(url: str, params: Dict[str, Any]) -> Dict[str, Any]:
    if httpx is not None:
        r = httpx.get(url, params=params, headers={"User-Agent": UA}, timeout=TIMEOUT)
        r.raise_for_status()
        return r.json()
    full = url + "?" + urllib.parse.urlencode(params)
    req = urllib.request.Request(full, headers={"User-Agent": UA})
    with urllib.request.urlopen(req, timeout=TIMEOUT) as resp:
        return json.loads(resp.read().decode("utf-8"))


def _wrap_affiliate(url: Optional[str]) -> Optional[str]:
    if not url:
        return None
    sid = os.environ.get("YAHOO_VC_SID")
    pid = os.environ.get("YAHOO_VC_PID")
    if sid and pid:
        return "https://ck.jp.ap.valuecommerce.com/servlet/referral?sid={}&pid={}&vc_url={}".format(
            urllib.parse.quote(sid, safe=""),
            urllib.parse.quote(pid, safe=""),
            urllib.parse.quote(url, safe=""),
        )
    return url


def search_items(query: str, condition: Optional[str] = "used", results: int = 20) -> List[Dict[str, Any]]:
    """Query Yahoo! Shopping Item Search v3. Returns list of hit dicts (empty on error)."""
    app_id = os.environ.get("YAHOO_CLIENT_ID")
    if not app_id or not query:
        return []
    params: Dict[str, Any] = {
        "appid": app_id,
        "query": query,
        "results": min(max(results, 1), 50),
        "in_stock": "true",
    }
    if condition:
        params["condition"] = condition
    try:
        data = _get_json(ENDPOINT, params)
    except Exception as e:
        print("  [yahoo] error ({}): {}".format(query, e))
        return []
    return data.get("hits") or []


def _extract_image(hit: Dict[str, Any]) -> Optional[str]:
    ex = hit.get("exImage") or {}
    if isinstance(ex, dict) and ex.get("url"):
        return ex["url"]
    img = hit.get("image") or {}
    if isinstance(img, dict):
        return img.get("medium") or img.get("small")
    return None


def _summarize_prices(hits: List[Dict[str, Any]]) -> Optional[Tuple[int, int, int]]:
    """Return (min_price, median_price, max_price) rounded to 10 yen, trimming outliers."""
    prices = sorted(
        int(h["price"])
        for h in hits
        if isinstance(h.get("price"), (int, float)) and 100 <= int(h["price"]) <= 300000
    )
    if len(prices) < 2:
        return None
    if len(prices) >= 6:
        trim = max(1, len(prices) // 10)
        prices = prices[trim:-trim]
    mn = (prices[0] // 10) * 10
    mx = ((prices[-1] + 9) // 10) * 10
    med = int(round(statistics.median(prices) / 10.0)) * 10
    med = max(mn, min(mx, med))
    return mn, med, mx


def fetch_market_data(keyword: str, delay: float = 1.05) -> Optional[Dict[str, Any]]:
    """Fetch real product image, URL, and (when used/junk matches) market prices.

    Strategy:
      1. Search with original keyword + condition=used.
      2. If <2 hits and keyword has 'ジャンク'/'中古', strip those words and search condition=used.
      3. If still 0 hits, search stripped keyword without condition filter for image+URL only
         (do NOT overwrite junk prices with brand-new prices).
    """
    if not is_configured() or not keyword:
        return None

    stripped = re.sub(r"\s*(ジャンク|中古)\s*", " ", keyword).strip()
    queries: List[Tuple[str, Optional[str], bool]] = [(keyword, "used", True)]
    if stripped and stripped != keyword:
        queries.append((stripped, "used", True))
    if stripped:
        queries.append((stripped, None, False))

    best_hits: List[Dict[str, Any]] = []
    use_prices = False
    matched_kw = keyword

    for idx, (q, cond, allow_price) in enumerate(queries):
        if idx > 0:
            time.sleep(delay)
        hits = search_items(q, condition=cond, results=20)
        if hits:
            best_hits = hits
            use_prices = allow_price
            matched_kw = "{}{}".format(q, " [used]" if cond == "used" else "")
            if len(hits) >= 2 or not allow_price:
                break

    if not best_hits:
        return None

    image_url = None
    product_url = None
    for h in best_hits:
        img = _extract_image(h)
        if img:
            image_url = img
            product_url = _wrap_affiliate(h.get("url"))
            break

    result: Dict[str, Any] = {
        "matched_keyword": matched_kw,
        "hits": len(best_hits),
        "image_url": image_url,
        "image_source_type": "yahoo" if image_url else None,
        "image_attribution": "Yahoo!ショッピング" if image_url else None,
        "affiliate_product_url": product_url,
        "prices": None,
    }
    if use_prices:
        summary = _summarize_prices(best_hits)
        if summary:
            result["prices"] = {
                "min_price": summary[0],
                "average_price": summary[1],
                "max_price": summary[2],
            }
    return result
