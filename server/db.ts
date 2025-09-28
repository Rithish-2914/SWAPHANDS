import { Pool as NeonPool, neonConfig } from "@neondatabase/serverless";
import pkg from "pg";
const { Pool: PgPool } = pkg;
import { drizzle as drizzleNeon } from "drizzle-orm/neon-serverless";
import { drizzle as drizzlePg } from "drizzle-orm/node-postgres";
import * as schema from "../shared/schema";
import ws from 'ws';
import "dotenv/config";

// Get database URL with better error handling
let databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  const isRailway = process.env.RAILWAY_ENVIRONMENT;
  const isReplit = process.env.REPL_ID;
  const isLocalDev = process.env.NODE_ENV === 'development' && !isRailway && !isReplit;
  
  if (isRailway) {
    console.error('❌ Railway deployment detected but DATABASE_URL is missing!');
    console.error('   Go to your Railway project dashboard and add a PostgreSQL database:');
    console.error('   1. Click "New" → "Database" → "Add PostgreSQL"');
    console.error('   2. Railway will automatically set DATABASE_URL environment variable');
    throw new Error("DATABASE_URL must be set in Railway. Please add a PostgreSQL database to your project.");
  } else if (isLocalDev) {
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
    console.log(`🔄 Using default local database URL`);
    console.log('   (Update .env file with your actual database URL)');
  } else {
    console.error("❌ DATABASE_URL must be set. Please check your environment configuration.");
    throw new Error("DATABASE_URL environment variable is required");
  }
}

// Enhanced database URL parsing with validation
const isNeonDatabase = databaseUrl.includes('neon.db') || 
                       databaseUrl.includes('pooler.supabase') ||
                       databaseUrl.includes('aws.neon.tech') ||
                       databaseUrl.includes('neon.tech') ||
                       databaseUrl.includes('neon.com');

const isRailwayPostgres = databaseUrl.includes('railway.app') || 
                         databaseUrl.includes('postgres.railway');

// Create appropriate pool and database connection based on database type
let pool: NeonPool | InstanceType<typeof PgPool>;
let db: ReturnType<typeof drizzleNeon> | ReturnType<typeof drizzlePg>;

// Database connection with retry logic for Railway
async function createDatabaseConnection() {
  const maxRetries = 3;
  let lastError: Error | null = null;
  
  for (let i = 0; i < maxRetries; i++) {
    try {
      if (isNeonDatabase) {
        // Configure WebSocket for Node.js environment (required for Node.js v21 and below)
        neonConfig.webSocketConstructor = ws;
        
        pool = new NeonPool({ 
          connectionString: databaseUrl,
          connectionTimeoutMillis: 10000, // 10 second timeout
          idleTimeoutMillis: 30000, // 30 second idle timeout
          max: 10 // Maximum pool size
        });
        
        // Test the connection
        const client = await pool.connect();
        await client.query('SELECT 1');
        client.release();
        
        db = drizzleNeon(pool, { schema });
        console.log('🗃️  Database: Neon/Serverless connected successfully');
        return;
        
      } else {
        // PostgreSQL (Railway, local, or other)
        pool = new PgPool({ 
          connectionString: databaseUrl,
          connectionTimeoutMillis: 10000,
          idleTimeoutMillis: 30000,
          max: 10,
          ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
        });
        
        // Test the connection
        const client = await pool.connect();
        await client.query('SELECT 1');
        client.release();
        
        db = drizzlePg(pool, { schema });
        
        if (isRailwayPostgres) {
          console.log('🗃️  Database: Railway PostgreSQL connected successfully');
        } else {
          console.log('🗃️  Database: PostgreSQL connected successfully');
        }
        return;
      }
    } catch (error) {
      lastError = error as Error;
      console.error(`❌ Database connection attempt ${i + 1}/${maxRetries} failed:`, error instanceof Error ? error.message : error);
      
      if (i < maxRetries - 1) {
        console.log(`⏳ Retrying in ${(i + 1) * 2} seconds...`);
        await new Promise(resolve => setTimeout(resolve, (i + 1) * 2000));
      }
    }
  }
  
  // All retries failed
  console.error('❌ Failed to connect to database after all retries');
  console.error('   Last error:', lastError?.message);
  
  if (process.env.RAILWAY_ENVIRONMENT) {
    console.error('   Railway troubleshooting:');
    console.error('   1. Check if PostgreSQL service is running in your Railway project');
    console.error('   2. Verify DATABASE_URL environment variable is set');
    console.error('   3. Check Railway service logs for database issues');
    console.error('   4. Try redeploying your Railway services');
  }
  
  throw lastError || new Error('Database connection failed after all retries');
}

// Initialize database connection
try {
  await createDatabaseConnection();
} catch (error) {
  console.error('Failed to initialize database:', error);
  // In Railway, we might want to continue with a mock database for health checks
  if (process.env.RAILWAY_ENVIRONMENT) {
    console.warn('⚠️  Continuing with limited functionality - database unavailable');
    // Create a mock database object to prevent crashes
    db = {
      select: () => ({ from: () => ({ where: () => Promise.resolve([]) }) }),
      insert: () => ({ values: () => ({ returning: () => Promise.resolve([]) }) }),
      update: () => ({ set: () => ({ where: () => ({ returning: () => Promise.resolve([]) }) }) }),
      delete: () => ({ where: () => Promise.resolve({ rowCount: 0 }) })
    } as any;
  } else {
    throw error;
  }
}

// Add connection health check function
export async function checkDatabaseHealth(): Promise<boolean> {
  try {
    if (!pool) return false;
    
    const client = await (pool as any).connect();
    await client.query('SELECT 1');
    client.release();
    return true;
  } catch (error) {
    console.error('Database health check failed:', error);
    return false;
  }
}

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('Shutting down database connections...');
  try {
    await (pool as any)?.end();
    console.log('Database connections closed.');
  } catch (error) {
    console.error('Error closing database connections:', error);
  }
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('Shutting down database connections...');
  try {
    await (pool as any)?.end();
    console.log('Database connections closed.');
  } catch (error) {
    console.error('Error closing database connections:', error);
  }
  process.exit(0);
});

export { pool, db };
