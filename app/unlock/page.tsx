'use client';

import { useState } from 'react';
import { Mark } from '@/components/Logo';

export default function Unlock() {
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/unlock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ passcode: code }),
      });
      if (res.ok) {
        window.location.href = '/';
        return;
      }
      const body = (await res.json().catch(() => ({}))) as { error?: string };
      setError(body.error ?? 'That code was not recognised.');
    } catch {
      setError('Could not reach the server. Check your connection and try again.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="mx-auto flex min-h-dvh w-full max-w-sm flex-col justify-center px-6">
      <Mark className="h-9 w-9 text-accent" />
      <h1 className="mt-4 text-[15px] font-semibold tracking-[0.16em] text-ink">VIRTUS</h1>
      <p className="mt-2 text-[13px] text-ink60">Enter the access code you were provided.</p>

      <form onSubmit={submit} className="mt-6">
        <input
          type="password"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          autoFocus
          autoComplete="off"
          className="w-full rounded border border-line bg-paper px-4 py-3 text-[15px] text-ink outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/15"
        />
        <button
          type="submit"
          disabled={busy || code.trim().length === 0}
          className="mt-3 w-full rounded bg-accent px-5 py-3 text-[13px] font-medium text-white transition hover:bg-accentDark disabled:cursor-not-allowed disabled:opacity-40"
        >
          {busy ? 'Checking…' : 'Continue'}
        </button>
        {error && (
          <p className="mt-3 text-sm text-red-700" role="alert">
            {error}
          </p>
        )}
      </form>
    </section>
  );
}
