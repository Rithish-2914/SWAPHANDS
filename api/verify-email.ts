import type { VercelRequest, VercelResponse } from '@vercel/node';
import { sanitizeUser } from './_utils/auth';
import { createAuthToken, setAuthCookie } from './auth-utils';
import { z } from 'zod';

const verifyEmailSchema = z.object({
  email: z.string().email(),
  otp: z.string().min(1)
});

// Lazy initialize storage to handle env var issues gracefully
let storageInstance: any = null;
async function getStorage() {
  if (!storageInstance) {
    if (!process.env.DATABASE_URL) {
      throw new Error('DATABASE_URL environment variable is required');
    }
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
    const { email, otp } = verifyEmailSchema.parse(req.body);
    const storage = await getStorage();
    
    const user = await storage.getUserByEmail(email);
    if (!user) {
      return res.status(400).json({ message: 'Invalid verification code' });
    }

    if (!user.otpCode || !user.otpExpiry) {
      return res.status(400).json({ message: 'No verification code found. Please register again.' });
    }

    if (user.otpCode !== otp || new Date() > user.otpExpiry) {
      return res.status(400).json({ message: 'Invalid or expired verification code' });
    }

    // Verify the user and clear OTP
    const verifiedUser = await storage.verifyUser(user.id);
    
    // Create auth token and set cookie
    const token = createAuthToken(user.id);
    setAuthCookie(res, token);

    res.json({ 
      message: 'Email verified successfully!', 
      user: sanitizeUser(verifiedUser || { ...user, isVerified: true })
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: 'Validation error', errors: error.errors });
    }
    console.error('Email verification error:', error);
    res.status(500).json({ message: 'Failed to verify email' });
  }
}