import express from "express";
import { initializeDatabase } from "../server/db";
import { registerRoutes } from "../server/routes";

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Initialize database and routes
let initialized = false;

async function initializeApp() {
  if (!initialized) {
    try {
      await initializeDatabase();
      await registerRoutes(app);
      initialized = true;
    } catch (error) {
      console.error("Failed to initialize app:", error);
    }
  }
}

export default async function handler(req: any, res: any) {
  await initializeApp();
  return app(req, res);
}
