/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
    "./services/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'brand-dark': "#0E1116",
        'brand-primary': "#374A67",
        'brand-light': "#E6FAFC",
        brand: {
          dark: "#0E1116",
          primary: "#374A67",
          light: "#E6FAFC",
          muted: "#5F718C",
          border: "#B9D7DE",
        },
        orange: {
          50: '#F3FBFC',
          100: '#E6FAFC',
          200: '#CBE8ED',
          300: '#A7CFD8',
          400: '#7899AE',
          500: '#5F718C',
          600: '#374A67',
          700: '#2B3C57',
          800: '#1C293C',
          900: '#0E1116',
          950: '#080A0D',
        },
      },
    },
  },
  plugins: [],
  safelist: [
    {
      pattern: /(bg|text|border)-(indigo|violet|amber|slate|emerald|cyan)-(50|100|200|500|700|800)/,
    },
  ],
};
