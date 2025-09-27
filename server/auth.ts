// server/setupAuth.ts
import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { Express } from "express";
import session from "express-session";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { storage } from "./storage";
import { User as SelectUser, insertUserSchema } from "@shared/schema";
import { z } from "zod";
import { sendVerificationEmail, sendPasswordResetEmail, generateOTPWithExpiry } from "./email";

declare global {
  namespace Express {
    interface User extends SelectUser {}
  }
}

const scryptAsync = promisify(scrypt);

// Hash a plaintext password using scrypt.
async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

// Compare supplied password with stored hash.
async function comparePasswords(supplied: string, stored: string) {
  try {
    if (!stored || typeof stored !== "string") return false;
    const parts = stored.split(".");
    if (parts.length !== 2) return false;

    const [hashed, salt] = parts;
    const hashedBuf = Buffer.from(hashed, "hex");
    const suppliedBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;

    if (hashedBuf.length !== suppliedBuf.length) return false;
    return timingSafeEqual(hashedBuf, suppliedBuf);
  } catch (err) {
    console.error("[comparePasswords] error:", err);
    return false;
  }
}

// Helper function to sanitize user data
function sanitizeUser(user: SelectUser): Omit<SelectUser, 'password'> {
  const { password, ...sanitizedUser } = user;
  return sanitizedUser;
}

export function setupAuth(app: Express) {
  // Generate a session secret if not provided (for local development)
  let sessionSecret = process.env.SESSION_SECRET;
  if (!sessionSecret) {
    sessionSecret = "dev-secret-key-" + Math.random().toString(36);
    console.warn('⚠️  SESSION_SECRET not set, using generated secret for local development');
    console.log('   Add SESSION_SECRET to your .env file for production');
  }

  const sessionSettings: session.SessionOptions = {
    secret: sessionSecret,
    resave: false,
    saveUninitialized: false,
    store: storage.sessionStore,
    cookie: {
      secure: process.env.NODE_ENV === "production",
      httpOnly: true,
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    },
  };

  app.set("trust proxy", 1);
  app.use(session(sessionSettings));
  app.use(passport.initialize());
  app.use(passport.session());

  // Local strategy
  passport.use(
    new LocalStrategy(
      {
        usernameField: "email",
        passwordField: "password",
      },
      async (
        email: string,
        password: string,
        done: (err: any, user?: Express.User | false) => void
      ) => {
        try {
          console.log("[DEBUG] Login attempt for:", email);

          const user = await storage.getUserByEmail(email);
          console.log("[DEBUG] found user:", !!user);

          if (!user) return done(null, false);
          
          // Check if user is verified
          if (!user.isVerified) {
            return done(null, false); // User needs to verify email first
          }
          
          // Check if user has a password (local auth) and it's not null
          if (!user.password) return done(null, false);

          const ok = await comparePasswords(password, user.password);
          console.log("[DEBUG] comparePasswords result:", ok);

          if (!ok) return done(null, false);

          return done(null, user);
        } catch (error) {
          return done(error as any);
        }
      }
    )
  );

  // Google OAuth strategy
  if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
    passport.use(
      new GoogleStrategy(
        {
          clientID: process.env.GOOGLE_CLIENT_ID,
          clientSecret: process.env.GOOGLE_CLIENT_SECRET,
          callbackURL: "/api/auth/google/callback",
        },
        async (accessToken, refreshToken, profile, done) => {
          try {
            console.log("[DEBUG] Google OAuth profile:", profile.id, profile.emails?.[0]?.value);

            const email = profile.emails?.[0]?.value;
            if (!email) {
              return done(new Error("No email provided by Google"));
            }

            // Check if user already exists
            let user = await storage.getUserByEmail(email);

            if (user) {
              // Update Google ID if not set
              if (!user.googleId) {
                user = await storage.updateUserGoogleAuth(user.id, {
                  googleId: profile.id,
                  authProvider: "google",
                  profilePicture: profile.photos?.[0]?.value,
                });
              }
            } else {
              // Create new user from Google profile
              user = await storage.createUser({
                email,
                firstName: profile.name?.givenName || profile.displayName || "User",
                lastName: profile.name?.familyName || "",
                googleId: profile.id,
                authProvider: "google",
                profilePicture: profile.photos?.[0]?.value,
                isVerified: true, // Google accounts are verified
              });
            }

            return done(null, user);
          } catch (error) {
            return done(error as any);
          }
        }
      )
    );
  }

  // Serialize / deserialize once
  passport.serializeUser(
    (user: Express.User, done: (err: any, id?: string) => void) => {
      done(null, user.id);
    }
  );

  passport.deserializeUser(
    async (id: string, done: (err: any, user?: Express.User | null) => void) => {
      try {
        const user = await storage.getUser(id);
        done(null, user);
      } catch (error) {
        done(error as any);
      }
    }
  );

  // Routes
  app.post("/api/register", async (req, res, next) => {
    try {
      const userData = insertUserSchema.parse(req.body);
      const existingUser = await storage.getUserByEmail(userData.email);
      if (existingUser) {
        return res.status(400).json({ message: "Email already exists" });
      }

      if (!userData.password) {
        return res.status(400).json({ message: "Password is required" });
      }
      
      // Generate OTP for email verification
      const { otp, expiry } = generateOTPWithExpiry();
      
      const hashed = await hashPassword(userData.password);
      let user = await storage.createUser({
        ...userData,
        password: hashed,
        isVerified: false, // User needs to verify email first
      });

      // Update user with OTP details
      user = await storage.updateUserOTP(user.id, otp, expiry) || user;

      console.log("[DEBUG register] created user id:", user.id);

      // Send verification email
      const emailSent = await sendVerificationEmail(userData.email, otp);
      if (!emailSent) {
        console.error('Failed to send verification email - auto-verifying user for development');
        // In case email fails, auto-verify the user to prevent lockout
        await storage.verifyUser(user.id);
        
        // Log the user in immediately
        req.login(user, (err: any) => {
          if (err) {
            console.error('Auto-login error after email failure:', err);
            return res.status(500).json({ message: "Registration failed - unable to send verification email. Please contact support." });
          }
          return res.status(201).json({
            message: "Registration successful! Email verification was skipped due to technical issues.",
            user: sanitizeUser({ ...user, isVerified: true }),
            requiresVerification: false
          });
        });
        return;
      }

      res.status(201).json({ 
        message: "Registration successful! Please check your email for verification code.",
        userId: user.id,
        email: userData.email,
        requiresVerification: true
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res
          .status(400)
          .json({ message: "Validation error", errors: error.errors });
      }
      console.error("[register] unexpected error:", error);
      res.status(500).json({ message: "Registration failed" });
    }
  });

  app.post("/api/login", (req, res, next) => {
    console.log("[DEBUG /api/login] body received:", req.body);

    passport.authenticate(
      "local",
      (err: any, user: Express.User | false, info: any) => {
        if (err) return next(err);
        if (!user) {
          return res.status(401).json({ message: "Invalid email or password" });
        }
        req.login(user, (loginErr: any) => {
          if (loginErr) return next(loginErr);
          res.status(200).json(sanitizeUser(user));
        });
      }
    )(req, res, next);
  });

  app.post("/api/logout", (req, res, next) => {
    req.logout((err: any) => {
      if (err) return next(err);
      res.sendStatus(200);
    });
  });

  app.get("/api/user", (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    res.json(sanitizeUser(req.user!));
  });

  // Google OAuth routes
  app.get("/api/auth/google", 
    passport.authenticate("google", { 
      scope: ["profile", "email"] 
    })
  );

  app.get("/api/auth/google/callback",
    passport.authenticate("google", { 
      failureRedirect: "/auth?error=google_auth_failed" 
    }),
    (req, res) => {
      // Successful authentication, redirect to dashboard
      res.redirect(process.env.NODE_ENV === "production" 
        ? "/?auth=success" 
        : "http://localhost:5000/?auth=success"
      );
    }
  );

  // Email verification endpoint
  app.post("/api/verify-email", async (req, res) => {
    try {
      const { email, otp } = req.body;
      
      if (!email || !otp) {
        return res.status(400).json({ message: "Email and OTP are required" });
      }

      const user = await storage.getUserByEmail(email);
      if (!user) {
        return res.status(400).json({ message: "Invalid verification code" });
      }

      if (!user.otpCode || !user.otpExpiry) {
        return res.status(400).json({ message: "No verification code found. Please register again." });
      }

      if (user.otpCode !== otp || new Date() > user.otpExpiry) {
        return res.status(400).json({ message: "Invalid or expired verification code" });
      }

      // Verify the user and clear OTP
      await storage.verifyUser(user.id);

      // Log the user in automatically after verification
      req.login(user, (err: any) => {
        if (err) {
          console.error('Auto-login error after verification:', err);
          return res.json({ message: "Email verified successfully! Please login." });
        }
        const verifiedUser = { ...user, isVerified: true };
        res.json({ 
          message: "Email verified successfully!", 
          user: sanitizeUser(verifiedUser)
        });
      });
    } catch (error) {
      console.error("Email verification error:", error);
      res.status(500).json({ message: "Failed to verify email" });
    }
  });

  // Resend verification email
  app.post("/api/resend-verification", async (req, res) => {
    try {
      const { email } = req.body;
      
      if (!email) {
        return res.status(400).json({ message: "Email is required" });
      }

      const user = await storage.getUserByEmail(email);
      if (!user) {
        return res.status(400).json({ message: "User not found" });
      }

      if (user.isVerified) {
        return res.status(400).json({ message: "Email is already verified" });
      }

      // Generate new OTP
      const { otp, expiry } = generateOTPWithExpiry();
      await storage.updateUserOTP(user.id, otp, expiry);

      // Send verification email
      const emailSent = await sendVerificationEmail(email, otp);
      if (!emailSent) {
        return res.status(500).json({ 
          message: "Failed to send verification email. Email service may be temporarily unavailable. Please try again later or contact support."
        });
      }

      res.json({ message: "Verification email sent! Please check your inbox." });
    } catch (error) {
      console.error("Resend verification error:", error);
      res.status(500).json({ message: "Failed to resend verification email" });
    }
  });

  // Password reset functionality
  app.post("/api/forgot-password", async (req, res) => {
    try {
      const { email } = req.body;
      
      if (!email) {
        return res.status(400).json({ message: "Email is required" });
      }

      const user = await storage.getUserByEmail(email);
      if (!user) {
        // Don't reveal if email exists or not for security
        return res.json({ message: "If the email exists, you'll receive reset instructions" });
      }

      // Generate OTP for password reset
      const { otp, expiry } = generateOTPWithExpiry();
      await storage.updateUserOTP(user.id, otp, expiry);

      // Send password reset email
      const emailSent = await sendPasswordResetEmail(email, otp);
      if (!emailSent) {
        console.warn('Failed to send password reset email');
        // Don't reveal email service issues for security, but log them
        return res.status(500).json({ 
          message: "Email service is temporarily unavailable. Please try again later or contact support."
        });
      }

      res.json({ message: "If the email exists, you'll receive reset instructions" });
    } catch (error) {
      console.error("Password reset error:", error);
      res.status(500).json({ message: "Failed to process password reset" });
    }
  });

  app.post("/api/reset-password", async (req, res) => {
    try {
      const { email, otp, newPassword } = req.body;

      if (!email || !otp || !newPassword) {
        return res.status(400).json({ message: "Email, OTP, and new password are required" });
      }

      const user = await storage.getUserByEmail(email);
      if (!user || !user.otpCode || !user.otpExpiry) {
        return res.status(400).json({ message: "Invalid or expired OTP" });
      }

      if (user.otpCode !== otp || new Date() > user.otpExpiry) {
        return res.status(400).json({ message: "Invalid or expired OTP" });
      }

      const hashedPassword = await hashPassword(newPassword);
      await storage.updateUserPassword(user.id, hashedPassword);

      // Clear OTP after successful reset
      await storage.clearUserOTP(user.id);

      res.json({ message: "Password reset successful" });
    } catch (error) {
      console.error("Password reset error:", error);
      res.status(500).json({ message: "Failed to reset password" });
    }
  });

  // Admin login endpoint (separate from regular login)
  app.post("/api/admin/login", (req, res, next) => {
    console.log("[DEBUG /api/admin/login] body received:", req.body);

    passport.authenticate(
      "local",
      (err: any, user: Express.User | false, info: any) => {
        if (err) return next(err);
        if (!user) {
          return res.status(401).json({ message: "Invalid admin credentials" });
        }
        
        // Check if user is an admin
        if (user.role !== 'admin') {
          return res.status(403).json({ message: "Admin access required" });
        }

        req.login(user, (loginErr: any) => {
          if (loginErr) return next(loginErr);
          res.status(200).json(sanitizeUser(user));
        });
      }
    )(req, res, next);
  });

  // Check auth providers availability
  app.get("/api/auth/providers", (req, res) => {
    res.json({
      google: !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET)
    });
  });
}

