import { describe, expect, it } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

/**
 * The verdict guards scanned source files. A „Gėdos siena" — fifteen named
 * members ranked #1 to #15 with a euro figure for salary they had supposedly
 * not earned — lived in public/data/absenteeism.json, was fetched directly by a
 * component, and survived the heroes-villains retirement, the integrity-index
 * demotion and the loyalty de-ranking, because no grep over read paths ever
 * looked at a static asset.
 *
 * Anything shipped from public/ reaches a reader exactly as an API response
 * does. This asserts the shape, not the instance.
 */
const PUBLIC_DIR = join(__dirname, "..", "..", "public");

// Keys that only exist to rank or judge a named person.
const FORBIDDEN_KEYS = [
  /^rank$/i,
  /unearned/i,
  /^top\d+_/i,
  /shame/i,
  /score$/i,
  /grade$/i,
];

// Titles that pass judgement rather than describing a measurement.
const FORBIDDEN_TEXT = [/gėdos siena/i, /wall of shame/i, /neuždirb/i, /reitingas/i];

function jsonFiles(dir: string): string[] {
  let out: string[] = [];
  let entries: string[];
  try {
    entries = readdirSync(dir);
  } catch {
    return out;
  }
  for (const entry of entries) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) out = out.concat(jsonFiles(full));
    else if (entry.endsWith(".json")) out.push(full);
  }
  return out;
}

function collectKeys(value: unknown, acc: string[] = []): string[] {
  if (Array.isArray(value)) value.forEach((v) => collectKeys(v, acc));
  else if (value && typeof value === "object") {
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      acc.push(k);
      collectKeys(v, acc);
    }
  }
  return acc;
}

describe("static data shipped to readers carries no verdicts", () => {
  const files = jsonFiles(PUBLIC_DIR);

  it("has no ranking or judgement keys", () => {
    const offenders: string[] = [];
    for (const file of files) {
      const keys = collectKeys(JSON.parse(readFileSync(file, "utf-8")));
      for (const key of keys) {
        if (FORBIDDEN_KEYS.some((re) => re.test(key))) {
          offenders.push(`${file.split("/public/")[1]}: ${key}`);
        }
      }
    }
    expect(offenders, "a rank or judgement key reached public/").toEqual([]);
  });

  it("has no text passing judgement on people", () => {
    const offenders: string[] = [];
    for (const file of files) {
      const raw = readFileSync(file, "utf-8");
      for (const re of FORBIDDEN_TEXT) {
        if (re.test(raw)) offenders.push(`${file.split("/public/")[1]}: ${re}`);
      }
    }
    expect(offenders, "judgement text reached public/").toEqual([]);
  });

  it("actually scans something, so a passing result means a check ran", () => {
    // A guard that silently finds no files is a guard that always passes.
    expect(files.length).toBeGreaterThan(0);
  });
});
