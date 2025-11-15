import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "#0C0A16",
        primary: "#1E90FF",
        "node-question": {
          border: "#8C31AA",
          bg: "#51244d",
          hover: "rgb(165, 165, 255)",
        },
        "node-start": {
          border: "#36238b",
          bg: "#1d1067",
        },
        "node-good": {
          border: "#31FF5E",
          bg: "#0a3313",
          hover: "#22b241",
        },
        "node-ambivalent": {
          border: "#FFDE31",
          bg: "#332c0a",
          hover: "#b29b21",
        },
        "node-existential": {
          border: "#FF3131",
          bg: "#330a0a",
          hover: "#b22222",
        },
        "node-selected": "#FF8B38",
      },
      borderRadius: {
        s: "8px",
        m: "12px",
        l: "16px",
      },
    },
  },
  plugins: [],
};
export default config;
