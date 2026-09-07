/**
 * Does the built bundle actually start?
 *
 * `src/config.ts` throws at module load when VITE_API_URL is unset, and Vite
 * inlines that value at build time — it never evaluates the module, so the
 * build succeeds either way. A build without the variable therefore produces a
 * bundle that throws on first paint and gives every visitor a blank page. CI
 * gave the variable to the tests and not to the build, and nothing downstream
 * would have noticed the difference.
 *
 * The check is direct: Vite replaces `import.meta.env.VITE_API_URL` with a
 * string literal, so the value we built with must appear in the output. If it
 * does not, the guard in config.ts is sitting there with nothing to satisfy it.
 */
import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';

const DIST = path.resolve('Seimas.v2/dashboard/dist');
const expected = process.env.VITE_API_URL;

function fail(msg) {
  console.error(`built app FAILED: ${msg}`);
  process.exit(1);
}

if (!expected) fail('VITE_API_URL is not set for this check either');

const html = readFileSync(path.join(DIST, 'index.html'), 'utf8');
const entry = html.match(/src="(\/assets\/index-[^"]+\.js)"/)?.[1];
if (!entry) fail('no entry script in dist/index.html');

const bundle = readFileSync(path.join(DIST, entry.replace(/^\//, '')), 'utf8');
if (!bundle.includes(expected)) {
  fail(
    `the API URL was not inlined — built without VITE_API_URL, so config.ts ` +
    `will throw on load and the page will be blank`,
  );
}

const assets = readdirSync(path.join(DIST, 'assets'));
if (!assets.some((f) => f.endsWith('.js'))) fail('dist/assets has no javascript');
if (!assets.some((f) => f.endsWith('.css'))) fail('dist/assets has no stylesheet');

console.log(`built app ok — entry ${entry}, API URL inlined, ${assets.length} assets`);
