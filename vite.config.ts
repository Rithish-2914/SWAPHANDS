// vite.config.js

import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { fileURLToPath } from "url";

// Standard way to get __dirname in ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig({
  // *** CRITICAL FIX FOR DEPLOYMENT (White Screen Issue) ***
  // Use './' (relative path) so the deployed index.html links to assets
  // correctly relative to its own location, resolving the "/src/main.tsx" error.
  base: './', 

  plugins: [
    react(),
    // NOTE: Removed Replit-specific plugins (@replit/vite-plugin-...)
    // as they are not needed and can cause issues on Railway.
  ],

  // Tells Vite where the entry point (index.html) is located.
  // We keep this because your setup is non-standard (code is in 'client').
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
    // at the repository root. This is where most servers expect static files.
    // NOTE: This assumes your server or Railway is configured to look in 'dist'.
    outDir: path.resolve(__dirname, "dist"), 
    emptyOutDir: true,
  },

  // Standard server options can usually be omitted or simplified for deployment
  server: {
    fs: {
      strict: true,
      deny: ["**/.*"],
    },
  },
});
