import { Request, Response, NextFunction } from "express";
import rateLimit from "express-rate-limit";
import helmet from "helmet";
import { doubleCsrf } from "csrf-csrf";
import cookieParser from "cookie-parser";
import { logger } from "../lib/logger";

/**
 * Rate Limiting Configuration
 */

// General API rate limiter: TEMPORARILY DISABLED
export const generalRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100000, // TEMP HIGH - set back to 10000 after debugging
  message: {
    error: "Too Many Requests",
    message: "Too many requests from this IP, please try again later.",
    retryAfter: "15 minutes",
  },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  // Skip rate limiting for certain IPs (e.g., internal health checks)
  skip: (req) => {
    // Skip rate limiting for health check endpoints
    return req.path === "/api/health" || req.path === "/health";
  },
});

// Strict authentication rate limiter: 5 attempts per 15 minutes
export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 requests per windowMs
  message: {
    error: "Too Many Requests",
    message: "Too many authentication attempts from this IP. Please try again later.",
    retryAfter: "15 minutes",
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true, // Don't count successful requests against the limit
});

// Webhook rate limiter (already defined in webhookSecurity.ts, but exported here for consistency)
export const webhookRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 60, // Max 60 requests per minute per IP
  message: {
    error: "Too Many Requests",
    message: "Webhook rate limit exceeded. Maximum 60 requests per minute.",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// AI operations rate limiter: 3 requests per hour (expensive Claude API calls)
export const aiRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // Limit each IP to 3 AI operations per hour
  message: {
    error: "Too Many Requests",
    message: "AI generation rate limit exceeded. You can generate up to 3 treatment plans per hour. Please try again later.",
    retryAfter: "1 hour",
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipFailedRequests: false, // Count all attempts (prevent retry spam)
});

/**
 * CSRF Protection Configuration
 */

// Validate SESSION_SECRET is set (fail-closed approach)
if (!process.env.SESSION_SECRET) {
  throw new Error("SESSION_SECRET environment variable must be set");
}

const CSRF_SECRET = process.env.CSRF_SECRET || process.env.SESSION_SECRET;

// Initialize CSRF protection
const {
  invalidCsrfTokenError,
  generateCsrfToken,
  doubleCsrfProtection,
} = doubleCsrf({
  getSecret: () => CSRF_SECRET,
  getSessionIdentifier: (req) => req.ip || "unknown", // For stateless JWT auth, use IP as session ID
  cookieName: "x-csrf-token",
  cookieOptions: {
    sameSite: "strict",
    path: "/",
    secure: process.env.NODE_ENV === "production", // HTTPS only in production
    httpOnly: true,
  },
  size: 64, // Token size in bytes
  ignoredMethods: ["GET", "HEAD", "OPTIONS"], // Safe methods don't need CSRF
  getCsrfTokenFromRequest: (req: Request) => {
    // Check header first (preferred for API)
    return req.headers["x-csrf-token"] as string;
  },
});

/**
 * Middleware to attach CSRF token to response
 * Use this before routes that need CSRF protection
 */
export const csrfProtection = doubleCsrfProtection;

/**
 * Endpoint to get CSRF token (for frontend to call before making mutations)
 * GET /api/csrf-token
 */
export function getCsrfToken(req: Request, res: Response) {
  const token = generateCsrfToken(req, res);
  res.json({
    success: true,
    data: {
      csrfToken: token,
    },
  });
}

/**
 * CSRF error handler
 * Must be registered after CSRF middleware
 */
export function csrfErrorHandler(
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
) {
  if (err === invalidCsrfTokenError) {
    return res.status(403).json({
      error: "Forbidden",
      message: "Invalid or missing CSRF token",
    });
  }
  next(err);
}

/**
 * Paths that should skip CSRF protection
 * - Login/register endpoints (they're the first point of contact)
 * - Webhook endpoints (use password authentication instead)
 * - Health check endpoints
 */
export function shouldSkipCsrf(path: string): boolean {
  const skipPaths = [
    "/api/auth/login",
    "/api/auth/register",
    "/api/auth/refresh", // Uses httpOnly refresh token as auth
    "/api/auth/forgot-password", // Public endpoint, no auth
    "/api/auth/reset-password", // Uses token from email as auth
    "/api/webhooks/",
    "/api/inbound-email",
    "/api/health",
    "/health",
    "/api/csrf-token", // CSRF token endpoint itself
    "/api/gpnet2/cases", // Dashboard data endpoint
    "/api/public/", // Magic-link questionnaire — no auth, no CSRF
  ];

  return skipPaths.some((skipPath) => path.startsWith(skipPath));
}

/**
 * Conditional CSRF middleware
 * Skips CSRF for certain paths
 */
export function conditionalCsrfProtection(
  req: Request,
  res: Response,
  next: NextFunction
) {
  if (shouldSkipCsrf(req.path)) {
    return next();
  }

  return csrfProtection(req, res, next);
}

/**
 * Security Headers Configuration using Helmet
 */
export const helmetConfig = helmet({
  // Content Security Policy
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: [
        "'self'",
        "'unsafe-inline'", // Required for Vite dev server
        "'unsafe-eval'", // Required for Vite dev server in development
      ],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com", "data:"],
      imgSrc: ["'self'", "data:", "https:", "blob:"],
      connectSrc: [
        "'self'",
        process.env.NODE_ENV === "development" ? "ws://localhost:*" : "",
        process.env.NODE_ENV === "development" ? "http://localhost:*" : "",
      ].filter(Boolean),
      frameSrc: ["'none'"],
      objectSrc: ["'none'"],
      upgradeInsecureRequests:
        process.env.NODE_ENV === "production" ? [] : null,
    },
  },

  // HTTP Strict Transport Security (HSTS)
  // Force HTTPS for 1 year
  strictTransportSecurity: {
    maxAge: 31536000, // 1 year in seconds
    includeSubDomains: true,
    preload: true,
  },

  // Prevent MIME type sniffing
  noSniff: true,

  // Prevent clickjacking
  frameguard: {
    action: "deny",
  },

  // Remove X-Powered-By header
  hidePoweredBy: true,

  // Referrer Policy
  referrerPolicy: {
    policy: "strict-origin-when-cross-origin",
  },

  // Permissions Policy (formerly Feature Policy)
  permittedCrossDomainPolicies: {
    permittedPolicies: "none",
  },
});

/**
 * Cookie Parser middleware
 * Required for CSRF protection
 */
export const cookieParserMiddleware = cookieParser();

/**
 * Validate critical environment variables on startup
 * Fail-closed: App won't start if required secrets are missing
 */
export function validateSecurityEnvironment() {
  const required = [
    "JWT_SECRET",
    "SESSION_SECRET",
    "DATABASE_URL",
  ];

  const missing = required.filter((key) => !process.env[key]);

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(", ")}\n` +
      "Application cannot start without these critical security settings."
    );
  }

  // Warn about weak secrets in production
  if (process.env.NODE_ENV === "production") {
    const secrets = ["JWT_SECRET", "SESSION_SECRET"];
    for (const key of secrets) {
      const value = process.env[key]!;
      if (value.length < 32) {
        logger.auth.warn("Weak secret detected", {
          key,
          message: "Secret is less than 32 characters. Use a stronger secret in production."
        });
      }
      if (value.includes("dev") || value.includes("test") || value.includes("default")) {
        logger.auth.error("Insecure secret detected", {
          key,
          message: "Secret appears to be a development/test value. Change it immediately!"
        });
        throw new Error(`Insecure ${key} detected in production`);
      }
    }
  }

  logger.auth.info("Security environment variables validated");
}
