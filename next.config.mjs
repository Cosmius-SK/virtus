import { readFileSync } from 'node:fs';

// The changelog is the single source of release notes (§8.7). Read it at build
// time so there is never a second copy to drift.
function release() {
  const text = readFileSync('./CHANGELOG.md', 'utf8');
  const heading = text.match(/^##\s+(\d+\.\d+\.\d+)\s*(?:—\s*(.*))?$/m);
  if (!heading) return { version: '0.0.0', name: '' };
  const body = text.slice(text.indexOf(heading[0]) + heading[0].length);
  const notes = body.split(/^## /m)[0].trim();
  return { version: heading[1], name: heading[2] ?? '', notes };
}

const { version, name, notes } = release();

/** @type {import('next').NextConfig} */
const config = {
  env: {
    NEXT_PUBLIC_VIRTUS_VERSION: version,
    NEXT_PUBLIC_VIRTUS_RELEASE: name,
    NEXT_PUBLIC_VIRTUS_NOTES: notes ?? '',
  },
};

export default config;
