import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getCurrentUser } from './auth-utils';
import { sanitizeUser } from './_utils/auth';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const user = await getCurrentUser(req);
    if (!user) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    res.status(200).json(sanitizeUser(user));
  } catch (error) {
    console.error('[user] error:', error);
    res.status(500).json({ message: 'Failed to get user data' });
  }
}