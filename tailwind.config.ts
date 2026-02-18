import { heroui } from "@heroui/theme";
import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
    "./node_modules/@heroui/theme/dist/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-geist-sans)"],
        mono: ["var(--font-geist-mono)"],
      },
      colors: {
        /* SMK Muhammadiyah 1 Surabaya Brand Colors */
        brand: {
          50: '#e8eef8',
          100: '#c5d4ed',
          200: '#9eb7e0',
          300: '#779ad3',
          400: '#5a84c9',
          500: '#1B4F9E',  /* Primary brand blue (badge body) */
          600: '#17448a',
          700: '#123872',
          800: '#0D2C5A',
          900: '#0D1F4C',  /* Dark navy (outer border) */
          950: '#091538',
        },
        gold: {
          50: '#fef9e7',
          100: '#fdf0bf',
          200: '#fbe597',
          300: '#f9d96f',
          400: '#F5C518',  /* Brand gold (sun rays) */
          500: '#d4a80f',
          600: '#b38d0c',
          700: '#8a6d09',
          800: '#614d06',
          900: '#3b2f04',
        },
        cyan: {
          50: '#e0f7fa',
          100: '#b2ebf2',
          200: '#80deea',
          300: '#4dd0e1',
          400: '#26c6da',
          500: '#00B8D4',  /* Brand cyan (inner ring) */
          600: '#00a0b7',
          700: '#008799',
          800: '#006e7c',
          900: '#00555f',
        },
      },
    },
  },
  darkMode: "class",
  plugins: [heroui()],
};

export default config;
