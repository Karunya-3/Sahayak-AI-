/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        warm: {
          50: '#FAF9F6',
          100: '#F8F7F4', // Theme background
          200: '#EDEBE6',
          300: '#DFDCD4',
        },
        primary: {
          DEFAULT: '#5146E5', // Deep indigo
          hover: '#4338CA',
          light: '#6366F1',
        },
        secondary: {
          DEFAULT: '#EAE7FF', // Soft lavender
          light: '#F4F2FF',
          dark: '#D8D3FF',
        },
        accent: {
          DEFAULT: '#B9F3D0', // Mint green
          dark: '#34D399',
          light: '#E6FAF0',
        },
        charcoal: {
          DEFAULT: '#20202A', // Dark charcoal text
          muted: '#525266',
          subtle: '#8C8C9E',
        },
      },
      fontFamily: {
        sans: [
          'Plus Jakarta Sans',
          'Inter',
          'system-ui',
          '-apple-system',
          'Segoe UI',
          'Roboto',
          'sans-serif',
        ],
      },
      keyframes: {
        pulseGlow: {
          '0%, 100%': { transform: 'scale(1)', boxShadow: '0 0 0 0 rgba(81, 70, 229, 0.4)' },
          '50%': { transform: 'scale(1.05)', boxShadow: '0 0 0 16px rgba(81, 70, 229, 0)' },
        },
        wave: {
          '0%, 100%': { height: '8px' },
          '50%': { height: '32px' },
        },
      },
      animation: {
        'pulse-glow': 'pulseGlow 2.5s infinite ease-in-out',
        'wave-bar': 'wave 1.2s infinite ease-in-out',
      },
    },
  },
  plugins: [],
};
