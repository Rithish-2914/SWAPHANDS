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

  // Tells Vite where the entry point (index.html) is located.
  root: path.resolve(__dirname, "client"), 

  resolve: {
    // Keeps your custom import aliases
    alias: {
      "@": path.resolve(__dirname, "client", "src"),
      "@shared": path.resolve(__dirname, "shared"),
      "@assets": path.resolve(__dirname, "attached_assets"),
    },
  },

  build: {
    // Sets the output directory to the standard 'dist' folder 
    // at the repository root.
    outDir: path.resolve(__dirname, "dist"), 
    emptyOutDir: true,
  },

  // Standard server options
  server: {
    fs: {
      strict: true,
      deny: ["**/.*"],
    },
  },
});
