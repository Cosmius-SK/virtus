import type { Banner } from '@/lib/admin/banner';

/**
 * The broadcast strip itself.
 *
 * One component, used by the application frame and by the preview in the admin
 * panel, for the same reason a template preview is drawn from the template's own
 * definition: a preview that is a second implementation is a preview that can
 * be wrong. Somebody about to put a notice in front of the whole firm should be
 * looking at the notice, not at something like it.
 */
const TONES = {
  info: 'border-line bg-lineSoft text-ink80',
  warn: 'border-amber-300 bg-amber-50 text-amber-900',
  alert: 'border-red-300 bg-red-50 text-red-900',
} as const;

export function BroadcastStrip({ banner, inset = false }: { banner: Banner; inset?: boolean }) {
  return (
    <div className={`border-b ${TONES[banner.tone]} ${inset ? 'rounded border' : ''}`} role="status">
      <p
        className={`text-[12.5px] leading-relaxed ${
          inset ? 'px-3 py-2' : 'mx-auto w-full max-w-6xl px-4 py-2 sm:px-6'
        }`}
      >
        {banner.text}
      </p>
    </div>
  );
}
