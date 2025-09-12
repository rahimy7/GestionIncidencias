// server/index.ts - ADD COMPRESSION AND CACHING
import express, { type Request, Response, NextFunction } from "express";
import compression from "compression";
import helmet from "helmet";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";


const app = express();

// Add compression middleware
app.use(compression({
  filter: (req, res) => {
    if (req.headers['x-no-compression']) {
      return false;
    }
    return compression.filter(req, res);
  },
}));

// Security headers
app.use(helmet({
  contentSecurityPolicy: false, // Disable for Vite development
}));

// Parse JSON with size limit
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: false, limit: '10mb' }));

// Cache static assets
app.use((req, res, next) => {
  if (req.url.match(/\.(js|css|png|jpg|jpeg|gif|svg|ico|woff|woff2|ttf|eot)$/)) {
    res.setHeader('Cache-Control', 'public, max-age=31536000'); // 1 year
  }
  next();
});

// Add response compression and timing
app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    
    // Add caching headers for API responses
    if (path.startsWith("/api") && req.method === 'GET') {
      if (path.includes('/dashboard/') || path.includes('/centers')) {
        res.setHeader('Cache-Control', 'private, max-age=300'); // 5 minutes
      }
    }
    
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      
      // Only log response body for errors or if very long response time
      if (res.statusCode >= 400 || duration > 1000) {
        if (capturedJsonResponse) {
          logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
        }
      }

      if (logLine.length > 100) {
        logLine = logLine.slice(0, 99) + "…";
      }

      // Color code by performance
      if (duration > 1000) {
        log(`🔴 ${logLine}`); // Red for slow
      } else if (duration > 500) {
        log(`🟡 ${logLine}`); // Yellow for medium
      } else {
        log(`🟢 ${logLine}`); // Green for fast
      }
    }
  });

  next();
});

(async () => {
  const server = await registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    
    log(`❌ Error ${status}: ${message}`);
    res.status(status).json({ message });
  });

  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const port = parseInt(process.env.PORT || "3000", 10);
  const host = "0.0.0.0"; // Keep for deployment compatibility

  server.listen(port, host, () => {
    log(`✅ Server running on http://${host}:${port}`);
    log(`📊 Dashboard: http://172.22.11.5:${port}`);
  });

  // Graceful shutdown
  process.on('SIGTERM', () => {
    log('📤 SIGTERM received, shutting down gracefully');
    server.close(() => {
      log('👋 Server closed');
      process.exit(0);
    });
  });

  server.on("error", (err: any) => {
    if (err.code === "EADDRINUSE") {
      log(`❌ Port ${port} already in use`);
    } else {
      log(`❌ Server error: ${err.message}`);
    }
  });
})();

