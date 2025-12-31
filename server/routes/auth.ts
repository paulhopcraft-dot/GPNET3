import express from "express";
import { register, login, me, logout, refresh, logoutAll } from "../controllers/auth";
import { authorize } from "../middleware/auth";

const router = express.Router();

// POST /api/auth/register - Create new user account (requires invite token)
router.post("/register", register);

// POST /api/auth/login - Authenticate and get JWT + refresh token
router.post("/login", login);

// POST /api/auth/refresh - Refresh access token using refresh token
router.post("/refresh", refresh);

// GET /api/auth/me - Get current logged-in user (requires authentication)
router.get("/me", authorize(), me);

// POST /api/auth/logout - Logout and revoke refresh token
router.post("/logout", authorize(), logout);

// POST /api/auth/logout-all - Logout from all devices (revoke all refresh tokens)
router.post("/logout-all", authorize(), logoutAll);

export default router;
