import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './lib/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-sans)', 'system-ui', 'sans-serif'],
        mono: ['ui-monospace', '"SF Mono"', '"Cascadia Code"', '"Roboto Mono"', 'monospace'],
      },
      colors: {
        primary: 'var(--color-primary)',
      },
    },
  },
  plugins: [],
};

export default config;
