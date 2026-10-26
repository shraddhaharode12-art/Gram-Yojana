/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        terracotta: { DEFAULT: '#B8502F', dark: '#8E3A20', light: '#E08A63' },
        haldi: { DEFAULT: '#E3A81C', dark: '#B98200', light: '#F6D77A' },
        neem: { DEFAULT: '#4F7A38', dark: '#365527', light: '#A9C48C' },
        chalk: { DEFAULT: '#FBF6EA', dark: '#EFE5CC' },
        soil: '#3B2A20',
      },
      fontFamily: {
        body: ['"Mukta"', '"Noto Sans Devanagari"', 'system-ui', 'sans-serif'],
        hand: ['"Kalam"', '"Mukta"', 'cursive'],
      },
    },
  },
  plugins: [],
};
