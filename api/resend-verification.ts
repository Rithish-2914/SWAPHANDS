import type { VercelRequest, VercelResponse } from '@vercel/node';
import { storage } from '../server/storage';
import { sendVerificationEmail } from '../server/email';
import { generateOTPWithExpiry } from './_utils/auth';
import { z } from 'zod';

const resendVerificationSchema = z.object({
  email: z.string().email()
});

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { email } = resendVerificationSchema.parse(req.body);
    
    const user = await storage.getUserByEmail(email);
    if (!user) {
      return res.status(400).json({ message: 'User not found' });
    }

    if (user.isVerified) {
      return res.status(400).json({ message: 'Email is already verified' });
    }

    // Generate new OTP
    const { otp, expiry } = generateOTPWithExpiry();
    await storage.updateUserOTP(user.id, otp, expiry);

    // Send verification email
    const emailSent = await sendVerificationEmail(email, otp);
    if (!emailSent) {
      return res.status(500).json({ 
        message: 'Failed to send verification email. Email service may be temporarily unavailable. Please try again later or contact support.'
      });
    }

    res.json({ message: 'Verification email sent! Please check your inbox.' });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: 'Validation error', errors: error.errors });
    }
    console.error('Resend verification error:', error);
    res.status(500).json({ message: 'Failed to resend verification email' });
  }
}
