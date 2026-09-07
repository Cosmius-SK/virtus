/**
 * The Virtus mark: a quill, drawn rather than shipped as an image.
 *
 * As SVG it scales from a favicon to a banner from one definition, inherits its
 * colour from wherever it sits, and adds nothing to the bundle.
 *
 * It is deliberately heavy. An earlier version drew the barbs as fine separate
 * shapes; it was elegant at 96px and an orange smudge at 24, which is the only
 * size that matters — a mark that fails in a header has failed. The three
 * notches are what make it read as a feather rather than a blade at that size,
 * and the vent hole is what makes the tail read as a nib.
 */
const PATH =
  'M56 6 L44 21 L52 22 L38 35 L46 36 L31 48 L40 49 L23 58 L6 60 L13 43 L28 29 L42 16 Z';

export function Mark({ className = 'h-7 w-7' }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden="true">
      <path d={PATH} fill="currentColor" />
      {/* The nib's vent. Punched out, so the mark works on any background. */}
      <circle cx="14.8" cy="50.5" r="2.5" className="fill-[var(--mark-vent,#fff)]" />
    </svg>
  );
}

export function Wordmark({ className = '' }: { className?: string }) {
  return (
    <span className={`flex items-center gap-2.5 ${className}`}>
      <Mark className="h-6 w-6 text-accent" />
      <span className="text-[13px] font-semibold tracking-[0.16em] text-ink">VIRTUS</span>
    </span>
  );
}
