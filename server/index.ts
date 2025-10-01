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


app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
  } else {
    next();
  }
});

// Cache static assets
app.use((req, res, next) => {
  if (req.url.match(/\.(js|css|png|jpg|jpeg|gif|svg|ico|woff|woff2|ttf|eot)$/)) {
    res.setHeader('Cache-Control', 'public, max-age=31536000'); // 1 year
  }
  next();
});

// Add response compression and timing


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

