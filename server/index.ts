import express, { type Request, Response, NextFunction } from "express";
import helmet from "helmet";
import cors from "cors";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { sanitiseLogData, securityHeaders, createErrorResponse } from "./security";
import { VERSION, BUILD_INFO } from "@shared/version";
import { initializeGlobalSocketMode } from "./services/socketModeService";
import { runDockerDiagnostics } from "./utils/dockerDiagnostics";
import { waitForDatabaseReady } from "./utils/dbHealthCheck";

const app = express();

// Run diagnostics in Docker environment
if (process.env.NODE_ENV === 'production' || process.env.DOCKER_ENV) {
  runDockerDiagnostics().catch(console.error);
}

// Trust proxy configuration for rate limiting
// In development, we don't need to trust proxy
app.set('trust proxy', process.env.NODE_ENV === 'production');

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https:"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"], // unsafe-eval needed for Vite in dev
      connectSrc: ["'self'", "ws:", "wss:", "https:"],
    },
  },
  crossOriginEmbedderPolicy: false, // Needed for Vite HMR
}));

// CORS configuration with proper origin validation
const allowedOrigins = process.env.NODE_ENV === 'production' 
  ? [
      process.env.FRONTEND_URL,
    ].filter(Boolean) as string[]
  : true;

app.use(cors({
  origin: allowedOrigins,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'X-Request-ID'],
}));

app.use(securityHeaders);


app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: false, limit: '10mb' }));

// Request ID tracking middleware
app.use((req, res, next) => {
  const requestId = req.headers['x-request-id'] || `req_${Date.now()}_${Math.random().toString(36).substring(2)}`;
  req.requestId = requestId as string;
  res.setHeader('X-Request-ID', requestId);
  next();
});

// Request logging middleware
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
        // Sanitise response data before logging
        const sanitisedResponse = sanitiseLogData(capturedJsonResponse);
        logLine += ` :: ${JSON.stringify(sanitisedResponse)}`;
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
  const server = await registerRoutes(app);

  app.use((err: any, req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    
    // Log error securely
    console.error('[ERROR]', {
      timestamp: new Date().toISOString(),
      path: req.path,
      method: req.method,
      ip: req.ip,
      status,
      error: process.env.NODE_ENV === 'development' ? err.stack : err.message
    });

    // Return sanitised error response
    const errorResponse = createErrorResponse(err, "Internal Server Error");
    res.status(status).json(errorResponse);
    
    // Don't throw in production
    if (process.env.NODE_ENV === 'development') {
      throw err;
    }
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Other ports are firewalled. Default to 5000 if not specified.
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = parseInt(process.env.PORT || '5000', 10);
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true,
  }, async () => {
    log(`AABot v${VERSION} serving on port ${port}`);
    console.log(`[STARTUP] ${BUILD_INFO.name} v${BUILD_INFO.version} - ${BUILD_INFO.description}`);
    
    // In production (Docker), wait for database to be ready
    if (process.env.NODE_ENV === 'production') {
      console.log('[STARTUP] Waiting for database connection...');
      const dbReady = await waitForDatabaseReady();
      if (!dbReady) {
        console.error('[STARTUP] Database connection failed, but continuing with startup...');
      }
    }
    
    // Initialize Socket Mode for Slack integration
    initializeGlobalSocketMode();
  });
})();
