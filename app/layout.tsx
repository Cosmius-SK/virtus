import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Virtus',
  description: 'A work companion. The mess in, the thing your job requires out.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-dvh antialiased">{children}</body>
    </html>
  );
}
