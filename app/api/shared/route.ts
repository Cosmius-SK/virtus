import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { ADMIN_COOKIE, adminPasscode, mayAdmin } from '@/lib/admin/gate';
import { cleanDoc, type SharedDoc } from '@/lib/shared/doc';
import { sharedStore } from '@/lib/shared/driver';
import { friendly } from '@/lib/friendly';

/**
 * What the whole firm shares: read by every screen, written from Admin.
 *
 * An endpoint rather than a hook, because the pipeline is called without a
 * browser (§7) and the plugin will want the organisation model and the
 * templates the same way this screen does. Rule 1 in the notes: endpoint first,
 * screen second.
 *
 * Reads are cached for a few seconds server-side. Not for speed — for cost. On
 * Vercel a blob fetch that misses cache is a billable operation, so without
 * this, a hundred people opening screens is a hundred reads of the same
 * kilobytes. With it, it is a handful a minute however many people are looking,
 * and a broadcast still reaches everybody inside a few seconds, which is the
 * right trade for a notice rather than for a chat message.
 */

let held: { doc: SharedDoc; at: number } | undefined;
const HOLD_MS = 5000;

export async function GET() {
  const store = sharedStore();
  if (!store) {
    // Not an error. The app keeps admin data on the device and says so.
    return NextResponse.json({ shared: false, reason: 'no-store' });
  }

  try {
    if (held && Date.now() - held.at < HOLD_MS) {
      return NextResponse.json({ shared: true, where: store.where, doc: held.doc });
    }
    const doc = await store.read();
    held = { doc, at: Date.now() };
    return NextResponse.json({ shared: true, where: store.where, doc });
  } catch (err) {
    return NextResponse.json({ shared: false, reason: friendly(err).message }, { status: 200 });
  }
}

export async function PUT(req: Request) {
  const store = sharedStore();
  if (!store) {
    return NextResponse.json(
      { error: 'There is no shared store configured, so this stays on your device.' },
      { status: 409 },
    );
  }

  const jar = await cookies();
  if (!(await mayAdmin(jar.get(ADMIN_COOKIE)?.value))) {
    return NextResponse.json(
      { error: 'The admin code is needed to change what everybody sees.', locked: true },
      { status: 403 },
    );
  }

  try {
    const body = (await req.json()) as { doc?: unknown; version?: number };
    const next = cleanDoc(body.doc);

    // Read before writing, so two people on the same afternoon cannot silently
    // overwrite each other. The loser is told and can re-read; nothing is lost
    // without somebody being shown that it was about to be.
    const current = await store.read();
    if (typeof body.version === 'number' && body.version !== current.version) {
      return NextResponse.json(
        {
          error:
            'Somebody else changed this while you were editing. Nothing was saved — reload to see theirs, then make your change again.',
          stale: true,
          doc: current,
        },
        { status: 409 },
      );
    }

    const written: SharedDoc = { ...next, version: current.version + 1, updatedAt: Date.now() };
    await store.write(written);
    held = { doc: written, at: Date.now() };
    return NextResponse.json({ ok: true, doc: written });
  } catch (err) {
    return NextResponse.json({ error: friendly(err).message }, { status: 500 });
  }
}

/** Whether the caller could write, without attempting one. Used to draw the screen. */
export async function HEAD() {
  const jar = await cookies();
  const open = !adminPasscode();
  const may = await mayAdmin(jar.get(ADMIN_COOKIE)?.value);
  return new NextResponse(null, {
    status: 204,
    headers: {
      'x-virtus-shared': sharedStore() ? '1' : '0',
      'x-virtus-admin': may ? '1' : '0',
      'x-virtus-admin-open': open ? '1' : '0',
    },
  });
}
