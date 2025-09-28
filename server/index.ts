import express, { type Request, Response, NextFunction } from "express";
import { setupVite, serveStatic, log } from "./vite";

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Early health check - registers before database operations
app.get("/api/health", (req, res) => {
  res.status(200).json({ 
    status: "healthy", 
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || "development",
    server: "running"
  });
});

// Fix for Railway deployment - rewrite trailing slashes without redirecting to preserve POST bodies
app.use((req, res, next) => {
  // Skip for static files
  if (req.url.match(/\.[^.]+$/)) return next();
  
  // Remove trailing slash from API routes in-place (no redirect)
  if (req.url.length > 1 && req.url.endsWith('/') && req.url.startsWith('/api')) {
    req.url = req.url.slice(0, -1);
  }
  next();
});

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
    if (path.startsWith("/api")) {
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

(async () => {
  const { createServer } = await import("http");
  const server = createServer(app);

  // Start server FIRST - this ensures health check is available immediately
  const port = parseInt(process.env.PORT || '5000', 10);
  server.listen(port, "0.0.0.0", () => {
    log(`server listening on port ${port} - health check available`);
  });

  // Now try to register routes (including database operations)
  try {
    const { registerRoutes } = await import("./routes");
    await registerRoutes(app);
    log(`database routes registered successfully`);
  } catch (error) {
    console.error('Failed to register database routes:', error);
    console.error('Server will continue running with health check only');
    
    // Add a fallback route for database errors (all HTTP methods)
    app.all("/api/*", (req, res) => {
      res.status(503).json({ 
        message: "Database service temporarily unavailable",
        error: "Please check database configuration"
      });
    });
  }

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    console.error('Express error:', err);
  });

  // Setup static serving after routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }
})();
