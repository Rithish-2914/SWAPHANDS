import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getCurrentUser } from './auth-utils';

// Lazy initialize storage
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
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const user = await getCurrentUser(req);
    if (!user) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    const storage = await getStorage();
    const items = await storage.getUserItems(user.id);
    res.status(200).json(items);
  } catch (error) {
    console.error('[my-items] error:', error);
    res.status(500).json({ message: 'Failed to fetch user items' });
  }
}