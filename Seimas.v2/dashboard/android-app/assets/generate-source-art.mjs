/**
 * Generates the source art for @capacitor/assets from original vector shapes —
 * no stock art. The mark is the project's own: a blue rounded field (--primary
 * #3B82F6) carrying a bold geometric "A" in the dark app colour (--primary-
 * foreground #0F172A), the same mark as the dashboard landing page.
 *
 * Run: node assets/generate-source-art.mjs
 * Rasterises with sharp (already present as a @capacitor/assets dependency).
 */
import sharp from 'sharp';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const HERE = dirname(fileURLToPath(import.meta.url));

const BLUE = '#3B82F6'; // --primary
const DARK_A = '#0F172A'; // --primary-foreground
const VOID = '#020817'; // --background (splash + adaptive dark surround)

/**
 * Geometric "A" drawn as strokes: two legs meeting at the apex plus a crossbar.
 * Centered on `cx`, apex at `top`, base at `bottom`, half-width `hw`. Reads
 * unmistakably as an A at launcher sizes, unlike a filled triangle.
 */
function letterA({ cx, top, bottom, hw, color }) {
  const h = bottom - top;
  const w = h * 0.16; // stroke weight
  const crossY = top + h * 0.66;
  // Leg centreline x-offset at a given height (0 at apex, hw at base).
  const offAt = (y) => (hw * (y - top)) / h;
  const co = offAt(crossY);
  return `<g fill="none" stroke="${color}" stroke-width="${w}"
      stroke-linecap="round" stroke-linejoin="round">
    <path d="M ${cx - hw} ${bottom} L ${cx} ${top} L ${cx + hw} ${bottom}" />
    <path d="M ${cx - co} ${crossY} L ${cx + co} ${crossY}" />
  </g>`;
}

/** Blue rounded tile with the dark A centered on it. Used where a tile is drawn. */
function tile({ size, radius, aScale = 0.52 }) {
  const cx = size / 2;
  const aH = size * aScale;
  const top = cx - aH / 2;
  const bottom = cx + aH / 2;
  const hw = aH * 0.42;
  return `
    <rect x="0" y="0" width="${size}" height="${size}" rx="${radius}" ry="${radius}" fill="${BLUE}" />
    ${letterA({ cx, top, bottom, hw, color: DARK_A })}
  `;
}

const svgs = {
  // Adaptive background: solid blue. The launcher masks it to circle/squircle,
  // which becomes the brand's rounded field.
  'icon-background.svg': (S) =>
    `<svg xmlns="http://www.w3.org/2000/svg" width="${S}" height="${S}" viewBox="0 0 ${S} ${S}"><rect width="${S}" height="${S}" fill="${BLUE}"/></svg>`,

  // Adaptive foreground: the dark A only, kept within the center safe zone
  // (~52% of the canvas) so no mask clips it. Transparent elsewhere.
  'icon-foreground.svg': (S) => {
    const cx = S / 2;
    const aH = S * 0.5;
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${S}" height="${S}" viewBox="0 0 ${S} ${S}">${letterA(
      { cx, top: cx - aH / 2, bottom: cx + aH / 2, hw: aH * 0.42, color: DARK_A },
    )}</svg>`;
  },

  // Legacy square icon: full blue field + dark A, corners rounded by the OS.
  'icon-only.svg': (S) =>
    `<svg xmlns="http://www.w3.org/2000/svg" width="${S}" height="${S}" viewBox="0 0 ${S} ${S}">${tile(
      { size: S, radius: 0, aScale: 0.5 },
    )}</svg>`,

  // Splash (both themes): dark surround with the full mark — a blue rounded tile
  // and dark A — centered.
  'splash.svg': (S) => {
    const tileSize = Math.round(S * 0.28);
    const off = (S - tileSize) / 2;
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${S}" height="${S}" viewBox="0 0 ${S} ${S}">
      <rect width="${S}" height="${S}" fill="${VOID}"/>
      <g transform="translate(${off}, ${off})">
        <svg width="${tileSize}" height="${tileSize}" viewBox="0 0 ${tileSize} ${tileSize}">
          ${tile({ size: tileSize, radius: Math.round(tileSize * 0.22), aScale: 0.5 })}
        </svg>
      </g>
    </svg>`;
  },
};

async function render(name, S) {
  const svg = svgs[name](S);
  const out = join(HERE, name.replace('.svg', '.png'));
  await sharp(Buffer.from(svg)).png().resize(S, S).toFile(out);
  return out;
}

const jobs = [
  ['icon-background.svg', 1024],
  ['icon-foreground.svg', 1024],
  ['icon-only.svg', 1024],
  ['splash.svg', 2732],
];

for (const [name, S] of jobs) {
  const out = await render(name, S);
  console.log('wrote', out);
}
// splash-dark is identical to splash (the app is dark-only).
await sharp(join(HERE, 'splash.png')).toFile(join(HERE, 'splash-dark.png'));
console.log('wrote', join(HERE, 'splash-dark.png'));
