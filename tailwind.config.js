/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#0f1722',
        pitch: { DEFAULT: '#0a8754', dark: '#076b43', light: '#1bbd7a' },
        gold: { DEFAULT: '#e9b949', dark: '#c79a2f' },
        chalk: '#f5f7f6',
      },
      fontFamily: {
        display: ['"Barlow Condensed"', 'system-ui', 'sans-serif'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
