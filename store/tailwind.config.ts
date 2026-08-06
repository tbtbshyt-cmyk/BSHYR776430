import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './lib/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        // الأسود المطفي والذهب الخالص
        ink: {
          950: '#0a0a0b',
          900: '#0f0f11',
          800: '#16161a',
          700: '#1f1f25',
          600: '#2a2a32',
          500: '#3a3a44',
        },
        gold: {
          50: '#fbf6e3',
          100: '#f5e9b8',
          200: '#ecd788',
          300: '#e3c55a',
          400: '#d4af37', // الذهب الخالص
          500: '#b8941f',
          600: '#947518',
          700: '#6f5712',
        },
      },
      fontFamily: {
        sans: ['Tajawal', 'Cairo', 'system-ui', 'sans-serif'],
        display: ['Cairo', 'Tajawal', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        gold: '0 0 0 1px rgba(212,175,55,0.35), 0 10px 40px -12px rgba(212,175,55,0.25)',
        'gold-lg': '0 0 40px -8px rgba(212,175,55,0.45)',
      },
      backgroundImage: {
        'gold-gradient': 'linear-gradient(135deg, #f5e9b8 0%, #d4af37 45%, #947518 100%)',
        'ink-radial': 'radial-gradient(circle at top, #1f1f25 0%, #0a0a0b 70%)',
      },
      keyframes: {
        'fade-up': {
          '0%': { opacity: '0', transform: 'translateY(12px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
      },
      animation: {
        'fade-up': 'fade-up 0.5s ease-out both',
        shimmer: 'shimmer 2.5s linear infinite',
      },
    },
  },
  plugins: [],
};
export default config;
