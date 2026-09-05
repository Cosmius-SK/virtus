import type { Config } from 'tailwindcss';

export default {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#12161c',
        paper: '#fbfaf7',
        rule: '#e3e0d8',
        accent: '#1f4f8b',
      },
    },
  },
  plugins: [],
} satisfies Config;
