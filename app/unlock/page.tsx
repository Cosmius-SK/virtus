'use client';

import { useState } from 'react';

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
      setError(body.error ?? 'That code does not work.');
    } catch {
      setError('Could not reach the server. Check your connection.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="mx-auto flex min-h-dvh w-full max-w-sm flex-col justify-center px-6">
      <h1 className="text-2xl font-light tracking-tight text-ink">Virtus</h1>
      <p className="mt-1 text-sm text-ink/55">Enter the code you were given.</p>

      <form onSubmit={submit} className="mt-6">
        <input
          type="password"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          autoFocus
          autoComplete="off"
          className="w-full rounded-lg border border-rule bg-white px-4 py-3 text-[15px] text-ink outline-none transition focus:border-accent/60 focus:ring-4 focus:ring-accent/10"
        />
        <button
          type="submit"
          disabled={busy || code.trim().length === 0}
          className="mt-3 w-full rounded-md bg-ink px-5 py-3 text-sm font-medium text-paper transition hover:bg-accent disabled:cursor-not-allowed disabled:bg-ink/25"
        >
          {busy ? 'Checking…' : 'Open'}
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
