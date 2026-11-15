"""Small copies of the VRK member portraits, served from our own site.

VRK's portraits are about 600×900 px and 450 kB. Lists, the seat map and the
front page show them at 32–64 px, so a visitor downloaded megabytes to see
avatars. This writes a 192 px wide copy of each into
dashboard/public/portraits/ and the list of ids into
dashboard/src/data/portraits.json. `portraitThumb()` swaps in a copy only when
the list has it, so a member without one still gets the original.

Run by hand when portraits change (a new member, a new photo), then commit:

    .venv/bin/python scripts/make_portrait_thumbs.py [API base]

Reads photo addresses from the public API; no database credentials needed.
"""
import io
import json
import re
import sys
import urllib.request
from pathlib import Path

from PIL import Image

API = sys.argv[1] if len(sys.argv) > 1 else "https://seimas-api.onrender.com"
WIDTH = 192  # three times the largest avatar (64 px)
VRK = re.compile(r"/kandImg/photo_(\d+)\.jpe?g$")
DASHBOARD = Path(__file__).resolve().parents[1] / "dashboard"
OUT = DASHBOARD / "public" / "portraits"
LISTED = DASHBOARD / "src" / "data" / "portraits.json"


def get(url: str) -> bytes:
    req = urllib.request.Request(url, headers={"User-Agent": "openseimas-portrait-thumbs"})
    with urllib.request.urlopen(req, timeout=30) as r:
        return r.read()


def main() -> None:
    urls = {}
    for mp in json.loads(get(f"{API}/api/mps")):
        m = VRK.search(mp.get("photo_url") or "")
        if m:
            urls[m.group(1)] = mp["photo_url"]

    OUT.mkdir(parents=True, exist_ok=True)
    before = after = 0
    for vrk_id, url in sorted(urls.items(), key=lambda kv: int(kv[0])):
        raw = get(url)
        img = Image.open(io.BytesIO(raw)).convert("RGB")
        img.thumbnail((WIDTH, WIDTH * 4), Image.LANCZOS)
        buf = io.BytesIO()
        img.save(buf, "JPEG", quality=80, optimize=True, progressive=True)
        (OUT / f"photo_{vrk_id}.jpg").write_bytes(buf.getvalue())
        before += len(raw)
        after += buf.tell()

    # The directory holds exactly what the list names.
    for stale in OUT.glob("*.jpg"):
        if stale.stem.removeprefix("photo_") not in urls:
            stale.unlink()

    LISTED.parent.mkdir(parents=True, exist_ok=True)
    LISTED.write_text(json.dumps(sorted(urls, key=int)) + "\n")
    print(f"{len(urls)} portraits: {before // 1024} kB at VRK, {after // 1024} kB here")


if __name__ == "__main__":
    main()
