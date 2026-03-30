import datetime as dt
import math
from io import BytesIO
from typing import Any, Dict, Tuple

import requests
from PIL import Image, ImageDraw, ImageFont, ImageOps

FORMAT_DIMENSIONS: Dict[str, Tuple[int, int]] = {
    "primary": (1200, 628),
    "square": (1080, 1080),
}

RARITY_BORDER = {
    "mythic": "#facc15",
    "legendary": "#a855f7",
    "epic": "#60a5fa",
    "rare": "#4ade80",
    "common": "#6b7280",
}


def _load_font(size: int, bold: bool = False) -> ImageFont.ImageFont:
    candidates = [
        "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf" if bold else "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
        "/usr/share/fonts/dejavu/DejaVuSans-Bold.ttf" if bold else "/usr/share/fonts/dejavu/DejaVuSans.ttf",
    ]
    for candidate in candidates:
        try:
            return ImageFont.truetype(candidate, size=size)
        except Exception:
            continue
    return ImageFont.load_default()


def _safe_int(value: Any, default: int = 0) -> int:
    try:
        return int(value)
    except Exception:
        return default


def _fetch_photo_image(photo_url: str | None, size: int = 200) -> Image.Image:
    try:
        if not photo_url:
            raise ValueError("missing photo url")
        response = requests.get(photo_url, timeout=15)
        response.raise_for_status()
        image = Image.open(BytesIO(response.content)).convert("RGB")
    except Exception:
        image = Image.new("RGB", (size, size), "#2D2E3A")
        fallback_draw = ImageDraw.Draw(image)
        font = _load_font(68, bold=True)
        text = "MP"
        bbox = fallback_draw.textbbox((0, 0), text, font=font)
        tw, th = bbox[2] - bbox[0], bbox[3] - bbox[1]
        fallback_draw.text(((size - tw) / 2, (size - th) / 2 - 6), text, font=font, fill="#A9B1D6")
        return image
    return ImageOps.fit(image, (size, size), method=Image.Resampling.LANCZOS)


def compute_radar_vertices(attributes: dict, center_x: float, center_y: float, radius: float) -> list[tuple[float, float]]:
    keys = ["STR", "WIS", "CHA", "INT", "STA"]
    vertices: list[tuple[float, float]] = []
    for i, key in enumerate(keys):
        value = float(attributes.get(key, 0) or 0) / 100.0
        value = max(0.0, min(1.0, value))
        angle = (2 * math.pi * i / 5) - (math.pi / 2)
        x = center_x + radius * value * math.cos(angle)
        y = center_y + radius * value * math.sin(angle)
        vertices.append((x, y))
    return vertices


def _compute_ring_vertices(center_x: float, center_y: float, radius: float, points: int = 5) -> list[tuple[float, float]]:
    coords: list[tuple[float, float]] = []
    for i in range(points):
        angle = (2 * math.pi * i / points) - (math.pi / 2)
        x = center_x + radius * math.cos(angle)
        y = center_y + radius * math.sin(angle)
        coords.append((x, y))
    return coords


def _alignment_visual(alignment: str) -> Tuple[Tuple[int, int, int], str]:
    raw = (alignment or "True Neutral").lower()
    if "good" in raw:
        tone = (22, 101, 52)
    elif "evil" in raw:
        tone = (127, 29, 29)
    else:
        tone = (55, 65, 81)

    if "lawful" in raw:
        icon = "⚖"
    elif "chaotic" in raw:
        icon = "⚡"
    else:
        icon = "−"
    return tone, icon


def _artifact_rows(artifacts: list[dict]) -> list[tuple[str, str, str]]:
    rows = artifacts[:3]
    if not rows:
        return [("No artifacts unlocked", "Common", "#6b7280")]
    output = []
    for artifact in rows:
        name = str(artifact.get("name", "Unknown Artifact"))
        rarity = str(artifact.get("rarity", "Common"))
        border_color = RARITY_BORDER.get(rarity.lower(), "#6b7280")
        output.append((name, rarity, border_color))
    return output


def render_share_card(hero_profile: Dict[str, Any], card_format: str = "primary") -> bytes:
    fmt = card_format.lower()
    if fmt not in FORMAT_DIMENSIONS:
        raise ValueError("Invalid format. Use 'primary' or 'square'.")

    width, height = FORMAT_DIMENSIONS[fmt]
    mp = hero_profile.get("mp", {}) or {}
    attributes = hero_profile.get("attributes", {}) or {}
    artifacts = hero_profile.get("artifacts", []) or []
    alignment = str(hero_profile.get("alignment", "True Neutral"))

    current_xp = _safe_int(hero_profile.get("xp_current_level"), 0)
    next_xp = max(_safe_int(hero_profile.get("xp_next_level"), 1), 1)
    xp = _safe_int(hero_profile.get("xp"), 0)
    denom = max(next_xp - current_xp, 1)
    progress = max(0.0, min(100.0, ((xp - current_xp) / denom) * 100.0))

    img = Image.new("RGB", (width, height), "#1A1B26")
    draw = ImageDraw.Draw(img, "RGBA")

    for i in range(18):
        inset = int(min(width, height) * 0.015 * i)
        alpha = max(8, 48 - i * 2)
        draw.ellipse((inset, inset, width - inset, height - inset), fill=(45, 46, 58, alpha))

    pad = int(width * 0.02)
    left_w = int(width * 0.4)
    right_x = pad + left_w + int(width * 0.02)
    right_w = width - right_x - pad

    f_name = _load_font(56 if width >= 1200 else 52, bold=True)
    f_party = _load_font(28 if width >= 1200 else 24)
    f_small = _load_font(20)
    f_footer = _load_font(18)
    f_level = _load_font(54, bold=True)
    f_badge = _load_font(16, bold=True)
    f_xp = _load_font(20, bold=True)
    f_art_title = _load_font(28, bold=True)
    f_art_item = _load_font(22, bold=True)
    f_art_rarity = _load_font(20)

    photo_size = 200 if width >= 1200 else 220
    photo = _fetch_photo_image(mp.get("photo"), size=photo_size)
    photo_mask = Image.new("L", (photo_size, photo_size), 0)
    ImageDraw.Draw(photo_mask).rounded_rectangle((0, 0, photo_size, photo_size), radius=26, fill=255)
    photo_x = pad + 8
    photo_y = pad + 8
    img.paste(photo, (photo_x, photo_y), photo_mask)
    draw.rounded_rectangle((photo_x, photo_y, photo_x + photo_size, photo_y + photo_size), radius=26, outline="#4E597B", width=3)

    name = str(mp.get("name", "Unknown MP"))
    party = str(mp.get("party", "Independent"))
    text_x = pad + 8
    text_y = photo_y + photo_size + 20
    draw.text((text_x, text_y), name, font=f_name, fill="#F3F4F6")
    draw.multiline_text((text_x, text_y + 74), party, font=f_party, fill="#A9B1D6", spacing=6)

    level = _safe_int(hero_profile.get("level"), 0)
    level_cx = text_x + 35
    level_cy = text_y + 205
    draw.ellipse((level_cx - 35, level_cy - 35, level_cx + 35, level_cy + 35), fill="#2D2E3A", outline="#7AA2F7", width=3)
    level_txt = str(level)
    lb = draw.textbbox((0, 0), level_txt, font=f_level)
    draw.text((level_cx - (lb[2] - lb[0]) / 2, level_cy - (lb[3] - lb[1]) / 2 - 4), level_txt, font=f_level, fill="#F3F4F6")

    badge_bg, badge_icon = _alignment_visual(alignment)
    badge_x = level_cx + 55
    badge_y = level_cy - 18
    badge_text = f"{badge_icon} {alignment}"
    badge_w = int(draw.textbbox((0, 0), badge_text, font=f_badge)[2] + 30)
    draw.rounded_rectangle((badge_x, badge_y, badge_x + badge_w, badge_y + 42), radius=16, fill=badge_bg)
    draw.text((badge_x + 14, badge_y + 10), badge_text, font=f_badge, fill="#E5E7EB")

    chart_h = int(height * 0.55 if fmt == "primary" else height * 0.36)
    chart_rect = (right_x, pad + 8, right_x + right_w, pad + 8 + chart_h)
    draw.rounded_rectangle(chart_rect, radius=20, fill=(45, 46, 58, 190), outline="#4E597B", width=2)

    cx = right_x + right_w // 2
    cy = chart_rect[1] + chart_h // 2
    rr = min(right_w, chart_h) * 0.33
    for frac in (0.25, 0.5, 0.75, 1.0):
        draw.polygon(_compute_ring_vertices(cx, cy, rr * frac), outline="#4E597B")
    axis_keys = ["STR", "WIS", "CHA", "INT", "STA"]
    for i, key in enumerate(axis_keys):
        angle = (2 * math.pi * i / 5) - (math.pi / 2)
        x = cx + rr * math.cos(angle)
        y = cy + rr * math.sin(angle)
        draw.line((cx, cy, x, y), fill="#4E597B", width=1)
        lx = cx + (rr + 26) * math.cos(angle)
        ly = cy + (rr + 26) * math.sin(angle)
        tb = draw.textbbox((0, 0), key, font=f_small)
        draw.text((lx - (tb[2] - tb[0]) / 2, ly - (tb[3] - tb[1]) / 2), key, font=f_small, fill="#A9B1D6")
    poly = compute_radar_vertices(attributes, cx, cy, rr)
    draw.polygon(poly, fill=(122, 162, 247, 90), outline="#7AA2F7", width=3)

    xp_rect_top = chart_rect[3] + 18
    xp_rect = (right_x, xp_rect_top, right_x + right_w, xp_rect_top + 78)
    draw.rounded_rectangle(xp_rect, radius=16, fill=(45, 46, 58, 190), outline="#4E597B", width=2)
    draw.text((xp_rect[0] + 12, xp_rect[1] + 8), "XP Progress", font=f_small, fill="#A9B1D6")
    bar = (xp_rect[0] + 12, xp_rect[1] + 38, xp_rect[2] - 12, xp_rect[2] - 12)
    bar_h = 30
    draw.rounded_rectangle((bar[0], bar[1], bar[2], bar[1] + bar_h), radius=15, fill="#1A1B26", outline="#4E597B", width=2)
    fill_w = int((bar[2] - bar[0]) * (progress / 100.0))
    if fill_w > 0:
        for x in range(fill_w):
            t = x / max(fill_w, 1)
            r = int(62 + (122 - 62) * t)
            g = int(76 + (162 - 76) * t)
            b = int(118 + (247 - 118) * t)
            draw.line((bar[0] + x, bar[1], bar[0] + x, bar[1] + bar_h), fill=(r, g, b))
    xp_text = f"XP: {current_xp:,} / {next_xp:,}"
    xb = draw.textbbox((0, 0), xp_text, font=f_xp)
    draw.text((bar[0] + (bar[2] - bar[0] - (xb[2] - xb[0])) / 2, bar[1] + 4), xp_text, font=f_xp, fill="#F3F4F6")

    art_top = xp_rect[3] + 18
    art_rect = (right_x, art_top, right_x + right_w, art_top + (120 if fmt == "primary" else 140))
    draw.rounded_rectangle(art_rect, radius=16, fill=(45, 46, 58, 190), outline="#4E597B", width=2)
    draw.text((art_rect[0] + 12, art_rect[1] + 8), "Top Artifacts", font=f_art_title, fill="#A9B1D6")
    rows = _artifact_rows(artifacts)
    row_y = art_rect[1] + 50
    row_h = 34
    for i, (name_txt, rarity_txt, border_color) in enumerate(rows[:3]):
        y1 = row_y + i * (row_h + 6)
        y2 = y1 + row_h
        if y2 > art_rect[3] - 8:
            break
        draw.rounded_rectangle((art_rect[0] + 12, y1, art_rect[2] - 12, y2), radius=10, fill=(26, 27, 38, 180), outline=border_color, width=2)
        draw.text((art_rect[0] + 20, y1 + 6), name_txt, font=f_art_item, fill="#F3F4F6")
        rb = draw.textbbox((0, 0), rarity_txt.upper(), font=f_art_rarity)
        draw.text((art_rect[2] - 20 - (rb[2] - rb[0]), y1 + 7), rarity_txt.upper(), font=f_art_rarity, fill="#A9B1D6")

    footer_y = height - 42
    draw.line((pad, footer_y, width - pad, footer_y), fill="#4E597B", width=2)
    left = "seimas-v2.vercel.app"
    center = f"Generated {dt.datetime.utcnow().strftime('%Y-%m-%d')}"
    right = "#HeroParliament"
    draw.text((pad, footer_y + 8), left, font=f_footer, fill="#A9B1D6")
    cb = draw.textbbox((0, 0), center, font=f_footer)
    draw.text(((width - (cb[2] - cb[0])) / 2, footer_y + 8), center, font=f_footer, fill="#A9B1D6")
    rb = draw.textbbox((0, 0), right, font=f_footer)
    draw.text((width - pad - (rb[2] - rb[0]), footer_y + 8), right, font=f_footer, fill="#A9B1D6")

    output = BytesIO()
    img.save(output, format="PNG", optimize=False)
    return output.getvalue()
