/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Midnight luxury palette
        midnight: {
          950: "#000000",
          900: "#0B0C10",
          800: "#101218",
          700: "#161821",
          600: "#1E2030",
          500: "#2A2D40",
        },
        gold: {
          50:  "#FBF6E5",
          100: "#F4E9C0",
          200: "#E8D27A",
          300: "#D4AF37", // primary
          400: "#C49A2A",
          500: "#AA771C", // primary dark
          600: "#8A5E13",
          700: "#6B470D",
        },
      },
      fontFamily: {
        sans: ["Inter", "Roboto", "system-ui", "sans-serif"],
        amharic: ['"Noto Sans Ethiopic"', '"Nyala"', "Roboto", "sans-serif"],
      },
      backgroundImage: {
        "gold-gradient":
          "linear-gradient(135deg, #D4AF37 0%, #F4E9C0 50%, #AA771C 100%)",
        "gold-gradient-soft":
          "linear-gradient(135deg, rgba(212,175,55,0.15) 0%, rgba(170,119,28,0.05) 100%)",
        "midnight-gradient":
          "radial-gradient(ellipse at top, #101218 0%, #000000 70%)",
      },
      boxShadow: {
        gold: "0 8px 32px rgba(212, 175, 55, 0.25)",
        "gold-glow": "0 0 24px rgba(212, 175, 55, 0.35)",
        luxury: "0 24px 60px rgba(0, 0, 0, 0.6)",
      },
      animation: {
        "fade-in": "fadeIn 0.4s ease-out",
        "slide-up": "slideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1)",
        "shimmer": "shimmer 2.4s linear infinite",
        "pulse-gold": "pulseGold 2.4s ease-in-out infinite",
      },
      keyframes: {
        fadeIn: { "0%": { opacity: "0" }, "100%": { opacity: "1" } },
        slideUp: {
          "0%": { transform: "translateY(20px)", opacity: "0" },
          "100%": { transform: "translateY(0)", opacity: "1" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
        pulseGold: {
          "0%, 100%": { boxShadow: "0 0 0 0 rgba(212, 175, 55, 0.4)" },
          "50%": { boxShadow: "0 0 0 12px rgba(212, 175, 55, 0)" },
        },
      },
    },
  },
  plugins: [],
};
