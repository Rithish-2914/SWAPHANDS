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
    const storage = await getStorage();
    const { category, search, condition, location } = req.query;

    let filters: any = {};
    if (category && typeof category === 'string') filters.category = category;
    if (search && typeof search === 'string') filters.search = search;
    if (condition && typeof condition === 'string') filters.condition = condition;
    if (location && typeof location === 'string') filters.location = location;

    const items = await storage.getItems(filters);
    res.status(200).json(items);
  } catch (error) {
    console.error('[items] error:', error);
    res.status(500).json({ message: 'Failed to fetch items' });
  }
}