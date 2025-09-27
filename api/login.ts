import type { VercelRequest, VercelResponse } from '@vercel/node';
import { comparePasswords, sanitizeUser } from './_utils/auth';
import { z } from 'zod';

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1)
});

// Lazy initialize storage to handle env var issues gracefully
let storageInstance: any = null;
async function getStorage() {
  if (!storageInstance) {
    // Check required environment variables
    if (!process.env.DATABASE_URL) {
      throw new Error('DATABASE_URL environment variable is required');
    }
    
    // Dynamically import storage after env var check
    const { storage } = await import('../server/storage');
    storageInstance = storage;
  }
  return storageInstance;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    // Environment validation
    if (!process.env.DATABASE_URL) {
      return res.status(500).json({ 
        message: 'Server configuration error: DATABASE_URL not set' 
      });
    }

    const storage = await getStorage();
    const { email, password } = loginSchema.parse(req.body);
    
    console.log('[DEBUG] Login attempt for:', email);

    const user = await storage.getUserByEmail(email);
    console.log('[DEBUG] found user:', !!user);

    if (!user) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }
    
    // Check if user is verified
    if (!user.isVerified) {
      return res.status(401).json({ message: 'Please verify your email before logging in' });
    }
    
    // Check if user has a password (local auth) and it's not null
    if (!user.password) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    const ok = await comparePasswords(password, user.password);
    console.log('[DEBUG] comparePasswords result:', ok);

    if (!ok) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    // For serverless, we'll return the user data and let the client handle session
    // In a real implementation, you might want to use JWT tokens instead of sessions
    res.status(200).json(sanitizeUser(user));
  } catch (error) {
    console.error('[login] unexpected error:', error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: 'Validation error', errors: error.errors });
    }
    // Ensure we always return JSON, never HTML
    return res.status(500).json({ 
      message: 'Login failed',
      error: process.env.NODE_ENV === 'development' ? (error instanceof Error ? error.message : String(error)) : undefined
    });
  }
}
