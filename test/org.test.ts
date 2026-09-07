import { describe, expect, it } from 'vitest';
import { fixNames } from '@/lib/names';
import { unknownNames } from '@/lib/org/notice';
import { orgPrompt } from '@/lib/org/types';
import type { Entry } from '@/lib/org/types';

const entry = (kind: Entry['kind'], name: string, about = ''): Entry => ({
  id: name,
  ownerId: 'o',
  kind,
  name,
  about,
  createdAt: 0,
  updatedAt: 0,
});

/**
 * The organisation model is the feature (§3). These cover the two ways it earns
 * that: putting back names dictation mangles, and noticing what it does not know
 * at the moment the offer explains itself.
 */
describe('putting back the names it knows', () => {
  const known = ['Equinix', 'Cosmius', 'Priya'];

  it('corrects a capitalised near-miss', () => {
    expect(fixNames('hosted in Equinox', known)).toContain('Equinix');
  });

  it('leaves an ordinary lowercase word alone, however close', () => {
    // The capital is the entire safety mechanism. Without it this would be a
    // find-and-replace over English.
    expect(fixNames('the equinox is in september', known)).toBe('the equinox is in september');
  });

  it('does nothing when two known names are equally close', () => {
    // A confident wrong name is far worse than a misspelt one: it will be sent
    // to a client. Marces is one edit from both, so neither wins.
    const twins = ['Marcus', 'Marcos'];
    expect(fixNames('spoke to Marces', twins)).toBe('spoke to Marces');
  });

  it('leaves a name it does not know untouched', () => {
    expect(fixNames('spoke to Nadia', known)).toBe('spoke to Nadia');
  });
});

describe('noticing what it does not know', () => {
  const note =
    'Priya approved the Equinix racks on Tuesday. Equinix have not confirmed. Tom is chasing.';

  it('finds names the note leaned on', () => {
    const found = unknownNames(note, []).map((n) => n.name);
    expect(found).toContain('Equinix');
    expect(found).toContain('Tom');
  });

  it('ranks by how often the note used them', () => {
    const [first] = unknownNames(note, []);
    expect(first.name).toBe('Equinix');
    expect(first.times).toBe(2);
  });

  it('does not offer what it already knows', () => {
    const found = unknownNames(note, [entry('client', 'Equinix')]).map((n) => n.name);
    expect(found).not.toContain('Equinix');
  });

  it('ignores days, months and the words every status note capitalises', () => {
    const found = unknownNames('Wave 2 slipped to Friday. Sev 1 raised in January.', []).map(
      (n) => n.name,
    );
    for (const noise of ['Friday', 'January', 'Wave', 'Sev']) expect(found).not.toContain(noise);
  });
});

describe('what the model is told', () => {
  it('says nothing at all when the organisation model is empty', () => {
    expect(orgPrompt({ entries: [] })).toBe('');
  });

  it('groups by kind and forbids inventing more of them', () => {
    const prompt = orgPrompt({
      entries: [
        { kind: 'person', name: 'Priya', about: 'Director. Wants the risk before the ask.' },
        { kind: 'client', name: 'Equinix', about: 'Colocation provider for Ashburn.' },
        { kind: 'term', name: 'PRE-2', about: 'The shared pre-production environment.' },
      ],
    });
    expect(prompt).toContain('People:');
    expect(prompt).toContain('Clients:');
    expect(prompt).toContain('Terminology:');
    expect(prompt).toContain('Wants the risk before the ask');
    expect(prompt).toContain('do not add anyone to it');
    // The list is context, not something to talk about.
    expect(prompt).toContain('Do not mention this list');
  });
});
