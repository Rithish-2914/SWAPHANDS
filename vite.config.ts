// vite.config.ts

import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { fileURLToPath } from "url";

// Standard way to get __dirname in ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig({
  plugins: [
    react(),
  ],

  // Tells Vite where your website's root is (for the dev server)
  root: path.resolve(__dirname, "client"),

  resolve: {
    // Keeps your custom import aliases
    alias: {
      "@": path.resolve(__dirname, "client", "src"),
      "@shared": path.resolve(__dirname, "shared"),
    },
  },

  build: {
    // Sets the output directory to the 'dist' folder at the project root
    outDir: path.resolve(__dirname, "..", "dist"), 
    emptyOutDir: true,
  },
});
