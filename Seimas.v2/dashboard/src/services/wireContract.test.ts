import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { mpProfileSchema } from './api';

/**
 * The schema must accept every null the backend is allowed to send.
 *
 * This is the test that would have caught both blank-page defects. Twice in one
 * session a backend value was widened to null while the zod schema still
 * required a number: first `mp.party`, then
 * `forensic_breakdown.loyalty_bonus.independent_voting_days_pct`. The parse
 * failed, and because the profile page parses the whole payload at once, one
 * legitimately-absent value took every other field down with it — for 9
 * members, since the Speaker and all 8 former members sit in no faction.
 *
 * The existing contract test in provenanceContract.test.ts goes through
 * `parse` correctly but builds its payload by hand, and nobody hand-writes the
 * awkward case. So this file works from two sources of truth that are not
 * anyone's imagination:
 *
 *   - contracts/wire-nullability.json — every path the backend may null,
 *     declared once and also checked from the Python side.
 *   - contracts/fixtures/*.json — real payloads captured from production for
 *     members chosen by awkward property rather than by name.
 *
 * Failure here means the schema and the backend disagree about what is
 * optional. Fix the schema, not this test.
 */
const ROOT = join(__dirname, '..', '..', '..', 'contracts');

type Contract = {
  endpoints: Record<string, { nullable_paths: Record<string, string> }>;
};

const contract: Contract = JSON.parse(
  readFileSync(join(ROOT, 'wire-nullability.json'), 'utf-8'),
);
const nullablePaths = Object.keys(contract.endpoints.heroes_profile.nullable_paths);

const fixtures = readdirSync(join(ROOT, 'fixtures'))
  .filter((f) => f.startsWith('heroes-') && f.endsWith('.json'))
  .map((f) => ({
    name: f,
    ...JSON.parse(readFileSync(join(ROOT, 'fixtures', f), 'utf-8')),
  }));

function setPath(obj: unknown, path: string, value: unknown): unknown {
  const clone = structuredClone(obj) as Record<string, unknown>;
  const parts = path.split('.');
  let cur: Record<string, unknown> = clone;
  for (const part of parts.slice(0, -1)) {
    if (cur[part] == null || typeof cur[part] !== 'object') return clone;
    cur = cur[part] as Record<string, unknown>;
  }
  cur[parts[parts.length - 1]] = value;
  return clone;
}

describe('the wire contract', () => {
  it('has fixtures and declared paths to check', () => {
    // Both lists empty would make every test below pass while checking nothing.
    expect(fixtures.length).toBeGreaterThan(0);
    expect(nullablePaths.length).toBeGreaterThan(0);
  });

  it.each(fixtures.map((f) => [f.name, f] as const))(
    'parses the real payload %s',
    (_name, fixture) => {
      const parsed = mpProfileSchema.safeParse(fixture.payload);
      if (!parsed.success) {
        throw new Error(
          `Captured payload for ${fixture._captured_mp} (${fixture._why}) does ` +
            `not parse. The backend and the schema disagree:\n` +
            JSON.stringify(parsed.error.issues, null, 2),
        );
      }
    },
  );

  it.each(nullablePaths)('accepts null at %s', (path) => {
    // Applied to every fixture, not just one: a path can be nested under an
    // object that is itself absent in some payloads.
    for (const fixture of fixtures) {
      const mutated = setPath(fixture.payload, path, null);
      const parsed = mpProfileSchema.safeParse(mutated);
      if (!parsed.success) {
        throw new Error(
          `The backend is allowed to send null at "${path}" ` +
            `(${contract.endpoints.heroes_profile.nullable_paths[path]}) but the ` +
            `schema rejects it. This blanks the whole profile page, not just ` +
            `this field.\n${JSON.stringify(parsed.error.issues, null, 2)}`,
        );
      }
    }
  });
});
