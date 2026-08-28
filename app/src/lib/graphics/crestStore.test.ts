import { describe, it, expect, beforeEach, vi } from 'vitest';

/**
 * The four behaviours here are design decisions, so they are the four things
 * pinned. Each has an obvious wrong version that would pass a naive test:
 * rejecting a big file, throwing on a missing one, leaking object URLs, and
 * leaving an orphan behind on replace.
 */
const store = new Map<string, unknown>();
const revoked: string[] = [];
let created = 0;

vi.mock('$app/environment', () => ({ browser: true }));
/*
 * One mock with a switch, rather than a second `vi.doMock` for the failure
 * case. `doMock` survives `resetModules` and leaks into every later test, and
 * `doUnmock` cancels the top-level mock as well — the first attempt at this
 * file hit both in turn.
 */
const storage = { throws: false };
vi.mock('idb-keyval', () => ({
  get: async (k: string) => {
    if (storage.throws) throw new Error('blocked');
    return store.get(k);
  },
  set: async (k: string, v: unknown) => {
    if (storage.throws) throw new Error('blocked');
    store.set(k, v);
  },
  del: async (k: string) => {
    if (storage.throws) throw new Error('blocked');
    store.delete(k);
  }
}));

const bigBitmap = { width: 2048, height: 2048, close: () => {} };
const smallBitmap = { width: 64, height: 64, close: () => {} };

function stubBrowser(bitmap: { width: number; height: number; close: () => void }) {
  vi.stubGlobal('createImageBitmap', async () => bitmap);
  vi.stubGlobal('URL', {
    createObjectURL: () => `blob:url-${++created}`,
    revokeObjectURL: (u: string) => void revoked.push(u)
  });
  vi.stubGlobal('document', {
    createElement: () => ({
      width: 0, height: 0,
      getContext: () => ({ drawImage: () => {} }),
      toBlob: (cb: (b: Blob) => void) => cb(new Blob(['small'], { type: 'image/png' }))
    })
  });
}

beforeEach(() => {
  store.clear(); revoked.length = 0; created = 0;
  stubBrowser(bigBitmap);
  // `vi.doMock` survives `resetModules`, so the throwing-storage case would
  // otherwise leak into every test after it — which it did, and the symptom
  // was a null URL in an unrelated assertion.
  storage.throws = false;
  vi.resetModules();
});

const file = (bytes = 4_000_000) =>
  new File([new Uint8Array(bytes > 1000 ? 1000 : bytes)], 'badge.png', { type: 'image/png' });

describe('putCrest', () => {
  it('downscales a large image instead of rejecting it', async () => {
    const { putCrest } = await import('./crestStore');
    const id = await putCrest('ziegelhuette', file());
    expect(id).toBe('ziegelhuette');
    const stored = store.get('anstoss:crest:ziegelhuette') as { blob: Blob };
    // The re-encoded blob, not the original: a 4 MB camera-roll photo must
    // become a working crest rather than an error.
    expect(await stored.blob.text()).toBe('small');
  });

  it('leaves an already-small image alone rather than re-encoding it', async () => {
    stubBrowser(smallBitmap);
    const { putCrest } = await import('./crestStore');
    await putCrest('c', new File(['original'], 'b.png', { type: 'image/png' }));
    const stored = store.get('anstoss:crest:c') as { blob: Blob };
    expect(await stored.blob.text()).toBe('original');
  });

  it('replaces rather than accumulating — one club, one crest', async () => {
    const { putCrest } = await import('./crestStore');
    await putCrest('c', file());
    await putCrest('c', file());
    const keys = [...store.keys()].filter((k) => k.startsWith('anstoss:crest:'));
    expect(keys).toEqual(['anstoss:crest:c']);
  });

  it('revokes the previous URL when a crest is replaced', async () => {
    const { putCrest, crestUrl } = await import('./crestStore');
    await putCrest('c', file());
    const first = await crestUrl('c');
    await putCrest('c', file());
    expect(revoked).toContain(first);
  });
});

describe('crestUrl', () => {
  it('returns null for a club with no crest — a normal outcome, not an error', async () => {
    const { crestUrl } = await import('./crestStore');
    expect(await crestUrl('never-set')).toBeNull();
  });

  it('hands back a stable URL rather than a new one each call', async () => {
    const { putCrest, crestUrl } = await import('./crestStore');
    await putCrest('c', file());
    expect(await crestUrl('c')).toBe(await crestUrl('c'));
  });

  it('returns null when storage itself throws, so cleared data degrades quietly', async () => {
    const { crestUrl } = await import('./crestStore');
    storage.throws = true;
    expect(await crestUrl('c')).toBeNull();
  });
});

describe('deleteCrest', () => {
  it('removes the record and releases the URL', async () => {
    const { putCrest, crestUrl, deleteCrest } = await import('./crestStore');
    await putCrest('c', file());
    const url = await crestUrl('c');
    await deleteCrest('c');
    expect(revoked).toContain(url);
    expect(await crestUrl('c')).toBeNull();
  });

  it('deleting something that was never stored does not throw', async () => {
    const { deleteCrest } = await import('./crestStore');
    await expect(deleteCrest('nothing')).resolves.toBeUndefined();
  });
});
