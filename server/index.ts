import express, { type Request, Response, NextFunction } from "express";
import { setupVite, serveStatic, log } from "./vite";
import { initializeDatabase } from "./db";

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Global error handler to prevent crashes
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  // Don't exit process in Railway - log and continue
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  // Don't exit process in Railway - log and continue
});

// Early health check - MUST be first and lightweight
app.get("/api/health", (req, res) => {
  res.status(200).json({ 
    status: "healthy", 
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || "development",
    server: "running",
    port: process.env.PORT || '5000'
  });
});

// Basic ping endpoint for Railway health checks
app.get("/ping", (req, res) => {
  res.status(200).send("pong");
});

// Simple root health check - only for production
// In development, Vite middleware handles the root route
if (process.env.NODE_ENV === "production") {
  app.get("/", (req, res) => {
    res.status(200).json({ message: "VIT SwapHands API Server Running" });
  });
}

// Force HTTPS in production (Railway fix for 405 errors)
if (process.env.NODE_ENV === "production") {
  app.use((req, res, next) => {
    // Skip health checks
    if (req.path === '/api/health' || req.path === '/ping') {
      return next();
    }
    
    // Check if request is HTTP instead of HTTPS
    const proto = req.header('x-forwarded-proto') || req.protocol;
    if (proto !== 'https') {
      // Redirect to HTTPS version
      return res.redirect(301, `https://${req.get('host')}${req.originalUrl}`);
    }
    
    next();
  });
}

// Fix for Railway deployment - rewrite trailing slashes without redirecting
app.use((req, res, next) => {
  // Skip for static files and health checks
  if (req.url.match(/\.[^.]+$/) || req.url === '/api/health' || req.url === '/ping') {
    return next();
  }
  
  // Remove trailing slash from API routes in-place (no redirect)
  if (req.url.length > 1 && req.url.endsWith('/') && req.url.startsWith('/api')) {
    req.url = req.url.slice(0, -1);
  }
  next();
});

// Enhanced request logging
app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api") || path === "/ping") {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

// Global error handling middleware for JSON responses
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  console.error('Express error:', err);
  
  // Always return JSON for API routes
  if (req.path.startsWith('/api')) {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    
    return res.status(status).json({ 
      message,
      error: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
  }
  
  next(err);
});

(async () => {
  const { createServer } = await import("http");
  const server = createServer(app);

  // Start server FIRST - this ensures health check is available immediately
  const port = parseInt(process.env.PORT || '5000', 10);
  
  server.listen(port, "0.0.0.0", () => {
    log(`Server listening on port ${port}`);
    log(`Health check available at http://localhost:${port}/api/health`);
    log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  });

  // Add server error handling
  server.on('error', (error: any) => {
    console.error('Server error:', error);
    if (error.code === 'EADDRINUSE') {
      console.error(`Port ${port} is already in use`);
    }
  });

  // Initialize database first
  try {
    await initializeDatabase();
    log('Database initialized successfully');
  } catch (error) {
    console.error('Failed to initialize database:', error);
    console.warn('Continuing with limited functionality...');
  }

  // Now try to register routes (including database operations) with timeout
  const routeRegistrationPromise = new Promise(async (resolve, reject) => {
    try {
      const { registerRoutes } = await import("./routes");
      await registerRoutes(app);
      log(`Database routes registered successfully`);
      resolve(true);
    } catch (error) {
      console.error('Failed to register database routes:', error);
      reject(error);
    }
  });

  // Set timeout for route registration (Railway might have timeouts)
  const timeoutPromise = new Promise((_, reject) => {
    setTimeout(() => reject(new Error('Route registration timeout')), 30000); // 30 seconds
  });

  try {
    await Promise.race([routeRegistrationPromise, timeoutPromise]);
  } catch (error) {
    console.error('Route registration failed or timed out:', error);
    console.error('Server will continue running with basic endpoints only');
    
    // Add fallback routes for database errors
    app.all("/api/auth/*", (req, res) => {
      res.status(503).json({ 
        message: "Authentication service temporarily unavailable",
        error: "Database connection failed during startup"
      });
    });

    app.all("/api/*", (req, res) => {
      // Skip already defined routes
      if (req.path === '/api/health') return;
      
      res.status(503).json({ 
        message: "Database service temporarily unavailable",
        error: "Please check database configuration and try again"
      });
    });
  }

  // Setup static serving after routes with error handling
  try {
    if (app.get("env") === "development") {
      await setupVite(app, server);
    } else {
      serveStatic(app);
    }
  } catch (staticError) {
    console.error('Static file serving setup failed:', staticError);
    // Add fallback for static routes in production
    if (process.env.NODE_ENV === "production") {
      app.get("*", (req, res) => {
        if (!req.path.startsWith('/api') && !req.path.startsWith('/uploads')) {
          res.status(200).json({ 
            message: "VIT SwapHands Frontend - Static files not available",
            api: "API endpoints are available at /api/*"
          });
        }
      });
    }
  }

  // Final catch-all error handler
  app.use((err: any, req: Request, res: Response, next: NextFunction) => {
    console.error('Final error handler:', err);
    
    if (req.path.startsWith('/api')) {
      const status = err.status || err.statusCode || 500;
      const message = err.message || "Internal Server Error";
      
      res.status(status).json({ message });
    } else {
      res.status(500).send('Internal Server Error');
    }
  });

  // Log successful startup
  log('Server initialization complete');
})().catch((error) => {
  console.error('Failed to start server:', error);
  // Don't exit in Railway - log and keep basic server running
  console.error('Server startup failed but health check should still be available');
});
