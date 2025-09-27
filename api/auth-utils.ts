import { type VercelRequest, type VercelResponse } from '@vercel/node';
import { storage } from '../server/storage';
import { createHmac, timingSafeEqual } from 'crypto';

// Get secret for signing tokens
function getTokenSecret(): string {
  const secret = process.env.SESSION_SECRET;
  if (!secret) {
    throw new Error('SESSION_SECRET environment variable is required for token signing');
  }
  return secret;
}

// Create HMAC-signed token for serverless authentication
export function createAuthToken(userId: string): string {
  const payload = {
    userId,
    timestamp: Date.now(),
  };
  const payloadBase64 = Buffer.from(JSON.stringify(payload)).toString('base64');
  
  // Create HMAC signature
  const secret = getTokenSecret();
  const signature = createHmac('sha256', secret)
    .update(payloadBase64)
    .digest('base64');
  
  // Return token with signature
  return `${payloadBase64}.${signature}`;
}

export function verifyAuthToken(token: string): { userId: string } | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 2) {
      return null;
    }
    
    const [payloadBase64, signature] = parts;
    
    // Verify signature
    const secret = getTokenSecret();
    const expectedSignature = createHmac('sha256', secret)
      .update(payloadBase64)
      .digest('base64');
    
    // Use timing-safe comparison to prevent timing attacks
    if (!timingSafeEqual(Buffer.from(signature, 'base64'), Buffer.from(expectedSignature, 'base64'))) {
      return null;
    }
    
    // Decode and validate payload
    const payload = JSON.parse(Buffer.from(payloadBase64, 'base64').toString());
    
    // Check if token is not too old (7 days)
    const maxAge = 7 * 24 * 60 * 60 * 1000;
    if (Date.now() - payload.timestamp > maxAge) {
      return null;
    }
    
    return { userId: payload.userId };
  } catch {
    return null;
  }
}

export function getAuthToken(req: VercelRequest): string | null {
  // Try to get token from Authorization header or cookie
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }
  
  // Try to get from cookie
  const cookieHeader = req.headers.cookie;
  if (cookieHeader) {
    const cookies = cookieHeader.split(';').reduce((acc: Record<string, string>, cookie) => {
      const [key, value] = cookie.trim().split('=');
      acc[key] = value;
      return acc;
    }, {});
    return cookies['auth-token'] || null;
  }
  
  return null;
}

export async function getCurrentUser(req: VercelRequest) {
  const token = getAuthToken(req);
  if (!token) return null;
  
  const decoded = verifyAuthToken(token);
  if (!decoded) return null;
  
  const user = await storage.getUser(decoded.userId);
  return user;
}

export function setAuthCookie(res: VercelResponse, token: string) {
  res.setHeader('Set-Cookie', [
    `auth-token=${token}; HttpOnly; Path=/; Max-Age=${7 * 24 * 60 * 60}; SameSite=Strict${
      process.env.NODE_ENV === 'production' ? '; Secure' : ''
    }`
  ]);
}

export function clearAuthCookie(res: VercelResponse) {
  res.setHeader('Set-Cookie', [
    'auth-token=; HttpOnly; Path=/; Max-Age=0; SameSite=Strict'
  ]);
}