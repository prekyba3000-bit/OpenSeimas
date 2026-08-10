"""Thin LLM client for the pipeline — Google Gemini via its OpenAI-compatible endpoint.

V.4 architecture rule: the LLM may only rephrase source-locked content, never
decide it. This module is wiring only — no pipeline logic calls it yet, and
nothing here may grow selection/scoring behaviour.

Config comes from the environment (Seimas.v2/.env is loaded if present):
  GEMINI_API_KEY   — required
  GEMINI_BASE_URL  — default: https://generativelanguage.googleapis.com/v1beta/openai/
  GEMINI_MODEL     — default: gemini-2.5-flash (pinned; do not float to -latest)
"""
import os
from pathlib import Path

from dotenv import load_dotenv
from openai import OpenAI

load_dotenv(Path(__file__).resolve().parents[1] / ".env")

DEFAULT_BASE_URL = "https://generativelanguage.googleapis.com/v1beta/openai/"
DEFAULT_MODEL = "gemini-2.5-flash"


def _client() -> OpenAI:
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        raise RuntimeError(
            "GEMINI_API_KEY is not set. Add it to Seimas.v2/.env "
            "(see .env.template) or export it before running."
        )
    return OpenAI(api_key=api_key, base_url=os.getenv("GEMINI_BASE_URL", DEFAULT_BASE_URL))


def complete(prompt: str) -> str:
    """Single-turn completion. Returns the model's text reply."""
    resp = _client().chat.completions.create(
        model=os.getenv("GEMINI_MODEL", DEFAULT_MODEL),
        messages=[{"role": "user", "content": prompt}],
    )
    return resp.choices[0].message.content or ""
