import express from "express";
import { register, login, me, logout } from "../controllers/auth";
import { authorize } from "../middleware/auth";

const router = express.Router();

// POST /api/auth/register - Create new user account (initial admin setup)
router.post("/register", register);

// POST /api/auth/login - Authenticate and get JWT
router.post("/login", login);

// GET /api/auth/me - Get current logged-in user (requires authentication)
router.get("/me", authorize(), me);

// POST /api/auth/logout - Logout (placeholder for token invalidation)
router.post("/logout", authorize(), logout);

export default router;
