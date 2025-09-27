import type { VercelRequest, VercelResponse } from '@vercel/node';
import { clearAuthCookie } from './auth-utils';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    // Clear the auth cookie
    clearAuthCookie(res);
    
    res.status(200).json({ message: 'Logged out successfully' });
  } catch (error) {
    console.error('[logout] error:', error);
    res.status(500).json({ message: 'Logout failed' });
  }
}