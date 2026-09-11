import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

const root = fileURLToPath(new URL('.', import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      '@': root,
      'server-only': fileURLToPath(new URL('./test/server-only-stub.ts', import.meta.url)),
    },
  },
  // The broadcast strip is rendered to a string in test/broadcast.test.tsx,
  // which is the only way to prove the internal note never leaves this screen.
  // tsconfig says `jsx: preserve`, because Next compiles the JSX itself. The
  // test runner has no Next, so it is told here instead.
  oxc: { jsx: { runtime: 'automatic' } },
  test: {
    environment: 'node',
    include: ['test/**/*.test.ts', 'test/**/*.test.tsx'],
  },
});
