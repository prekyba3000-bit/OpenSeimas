import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

/**
 * An element that responds to a click and is not a button, link or input does
 * not exist for a reader using a keyboard.
 *
 * Found 2026-09-08 while fixing the sessions page, where every control was a
 * `div` with an `onClick`: the session headers, the timeline bars, and each
 * vote row. None took a tab stop, responded to Enter, showed a focus ring, or
 * announced that it expanded anything. The same shape was in four more files —
 * the worst being ComparisonView, whose entire member picker was divs, so a
 * reader could not choose anyone to compare at all.
 *
 * Written against the shape rather than the instances, because the instances
 * were five separate accidents of one habit.
 *
 * `aria-hidden` is the one exemption and it is a real one: a full-screen
 * click-away backdrop is decorative, and the thing it dismisses has to be
 * dismissible another way. Both current backdrops close on Escape, which is
 * asserted where they live.
 */
const SRC = path.resolve(__dirname, '..');
const NON_INTERACTIVE = /^(div|span|li|tr|td|article|section|p|img)$/;

// Vendored shadcn/ui is third-party, and excluded from the type gate for the
// same reason. It is not where our surfaces live.
const SKIP = [path.join('components', 'ui') + path.sep];

function sourceFiles(dir: string, out: string[] = []): string[] {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) sourceFiles(full, out);
    else if (/\.tsx$/.test(entry.name) && !/\.test\.tsx$/.test(entry.name)) out.push(full);
  }
  return out;
}

/** End of an opening tag: the first `>` at brace depth 0. A naive
 *  `indexOf('>')` stops at the arrow in `onClick={() => f()}`, which is how
 *  the first version of this guard cleared two files it should have failed. */
function openingTag(source: string, start: number): string | null {
  let depth = 0;
  for (let i = start; i < source.length; i++) {
    const c = source[i];
    if (c === '{') depth++;
    else if (c === '}') depth--;
    else if (c === '>' && depth === 0) return source.slice(start, i + 1);
  }
  return null;
}

/** The element's own contents, by matching its close tag. */
function subtree(source: string, start: number, tag: string): string {
  const open = new RegExp(`<${tag}\\b`, 'g');
  const close = new RegExp(`</${tag}>`, 'g');
  open.lastIndex = start + 1;
  close.lastIndex = start;
  let depth = 1;
  let cursor = start;
  while (depth > 0) {
    close.lastIndex = cursor;
    const c = close.exec(source);
    if (!c) return source.slice(start);
    open.lastIndex = cursor + 1;
    let nested = 0;
    let o: RegExpExecArray | null;
    while ((o = open.exec(source)) && o.index < c.index) nested++;
    depth += nested - 1;
    cursor = c.index + c[0].length;
  }
  return source.slice(start, cursor);
}

const INTERACTIVE_CHILD = /<(a|button|Link|NavLink|input|select|textarea)\b/;

export function clickableNonInteractive(source: string): string[] {
  const found: string[] = [];
  const re = /<([a-zA-Z]+)\b/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(source))) {
    if (!NON_INTERACTIVE.test(m[1])) continue;
    const attrs = openingTag(source, m.index);
    if (!attrs || !/\bonClick[=\s]/.test(attrs)) continue;
    // Decorative click-away. What it dismisses must close another way.
    if (/\baria-hidden\b/.test(attrs)) continue;
    // The full ARIA widget pattern, done properly: a role, a tab stop, and a
    // keyboard handler. SeimasMap's 141 seats are built this way — a real
    // <button> per seat would fight the absolute positioning that places each
    // one in the chamber. All three parts are required; two of them is a
    // control that announces itself and cannot be operated.
    // The role may be conditional — SeimasMap gives a seat `role={seat.mp ?
    // 'button' : undefined}`, because a vacant seat is not a control and
    // correctly gets no role and no tab stop.
    const roleAttr = /\brole=(\{[^}]*\}|"[^"]*"|'[^']*')/.exec(attrs)?.[1] ?? '';
    if (
      /\b(button|link|option|tab|menuitem)\b/.test(roleAttr) &&
      /\btabIndex[=\s]/.test(attrs) &&
      /\bonKeyDown[=\s]/.test(attrs)
    ) continue;
    // A clickable region that contains a real control is the accepted
    // data-table pattern: the region is a pointer convenience and the control
    // is the keyboard path. Without a control inside, it is pointer-only.
    if (INTERACTIVE_CHILD.test(subtree(source, m.index, m[1]))) continue;
    found.push(`<${m[1]}> line ${source.slice(0, m.index).split('\n').length}`);
  }
  return found;
}

describe('nothing on a public surface is clickable by pointer only', () => {
  const files = sourceFiles(SRC).filter((f) => !SKIP.some((s) => f.includes(s)));

  it('catches the shape it was written for', () => {
    expect(clickableNonInteractive('<div onClick={x}>hi</div>')).toHaveLength(1);
    expect(clickableNonInteractive('<button onClick={x}>hi</button>')).toEqual([]);
    expect(clickableNonInteractive('<div aria-hidden onClick={x} />')).toEqual([]);
  });

  it('is not fooled by the arrow in an inline handler', () => {
    // The first version scanned to the first `>`, which is the one in `=>`.
    // It cleared two files that were actually broken.
    expect(
      clickableNonInteractive('<div onClick={() => close()} className="x">hi</div>'),
    ).toHaveLength(1);
    expect(
      clickableNonInteractive('<div onClick={() => close()} aria-hidden />'),
    ).toEqual([]);
  });

  it('allows the full ARIA widget pattern, and only the full one', () => {
    const done = '<div role="button" tabIndex={0} onKeyDown={k} onClick={c} />';
    expect(clickableNonInteractive(done)).toEqual([]);
    // Conditional, because the thing is only sometimes a control.
    expect(clickableNonInteractive(
      "<div role={x ? 'button' : undefined} tabIndex={x ? 0 : undefined} onKeyDown={k} onClick={c} />",
    )).toEqual([]);
    // Each part missing is a control a keyboard cannot reach or cannot name.
    expect(clickableNonInteractive(
      '<div role="button" tabIndex={0} onClick={c} />',
    )).toHaveLength(1);
    expect(clickableNonInteractive(
      '<div role="button" onKeyDown={k} onClick={c} />',
    )).toHaveLength(1);
    expect(clickableNonInteractive(
      '<div tabIndex={0} onKeyDown={k} onClick={c} />',
    )).toHaveLength(1);
  });

  it('allows a clickable region that contains a real control', () => {
    // The accepted data-table pattern: the row is a pointer convenience, the
    // link inside is the keyboard path.
    expect(
      clickableNonInteractive('<tr onClick={go}><td><Link to="/x">Name</Link></td></tr>'),
    ).toEqual([]);
    expect(
      clickableNonInteractive('<tr onClick={go}><td>Name</td></tr>'),
    ).toHaveLength(1);
  });

  it('finds files to check', () => {
    expect(files.length).toBeGreaterThan(20);
  });

  it.each(files.map((f) => [path.relative(SRC, f), f]))('%s', (_rel, full) => {
    expect(clickableNonInteractive(fs.readFileSync(full, 'utf8'))).toEqual([]);
  });
});
