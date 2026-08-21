/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        base: {
          DEFAULT: "#0b0f16",
          800: "#101623",
          700: "#16202f",
          600: "#1f2c3f",
        },
        gold: {
          DEFAULT: "#d4af37",
          300: "#e6c75e",
          500: "#c9a227",
        },
      },
      fontFamily: {
        mono: ["'JetBrains Mono'", "'IBM Plex Sans Arabic'", "monospace"],
        sans: ["Inter", "'IBM Plex Sans Arabic'", "system-ui", "sans-serif"],
        ar: ["'IBM Plex Sans Arabic'", "Inter", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};