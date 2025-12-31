import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import type { UserRole } from "@shared/schema";
import { logger } from "../lib/logger";

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        role: UserRole;
        organizationId: string;
        companyId?: string | null; // Deprecated - use organizationId
      };
    }
  }
}

export interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: UserRole;
    organizationId: string;
    companyId?: string | null; // Deprecated - use organizationId
  };
}

export interface JWTPayload {
  id: string;
  email: string;
  role: UserRole;
  organizationId?: string; // New field
  companyId?: string | null; // Deprecated - fallback for old tokens
}

const COOKIE_NAME = "gpnet_auth";

export function authorize(allowedRoles?: UserRole[]) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      // Try to get token from httpOnly cookie first (primary method)
      // Fall back to Authorization header for backwards compatibility
      let token: string | undefined;

      if (req.cookies && req.cookies[COOKIE_NAME]) {
        token = req.cookies[COOKIE_NAME];
      } else {
        const authHeader = req.headers.authorization;
        if (authHeader && authHeader.startsWith("Bearer ")) {
          token = authHeader.substring(7);
        }
      }

      if (!token) {
        return res.status(401).json({
          error: "Unauthorized",
          message: "No token provided"
        });
      }

      if (!process.env.JWT_SECRET) {
        logger.auth.error("JWT_SECRET is not set in environment variables");
        return res.status(500).json({
          error: "Server configuration error"
        });
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET) as JWTPayload;

      // Attach user info to request
      // Support both organizationId (new) and companyId (legacy) for backwards compatibility
      const organizationId = decoded.organizationId || decoded.companyId || "";

      req.user = {
        id: decoded.id,
        email: decoded.email,
        role: decoded.role,
        organizationId,
        companyId: decoded.companyId, // Keep for backwards compat
      };

      // Check if user role is allowed
      if (allowedRoles && allowedRoles.length > 0) {
        if (!allowedRoles.includes(decoded.role)) {
          return res.status(403).json({
            error: "Forbidden",
            message: `Access restricted to: ${allowedRoles.join(", ")}`,
          });
        }
      }

      next();
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        return res.status(401).json({
          error: "Unauthorized",
          message: "Token expired",
        });
      }

      if (error instanceof jwt.JsonWebTokenError) {
        return res.status(401).json({
          error: "Unauthorized",
          message: "Invalid token",
        });
      }

      return res.status(500).json({
        error: "Server error",
        message: "Failed to authenticate token",
      });
    }
  };
}
