import { scrypt, randomBytes, timingSafeEqual } from 'crypto';
import { promisify } from 'util';

const scryptAsync = promisify(scrypt);

// Hash a plaintext password using scrypt.
export async function hashPassword(password: string) {
  const salt = randomBytes(16).toString('hex');
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString('hex')}.${salt}`;
}

// Compare supplied password with stored hash.
export async function comparePasswords(supplied: string, stored: string) {
  try {
    if (!stored || typeof stored !== 'string') return false;
    const parts = stored.split('.');
    if (parts.length !== 2) return false;

    const [hashed, salt] = parts;
    const hashedBuf = Buffer.from(hashed, 'hex');
    const suppliedBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;

    if (hashedBuf.length !== suppliedBuf.length) return false;
    return timingSafeEqual(hashedBuf, suppliedBuf);
  } catch (err) {
    console.error('[comparePasswords] error:', err);
    return false;
  }
}

// Generate OTP for email verification
export function generateOTPWithExpiry() {
  const otp = randomBytes(3).toString('hex').toUpperCase();
  const expiry = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes
  return { otp, expiry };
}

// Helper function to sanitize user data
export function sanitizeUser(user: any) {
  const { password, ...sanitizedUser } = user;
  return sanitizedUser;
}
