import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: '#0a0a0a',
        panel: '#141414',
        panelBorder: '#27272a',
        accent: '#c8102e',
        accentHover: '#e01a2b',
        good: '#22c55e',
        bad: '#f43f5e',
        warn: '#f59e0b',
      },
      fontFamily: {
        display: ['var(--font-display)', 'sans-serif'],
        body: ['var(--font-body)', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
export default config;
