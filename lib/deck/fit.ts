/**
 * How much room text needs, and what size it has to be to get it.
 *
 * The renderer used to place every box at the height its format declared and
 * set every font to a fixed size, which is fine until the content disagrees.
 * On a real status report that meant "Key Decisions: None" holding a box two
 * thirds empty while the section beside it, with two full sentences of bullets,
 * ran past its edge. Both are wrong in the same way: the design was deciding
 * something only the content knows.
 *
 * So: measure, then allocate, then size. The measurement is an estimate — laying
 * out text properly means font metrics, kerning and hyphenation, none of which
 * are available while writing a file that PowerPoint will lay out itself. An
 * estimate that is right to within a line is worth far more than a fixed number
 * that is wrong by five.
 *
 * Deliberately isomorphic: the editing screen needs the same answers to tell
 * somebody what will not fit, and two copies of this arithmetic would drift.
 */

/** Average glyph width as a fraction of the font size, for a proportional face. */
const CHAR = 0.5;
/** Line height as a multiple of the font size. */
const LINE = 1.22;
/** Points per inch. */
const PT = 72;

/** Left and right insets inside a text box, in inches. */
export const INSET = 0.2;

export function charsPerLine(widthIn: number, sizePt: number): number {
  return Math.max(8, Math.floor(((widthIn - INSET) * PT) / (CHAR * sizePt)));
}

export function lineHeightIn(sizePt: number): number {
  return (sizePt * LINE) / PT;
}

/** Lines one run of text takes. Newlines count; a blank line still counts. */
export function linesFor(text: string, widthIn: number, sizePt: number): number {
  const per = charsPerLine(widthIn, sizePt);
  return text
    .split('\n')
    .reduce((n, part) => n + Math.max(1, Math.ceil(part.length / per)), 0);
}

/** Lines a bullet list takes, including the space between items. */
export function linesForList(items: string[], widthIn: number, sizePt: number): number {
  if (!items.length) return 1;
  // A bullet and its gutter cost about three characters of the line.
  const per = Math.max(6, charsPerLine(widthIn, sizePt) - 3);
  return items.reduce((n, item) => n + Math.max(1, Math.ceil(item.length / per)), 0);
}

/** Lines the tallest cell of a table row takes. */
export function linesForRow(cells: string[], widths: number[], sizePt: number): number {
  return Math.max(
    1,
    ...cells.map((cell, i) => Math.ceil(cell.length / charsPerLine(widths[i] ?? 1, sizePt))),
  );
}

/**
 * The largest size between `floor` and `nominal` whose content fits `heightIn`.
 *
 * Half-point steps: a quarter point is not visible and a whole point is a
 * visible jump between two sections that should look like one document.
 */
export function fitSize(
  linesAt: (sizePt: number) => number,
  heightIn: number,
  nominal: number,
  floor: number,
): number {
  for (let size = nominal; size > floor; size -= 0.5) {
    if (linesAt(size) * lineHeightIn(size) <= heightIn) return size;
  }
  return floor;
}

/** How tall this content would like to be at its nominal size, in inches. */
export function neededIn(lines: number, sizePt: number, padIn = 0.08): number {
  return lines * lineHeightIn(sizePt) + padIn;
}
