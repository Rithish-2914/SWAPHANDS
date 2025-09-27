import { Pool as NeonPool, neonConfig } from "@neondatabase/serverless";
import pkg from "pg";
const { Pool: PgPool } = pkg;
import { drizzle as drizzleNeon } from "drizzle-orm/neon-serverless";
import { drizzle as drizzlePg } from "drizzle-orm/node-postgres";
import * as schema from "../shared/schema";
import ws from 'ws';
import "dotenv/config";

// For local development, provide a more helpful error message and fallback
let databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  const isLocalDev = process.env.NODE_ENV === 'development' && !process.env.REPL_ID;
  
  if (isLocalDev) {
    console.log('🔧 Local Development Setup');
    console.log('📍 DATABASE_URL not found. For local development, you have several options:');
    console.log('   1. Use a local PostgreSQL database');
    console.log('   2. Use a free cloud database like Neon, Supabase, or Railway');
    console.log('   3. Use Docker: docker run --name postgres -e POSTGRES_PASSWORD=password -p 5432:5432 -d postgres');
    console.log('');
    console.log('📝 Create a .env file with: DATABASE_URL=postgresql://username:password@localhost:5432/vit_swaphands');
    console.log('');
    
    // Use a default local database URL for development
    databaseUrl = 'postgresql://postgres:password@localhost:5432/vit_swaphands';
    console.log(`🔄 Using default local database URL: ${databaseUrl}`);
    console.log('   (Update .env file with your actual database URL)');
  } else {
    throw new Error("DATABASE_URL must be set. Did you forget to provision a database?");
  }
}

// Determine if we're using Neon (serverless) or local PostgreSQL
// Check the actual DATABASE_URL content to determine the database type
const isNeonDatabase = databaseUrl.includes('neon.db') || 
                       databaseUrl.includes('pooler.supabase') ||
                       databaseUrl.includes('aws.neon.tech') ||
                       databaseUrl.includes('neon.tech') ||
                       databaseUrl.includes('neon.com');

// Create appropriate pool and database connection based on database type
let pool: NeonPool | InstanceType<typeof PgPool>;
let db: ReturnType<typeof drizzleNeon> | ReturnType<typeof drizzlePg>;

if (isNeonDatabase) {
  // Configure WebSocket for Node.js environment (required for Node.js v21 and below)
  neonConfig.webSocketConstructor = ws;
  
  pool = new NeonPool({ 
    connectionString: databaseUrl
  });
  db = drizzleNeon(pool, { schema });
  console.log('🗃️  Database: Neon/Serverless');
} else {
  pool = new PgPool({ connectionString: databaseUrl });
  db = drizzlePg(pool, { schema });
  console.log('🗃️  Database: Local PostgreSQL');
}

export { pool, db };
