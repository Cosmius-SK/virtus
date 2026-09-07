import type { Metadata } from 'next';
import { Shell } from '@/components/Shell';
import './globals.css';

export const metadata: Metadata = {
  title: 'Virtus',
  description:
    'Turn working notes into the documents a role requires — reviewed before anything is produced.',
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
