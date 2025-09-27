import type { VercelRequest, VercelResponse } from '@vercel/node';
import { insertUserSchema } from '../shared/schema';
import { sendVerificationEmail } from '../server/email';
import { hashPassword, generateOTPWithExpiry, sanitizeUser } from './_utils/auth';
import { createAuthToken, setAuthCookie } from './auth-utils';
import { z } from 'zod';

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
    const userData = insertUserSchema.parse(req.body);
    const existingUser = await storage.getUserByEmail(userData.email);
    if (existingUser) {
      return res.status(400).json({ message: 'Email already exists' });
    }

    if (!userData.password) {
      return res.status(400).json({ message: 'Password is required' });
    }
    
    // Generate OTP for email verification
    const { otp, expiry } = generateOTPWithExpiry();
    
    const hashed = await hashPassword(userData.password);
    let user = await storage.createUser({
      ...userData,
      password: hashed,
      isVerified: false, // User needs to verify email first
    });

    // Update user with OTP details
    user = await storage.updateUserOTP(user.id, otp, expiry) || user;

    console.log('[DEBUG register] created user id:', user.id);

    // Send verification email
    const emailSent = await sendVerificationEmail(userData.email, otp);
    if (!emailSent) {
      console.error('Failed to send verification email - auto-verifying user for development');
      // In case email fails, auto-verify the user to prevent lockout
      const verifiedUser = await storage.verifyUser(user.id);
      
      // Create auth token and set cookie for auto-verified user
      const token = createAuthToken(user.id);
      setAuthCookie(res, token);
      
      return res.status(201).json({
        message: 'Registration successful! Email verification was skipped due to technical issues.',
        user: sanitizeUser(verifiedUser || { ...user, isVerified: true }),
        requiresVerification: false
      });
    }

    res.status(201).json({ 
      message: 'Registration successful! Please check your email for verification code.',
      userId: user.id,
      email: userData.email,
      requiresVerification: true
    });
  } catch (error) {
    console.error('[register] unexpected error:', error);
    if (error instanceof z.ZodError) {
      return res
        .status(400)
        .json({ message: 'Validation error', errors: error.errors });
    }
    // Ensure we always return JSON, never HTML
    return res.status(500).json({ 
      message: 'Registration failed',
      error: process.env.NODE_ENV === 'development' ? (error instanceof Error ? error.message : String(error)) : undefined
    });
  }
}