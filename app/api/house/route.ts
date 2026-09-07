import { NextResponse } from 'next/server';
import JSZip from 'jszip';
import { houseFromTheme } from '@/lib/house';

export const runtime = 'nodejs';
export const maxDuration = 30;

/** Office files are zips. The theme is one entry, in a known place. */
const THEMES = ['ppt/theme/theme1.xml', 'word/theme/theme1.xml'];

const LIMIT = 25 * 1024 * 1024;

/**
 * An uploaded .pptx/.potx/.docx/.dotx → the house style in it.
 *
 * On the server because reading it means unzipping, and because the file itself
 * never needs to be stored — only the dozen values that come out of it, which
 * go back to the device. Nothing about the deck someone uploads is kept here.
 */
export async function POST(req: Request) {
  let file: File | null = null;
  try {
    const form = await req.formData();
    const sent = form.get('file');
    file = sent instanceof File ? sent : null;
  } catch {
    return NextResponse.json({ error: 'Send the file as a form upload.' }, { status: 400 });
  }
  if (!file) return NextResponse.json({ error: 'No file was sent.' }, { status: 400 });
  if (file.size > LIMIT) {
    return NextResponse.json(
      { error: 'That file is larger than 25MB. A template file should be far smaller.' },
      { status: 413 },
    );
  }

  try {
    const zip = await JSZip.loadAsync(await file.arrayBuffer());
    const entry = THEMES.map((path) => zip.file(path)).find(Boolean);
    if (!entry) {
      return NextResponse.json(
        {
          error:
            'No theme was found in that file. Save it as a PowerPoint or Word file (.pptx, .potx, .docx or .dotx) and try again.',
        },
        { status: 400 },
      );
    }
    return NextResponse.json({ house: houseFromTheme(await entry.async('string'), file.name) });
  } catch {
    return NextResponse.json(
      { error: 'That file could not be opened. It may be a different format than its name says.' },
      { status: 400 },
    );
  }
}
