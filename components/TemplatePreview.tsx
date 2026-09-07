import type { FormatDef, Section } from '@/lib/formats/types';

/**
 * A wireframe of what a template produces, drawn from the template's own
 * section list.
 *
 * Not a screenshot. A screenshot is a file somebody has to remember to
 * regenerate, and it is wrong the first time a section moves; this is derived
 * from the same definition the renderer uses, so it cannot drift. Adding a
 * template to the registry gives it a preview for nothing.
 *
 * It shows shape, not content — which is the honest thing for a preview to
 * show, because the content will be the reader's own.
 */
const W = 160;
const H = 90;
const M = 6;
const BAR = 4;
const GAP = 2.5;

function rows(sections: Section[]): Section[][] {
  const out: Section[][] = [];
  for (let i = 0; i < sections.length; i++) {
    if (sections[i].beside && sections[i + 1]) out.push([sections[i], sections[i++ + 1]]);
    else out.push([sections[i]]);
  }
  return out;
}

export function TemplatePreview({ format }: { format: FormatDef }) {
  const laid = rows(format.sections);
  const isPack = format.layout === 'pack';

  // A pack is drawn as its cover with the rest stacked behind it, because that
  // is the difference someone is choosing between.
  const bodyTop = 12;
  const available = H - bodyTop - 6;
  // Solve for the scale that fills the card exactly. The labels and gutters
  // between rows are a fixed cost that does not scale, so they come off the
  // budget before the bodies are divided into what is left — scaling the whole
  // stack instead left short templates huddled at the top of a mostly empty
  // box, which made them all look alike, the opposite of what a preview is for.
  const overhead = laid.reduce((n, r) => n + (r[0].kind === 'fields' ? 0 : BAR) + GAP, 0);
  const asked = laid.reduce((n, r) => n + Math.max(...r.map((s) => s.height)) * 8, 0);
  const scale = Math.max(0.45, Math.min(3, (available - overhead) / asked));

  let y = bodyTop;

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="h-full w-full"
      role="img"
      aria-label={`Layout of the ${format.name} template`}
    >
      <rect width={W} height={H} rx="2" className="fill-white" />

      {isPack && (
        <>
          <rect x={M + 5} y={4} width={W - M * 2} height={H - 10} rx="1.5" className="fill-lineSoft" />
          <rect x={M + 2.5} y={2.5} width={W - M * 2} height={H - 8} rx="1.5" className="fill-line" />
          <rect x={M} y={1} width={W - M * 2} height={H - 6} rx="1.5" className="fill-white stroke-line" strokeWidth="0.6" />
        </>
      )}

      {/* Banner. */}
      <rect x={M} y={isPack ? 5 : 4} width={W - M * 2} height={5} rx="1" className="fill-accent" />

      {laid.map((row, i) => {
        const h = Math.max(...row.map((s) => s.height)) * 8 * scale;
        const each = row.length === 2 ? (W - M * 2 - 3) / 2 : W - M * 2;
        const top = y;
        y += h + (row[0].kind === 'fields' ? 0 : BAR) + GAP;

        return (
          <g key={i}>
            {row.map((section, j) => {
              const x = M + j * (each + 3);
              if (section.kind === 'fields') {
                const n = (section.fields?.length ?? 3) + (format.status ? 1 : 0);
                return (
                  <g key={section.id}>
                    {Array.from({ length: n }).map((_, k) => (
                      <rect
                        key={k}
                        x={x + k * ((each + 1) / n)}
                        y={top}
                        width={(each + 1) / n - 1}
                        height={5}
                        rx="0.6"
                        className={k === n - 1 && format.status ? 'fill-accent/70' : 'fill-ink40/50'}
                      />
                    ))}
                  </g>
                );
              }
              return (
                <g key={section.id}>
                  <rect x={x} y={top} width={each} height={BAR - 0.5} rx="0.6" className="fill-ink40" />
                  <rect
                    x={x}
                    y={top + BAR}
                    width={each}
                    height={h}
                    rx="0.6"
                    className="fill-none stroke-line"
                    strokeWidth="0.6"
                  />
                  {section.kind === 'list' &&
                    Array.from({ length: Math.min(4, Math.floor(h / 4)) }).map((_, k) => (
                      <rect
                        key={k}
                        x={x + 2}
                        y={top + BAR + 2 + k * 4}
                        width={(each - 6) * (k % 2 ? 0.7 : 0.92)}
                        height={1.6}
                        rx="0.8"
                        className="fill-line"
                      />
                    ))}
                  {section.kind === 'paragraph' &&
                    Array.from({ length: Math.min(3, Math.floor(h / 4)) }).map((_, k) => (
                      <rect
                        key={k}
                        x={x + 2}
                        y={top + BAR + 2 + k * 4}
                        width={(each - 6) * (k === 2 ? 0.55 : 1)}
                        height={1.6}
                        rx="0.8"
                        className="fill-line"
                      />
                    ))}
                  {section.kind === 'table' && (
                    <>
                      <rect x={x} y={top + BAR} width={each} height={3} className="fill-ink40/70" />
                      {Array.from({ length: Math.min(3, Math.floor((h - 3) / 3.5)) }).map((_, k) => (
                        <line
                          key={k}
                          x1={x}
                          x2={x + each}
                          y1={top + BAR + 3 + (k + 1) * 3.5}
                          y2={top + BAR + 3 + (k + 1) * 3.5}
                          className="stroke-line"
                          strokeWidth="0.5"
                        />
                      ))}
                      {(section.columns ?? []).slice(1).map((_, k) => (
                        <line
                          key={k}
                          x1={x + (each / (section.columns?.length ?? 1)) * (k + 1)}
                          x2={x + (each / (section.columns?.length ?? 1)) * (k + 1)}
                          y1={top + BAR}
                          y2={top + BAR + h}
                          className="stroke-line"
                          strokeWidth="0.4"
                        />
                      ))}
                    </>
                  )}
                </g>
              );
            })}
          </g>
        );
      })}
    </svg>
  );
}
