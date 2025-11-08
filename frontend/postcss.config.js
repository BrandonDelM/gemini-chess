import tailwindcss from 'tailwindcss';
import autoprefixer from 'autoprefixer';

/** @type {import('postcss-load-config').Config} */
export default {
  plugins: [
    // Use the imported plugin variables here
    tailwindcss,
    autoprefixer,
  ],
};