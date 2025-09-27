import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createAuthToken, setAuthCookie } from '../../auth-utils';
import { sanitizeUser } from '../../_utils/auth';

// Lazy initialize storage
let storageInstance: any = null;
async function getStorage() {
  if (!storageInstance) {
    if (!process.env.DATABASE_URL) {
      throw new Error('DATABASE_URL environment variable is required');
    }
    const { storage } = await import('../../../server/storage');
    storageInstance = storage;
  }
  return storageInstance;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { code, error } = req.query;

    if (error) {
      console.error('[Google OAuth] error:', error);
      return res.redirect('/auth?error=google_auth_failed');
    }

    if (!code || typeof code !== 'string') {
      return res.redirect('/auth?error=no_code');
    }

    // Check if Google OAuth is configured
    if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
      return res.redirect('/auth?error=oauth_not_configured');
    }

    // Exchange code for access token
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    const redirectUri = `${req.headers.origin || 'https://swap-hands.vercel.app'}/api/auth/google/callback`;

    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        code,
        grant_type: 'authorization_code',
        redirect_uri: redirectUri,
      }),
    });

    const tokenData = await tokenResponse.json();

    if (!tokenResponse.ok) {
      console.error('[Google OAuth] token error:', tokenData);
      return res.redirect('/auth?error=token_exchange_failed');
    }

    // Get user profile from Google
    const profileResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: {
        Authorization: `Bearer ${tokenData.access_token}`,
      },
    });

    const profile = await profileResponse.json();

    if (!profileResponse.ok) {
      console.error('[Google OAuth] profile error:', profile);
      return res.redirect('/auth?error=profile_fetch_failed');
    }

    // Validate email
    if (!profile.email) {
      return res.redirect('/auth?error=no_email');
    }

    const storage = await getStorage();

    // Check if user already exists
    let user = await storage.getUserByEmail(profile.email);

    if (user) {
      // Update Google ID if not set
      if (!user.googleId) {
        user = await storage.updateUserGoogleAuth(user.id, {
          googleId: profile.id,
          authProvider: 'google',
          profilePicture: profile.picture,
        });
      }
    } else {
      // Create new user from Google profile
      user = await storage.createUser({
        email: profile.email,
        firstName: profile.given_name || profile.name || 'User',
        lastName: profile.family_name || '',
        googleId: profile.id,
        authProvider: 'google',
        profilePicture: profile.picture,
        isVerified: true, // Google accounts are verified
      });
    }

    // Create authentication token and set cookie
    const token = createAuthToken(user.id);
    setAuthCookie(res, token);

    // Redirect to success page
    res.redirect('/?auth=success');
  } catch (error) {
    console.error('[Google OAuth callback] error:', error);
    res.redirect('/auth?error=callback_failed');
  }
}