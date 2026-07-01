/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      keyframes: {
        "float-down": {
          "0%, 100%": { transform: "translate(-50%, 0)" },
          "50%": { transform: "translate(-50%, 6px)" },
        },
        "swipe-finger": {
          "0%, 100%": { transform: "rotate(-20deg) translateX(0)" },
          "50%": { transform: "rotate(-20deg) translateX(-24px)" },
        },
        "finger-hint-fade": {
          "0%": { opacity: "0" },
          "15%": { opacity: "1" },
          "100%": { opacity: "1" },
        },
      },
      animation: {
        "float-down": "float-down 2s ease-in-out infinite",
        "swipe-finger": "swipe-finger 1.8s ease-in-out infinite",
        "finger-swipe-hint": "finger-hint-fade 0.6s ease-out forwards",
      },
      colors: {
        brand: "#FDD900",
        ink: "#1D1D1B",
      },
      fontFamily: {
        play: ["Play", "sans-serif"],
        mulish: ["Mulish", "sans-serif"],
      },
    },
  },
  plugins: [],
};
