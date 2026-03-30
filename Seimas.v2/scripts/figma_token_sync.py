#!/usr/bin/env python3
"""
Simple Figma token JSON -> CSS variable generator.

Expected input formats (examples):
- Flat map: {"color-bg-void": "#050505", "color-text-bright": "#EEEEEE"}
- Nested map with `value` keys: {"color": {"bg": {"void": {"value":"#050505"}}}}

The script writes a CSS file with `:root { --name: value; }` entries.
"""
import json
import os
import sys
from typing import Any, Dict


def flatten_tokens(obj: Any, prefix: str = "") -> Dict[str, str]:
    out = {}
    if isinstance(obj, dict):
        # If this dict directly contains a value, use it
        if "value" in obj and isinstance(obj["value"], (str, int, float)):
            out[prefix.rstrip("-")] = str(obj["value"])
            return out
        for k, v in obj.items():
            new_prefix = f"{prefix}{k}-" if prefix or k else ""
            out.update(flatten_tokens(v, new_prefix))
        return out
    # primitive
    if prefix:
        out[prefix.rstrip("-")] = str(obj)
    return out


def main():
    import argparse

    p = argparse.ArgumentParser()
    p.add_argument("--input", default="figma_tokens.json", help="Input JSON file path")
    p.add_argument("--output", default="dashboard/src/figma-tokens.css", help="Output CSS file path")
    args = p.parse_args()

    raw = None
    # Prefer env var if provided (useful in CI)
    env_json = os.getenv("FIGMA_TOKENS_JSON")
    if env_json:
        try:
            raw = json.loads(env_json)
        except Exception as e:
            print("Failed to parse FIGMA_TOKENS_JSON:", e, file=sys.stderr)
            sys.exit(2)
    else:
        if not os.path.exists(args.input):
            print(f"No input: {args.input}", file=sys.stderr)
            sys.exit(2)
        with open(args.input, "r", encoding="utf-8") as f:
            raw = json.load(f)

    tokens = flatten_tokens(raw)

    # Normalize names to css variable style: replace spaces and dots
    def normalize(name: str) -> str:
        return name.replace(".", "-").replace(" ", "-").lower()

    css_lines = [":root {\n"]
    for k, v in sorted(tokens.items()):
        nm = normalize(k)
        css_lines.append(f"  --{nm}: {v};\n")
    css_lines.append("}\n")

    out_dir = os.path.dirname(args.output)
    if out_dir and not os.path.exists(out_dir):
        os.makedirs(out_dir, exist_ok=True)

    with open(args.output, "w", encoding="utf-8") as f:
        f.writelines(css_lines)

    print(f"Wrote {len(tokens)} tokens to {args.output}")


if __name__ == "__main__":
    main()
