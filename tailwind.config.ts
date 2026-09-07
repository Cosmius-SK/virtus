import type { Config } from 'tailwindcss';

export default {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Virtus's own identity (lib/brand.ts). The documents wear the client's
        // house style instead — see lib/deck/master.ts. Keeping the two apart is
        // deliberate: the tool adapts to whoever owns the output.
        accent: '#F4531C',
        accentDark: '#D8410E',
        accentTint: '#FFF1EA',
        ink: '#131A24',
        ink80: '#2B3644',
        ink60: '#586576',
        ink40: '#8A94A2',
        line: '#E3E7EC',
        lineSoft: '#EFF2F5',
        paper: '#FFFFFF',
        canvas: '#F5F7F9',
        night: '#1B2430',
        nightSoft: '#232E3C',
      },
      fontFamily: {
        sans: ['ui-sans-serif', 'system-ui', 'Segoe UI', 'Helvetica Neue', 'Arial', 'sans-serif'],
      },
      borderRadius: { DEFAULT: '4px', md: '6px', lg: '8px' },
      boxShadow: {
        card: '0 1px 2px rgba(19,26,36,0.04), 0 1px 3px rgba(19,26,36,0.06)',
        lift: '0 2px 4px rgba(19,26,36,0.06), 0 8px 24px rgba(19,26,36,0.08)',
      },
    },
  },
  plugins: [],
} satisfies Config;
