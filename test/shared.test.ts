import { afterEach, describe, expect, it } from 'vitest';
import { ADMIN_COOKIE, adminPasscode, adminToken, mayAdmin } from '@/lib/admin/gate';
import { cleanDoc, EMPTY_DOC, isEmpty, type SharedDoc } from '@/lib/shared/doc';

/**
 * What the whole firm shares, and who may change it.
 *
 * Two things here fail silently, which is why they are tested rather than
 * eyeballed:
 *
 * - A gate that is open when it should be shut looks exactly like a gate that
 *   is working, right up until somebody who should not have edited the
 *   classification-adjacent broadcast does.
 * - A document read from a store is whatever that store had in it. A field
 *   that arrives as the wrong shape does not throw; it reaches a renderer and
 *   comes out as a document nobody can explain.
 */

const was = process.env.VIRTUS_ADMIN_PASSCODE;
afterEach(() => {
  if (was === undefined) delete process.env.VIRTUS_ADMIN_PASSCODE;
  else process.env.VIRTUS_ADMIN_PASSCODE = was;
});

describe('who may change what everybody sees', () => {
  it('is open when no code is configured, and that is deliberate', () => {
    // Unset means open, exactly as the app gate does. A deployment nobody
    // configured must not ship an Admin screen that cannot be opened and has
    // no way to be fixed from inside (lesson 12.10).
    delete process.env.VIRTUS_ADMIN_PASSCODE;
    expect(adminPasscode()).toBe('');
    return expect(mayAdmin(undefined)).resolves.toBe(true);
  });

  it('refuses everything but the right cookie once a code is set', async () => {
    process.env.VIRTUS_ADMIN_PASSCODE = 'open-sesame';
    const right = await adminToken('open-sesame');

    expect(await mayAdmin(right)).toBe(true);

    // Paired: the three ways somebody arrives without it.
    expect(await mayAdmin(undefined)).toBe(false);
    expect(await mayAdmin('')).toBe(false);
    expect(await mayAdmin(await adminToken('some-other-code'))).toBe(false);
  });

  it('is not the same token as the app gate', async () => {
    // The two codes could be set to the same string by somebody being helpful.
    // If the tokens matched, the app cookie would unlock Admin — everyone
    // through the front door would be an admin, and nothing on screen would
    // say so.
    const { gateToken } = await import('@/lib/gate');
    const shared = 'same-code-for-both';
    expect(await adminToken(shared)).not.toBe(await gateToken(shared));
    // Paired: each is stable in itself, so the line above is about the two
    // differing rather than about either being random.
    expect(await adminToken(shared)).toBe(await adminToken(shared));
  });

  it('changing the code invalidates a cookie already issued', async () => {
    const before = await adminToken('first');
    process.env.VIRTUS_ADMIN_PASSCODE = 'second';
    expect(await mayAdmin(before)).toBe(false);
    expect(await mayAdmin(await adminToken('second'))).toBe(true);
  });

  it('names its cookie once', () => {
    expect(ADMIN_COOKIE).toBe('virtus_admin');
  });
});

describe('reading a document out of the store', () => {
  it('keeps what is there and replaces what is not a list', () => {
    const doc = cleanDoc({
      version: 3,
      updatedAt: 12,
      broadcasts: [{ id: 'a', text: 'Trial run', tone: 'info', on: true, addedAt: 1 }],
      org: 'not a list',
      templates: undefined,
      somethingElse: 'dropped',
    });

    expect(doc.version).toBe(3);
    expect(doc.broadcasts).toHaveLength(1);
    // Paired with the line above: the good field survived, so these two are
    // about the bad ones being replaced rather than everything being discarded.
    expect(doc.org).toEqual([]);
    expect(doc.templates).toEqual([]);
    expect('somethingElse' in doc).toBe(false);
  });

  it('turns nothing at all into an empty document rather than throwing', () => {
    expect(cleanDoc(undefined)).toEqual(EMPTY_DOC);
    expect(cleanDoc(null).version).toBe(0);
    // Paired: a version that is not a number is not carried through as one.
    expect(cleanDoc({ version: 'seven' }).version).toBe(0);
  });
});

describe('whether a device is holding something worth publishing', () => {
  const full: SharedDoc = {
    ...EMPTY_DOC,
    org: [
      {
        id: 'e',
        ownerId: 'o',
        kind: 'person',
        name: 'Priya',
        about: 'Delivery lead',
        createdAt: 1,
        updatedAt: 1,
      },
    ],
  };

  it('says no for an empty one and yes for anything in it', () => {
    expect(isEmpty(EMPTY_DOC)).toBe(true);
    expect(isEmpty(full)).toBe(false);
    // Each part counts on its own: a device holding only a house style still
    // has something the shared store does not, and offering to publish
    // nothing is how somebody learns to ignore the offer.
    const house = {
      from: 'house.pptx',
      accent: '#1F3B73',
      accentLine: '#1F3B73',
      accentSoft: '#E8EDF6',
      accentSofter: '#F4F7FB',
      ink: '#1A1A1A',
      face: 'Segoe UI',
      faceHeading: 'Segoe UI',
      series: [],
    };
    expect(isEmpty({ ...EMPTY_DOC, house })).toBe(false);
    expect(
      isEmpty({
        ...EMPTY_DOC,
        broadcasts: [{ id: 'b', text: 'x', tone: 'info', on: false, addedAt: 1 }],
      }),
    ).toBe(false);
  });
});
