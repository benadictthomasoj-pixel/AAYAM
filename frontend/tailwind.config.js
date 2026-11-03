/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          green: '#087F4F',
          hover: '#075E43',
          light: '#E7F8EF',
          dark: '#075E43',
          focus: '#087F4F',
        },
        aayam: {
          primary: '#087F4F',
          forest: '#075E43',
          teal: '#0F9F91',
          mint: '#E7F8EF',
          bg: '#F4F8F7',
          card: '#FFFFFF',
          text: '#142B2A',
          secondary: '#647775',
          border: '#E1EBE7',
          critical: '#E54848',
          warning: '#E9A23B',
          operational: '#169B62',
        },
        surface: {
          app: '#F4F8F7',
          sidebar: '#FFFFFF',
          header: '#FFFFFF',
          card: '#FFFFFF',
          secondary: '#E7F8EF',
          border: '#E1EBE7',
          inputBorder: '#CBD5E1',
        },
        risk: {
          critical: '#E54848',
          warning: '#E9A23B',
          healthy: '#169B62',
          operational: '#169B62',
        },
      },
      fontFamily: {
        sans: [
          'Inter',
          'Noto Sans Devanagari',
          'Noto Sans Tamil',
          'Noto Sans Telugu',
          'Noto Sans Malayalam',
          'Noto Sans Kannada',
          'system-ui',
          '-apple-system',
          'BlinkMacSystemFont',
          'Segoe UI',
          'sans-serif',
        ],
        mono: ['JetBrains Mono', 'Menlo', 'monospace'],
      }
    },
  },
  plugins: [],
}
