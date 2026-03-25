import "dotenv/config";
import * as Sentry from "@sentry/node";
import express, { type Request, Response, NextFunction } from "express";
import cors from "cors";
import path from "path";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic } from "./vite";
import { TranscriptIngestionModule } from "./services/transcripts";
import { NotificationScheduler } from "./services/notificationScheduler";
import { syncScheduler } from "./services/syncScheduler";
import { complianceScheduler } from "./services/complianceScheduler";
import { agentScheduler } from "./agent-runner/triggers";
import { storage } from "./storage";
import { logger } from "./lib/logger";
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

// Initialise Sentry before everything else so it can capture startup errors
if (process.env.SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV ?? "development",
    tracesSampleRate: parseFloat(process.env.SENTRY_TRACES_SAMPLE_RATE ?? "0.1"),
  });
}

// Validate critical security environment variables on startup (fail-closed)
validateSecurityEnvironment();

const app = express();

// Trust reverse proxy (Nginx, load balancer) so rate limiters and HTTPS
// detection use the real client IP from X-Forwarded-For, not the proxy IP.
// Set to 1 in production (one trusted proxy layer). Disable in dev.
if (process.env.NODE_ENV === "production") {
  app.set("trust proxy", 1);
}

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

// Dev-only: auto-login helper (serves before Vite middleware)
if (process.env.NODE_ENV !== "production") {
  app.use("/autologin.html", express.static(path.join(process.cwd(), "public", "autologin.html")));
}

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

// Request timing middleware — records API latency for /api/control/performance
import { recordApiRequest } from "./services/metricsService";
app.use("/api", (req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();
  res.on("finish", () => {
    const duration = Date.now() - start;
    const prefix = "/" + req.path.split("/").slice(1, 3).join("/"); // e.g. /api/auth
    const isError = res.statusCode >= 500;
    recordApiRequest(prefix, duration, isError);
  });
  next();
});

// General API rate limiting (100 requests per 15 minutes)
// Applied to all /api routes except specific exclusions
app.use("/api", generalRateLimiter);

// Strict rate limiting for authentication endpoints (5 attempts per 15 minutes)
app.use("/api/auth/login", authRateLimiter);
app.use("/api/auth/register", authRateLimiter);

// CSRF token endpoint (must be before CSRF protection)
app.get("/api/csrf-token", getCsrfToken);

// Inbound email webhook (must be before CSRF - uses webhook secret auth)
import inboundEmailRoutes from "./routes/inbound-email";
app.use("/api/inbound-email", inboundEmailRoutes);

// CSRF protection middleware
// Skips login, register, webhooks, and health checks
app.use(conditionalCsrfProtection);

// Request logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  const reqPath = req.path;

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (reqPath.startsWith("/api")) {
      logger.api.debug(`${req.method} ${reqPath}`, {
        status: res.statusCode,
        duration: `${duration}ms`,
      });
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
    logger.notification.info("Notification scheduler started");
  } else {
    logger.notification.info("Notification scheduler disabled (set ENABLE_NOTIFICATIONS=true to enable)");
  }

  // Start daily sync scheduler if enabled
  if (process.env.DAILY_SYNC_ENABLED === "true") {
    const syncTime = process.env.DAILY_SYNC_TIME || "18:00";
    const [hour, minute] = syncTime.split(":");
    const cronExpression = `${minute} ${hour} * * *`;
    syncScheduler.start(cronExpression, true);
    logger.sync.info("Daily sync scheduler started", { syncTime });
  } else {
    logger.sync.info("Daily sync scheduler disabled (set DAILY_SYNC_ENABLED=true to enable)");
  }

  // Start compliance scheduler if enabled
  if (process.env.COMPLIANCE_CHECK_ENABLED === "true") {
    const complianceTime = process.env.COMPLIANCE_CHECK_TIME || "06:00";
    const [hour, minute] = complianceTime.split(":");
    const cronExpression = `${minute} ${hour} * * *`;
    complianceScheduler.start(cronExpression, true);
    logger.compliance.info("Compliance scheduler started", { complianceTime });
  } else {
    logger.compliance.info("Compliance scheduler disabled (set COMPLIANCE_CHECK_ENABLED=true to enable)");
  }

  // Start agent scheduler if enabled
  if (process.env.AGENTS_ENABLED === "true") {
    const coordinatorTime = process.env.AGENT_COORDINATOR_TIME || "09:00";
    const certExpiryTime = process.env.AGENT_CERT_EXPIRY_TIME || "08:00";
    const toHourMin = (t: string) => { const [h, m] = t.split(":"); return `${m} ${h}`; };
    agentScheduler.start(
      `${toHourMin(coordinatorTime)} * * *`,
      `${toHourMin(certExpiryTime)} * * *`,
      true
    );
    logger.ai.info("Agent scheduler started", { coordinatorTime, certExpiryTime });
  } else {
    logger.ai.info("Agent scheduler disabled (set AGENTS_ENABLED=true to enable)");
  }

  await registerRoutes(app);

  // Catch-all for unmatched /api/* routes — return JSON 404 instead of Vite HTML fallback
  app.all('/api/*', (_req, res) => {
    res.status(404).json({ error: 'Not Found', message: 'API endpoint not found' });
  });

  // CSRF error handler (must be after CSRF middleware and routes)
  app.use(csrfErrorHandler);

  // Sentry error capture (must be after routes, before other error handlers)
  if (process.env.SENTRY_DSN) {
    Sentry.setupExpressErrorHandler(app);
  }

  // Global error handler
  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    res.status(status).json({ message });
    if (status >= 500) {
      logger.server.error("Unhandled error", { status }, err);
    }
  });

  const port = parseInt(process.env.PORT || "5000", 10);
  const isDev = app.get("env") === "development";

  if (isDev) {
    const server = app.listen(port, () => {
      logger.server.info(`Server listening on http://localhost:${port}`);
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
      logger.server.info(`Server listening on http://localhost:${port}`);
    });
  }
};

startServer().catch((error) => {
  logger.server.error("Failed to start server", {}, error);
  process.exit(1);
});

let shuttingDown = false;
const gracefulShutdown = async () => {
  if (shuttingDown) return;
  shuttingDown = true;
  logger.server.info("Graceful shutdown initiated");
  try {
    await transcriptModule.stop();
  } catch (err) {
    logger.server.error("Transcript module shutdown error", {}, err);
  }
  try {
    await notificationScheduler.stop();
  } catch (err) {
    logger.notification.error("Notification scheduler shutdown error", {}, err);
  }
  try {
    syncScheduler.stop();
  } catch (err) {
    logger.sync.error("Sync scheduler shutdown error", {}, err);
  }
  try {
    complianceScheduler.stop();
  } catch (err) {
    logger.compliance.error("Compliance scheduler shutdown error", {}, err);
  }
  try {
    agentScheduler.stop();
  } catch (err) {
    logger.ai.error("Agent scheduler shutdown error", {}, err);
  }
  process.exit(0);
};

process.on("SIGINT", gracefulShutdown);
process.on("SIGTERM", gracefulShutdown);
