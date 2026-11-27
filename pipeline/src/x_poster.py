"""Automated X (Twitter) poster for JunkPrice Battle.

Posts two engaging formats from data/zukan.db via official X API v2 (Free Tier: 500 posts/month):
  - quiz   (Morning): 2-choice 'Which sells higher?' post + optional auto-generated A vs B image
  - trivia (Evening): Surprising junk price fact + link to /items/<slug>/ (with OGP card)

Usage:
  python pipeline/src/x_poster.py --mode quiz --dry-run
  python pipeline/src/x_poster.py --mode trivia --dry-run
  python pipeline/src/x_poster.py --mode quiz   # posts to X (requires X_API_* env vars)
"""
from __future__ import annotations

import argparse
import datetime
import hashlib
import io
import os
import random
import sys
import urllib.request
from typing import Dict, List, Optional, Tuple

sys.path.insert(0, os.path.dirname(__file__))

try:
    from dotenv import load_dotenv  # type: ignore

    load_dotenv(os.path.join(os.path.dirname(__file__), "..", ".env"))
except Exception:
    pass

from db import all_items, connect  # noqa: E402

SITE_URL = (os.environ.get("SITE_URL") or "https://junkproduct.com").rstrip("/")
UA = "JunkPriceBattle/0.1 (https://junkproduct.com) x-poster"


def jst_today() -> datetime.date:
    return (datetime.datetime.utcnow() + datetime.timedelta(hours=9)).date()


def yen(n: int) -> str:
    return "¥{:,}".format(int(n))


def pick_quiz_pair(items: List[Dict], day: datetime.date) -> Tuple[Dict, Dict]:
    """Deterministically pick a balanced pair (1.2x-3.5x price ratio) for the given date."""
    seed = int(hashlib.sha256(("x-quiz-" + day.isoformat()).encode("utf-8")).hexdigest()[:8], 16)
    rng = random.Random(seed)
    shuffled = list(items)
    rng.shuffle(shuffled)
    for a in shuffled:
        cands = [
            b for b in shuffled
            if b["id"] != a["id"]
            and b["average_price"] != a["average_price"]
            and 1.2 <= max(a["average_price"], b["average_price"]) / min(a["average_price"], b["average_price"]) <= 3.5
        ]
        if cands:
            b = rng.choice(cands)
            return (a, b) if rng.random() < 0.5 else (b, a)
    return shuffled[0], shuffled[1]


def pick_trivia_item(items: List[Dict], day: datetime.date) -> Dict:
    """Cycle through all items by day ordinal so we don't repeat the same item back-to-back."""
    ordered = sorted(items, key=lambda x: x["id"])
    return ordered[day.toordinal() % len(ordered)]


def x_weighted_len(text: str) -> int:
    """Approximate X weighted character count (URLs=23, ASCII=1, CJK/emoji=2; max 280)."""
    import re

    no_urls = re.sub(r"https?://\S+", "", text)
    url_count = len(re.findall(r"https?://\S+", text))
    w = url_count * 23
    for ch in no_urls:
        w += 1 if ord(ch) < 128 else 2
    return w


def build_quiz_text(a: Dict, b: Dict) -> str:
    a_title = a["title"][:28] + ("…" if len(a["title"]) > 28 else "")
    b_title = b["title"][:28] + ("…" if len(b["title"]) > 28 else "")
    return (
        "【今日のガラクタ鑑定🔍】\n"
        "高く売れるのはどっち？\n\n"
        "A：{a_title}\n"
        "B：{b_title}\n\n"
        "答えと相場👇\n"
        "{url}/\n"
        "#ガラクタお宝鑑定 #フリマ相場"
    ).format(a_title=a_title, b_title=b_title, url=SITE_URL)


def build_trivia_text(it: Dict) -> str:
    title = it["title"][:30] + ("…" if len(it["title"]) > 30 else "")
    why = (it.get("why_it_sells") or "").strip()
    tmpl = (
        "【意外と売れるガラクタ💡】\n"
        "「{title}」\n"
        "相場：{price}（{mn}〜{mx}）\n\n"
        "{why}\n\n"
        "詳しい相場＆出品テンプレ👇\n"
        "{url}/items/{slug}/\n"
        "#ガラクタお宝鑑定"
    )
    # Trim 'why' until the weighted length fits safely under X's 280 limit
    for limit in (55, 45, 35, 25, 15, 0):
        w_text = (why[:limit] + "…") if (limit and len(why) > limit) else (why if limit else "")
        candidate = tmpl.format(
            title=title,
            price=yen(it["average_price"]),
            mn=yen(it["min_price"]),
            mx=yen(it["max_price"]),
            why=w_text,
            url=SITE_URL,
            slug=it["slug"],
        )
        if x_weighted_len(candidate) <= 270:
            return candidate
    return candidate


def _find_jp_font(size: int):
    from PIL import ImageFont  # type: ignore

    candidates = [
        "/usr/share/fonts/opentype/noto/NotoSansCJK-Bold.ttc",
        "/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc",
        "/usr/share/fonts/truetype/noto/NotoSansCJK-Bold.ttc",
        "C:/Windows/Fonts/meiryob.ttc",
        "C:/Windows/Fonts/YuGothB.ttc",
    ]
    for path in candidates:
        if os.path.exists(path):
            try:
                return ImageFont.truetype(path, size)
            except Exception:
                pass
    return ImageFont.load_default()


def _download_image(url: Optional[str]):
    if not url:
        return None
    from PIL import Image  # type: ignore

    try:
        req = urllib.request.Request(url, headers={"User-Agent": UA})
        with urllib.request.urlopen(req, timeout=12) as resp:
            return Image.open(io.BytesIO(resp.read())).convert("RGB")
    except Exception as e:
        print("  [image download skip] {}: {}".format(url, e))
        return None


def _wrap_text(text: str, max_chars: int = 15) -> List[str]:
    lines = []
    while text and len(lines) < 2:
        if len(text) <= max_chars:
            lines.append(text)
            break
        lines.append(text[:max_chars])
        text = text[max_chars:]
    if text and len(lines) == 2 and not lines[1].endswith("…") and len(text) > max_chars:
        lines[1] = lines[1][:-1] + "…"
    return lines


def generate_vs_image(a: Dict, b: Dict, out_path: str) -> Optional[str]:
    """Generate a 1200x630 'A vs B' quiz card PNG using Pillow. Returns path or None if Pillow missing."""
    try:
        from PIL import Image, ImageDraw  # type: ignore
    except Exception:
        return None

    w, h = 1200, 630
    canvas = Image.new("RGB", (w, h), (250, 250, 249))
    draw = ImageDraw.Draw(canvas)

    # Top accent bar + header
    draw.rectangle([(0, 0), (w, 14)], fill=(220, 38, 38))
    f_title = _find_jp_font(34)
    f_label = _find_jp_font(26)
    f_item = _find_jp_font(24)
    f_vs = _find_jp_font(32)
    f_foot = _find_jp_font(20)

    draw.text((48, 34), "どっちの売値が高い？ ガラクタお宝鑑定クイズ", fill=(28, 25, 23), font=f_title)

    boxes = [(48, 102, 564, 560, "A", a), (636, 102, 1152, 560, "B", b)]
    for x1, y1, x2, y2, letter, item in boxes:
        draw.rounded_rectangle([(x1, y1), (x2, y2)], radius=20, fill=(255, 255, 255), outline=(231, 229, 228), width=3)
        # Image area
        img_box = (x1 + 16, y1 + 16, x2 - 16, y1 + 310)
        draw.rectangle(img_box, fill=(245, 245, 244))
        photo = _download_image(item.get("image_url"))
        if photo is not None:
            bw, bh = img_box[2] - img_box[0], img_box[3] - img_box[1]
            photo.thumbnail((bw, bh))
            px = img_box[0] + (bw - photo.width) // 2
            py = img_box[1] + (bh - photo.height) // 2
            canvas.paste(photo, (px, py))
        else:
            draw.text((x1 + 150, y1 + 140), item.get("category") or "ジャンク品", fill=(120, 113, 108), font=f_label)

        # A / B badge
        draw.rounded_rectangle([(x1 + 24, y1 + 24), (x1 + 74, y1 + 74)], radius=12, fill=(220, 38, 38))
        draw.text((x1 + 39, y1 + 32), letter, fill=(255, 255, 255), font=f_label)

        # Item title (up to 2 lines)
        ty = y1 + 330
        for line in _wrap_text(item["title"], 17):
            draw.text((x1 + 22, ty), line, fill=(28, 25, 23), font=f_item)
            ty += 34
        draw.text((x1 + 22, y2 - 48), "相場：¥ ???", fill=(220, 38, 38), font=f_label)

    # Center VS circle
    draw.ellipse([(555, 280), (645, 370)], fill=(28, 25, 23), outline=(250, 250, 249), width=5)
    draw.text((577, 305), "VS", fill=(255, 255, 255), font=f_vs)

    draw.text((48, 580), "junkproduct.com  |  毎日更新・ガラクタ相場図鑑", fill=(120, 113, 108), font=f_foot)
    canvas.save(out_path, "PNG")
    return out_path


def post_to_x(text: str, image_path: Optional[str]) -> str:
    import tweepy  # type: ignore

    api_key = os.environ.get("X_API_KEY")
    api_secret = os.environ.get("X_API_SECRET")
    access_token = os.environ.get("X_ACCESS_TOKEN")
    access_secret = os.environ.get("X_ACCESS_TOKEN_SECRET")
    if not all([api_key, api_secret, access_token, access_secret]):
        sys.exit("X API credentials (X_API_KEY / X_API_SECRET / X_ACCESS_TOKEN / X_ACCESS_TOKEN_SECRET) are missing.")

    media_ids = None
    if image_path and os.path.exists(image_path):
        try:
            auth = tweepy.OAuth1UserHandler(api_key, api_secret, access_token, access_secret)
            api_v1 = tweepy.API(auth)
            media = api_v1.media_upload(filename=image_path)
            media_ids = [media.media_id_string]
        except Exception as e:
            print("  [x] media upload skipped (falling back to text+OGP): {}".format(e))

    client = tweepy.Client(
        consumer_key=api_key,
        consumer_secret=api_secret,
        access_token=access_token,
        access_token_secret=access_secret,
    )
    resp = client.create_tweet(text=text, media_ids=media_ids)
    tweet_id = resp.data["id"]
    return "https://x.com/i/web/status/{}".format(tweet_id)


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--mode", choices=["quiz", "trivia", "auto"], default="auto")
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
    image_path = None
    if mode == "quiz":
        a, b = pick_quiz_pair(items, today)
        text = build_quiz_text(a, b)
        image_path = generate_vs_image(a, b, os.path.join(os.path.dirname(__file__), "..", "preview_vs.png"))
    else:
        it = pick_trivia_item(items, today)
        text = build_trivia_text(it)

    print("=== X POST ({}) ===".format(mode))
    print(text)
    print("chars:", len(text), "| image:", image_path or "OGP card")

    if args.dry_run:
        print("(dry-run: not posted)")
        return

    url = post_to_x(text, image_path)
    print("Posted:", url)


if __name__ == "__main__":
    main()
