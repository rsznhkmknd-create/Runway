import type { Config } from 'tailwindcss'

const config: Config = {
  darkMode: 'class',
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // ── Semantic tokens (driven by CSS vars in globals.css) ──
        app:        'rgb(var(--app-bg) / <alpha-value>)',
        surface:    'rgb(var(--surface) / <alpha-value>)',
        'surface-2':'rgb(var(--surface-2) / <alpha-value>)',
        border:     'rgb(var(--border-color) / <alpha-value>)',
        'text-primary':   'rgb(var(--text-primary) / <alpha-value>)',
        'text-secondary': 'rgb(var(--text-secondary) / <alpha-value>)',
        'text-muted':     'rgb(var(--text-muted) / <alpha-value>)',

        // ── Brand scale (kept; mint #00C48C at 600) ──
        brand: {
          50:  '#e6faf3',
          100: '#b8f0d8',
          200: '#8ae6bd',
          300: '#5cdba2',
          400: '#2ed087',
          500: '#1acd85',
          600: '#00C48C',
          700: '#00a374',
          800: '#00825c',
          900: '#006145',
        },

        // ── Legacy aliases kept so existing navy literals still work ──
        navy: {
          DEFAULT: '#111827',
          surface: '#0F1D2D',
        },
        accent: '#00C48C',
        steel: '#4a5568',
      },
      fontFamily: {
        sans: ['DM Sans', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        // Subtle, not overwrought — Linear/Stripe territory
        card: '0 1px 2px 0 rgb(0 0 0 / 0.04)',
      },
    },
  },
  plugins: [],
}

export default config
