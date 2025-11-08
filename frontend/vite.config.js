import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
// Removed: import tailwindcss from 'tailwindcss';
// Removed: import autoprefixer from 'autoprefixer';


// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  
  // ADD THIS CSS BLOCK
  css: {
    postcss: {
      plugins: [
        // Using string names here forces Vite to resolve the CommonJS
        // packages internally, bypassing the 'Dynamic require' error.
        'tailwindcss',
        'autoprefixer',
      ],
    },
  },
});