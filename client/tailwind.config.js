/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#f5f8ff",
          100: "#ebf1ff",
          200: "#dde7ff",
          300: "#c4d5ff",
          400: "#9fb9ff",
          500: "#7091ff",
          600: "#4865f5",
          700: "#364bd4",
          800: "#2d3daa",
          900: "#2a3687",
          950: "#1d2353",
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
}
