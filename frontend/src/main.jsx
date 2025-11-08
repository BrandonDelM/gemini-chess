import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
// Import PostCSS plugins using ESM syntax (import) instead of CommonJS (require)
import tailwindcss from 'tailwindcss';
import autoprefixer from 'autoprefixer';


// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  
  // ADD THIS CSS BLOCK
  css: {
    postcss: {
      plugins: [
        // Load the imported plugins directly
        tailwindcss(),
        autoprefixer(),
      ],
    },
  },
});