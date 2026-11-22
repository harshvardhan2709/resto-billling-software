/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: '#F7F8F6',
        sidebar: '#14181d',
        primary: '#287A50',
        primaryHover: '#206640',
        text: '#252925',
        secondaryText: '#777F78',
        brand: {
          50: '#ecfdf5',
          100: '#d1fae5',
          200: '#a7f3d0',
          300: '#6ee7b7',
          400: '#34d399',
          500: '#287A50',
          600: '#206640',
          700: '#1a5234',
          800: '#143f28',
          900: '#0e2b1c',
        },
        charcoal: {
          800: '#1e242b',
          900: '#14181d',
          950: '#0c0f12',
        },
        surface: {
          DEFAULT: '#F7F8F6',
          card: '#ffffff',
          subtle: '#f1f5f9',
          border: '#e2e8f0',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
