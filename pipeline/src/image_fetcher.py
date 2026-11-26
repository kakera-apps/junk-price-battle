"""Rights-clean image fetcher.

Priority: 1) Rakuten Ichiba API (official product image + affiliate link)
          2) Wikimedia Commons (CC0 / Public Domain / CC BY, attribution kept)
          3) fallback (frontend shows a local category SVG)
Never scrapes Mercari / Yahoo Auctions. Never raises: errors degrade to fallback.
"""
from __future__ import annotations

import json
import os
import re
import urllib.parse
import urllib.request
from typing import Any, Dict, Optional

try:  # optional dependency
    import httpx  # type: ignore
except Exception:  # pragma: no cover
    httpx = None

try:
    from dotenv import load_dotenv  # type: ignore

    load_dotenv(os.path.join(os.path.dirname(__file__), "..", ".env"))
except Exception:
    pass

UA = "JunkPriceBattle/0.1 (https://example.com; contact: admin@example.com) image-fetcher"
TIMEOUT = 15

FALLBACK: Dict[str, Any] = {
    "image_url": None,
    "image_source_type": "fallback",
    "image_attribution": "イメージイラスト",
    "affiliate_product_url": None,
}


def _get_json(url: str, params: Dict[str, Any]) -> Dict[str, Any]:
    if httpx is not None:
        r = httpx.get(url, params=params, headers={"User-Agent": UA}, timeout=TIMEOUT)
        r.raise_for_status()
        return r.json()
    full = url + "?" + urllib.parse.urlencode(params)
    req = urllib.request.Request(full, headers={"User-Agent": UA})
    with urllib.request.urlopen(req, timeout=TIMEOUT) as resp:
        return json.loads(resp.read().decode("utf-8"))


# ---------------------------------------------------------------- Rakuten
def fetch_rakuten(keyword: str) -> Optional[Dict[str, Any]]:
    from rakuten_client import fetch_market_data

    data = fetch_market_data(keyword)
    if not data or not data.get("image_url"):
        return None
    return {
        "image_url": data["image_url"],
        "image_source_type": "rakuten",
        "image_attribution": "楽天市場",
        "affiliate_product_url": data["affiliate_product_url"],
    }


# -------------------------------------------------------------- Wikimedia
_OK_LICENSE = re.compile(r"^(cc0|public domain|pd\b|cc[- ]by[- ][\d.]+)", re.I)
_SA_LICENSE = re.compile(r"^cc[- ]by-sa", re.I)


def _strip_html(s: str) -> str:
    return re.sub(r"\s+", " ", re.sub(r"<[^>]+>", "", s or "")).strip()


def _license_ok(name: str) -> bool:
    name = (name or "").strip()
    if _SA_LICENSE.match(name.replace(" ", "-")):
        return os.environ.get("WIKIMEDIA_ALLOW_SA") == "1"
    return bool(_OK_LICENSE.match(name))


def fetch_wikimedia(keyword_en: str) -> Optional[Dict[str, Any]]:
    if not keyword_en:
        return None
    params = {
        "action": "query",
        "format": "json",
        "generator": "search",
        "gsrsearch": "{} filetype:bitmap".format(keyword_en),
        "gsrnamespace": 6,
        "gsrlimit": 12,
        "prop": "imageinfo",
        "iiprop": "url|extmetadata|mime|size",
        "iiurlwidth": 640,
    }
    try:
        data = _get_json("https://commons.wikimedia.org/w/api.php", params)
    except Exception as e:
        print("  [wikimedia] error: {}".format(e))
        return None
    pages = sorted((data.get("query", {}).get("pages", {})).values(), key=lambda p: p.get("index", 99))
    for p in pages:
        info = (p.get("imageinfo") or [None])[0]
        if not info or info.get("mime") not in ("image/jpeg", "image/png"):
            continue
        if (info.get("width") or 0) < 400:
            continue
        meta = info.get("extmetadata", {})
        lic = (meta.get("LicenseShortName") or {}).get("value", "")
        if not _license_ok(lic):
            continue
        thumb = info.get("thumburl")
        if not thumb:
            continue
        artist = _strip_html((meta.get("Artist") or {}).get("value", "")) or "Unknown"
        if len(artist) > 40:
            artist = artist[:40] + "…"
        return {
            "image_url": thumb,
            "image_source_type": "wikimedia",
            "image_attribution": "Wikimedia Commons / {} / {}".format(artist, lic),
            "affiliate_product_url": None,
        }
    return None


def fetch_yahoo(keyword: str) -> Optional[Dict[str, Any]]:
    from yahoo_client import fetch_market_data

    data = fetch_market_data(keyword)
    if not data or not data.get("image_url"):
        return None
    return {
        "image_url": data["image_url"],
        "image_source_type": "yahoo",
        "image_attribution": "Yahoo!ショッピング",
        "affiliate_product_url": data["affiliate_product_url"],
    }


def fetch_image(rakuten_keyword: str, wikimedia_keyword_en: str) -> Dict[str, Any]:
    """Return image info dict. Always returns a valid dict (fallback on failure)."""
    for fn, kw in (
        (fetch_rakuten, rakuten_keyword),
        (fetch_yahoo, rakuten_keyword),
        (fetch_wikimedia, wikimedia_keyword_en),
    ):
        try:
            res = fn(kw)
        except Exception as e:  # defensive: never break the pipeline
            print("  [image] unexpected error: {}".format(e))
            res = None
        if res:
            return res
    return dict(FALLBACK)


if __name__ == "__main__":
    import sys

    kw = " ".join(sys.argv[1:]) or "Game Boy"
    print(json.dumps(fetch_image(kw, kw), ensure_ascii=False, indent=2))
