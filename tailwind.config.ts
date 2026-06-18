import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}"
  ],
  theme: {
    extend: {
      colors: {
        tiger: {
          red: "#C10016",
          redLight: "#FEF2F2",
          redHover: "#A30013"
        },
        tgx: {
          text: "#3A3A3A",
          muted: "#9C9C9C",
          soft: "#BFBFBF",
          border: "#E8E8E8",
          hover: "#F6F6F6",
          page: "#FAFAFA",
          input: "#F0F0F0",
          search: "#F5F5F5",
          blue: "#2563EB"
        },
        status: {
          good: "#16A34A",
          goodLight: "#F0FDF4",
          okay: "#CA8A04",
          okayLight: "#FEFCE8",
          attention: "#EA580C",
          attentionLight: "#FFF7ED",
          risk: "#DC2626",
          riskLight: "#FEF2F2"
        }
      },
      boxShadow: {
        card: "0 1px 3px rgba(0,0,0,.06)",
        cardHover: "0 4px 14px rgba(0,0,0,.09)",
        sidebar: "1px 1px 8px 0 rgba(191,191,191,0.25)"
      },
      fontFamily: {
        sans: ["Poppins", "Noto Sans Thai", "sans-serif"],
        data: ["Inter", "Poppins", "Noto Sans Thai", "sans-serif"]
      }
    }
  },
  plugins: []
};

export default config;
