import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

/**
 * The three files `tsconfig.typecheck.json` excludes from the type gate.
 *
 * They are vendored shadcn/ui adapters whose types no longer match the
 * installed react-day-picker, recharts and react-resizable-panels. Excluding
 * them is only honest while nothing imports them: the moment an application
 * file does, the gate would be waving through broken code on a real surface.
 *
 * So the exclusion list and this test are two halves of one decision. Import
 * one of these and this fails, which is the signal to fix the adapter or drop
 * the exclusion — not to add another entry here.
 */
const EXCLUDED = ['calendar', 'chart', 'resizable'];

const SRC = path.resolve(__dirname, '../..');

function sourceFiles(dir: string, out: string[] = []): string[] {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) sourceFiles(full, out);
    else if (/\.(ts|tsx)$/.test(entry.name) && !/\.test\.tsx?$/.test(entry.name)) out.push(full);
  }
  return out;
}

describe('the type gate excludes only files nothing imports', () => {
  it('lists exactly the files tsconfig.typecheck.json excludes', () => {
    const cfg = fs.readFileSync(
      path.resolve(__dirname, '../../../tsconfig.typecheck.json'),
      'utf8',
    );
    for (const name of EXCLUDED) {
      expect(cfg).toContain(`src/components/ui/${name}.tsx`);
    }
    // Nothing else. A fourth entry added without a matching entry here is the
    // exact drift this guards.
    const listed = [...cfg.matchAll(/"src\/[^"]+"/g)].map((m) => m[0]);
    expect(listed).toHaveLength(EXCLUDED.length);
  });

  it.each(EXCLUDED)('nothing outside ui/ imports %s', (name) => {
    const importers = sourceFiles(SRC)
      .filter((f) => !f.includes(`components${path.sep}ui${path.sep}`))
      .filter((f) => {
        const src = fs.readFileSync(f, 'utf8');
        return new RegExp(`from ['"][^'"]*ui/${name}['"]`).test(src);
      })
      .map((f) => path.relative(SRC, f));
    expect(importers).toEqual([]);
  });
});
