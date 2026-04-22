import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
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
        // Finsight theme tokens
        navy: {
          DEFAULT: '#111827',
          surface: '#0F1D2D',
        },
        background: '#111827',
        surface: '#0F1D2D',
        accent: '#00C48C',
        steel: '#4a5568',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}

export default config
