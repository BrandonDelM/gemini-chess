/** @type {import('tailwindcss').Config} */
module.exports = {
  // CRITICAL: This 'content' array tells Tailwind where to find your class names.
  content: [
    // Look in the root index file (e.g., index.html)
    "./index.html",
    // Look in all JavaScript/JSX/TSX files within the 'src' directory (most common React setup)
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}