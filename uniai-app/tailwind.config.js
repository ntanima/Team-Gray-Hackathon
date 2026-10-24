/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: "var(--bg)", surface: "var(--surface)", surface2: "var(--surface-2)",
        ink: "var(--ink)", muted: "var(--muted)", line: "var(--line)",
        accent: "var(--accent)", cyan: "var(--cyan)",
      },
      fontFamily: {
        sans: ["Manrope", "system-ui", "-apple-system", "Segoe UI", "Roboto", "sans-serif"],
        display: ["'Bricolage Grotesque'", "Manrope", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};
