/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ["class"],
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
      },
      borderRadius: {
        lg: "0.5rem",
        md: "0.5rem",
        sm: "0.375rem",
      },
      colors: {
        background: "hsl(210 40% 98%)",
        foreground: "hsl(222 47% 11%)",
        primary: { DEFAULT: "hsl(217 91% 60%)", foreground: "#fff" },
        destructive: { DEFAULT: "hsl(0 84% 60%)", foreground: "#fff" },
        success: { DEFAULT: "hsl(142 76% 36%)", foreground: "#fff" },
        warning: { DEFAULT: "hsl(38 92% 50%)", foreground: "#fff" },
        muted: { DEFAULT: "hsl(210 40% 96%)", foreground: "hsl(215 16% 47%)" },
        card: { DEFAULT: "#fff", foreground: "hsl(222 47% 11%)" },
        sidebar: { DEFAULT: "hsl(222 47% 11%)", foreground: "hsl(210 40% 98%)" },
        border: "hsl(214 32% 91%)",
        input: "hsl(214 32% 91%)",
        ring: "hsl(217 91% 60%)",
      },
    },
  },
  plugins: [],
};
