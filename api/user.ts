import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  // For now, return 401 since we don't have session handling in serverless
  // In a real implementation, you would check JWT tokens or other auth mechanisms
  res.status(401).json({ message: 'Authentication required' });
}
