import type { Metadata, Viewport } from 'next';
import { Shell } from '@/components/Shell';
import './globals.css';

export const metadata: Metadata = {
  title: 'Virtus',
  description:
    'Turn working notes into the documents a role requires — reviewed before anything is produced.',
};

/**
 * Without this, a phone lays the page out at a notional desktop width and then
 * scales it down: the header runs off the side, the page scrolls sideways, and
 * every breakpoint in the application is measured against the wrong number so
 * none of them ever fire. It is one line and its absence made every mobile
 * layout below it untestable.
 */
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-dvh bg-canvas text-ink antialiased">
        <Shell classification={process.env.NEXT_PUBLIC_VIRTUS_CLASSIFICATION || undefined}>
          {children}
        </Shell>
      </body>
    </html>
  );
}
