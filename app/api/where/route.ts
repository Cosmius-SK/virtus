import { NextResponse } from 'next/server';
import { destination } from '@/lib/ai/provider';

export const runtime = 'nodejs';

/**
 * Where the text goes (§5).
 *
 * The question that decides everything, answered by the product itself rather
 * than discovered during a security review.
 */
export async function GET() {
  return NextResponse.json(destination());
}
