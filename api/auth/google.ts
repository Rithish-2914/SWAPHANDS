import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    // Check if Google OAuth is configured
    if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
      return res.status(500).json({ message: 'Google OAuth not configured' });
    }

    // Build Google OAuth URL
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const redirectUri = `${req.headers.origin || 'https://swap-hands.vercel.app'}/api/auth/google/callback`;
    
    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: 'profile email',
      access_type: 'offline',
      prompt: 'select_account'
    });

    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
    
    // Redirect to Google OAuth
    res.writeHead(302, { Location: authUrl });
    res.end();
  } catch (error) {
    console.error('[Google OAuth] error:', error);
    res.status(500).json({ message: 'Failed to initiate Google authentication' });
  }
}