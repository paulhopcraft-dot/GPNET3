import "dotenv/config";
import express, { type Request, Response, NextFunction } from "express";
import cors from "cors";
import path from "path";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { TranscriptIngestionModule } from "./services/transcripts";
import { NotificationScheduler } from "./services/notificationScheduler";
import { storage } from "./storage";
import {
  validateSecurityEnvironment,
  helmetConfig,
  cookieParserMiddleware,
  generalRateLimiter,
  authRateLimiter,
  conditionalCsrfProtection,
  csrfErrorHandler,
  getCsrfToken,
} from "./middleware/security";

// Validate critical security environment variables on startup (fail-closed)
validateSecurityEnvironment();

const app = express();

// Security headers (helmet) - should be first
app.use(helmetConfig);

// CORS configuration
app.use(
  cors({
    origin: process.env.CLIENT_URL || "http://localhost:5173",
    credentials: true, // Allow cookies for CSRF protection
  })
);

// Serve uploaded files (logos, etc.)
app.use("/uploads", express.static(path.join(process.cwd(), "public", "uploads")));

declare module "http" {
  interface IncomingMessage {
    rawBody: unknown;
  }
}

// Body parsers
app.use(
  express.json({
    verify: (req, _res, buf) => {
      req.rawBody = buf;
    },
  })
);
app.use(express.urlencoded({ extended: false }));

// Cookie parser (required for CSRF protection)
app.use(cookieParserMiddleware);

// General API rate limiting (100 requests per 15 minutes)
// Applied to all /api routes except specific exclusions
app.use("/api", generalRateLimiter);

// Strict rate limiting for authentication endpoints (5 attempts per 15 minutes)
app.use("/api/auth/login", authRateLimiter);
app.use("/api/auth/register", authRateLimiter);

// CSRF token endpoint (must be before CSRF protection)
app.get("/api/csrf-token", getCsrfToken);

// CSRF protection middleware
// Skips login, register, webhooks, and health checks
app.use(conditionalCsrfProtection);

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
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }
      if (logLine.length > 80) logLine = logLine.slice(0, 79) + "…";
      log(logLine);
    }
  });

  next();
});

const transcriptModule = new TranscriptIngestionModule();

// Create notification scheduler (controlled by ENABLE_NOTIFICATIONS env var)
export const notificationScheduler = new NotificationScheduler(storage);

const startServer = async () => {
  await transcriptModule.start();

  // Start notification scheduler if enabled
  if (process.env.ENABLE_NOTIFICATIONS === "true") {
    await notificationScheduler.start();
    console.log("[Notifications] Notification scheduler started");
  } else {
    console.log("[Notifications] Notification scheduler disabled (set ENABLE_NOTIFICATIONS=true to enable)");
  }

  await registerRoutes(app);

  // CSRF error handler (must be after CSRF middleware and routes)
  app.use(csrfErrorHandler);

  // Global error handler
  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    res.status(status).json({ message });
    throw err;
  });

  const port = parseInt(process.env.PORT || "5000", 10);
  const isDev = app.get("env") === "development";

  if (isDev) {
    const server = app.listen(port, () => {
      console.log(`Server listening on http://localhost:${port}`);
    });

    try {
      await setupVite(app, server);
    } catch (error) {
      server.close();
      throw error;
    }
  } else {
    serveStatic(app);
    app.listen(port, () => {
      console.log(`Server listening on http://localhost:${port}`);
    });
  }
};

startServer().catch((error) => {
  console.error("Failed to start server:", error);
  process.exit(1);
});

let shuttingDown = false;
const gracefulShutdown = async () => {
  if (shuttingDown) return;
  shuttingDown = true;
  try {
    await transcriptModule.stop();
  } catch (err) {
    console.error("Transcript module shutdown error", err);
  }
  try {
    await notificationScheduler.stop();
  } catch (err) {
    console.error("Notification scheduler shutdown error", err);
  }
  process.exit(0);
};

process.on("SIGINT", gracefulShutdown);
process.on("SIGTERM", gracefulShutdown);
