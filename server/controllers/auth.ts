import { Request, Response } from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { db } from "../db";
import { users } from "@shared/schema";
import { eq } from "drizzle-orm";
import type { AuthRequest } from "../middleware/auth";

const SALT_ROUNDS = 10;
const JWT_EXPIRES_IN = "15m"; // 15 minutes as per requirements

function generateAccessToken(userId: string, email: string, role: string): string {
  if (!process.env.JWT_SECRET) {
    throw new Error("JWT_SECRET not configured");
  }

  return jwt.sign(
    { id: userId, email, role },
    process.env.JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
}

export async function register(req: Request, res: Response) {
  try {
    const { email, password, role, subrole, companyId, insurerId } = req.body;

    // Validate required fields
    if (!email || !password || !role) {
      return res.status(400).json({
        error: "Bad Request",
        message: "Email, password, and role are required",
      });
    }

    // Validate role
    const validRoles = ["admin", "employer", "clinician", "insurer"];
    if (!validRoles.includes(role)) {
      return res.status(400).json({
        error: "Bad Request",
        message: `Role must be one of: ${validRoles.join(", ")}`,
      });
    }

    // Check if user already exists
    const existingUser = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (existingUser.length > 0) {
      return res.status(409).json({
        error: "Conflict",
        message: "User with this email already exists",
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

    // Create user
    const newUser = await db
      .insert(users)
      .values({
        email,
        password: hashedPassword,
        role,
        subrole: subrole || null,
        companyId: companyId || null,
        insurerId: insurerId || null,
      })
      .returning({
        id: users.id,
        email: users.email,
        role: users.role,
        subrole: users.subrole,
        companyId: users.companyId,
        insurerId: users.insurerId,
        createdAt: users.createdAt,
      });

    const user = newUser[0];

    if (user.isActive === false) {
      return res.status(403).json({
        error: "Forbidden",
        message: "This account has been deactivated. Please contact support.",
      });
    }

    // Generate access token
    const accessToken = generateAccessToken(user.id, user.email, user.role);

    res.status(201).json({
      success: true,
      message: "User registered successfully",
      data: {
        user: {
          id: user.id,
          email: user.email,
          role: user.role,
          subrole: user.subrole,
          companyId: user.companyId,
          insurerId: user.insurerId,
          createdAt: user.createdAt,
        },
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

    // Generate access token
    const accessToken = generateAccessToken(user.id, user.email, user.role);

    res.json({
      success: true,
      message: "Login successful",
      data: {
        user: {
          id: user.id,
          email: user.email,
          role: user.role,
          subrole: user.subrole,
          companyId: user.companyId,
          insurerId: user.insurerId,
        },
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
  // Placeholder for logout logic
  // In a stateless JWT system, logout is typically handled client-side by removing the token
  // For refresh tokens, you would invalidate them in the database here
  
  res.json({
    success: true,
    message: "Logout successful (client should discard token)",
  });
}
