import express from "express";
import {
  createUserInvite,
  listOrganizationInvites,
  cancelUserInvite,
  resendUserInvite,
} from "../controllers/invites";
import { authorize } from "../middleware/auth";

const router = express.Router();

// All invite routes require admin authentication
const requireAdmin = authorize(["admin"]);

// POST /api/admin/invites - Create new user invite
router.post("/", requireAdmin, createUserInvite);

// GET /api/admin/invites?organizationId=xxx - List invites for organization
router.get("/", requireAdmin, listOrganizationInvites);

// DELETE /api/admin/invites/:inviteId - Cancel pending invite
router.delete("/:inviteId", requireAdmin, cancelUserInvite);

// POST /api/admin/invites/:inviteId/resend - Resend invite with new token
router.post("/:inviteId/resend", requireAdmin, resendUserInvite);

export default router;
