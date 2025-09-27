import type { VercelRequest, VercelResponse } from '@vercel/node';
import { storage } from '../server/storage';
import { sanitizeUser } from './_utils/auth';
import { z } from 'zod';

const verifyEmailSchema = z.object({
  email: z.string().email(),
  otp: z.string().min(1)
});

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { email, otp } = verifyEmailSchema.parse(req.body);
    
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
    await storage.verifyUser(user.id);

    const verifiedUser = { ...user, isVerified: true };
    res.json({ 
      message: 'Email verified successfully!', 
      user: sanitizeUser(verifiedUser)
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: 'Validation error', errors: error.errors });
    }
    console.error('Email verification error:', error);
    res.status(500).json({ message: 'Failed to verify email' });
  }
}
