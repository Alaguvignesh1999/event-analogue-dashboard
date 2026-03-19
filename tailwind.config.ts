import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        bg: '#0a0e17',
        surface: '#111827',
        card: '#1a1f2e',
        border: '#252d3d',
        hover: '#1e2740',
        t1: '#f0f2f5',
        t2: '#a0aec0',
        t3: '#5a6578',
        t4: '#3a4050',
        accent: '#3b82f6',
        positive: '#22c55e',
        negative: '#ef4444',
        amber: '#f59e0b',
        purple: '#a78bfa',
        teal: '#2dd4bf',
        magenta: '#ec4899',
        orange: '#f97316',
      },
      fontFamily: {
        sans: ['var(--font-sans)', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['var(--font-mono)', 'ui-monospace', 'monospace'],
      },
    },
  },
  plugins: [],
};

export default config;
