import { Request, Response } from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { db } from "../db";
import { users } from "@shared/schema";
import { eq } from "drizzle-orm";
import type { AuthRequest } from "../middleware/auth";
import { validateInvite, useInvite } from "../inviteService";

const SALT_ROUNDS = 10;
const JWT_EXPIRES_IN = "15m"; // 15 minutes as per requirements
const COOKIE_NAME = "gpnet_auth";
const COOKIE_MAX_AGE = 15 * 60 * 1000; // 15 minutes in milliseconds

// Helper to set auth cookie
function setAuthCookie(res: Response, token: string): void {
  res.cookie(COOKIE_NAME, token, {
    httpOnly: true, // Not accessible via JavaScript (XSS protection)
    secure: process.env.NODE_ENV === "production", // HTTPS only in production
    sameSite: "strict", // CSRF protection
    maxAge: COOKIE_MAX_AGE,
    path: "/",
  });
}

// Helper to clear auth cookie
function clearAuthCookie(res: Response): void {
  res.clearCookie(COOKIE_NAME, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
  });
}

function generateAccessToken(userId: string, email: string, role: string, organizationId: string): string {
  if (!process.env.JWT_SECRET) {
    throw new Error("JWT_SECRET not configured");
  }

  return jwt.sign(
    {
      id: userId,
      email,
      role,
      organizationId,
      companyId: organizationId, // Backwards compatibility - keep companyId field
    },
    process.env.JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
}

export async function register(req: Request, res: Response) {
  try {
    const { email, password, inviteToken } = req.body;

    // Validate required fields
    if (!email || !password || !inviteToken) {
      return res.status(400).json({
        error: "Bad Request",
        message: "Email, password, and invite token are required",
      });
    }

    // Validate invite token
    const inviteValidation = await validateInvite(inviteToken);

    if (!inviteValidation.valid || !inviteValidation.invite) {
      return res.status(403).json({
        error: "Forbidden",
        message: inviteValidation.error || "Invalid invite token",
      });
    }

    const invite = inviteValidation.invite;

    // Verify email matches invite
    if (email.toLowerCase().trim() !== invite.email.toLowerCase().trim()) {
      return res.status(403).json({
        error: "Forbidden",
        message: "Email does not match the invited email address",
      });
    }

    // Check if user already exists with this email
    const existingUser = await db
      .select()
      .from(users)
      .where(eq(users.email, email.toLowerCase().trim()))
      .limit(1);

    if (existingUser.length > 0) {
      return res.status(409).json({
        error: "Conflict",
        message: "User with this email already exists",
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

    // Create user with organizationId and role FROM THE INVITE
    // User cannot choose these - they come from the invite only
    const newUser = await db
      .insert(users)
      .values({
        email: invite.email,
        password: hashedPassword,
        role: invite.role, // ✅ From invite, not user input
        subrole: invite.subrole || null, // ✅ From invite, not user input
        organizationId: invite.organizationId, // ✅ From invite - tenant isolation
        companyId: invite.organizationId, // Keep for backwards compat (deprecated)
        insurerId: null,
      })
      .returning({
        id: users.id,
        email: users.email,
        role: users.role,
        subrole: users.subrole,
        organizationId: users.organizationId,
        companyId: users.companyId,
        insurerId: users.insurerId,
        createdAt: users.createdAt,
      });

    const user = newUser[0];

    // Mark invite as used
    await useInvite(inviteToken);

    // Generate access token with organizationId
    const accessToken = generateAccessToken(user.id, user.email, user.role, user.organizationId);

    // Set httpOnly cookie (primary auth method)
    setAuthCookie(res, accessToken);

    res.status(201).json({
      success: true,
      message: "User registered successfully",
      data: {
        user: {
          id: user.id,
          email: user.email,
          role: user.role,
          subrole: user.subrole,
          organizationId: invite.organizationId,
          createdAt: user.createdAt,
        },
        // Token still returned for backwards compatibility during migration
        // Client should NOT store this in localStorage
        accessToken,
      },
    });
  } catch (error) {
    console.error("Registration error:", error);
    res.status(500).json({
      error: "Internal Server Error",
      message: "Failed to register user",
    });
  }
}

export async function login(req: Request, res: Response) {
  try {
    const { email, password } = req.body;

    // Validate required fields
    if (!email || !password) {
      return res.status(400).json({
        error: "Bad Request",
        message: "Email and password are required",
      });
    }

    // Find user
    const userResult = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (userResult.length === 0) {
      return res.status(401).json({
        error: "Unauthorized",
        message: "Invalid email or password",
      });
    }

    const user = userResult[0];

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      return res.status(401).json({
        error: "Unauthorized",
        message: "Invalid email or password",
      });
    }

    // Generate access token with organizationId
    const accessToken = generateAccessToken(user.id, user.email, user.role, user.organizationId);

    // Set httpOnly cookie (primary auth method)
    setAuthCookie(res, accessToken);

    res.json({
      success: true,
      message: "Login successful",
      data: {
        user: {
          id: user.id,
          email: user.email,
          role: user.role,
          subrole: user.subrole,
          organizationId: user.organizationId,
          companyId: user.companyId, // Deprecated - backwards compat
          insurerId: user.insurerId,
        },
        // Token still returned for backwards compatibility during migration
        // Client should NOT store this in localStorage
        accessToken,
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({
      error: "Internal Server Error",
      message: "Failed to log in",
    });
  }
}

export async function me(req: AuthRequest, res: Response) {
  try {
    if (!req.user) {
      return res.status(401).json({
        error: "Unauthorized",
        message: "User not authenticated",
      });
    }

    // Fetch full user details from database
    const userResult = await db
      .select({
        id: users.id,
        email: users.email,
        role: users.role,
        subrole: users.subrole,
        companyId: users.companyId,
        insurerId: users.insurerId,
        createdAt: users.createdAt,
      })
      .from(users)
      .where(eq(users.id, req.user.id))
      .limit(1);

    if (userResult.length === 0) {
      return res.status(404).json({
        error: "Not Found",
        message: "User not found",
      });
    }

    res.json({
      success: true,
      data: {
        user: userResult[0],
      },
    });
  } catch (error) {
    console.error("Get user error:", error);
    res.status(500).json({
      error: "Internal Server Error",
      message: "Failed to fetch user details",
    });
  }
}

export async function logout(req: AuthRequest, res: Response) {
  // Clear the httpOnly auth cookie
  clearAuthCookie(res);

  res.json({
    success: true,
    message: "Logout successful",
  });
}
