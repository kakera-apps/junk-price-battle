"""Automated Bluesky (AT Protocol) & Threads (Meta Graph API) poster for JunkPrice Battle.

Both official APIs are 100% free and run cleanly on GitHub Actions.
Reuses pair selection, copy generation, and A vs B image generation from x_poster.py.

Usage:
  python pipeline/src/sns_poster.py --mode quiz --platform all --dry-run
  python pipeline/src/sns_poster.py --mode trivia --platform bluesky
  python pipeline/src/sns_poster.py --mode quiz --platform threads
"""
from __future__ import annotations

import argparse
import datetime
import json
import os
import re
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from typing import Any, Dict, List, Optional

sys.path.insert(0, os.path.dirname(__file__))

try:
    from dotenv import load_dotenv  # type: ignore

    load_dotenv(os.path.join(os.path.dirname(__file__), "..", ".env"))
except Exception:
    pass

from db import all_items, connect  # noqa: E402
from x_poster import (  # noqa: E402
    SITE_URL,
    build_quiz_text,
    build_trivia_text,
    generate_vs_image,
    jst_today,
    pick_quiz_pair,
    pick_trivia_item,
    yen,
)

UA = "JunkPriceBattle/0.1 (https://junkproduct.com) sns-poster"
TIMEOUT = 20


def _http_json(
    url: str,
    method: str = "GET",
    headers: Optional[Dict[str, str]] = None,
    json_body: Optional[Dict[str, Any]] = None,
    form_body: Optional[Dict[str, Any]] = None,
    raw_body: Optional[bytes] = None,
) -> Dict[str, Any]:
    hdrs = {"User-Agent": UA}
    if headers:
        hdrs.update(headers)
    data = None
    if json_body is not None:
        data = json.dumps(json_body).encode("utf-8")
        hdrs.setdefault("Content-Type", "application/json")
    elif form_body is not None:
        data = urllib.parse.urlencode(form_body).encode("utf-8")
        hdrs.setdefault("Content-Type", "application/x-www-form-urlencoded")
    elif raw_body is not None:
        data = raw_body
    req = urllib.request.Request(url, data=data, headers=hdrs, method=method)
    try:
        with urllib.request.urlopen(req, timeout=TIMEOUT) as resp:
            return json.loads(resp.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        body = ""
        try:
            body = e.read().decode("utf-8", errors="replace")
        except Exception:
            pass
        raise RuntimeError("HTTP {} {}: {}".format(e.code, e.reason, body)) from e


# ----------------------------------------------------------------- Bluesky
def _bluesky_facets(text: str) -> List[Dict[str, Any]]:
    """Build AT Protocol rich-text facets (UTF-8 byte offsets) for URLs and hashtags."""
    facets: List[Dict[str, Any]] = []
    # URLs
    for m in re.finditer(r"https?://[^\s]+", text):
        start = len(text[: m.start()].encode("utf-8"))
        end = len(text[: m.end()].encode("utf-8"))
        facets.append(
            {
                "index": {"byteStart": start, "byteEnd": end},
                "features": [{"$type": "app.bsky.richtext.facet#link", "uri": m.group(0)}],
            }
        )
    # Hashtags
    for m in re.finditer(r"#([^\s#]+)", text):
        start = len(text[: m.start()].encode("utf-8"))
        end = len(text[: m.end()].encode("utf-8"))
        facets.append(
            {
                "index": {"byteStart": start, "byteEnd": end},
                "features": [{"$type": "app.bsky.richtext.facet#tag", "tag": m.group(1)}],
            }
        )
    return facets


def post_to_bluesky(
    text: str,
    image_path: Optional[str] = None,
    link_card: Optional[Dict[str, str]] = None,
) -> str:
    handle = os.environ.get("BLUESKY_HANDLE", "").strip().lstrip("@")
    password = os.environ.get("BLUESKY_APP_PASSWORD", "").strip()
    if not handle or not password:
        raise RuntimeError("BLUESKY_HANDLE / BLUESKY_APP_PASSWORD が未設定です。")

    session = _http_json(
        "https://bsky.social/xrpc/com.atproto.server.createSession",
        method="POST",
        json_body={"identifier": handle, "password": password},
    )
    did = session["did"]
    jwt = session["accessJwt"]
    auth_hdr = {"Authorization": "Bearer " + jwt}

    embed: Optional[Dict[str, Any]] = None
    if image_path and os.path.exists(image_path):
        with open(image_path, "rb") as f:
            blob_resp = _http_json(
                "https://bsky.social/xrpc/com.atproto.repo.uploadBlob",
                method="POST",
                headers={**auth_hdr, "Content-Type": "image/png"},
                raw_body=f.read(),
            )
        embed = {
            "$type": "app.bsky.embed.images",
            "images": [{"alt": "JunkPrice Battle 2択クイズ比較画像", "image": blob_resp["blob"]}],
        }
    elif link_card:
        ext: Dict[str, Any] = {
            "uri": link_card["uri"],
            "title": link_card["title"],
            "description": link_card["description"],
        }
        og_path = os.path.join(os.path.dirname(__file__), "..", "..", "web", "public", "og-image.png")
        if os.path.exists(og_path):
            try:
                with open(og_path, "rb") as f:
                    thumb = _http_json(
                        "https://bsky.social/xrpc/com.atproto.repo.uploadBlob",
                        method="POST",
                        headers={**auth_hdr, "Content-Type": "image/png"},
                        raw_body=f.read(),
                    )
                ext["thumb"] = thumb["blob"]
            except Exception as e:
                print("  [bluesky] thumb upload skipped:", e)
        embed = {"$type": "app.bsky.embed.external", "external": ext}

    now_iso = datetime.datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ")
    record: Dict[str, Any] = {
        "$type": "app.bsky.feed.post",
        "text": text,
        "createdAt": now_iso,
        "langs": ["ja"],
    }
    facets = _bluesky_facets(text)
    if facets:
        record["facets"] = facets
    if embed:
        record["embed"] = embed

    res = _http_json(
        "https://bsky.social/xrpc/com.atproto.repo.createRecord",
        method="POST",
        headers=auth_hdr,
        json_body={"repo": did, "collection": "app.bsky.feed.post", "record": record},
    )
    rkey = res["uri"].rsplit("/", 1)[-1]
    return "https://bsky.app/profile/{}/post/{}".format(handle, rkey)


# ----------------------------------------------------------------- Threads
def post_to_threads(text: str, link_url: Optional[str] = None) -> str:
    token = os.environ.get("THREADS_ACCESS_TOKEN", "").strip()
    if not token:
        raise RuntimeError("THREADS_ACCESS_TOKEN が未設定です。")

    # Resolve the authenticated Threads user ID directly via /me (avoids App ID / User ID mix-ups)
    me = _http_json(
        "https://graph.threads.net/v1.0/me?fields=id,username&access_token=" + urllib.parse.quote(token, safe="")
    )
    uid = str(me["id"])
    print("  [threads] authenticated as @{} (id={})".format(me.get("username", "?"), uid))

    # Step 1: Create media container (retry without link_attachment if 400)
    base_payload: Dict[str, Any] = {
        "media_type": "TEXT",
        "text": text,
        "access_token": token,
    }
    endpoint = "https://graph.threads.net/v1.0/{}/threads".format(uid)
    if link_url:
        try:
            created = _http_json(endpoint, method="POST", form_body={**base_payload, "link_attachment": link_url})
        except Exception as e:
            print("  [threads] link_attachment failed, retrying plain text:", e)
            created = _http_json(endpoint, method="POST", form_body=base_payload)
    else:
        created = _http_json(endpoint, method="POST", form_body=base_payload)
    creation_id = created["id"]

    # Brief wait recommended by Meta before publishing container
    time.sleep(3)

    # Step 2: Publish container
    published = _http_json(
        "https://graph.threads.net/v1.0/{}/threads_publish".format(uid),
        method="POST",
        form_body={"creation_id": creation_id, "access_token": token},
    )
    return "https://www.threads.net/t/{}".format(published["id"])


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--mode", choices=["quiz", "trivia", "auto"], default="auto")
    ap.add_argument("--platform", choices=["all", "bluesky", "threads"], default="all")
    ap.add_argument("--dry-run", action="store_true")
    args = ap.parse_args()

    mode = args.mode
    if mode == "auto":
        jst_hour = (datetime.datetime.utcnow() + datetime.timedelta(hours=9)).hour
        mode = "quiz" if jst_hour < 15 else "trivia"

    conn = connect()
    items = [dict(r) for r in all_items(conn)]
    if len(items) < 2:
        sys.exit("DB has fewer than 2 items.")

    today = jst_today()
    image_path: Optional[str] = None
    link_url = SITE_URL + "/"
    link_card: Optional[Dict[str, str]] = None

    if mode == "quiz":
        a, b = pick_quiz_pair(items, today)
        text = build_quiz_text(a, b)
        image_path = generate_vs_image(a, b, os.path.join(os.path.dirname(__file__), "..", "preview_vs.png"))
        link_card = {
            "uri": link_url,
            "title": "どっちの売値が高い？ガラクタお宝鑑定クイズ",
            "description": "{} vs {} — 実物写真で2択のフリマ相場バトル！".format(a["title"], b["title"]),
        }
    else:
        it = pick_trivia_item(items, today)
        text = build_trivia_text(it)
        link_url = "{}/items/{}/".format(SITE_URL, it["slug"])
        link_card = {
            "uri": link_url,
            "title": "{}の売値相場は{}？".format(it["title"], yen(it["average_price"])),
            "description": (it.get("why_it_sells") or "")[:140],
        }

    print("=== SNS POST ({} / {}) ===".format(mode, args.platform))
    print(text)
    print("link:", link_url, "| image:", image_path or "link card")

    if args.dry_run:
        print("(dry-run: not posted)")
        return

    targets = ["bluesky", "threads"] if args.platform == "all" else [args.platform]
    errors = []

    if "bluesky" in targets:
        if os.environ.get("BLUESKY_HANDLE") and os.environ.get("BLUESKY_APP_PASSWORD"):
            try:
                url = post_to_bluesky(text, image_path=image_path, link_card=link_card)
                print("[bluesky] Posted:", url)
            except Exception as e:
                print("[bluesky] ERROR:", e)
                errors.append("bluesky: {}".format(e))
        else:
            print("[bluesky] Skipped (BLUESKY_HANDLE / BLUESKY_APP_PASSWORD not set)")

    if "threads" in targets:
        if os.environ.get("THREADS_ACCESS_TOKEN"):
            try:
                url = post_to_threads(text, link_url=link_url)
                print("[threads] Posted:", url)
            except Exception as e:
                print("[threads] ERROR:", e)
                errors.append("threads: {}".format(e))
        else:
            print("[threads] Skipped (THREADS_ACCESS_TOKEN not set)")

    if errors:
        sys.exit("One or more platforms failed: " + "; ".join(errors))


if __name__ == "__main__":
    main()
