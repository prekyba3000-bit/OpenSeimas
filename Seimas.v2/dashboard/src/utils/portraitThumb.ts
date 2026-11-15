import listed from '../data/portraits.json';

const HAVE = new Set<string>(listed);
const VRK = /\/kandImg\/photo_(\d+)\.jpe?g$/;

/**
 * Our 192 px copy of a VRK portrait (made by scripts/make_portrait_thumbs.py)
 * when the list has one; otherwise the address as given. For pictures shown
 * at avatar size — the profile keeps the original.
 */
export function portraitThumb(url: string | null | undefined): string | undefined {
  if (!url) return undefined;
  const id = VRK.exec(url)?.[1];
  return id && HAVE.has(id) ? `${import.meta.env.BASE_URL}portraits/photo_${id}.jpg` : url;
}
