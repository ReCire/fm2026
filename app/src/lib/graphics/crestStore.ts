import { get, set, del } from 'idb-keyval';
import { browser } from '$app/environment';

/**
 * Storage for player-supplied club crests.
 *
 * A generated crest needs no storage; a real badge is a binary and does. This
 * keeps them in IndexedDB rather than in the save, for the same reason the
 * theme is not in the save: a career is portable and a 200 KB image per club is
 * not something to carry through an export.
 *
 * Four behaviours here are design decisions rather than implementation details,
 * all of them fm-03-design's and worth stating because each has an obvious
 * wrong version:
 *
 *   1. DOWNSCALE on write, never validate and reject. Someone picking a 4 MB
 *      photo from their camera roll gets a working crest, not an error. The
 *      failure mode of "your file is too big" is that they give up.
 *   2. A MISSING asset is a normal outcome. `crestUrl` returns null and the
 *      caller falls back to the generated mark — cleared site data degrades to
 *      the shipped crest, never to a broken image.
 *   3. Object URLs are MANAGED HERE. Callers get a stable string and never have
 *      to remember to revoke anything.
 *   4. `putCrest` REPLACES any existing crest for that club. One club, one
 *      crest, no orphans to collect later.
 */
const KEY = (clubId: string) => `anstoss:crest:${clubId}`;

/** Longest edge after downscaling. Big enough for a 56px carousel on a 3x screen. */
const MAX_EDGE = 512;
/** Re-encode quality. 0.82 is where badge flats stop gaining anything visible. */
const QUALITY = 0.82;

/** assetId → object URL, so the same crest is never allocated twice. */
const urls = new Map<string, string>();

interface StoredCrest {
  clubId: string;
  blob: Blob;
  savedAt: number;
}

/**
 * Downscale to a sane budget.
 *
 * Preserves aspect ratio and leaves anything already small alone — re-encoding
 * a 64px PNG only loses detail. Transparency is preserved by keeping PNG for
 * images that have it; a crest on a coloured card with a white box round it is
 * worse than no crest.
 */
async function downscale(file: File): Promise<Blob> {
  if (!browser) return file;

  const bitmap = await createImageBitmap(file);
  const longest = Math.max(bitmap.width, bitmap.height);

  if (longest <= MAX_EDGE) {
    bitmap.close();
    return file;
  }

  const scale = MAX_EDGE / longest;
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    bitmap.close();
    return file;   // no 2D context: store the original rather than fail
  }
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  const hasAlpha = file.type === 'image/png' || file.type === 'image/webp';
  const type = hasAlpha ? 'image/png' : 'image/jpeg';

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, type, QUALITY)
  );
  return blob ?? file;
}

/**
 * Store a crest for a club, replacing any previous one.
 * Returns the asset id to put in the club's override.
 */
export async function putCrest(clubId: string, file: File): Promise<string> {
  const blob = await downscale(file);
  const record: StoredCrest = { clubId, blob, savedAt: Date.now() };
  await set(KEY(clubId), record);

  // The previous URL for this club now points at a replaced blob.
  release(clubId);
  return clubId;
}

/**
 * An object URL for a stored crest, or null if there is none.
 *
 * Null is a normal answer. Cleared site data, a different browser, a save
 * imported from someone else's pack — all reach here and all should show the
 * generated crest rather than a broken image.
 */
export async function crestUrl(assetId: string): Promise<string | null> {
  if (!browser) return null;

  const cached = urls.get(assetId);
  if (cached) return cached;

  try {
    const record = (await get(KEY(assetId))) as StoredCrest | undefined;
    if (!record?.blob) return null;
    const url = URL.createObjectURL(record.blob);
    urls.set(assetId, url);
    return url;
  } catch {
    // Storage unavailable or blocked. The generated crest is the right answer.
    return null;
  }
}

export async function deleteCrest(assetId: string): Promise<void> {
  release(assetId);
  try {
    await del(KEY(assetId));
  } catch {
    // Nothing to do: the override is being cleared regardless, and the caller
    // will fall back to the generated crest.
  }
}

export async function hasCrest(assetId: string): Promise<boolean> {
  return (await crestUrl(assetId)) !== null;
}

/** Drop a cached object URL. Called on replace and delete; callers need not. */
function release(assetId: string): void {
  const url = urls.get(assetId);
  if (!url) return;
  URL.revokeObjectURL(url);
  urls.delete(assetId);
}

/** Release every cached URL. For tests and for a full editor reset. */
export function releaseAll(): void {
  for (const id of [...urls.keys()]) release(id);
}

export const CREST_LIMITS = { maxEdge: MAX_EDGE, quality: QUALITY } as const;
