import { NextResponse } from 'next/server';
import { formatIndex } from '@/lib/formats/registry';

export const runtime = 'nodejs';

/** What Virtus can produce. The picker reads this; so will an admin screen. */
export async function GET() {
  return NextResponse.json({ formats: formatIndex() });
}
