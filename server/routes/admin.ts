import express from "express";
import { authorize } from "../middleware/auth";
import { storage } from "../storage";
import bcrypt from "bcrypt";
import { db } from "../db";
import { users, auditEvents } from "../../shared/schema";
import { eq } from "drizzle-orm";
import type { UserRole } from "../../shared/schema";

const router = express.Router();

// All admin routes require admin role
router.use(authorize(["admin"]));

// GET /api/admin/users - List all users
router.get("/users", async (req, res) => {
  try {
    const allUsers = await db.select({
      id: users.id,
      email: users.email,
      role: users.role,
      subrole: users.subrole,
      companyId: users.companyId,
      insurerId: users.insurerId,
      isActive: users.isActive,
      createdAt: users.createdAt,
    }).from(users);

    res.json({
      success: true,
      data: allUsers,
    });
  } catch (error) {
    console.error("Failed to fetch users:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch users",
    });
  }
});

// GET /api/admin/users/:id - Get single user
router.get("/users/:id", async (req, res) => {
  try {
    const userId = req.params.id;
    const [user] = await db.select({
      id: users.id,
      email: users.email,
      role: users.role,
      subrole: users.subrole,
      companyId: users.companyId,
      insurerId: users.insurerId,
      isActive: users.isActive,
      createdAt: users.createdAt,
    }).from(users).where(eq(users.id, userId));

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    res.json({
      success: true,
      data: user,
    });
  } catch (error) {
    console.error("Failed to fetch user:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch user",
    });
  }
});

// POST /api/admin/users - Create new user
router.post("/users", async (req, res) => {
  try {
    const { email, password, role, subrole, companyId, insurerId } = req.body;

    if (!email || !password || !role) {
      return res.status(400).json({
        success: false,
        message: "Email, password, and role are required",
      });
    }

    // Check if user already exists
    const [existing] = await db.select().from(users).where(eq(users.email, email.toLowerCase()));
    if (existing) {
      return res.status(409).json({
        success: false,
        message: "User with this email already exists",
      });
    }

    // Validate role
    const validRoles: UserRole[] = ["admin", "employer", "clinician", "insurer"];
    if (!validRoles.includes(role)) {
      return res.status(400).json({
        success: false,
        message: "Invalid role. Must be one of: admin, employer, clinician, insurer",
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const [newUser] = await db.insert(users).values({
      email: email.toLowerCase(),
      password: hashedPassword,
      role,
      subrole: subrole || null,
      companyId: companyId || null,
      insurerId: insurerId || null,
      isActive: true,
    }).returning({
      id: users.id,
      email: users.email,
      role: users.role,
      subrole: users.subrole,
      companyId: users.companyId,
      insurerId: users.insurerId,
      isActive: users.isActive,
      createdAt: users.createdAt,
    });

    // Log audit event
    await db.insert(auditEvents).values({
      userId: (req as any).user?.id,
      eventType: "USER_CREATED",
      resourceType: "user",
      resourceId: newUser.id,
      metadata: { email: newUser.email, role: newUser.role },
    });

    res.status(201).json({
      success: true,
      data: newUser,
    });
  } catch (error) {
    console.error("Failed to create user:", error);
    res.status(500).json({
      success: false,
      message: "Failed to create user",
    });
  }
});

// PATCH /api/admin/users/:id - Update user
router.patch("/users/:id", async (req, res) => {
  try {
    const userId = req.params.id;
    const { email, password, role, subrole, companyId, insurerId, isActive } = req.body;

    // Check user exists
    const [existing] = await db.select().from(users).where(eq(users.id, userId));
    if (!existing) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Build update object
    const updates: Record<string, any> = {};
    if (email !== undefined) updates.email = email.toLowerCase();
    if (password !== undefined) updates.password = await bcrypt.hash(password, 10);
    if (role !== undefined) {
      const validRoles: UserRole[] = ["admin", "employer", "clinician", "insurer"];
      if (!validRoles.includes(role)) {
        return res.status(400).json({
          success: false,
          message: "Invalid role",
        });
      }
      updates.role = role;
    }
    if (subrole !== undefined) updates.subrole = subrole;
    if (companyId !== undefined) updates.companyId = companyId;
    if (insurerId !== undefined) updates.insurerId = insurerId;
    if (isActive !== undefined) updates.isActive = isActive;

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({
        success: false,
        message: "No updates provided",
      });
    }

    const [updatedUser] = await db.update(users)
      .set(updates)
      .where(eq(users.id, userId))
      .returning({
        id: users.id,
        email: users.email,
        role: users.role,
        subrole: users.subrole,
        companyId: users.companyId,
        insurerId: users.insurerId,
        isActive: users.isActive,
        createdAt: users.createdAt,
      });

    // Log audit event
    await db.insert(auditEvents).values({
      userId: (req as any).user?.id,
      eventType: "USER_UPDATED",
      resourceType: "user",
      resourceId: updatedUser.id,
      metadata: { changes: Object.keys(updates) },
    });

    res.json({
      success: true,
      data: updatedUser,
    });
  } catch (error) {
    console.error("Failed to update user:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update user",
    });
  }
});

// DELETE /api/admin/users/:id - Delete user (soft delete by deactivating)
router.delete("/users/:id", async (req, res) => {
  try {
    const userId = req.params.id;

    // Prevent deleting self
    if ((req as any).user?.id === userId) {
      return res.status(400).json({
        success: false,
        message: "Cannot delete your own account",
      });
    }

    // Check user exists
    const [existing] = await db.select().from(users).where(eq(users.id, userId));
    if (!existing) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Soft delete by deactivating
    await db.update(users)
      .set({ isActive: false })
      .where(eq(users.id, userId));

    // Log audit event
    await db.insert(auditEvents).values({
      userId: (req as any).user?.id,
      eventType: "USER_DELETED",
      resourceType: "user",
      resourceId: userId,
      metadata: { email: existing.email },
    });

    res.json({
      success: true,
      message: "User deactivated successfully",
    });
  } catch (error) {
    console.error("Failed to delete user:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete user",
    });
  }
});

// GET /api/admin/stats - Dashboard statistics
router.get("/stats", async (req, res) => {
  try {
    const [userStats] = await db.select({
      total: users.id,
    }).from(users);

    const activeUsers = await db.select().from(users).where(eq(users.isActive, true));
    const inactiveUsers = await db.select().from(users).where(eq(users.isActive, false));

    // Get case count
    const cases = await storage.getGPNet2Cases();

    res.json({
      success: true,
      data: {
        totalUsers: activeUsers.length + inactiveUsers.length,
        activeUsers: activeUsers.length,
        inactiveUsers: inactiveUsers.length,
        totalCases: cases.length,
        usersByRole: {
          admin: activeUsers.filter(u => u.role === "admin").length,
          employer: activeUsers.filter(u => u.role === "employer").length,
          clinician: activeUsers.filter(u => u.role === "clinician").length,
          insurer: activeUsers.filter(u => u.role === "insurer").length,
        },
      },
    });
  } catch (error) {
    console.error("Failed to fetch stats:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch statistics",
    });
  }
});

// GET /api/admin/audit-log - Get recent audit events
router.get("/audit-log", async (req, res) => {
  try {
    const limit = parseInt(req.query.limit as string) || 50;
    const offset = parseInt(req.query.offset as string) || 0;

    const events = await db.select()
      .from(auditEvents)
      .orderBy(auditEvents.timestamp)
      .limit(limit)
      .offset(offset);

    res.json({
      success: true,
      data: events,
    });
  } catch (error) {
    console.error("Failed to fetch audit log:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch audit log",
    });
  }
});

export default router;
