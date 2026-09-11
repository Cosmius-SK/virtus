import 'server-only';
import { cleanDoc, EMPTY_DOC, type SharedDoc } from './doc';

/**
 * The one place that knows where shared data is kept.
 *
 * Deliberately the same shape as `lib/ai/provider.ts`: a single module holding
 * the one decision, so that changing it is changing a file rather than hunting
 * call sites. The storage was always going to move — the notes said so while it
 * was still on the device — and the point of a driver is that moving it again
 * costs what moving it once cost.
 *
 * Not configured is a first-class answer, not an error. A checkout with no
 * token, and a deployment before somebody has created the store, both run: the
 * app falls back to keeping admin data on the device and says so on screen.
 * Failing closed here would mean a deploy where nobody can reach Admin at all,
 * which is the same trap the passcode gate avoids by treating "unset" as "open"
 * (lesson 12.10).
 */
export interface SharedStore {
  /** Said on screen when somebody asks where this is kept. */
  readonly where: string;
  read(): Promise<SharedDoc>;
  write(doc: SharedDoc): Promise<void>;
}

const PATH = 'virtus/shared.json';

/**
 * Vercel Blob, private.
 *
 * Private rather than public, and that is not a default worth taking lightly:
 * this document holds the organisation model, which is the real names of real
 * people at a real firm along with what they do. A public blob is reachable by
 * anybody holding its URL, with no token and no gate — the same URL that would
 * sit in a browser history, a proxy log or a screenshot. The product's own page
 * has a table headed "what leaves the building"; putting the firm's staff list
 * at an unauthenticated URL would make that table a lie.
 *
 * Chosen for size: the whole document is about 11KB — six broadcasts, a house
 * style, forty organisation entries — and a few kilobytes more per template
 * built in Admin. Storage is not the cost here; reads are, because Vercel
 * counts a fetch that misses cache. So the route in front of this holds the
 * document briefly, and a hundred people opening screens costs what one does.
 */
function blobStore(token: string): SharedStore {
  return {
    where: 'Vercel Blob',

    async read() {
      const { get } = await import('@vercel/blob');
      // By pathname rather than listing first: `list` is charged as an advanced
      // operation and a listing is not needed to read a document whose name is
      // a constant. `useCache: false` because an admin who has just pressed
      // save must be shown what they saved — the caching that matters belongs
      // to the route, which knows when a write has happened, and a CDN that
      // does not know cannot be allowed to answer for it.
      const found = await get(PATH, { token, access: 'private', useCache: false });
      if (!found?.stream) return EMPTY_DOC;
      return cleanDoc(JSON.parse(await new Response(found.stream).text()));
    },

    async write(doc) {
      const { put } = await import('@vercel/blob');
      await put(PATH, JSON.stringify(doc), {
        token,
        access: 'private',
        contentType: 'application/json',
        // One document, overwritten. Without these every save would leave a new
        // file behind and the store would grow without limit for no benefit —
        // the history that matters is in the changelog, not in orphaned blobs.
        addRandomSuffix: false,
        allowOverwrite: true,
      });
    },
  };
}

/**
 * A file on disk, for development.
 *
 * Its first purpose is honest: without it the shared path could only be
 * exercised against a real Vercel Blob store, which means it could not be
 * driven in a browser here at all, and "it compiles" is not the same claim as
 * "it works". Its second purpose is that a second implementation is what turns
 * an interface from a hope into a fact — the swap this file promises is only
 * cheap if something has actually swapped.
 *
 * Only ever reachable by setting the token to `file:<path>`, which nothing in
 * production would do. A serverless filesystem is ephemeral, so this would
 * silently forget everything between requests; the prefix makes choosing it
 * deliberate rather than something a missing variable could fall into.
 */
function fileStore(path: string): SharedStore {
  return {
    where: `a file on this machine (${path})`,
    async read() {
      const { readFile } = await import('node:fs/promises');
      try {
        return cleanDoc(JSON.parse(await readFile(path, 'utf8')));
      } catch {
        return EMPTY_DOC;
      }
    },
    async write(doc) {
      const { writeFile, mkdir } = await import('node:fs/promises');
      const { dirname } = await import('node:path');
      await mkdir(dirname(path), { recursive: true });
      await writeFile(path, JSON.stringify(doc, null, 2), 'utf8');
    },
  };
}

/**
 * The configured store, or nothing.
 *
 * Read fresh each call rather than cached in a module, because a serverless
 * instance can outlive an environment change and a token that has been rotated
 * should be picked up at the next request rather than at the next deploy.
 */
export function sharedStore(): SharedStore | undefined {
  const token = process.env.BLOB_READ_WRITE_TOKEN?.trim();
  if (!token) return undefined;
  if (token.startsWith('file:')) return fileStore(token.slice('file:'.length));
  return blobStore(token);
}
