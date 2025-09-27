import { defineConfig } from "drizzle-kit";

// Use default local database URL if DATABASE_URL is not set (for local development)
let databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  const isLocalDev = process.env.NODE_ENV === 'development' && !process.env.REPL_ID;
  
  if (isLocalDev) {
    databaseUrl = 'postgresql://postgres:password@localhost:5432/vit_swaphands';
    console.log('🔄 Using default local database URL for Drizzle operations');
  } else {
    throw new Error("DATABASE_URL must be set. Did you forget to provision a database?");
  }
}

export default defineConfig({
  out: "./migrations",
  schema: "./shared/schema.ts",
  dialect: "postgresql",
  dbCredentials: {
    url: databaseUrl,
  },
  verbose: true,
  strict: false,
});
