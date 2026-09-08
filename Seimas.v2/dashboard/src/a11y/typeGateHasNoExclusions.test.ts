import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

/**
 * The type gate covers everything, and there is no second config to hide in.
 *
 * It briefly had one. Three vendored shadcn/ui adapters — calendar, chart,
 * resizable — no longer compiled against the installed react-day-picker,
 * recharts and react-resizable-panels, so `tsconfig.typecheck.json` excluded
 * them to let a gate exist at all. Nothing imported any of the three and none
 * had a story, so they were deleted instead and the exclusion went with them:
 * `tsc --noEmit` now runs over the whole of `src` and passes.
 *
 * This exists because an exclusion list is the natural place for the next
 * broken file to go, and a gate with a carve-out stops being a gate quietly.
 * Fix the file or delete it; do not reintroduce the config.
 */
const DASHBOARD = path.resolve(__dirname, '../..');
const ROOT = path.resolve(DASHBOARD, '../..');

describe('the type gate', () => {
  it('has no separate config to exclude files in', () => {
    expect(fs.existsSync(path.join(DASHBOARD, 'tsconfig.typecheck.json'))).toBe(false);
  });

  it('declares no exclusions in the config it does use', () => {
    const cfg = fs.readFileSync(path.join(DASHBOARD, 'tsconfig.json'), 'utf8');
    expect(cfg).not.toMatch(/"exclude"/);
  });

  it('is what CI and the pre-push hook actually run', () => {
    const pkg = JSON.parse(fs.readFileSync(path.join(DASHBOARD, 'package.json'), 'utf8'));
    expect(pkg.scripts.typecheck).toBe('tsc --noEmit');

    const ci = fs.readFileSync(path.join(ROOT, '.github/workflows/ci.yml'), 'utf8');
    expect(ci).toContain('npm run dashboard:typecheck');

    const hook = fs.readFileSync(path.join(ROOT, 'scripts/local-ops/pre-push'), 'utf8');
    expect(hook).toContain('npx tsc --noEmit');
  });

  it('has nothing left importing the deleted adapters', () => {
    for (const name of ['calendar', 'chart', 'resizable']) {
      expect(fs.existsSync(path.join(DASHBOARD, `src/components/ui/${name}.tsx`))).toBe(false);
    }
  });
});
