import type { Config } from 'tailwindcss';

export default {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // The firm's own palette — see docs/brand.md. Kept in step with
        // lib/deck/master.ts so the app and the decks it makes look related.
        ink: '#1a1a1a',
        paper: '#fbfaf9',
        rule: '#dbdbdb',
        accent: '#0f7f40',
        accentSoft: '#cce6dd',
      },
    },
  },
  plugins: [],
} satisfies Config;
