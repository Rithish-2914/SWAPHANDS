import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getCurrentUser } from './auth-utils';
import { z } from 'zod';

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
  try {
    const user = await getCurrentUser(req);
    if (!user) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    const storage = await getStorage();

    if (req.method === 'GET') {
      const wishlist = await storage.getUserWishlist(user.id);
      return res.status(200).json(wishlist);
    }

    if (req.method === 'POST') {
      const { itemId } = z.object({ itemId: z.string() }).parse(req.body);
      await storage.addToWishlist(user.id, itemId);
      return res.status(200).json({ message: 'Added to wishlist' });
    }

    if (req.method === 'DELETE') {
      const { itemId } = req.query;
      if (!itemId || typeof itemId !== 'string') {
        return res.status(400).json({ message: 'Item ID is required' });
      }
      await storage.removeFromWishlist(user.id, itemId);
      return res.status(200).json({ message: 'Removed from wishlist' });
    }

    return res.status(405).json({ message: 'Method not allowed' });
  } catch (error) {
    console.error('[wishlist] error:', error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: 'Validation error', errors: error.errors });
    }
    res.status(500).json({ message: 'Failed to handle wishlist operation' });
  }
}