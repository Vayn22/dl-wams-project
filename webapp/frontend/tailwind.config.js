/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,jsx}",
    "./components/**/*.{js,jsx}",
    "./context/**/*.{js,jsx}",
    "./data/**/*.js",
    "./lib/**/*.js",
  ],
  theme: {
    extend: {
      colors: {
        navy: "#1E3A5F",
      },
    },
  },
  plugins: [],
};
