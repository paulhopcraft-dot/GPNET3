import { randomBytes } from "crypto";
import { storage } from "./storage";
import type { UserRole } from "../shared/schema";

export interface CreateInviteParams {
  email: string;
  organizationId: string;
  role: UserRole;
  subrole?: string;
  createdBy: string;
}

export interface InviteValidationResult {
  valid: boolean;
  invite?: {
    id: string;
    email: string;
    organizationId: string;
    role: UserRole;
    subrole?: string | null;
  };
  error?: string;
}

/**
 * Generate a cryptographically secure random token for invite links
 * @returns 32-byte hex string (64 characters)
 */
export function generateToken(): string {
  return randomBytes(32).toString("hex");
}

/**
 * Create a new user invite with 7-day expiry
 * @param params - Invite creation parameters
 * @returns Created invite with token and expiry date
 */
export async function createInvite(params: CreateInviteParams) {
  const { email, organizationId, role, subrole, createdBy } = params;

  // Generate secure token
  const token = generateToken();

  // Set expiry to 7 days from now
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);

  // Create invite in database
  const invite = await storage.createUserInvite({
    email: email.toLowerCase().trim(),
    organizationId,
    role,
    subrole: subrole || null,
    invitedByUserId: createdBy,
    token,
    expiresAt,
    status: "pending",
  });

  return {
    id: invite.id,
    email: invite.email,
    organizationId: invite.organizationId,
    role: invite.role,
    subrole: invite.subrole,
    token: invite.token,
    expiresAt: invite.expiresAt,
    createdAt: invite.createdAt,
  };
}

/**
 * Validate an invite token
 * @param token - The invite token to validate
 * @returns Validation result with invite data if valid
 */
export async function validateInvite(token: string): Promise<InviteValidationResult> {
  if (!token || token.trim().length === 0) {
    return {
      valid: false,
      error: "Invalid invite token",
    };
  }

  // Get invite from database
  const invite = await storage.getUserInviteByToken(token);

  if (!invite) {
    return {
      valid: false,
      error: "Invite not found",
    };
  }

  // Check if already used
  if (invite.status === "used" || invite.usedAt) {
    return {
      valid: false,
      error: "Invite has already been used",
    };
  }

  // Check if cancelled
  if (invite.status === "cancelled") {
    return {
      valid: false,
      error: "Invite has been cancelled",
    };
  }

  // Check if expired
  const now = new Date();
  if (new Date(invite.expiresAt) < now) {
    // Update status to expired
    await storage.updateUserInvite(invite.id, { status: "expired" });
    return {
      valid: false,
      error: "Invite has expired",
    };
  }

  return {
    valid: true,
    invite: {
      id: invite.id,
      email: invite.email,
      organizationId: invite.organizationId,
      role: invite.role as UserRole,
      subrole: invite.subrole,
    },
  };
}

/**
 * Mark an invite as used after successful registration
 * @param token - The invite token that was used
 * @returns Updated invite
 */
export async function useInvite(token: string) {
  const invite = await storage.getUserInviteByToken(token);

  if (!invite) {
    throw new Error("Invite not found");
  }

  return await storage.updateUserInvite(invite.id, {
    status: "used",
    usedAt: new Date(),
  });
}

/**
 * Cancel a pending invite
 * @param inviteId - The ID of the invite to cancel
 * @returns Updated invite
 */
export async function cancelInvite(inviteId: string) {
  return await storage.updateUserInvite(inviteId, {
    status: "cancelled",
  });
}

/**
 * Get all pending invites for an organization (for admin UI)
 * @param organizationId - The organization ID
 * @returns List of pending invites
 */
export async function getOrganizationInvites(organizationId: string) {
  const invites = await storage.getUserInvitesByOrg(organizationId);

  // Mark expired invites
  const now = new Date();
  for (const invite of invites) {
    if (invite.status === "pending" && new Date(invite.expiresAt) < now) {
      await storage.updateUserInvite(invite.id, { status: "expired" });
      invite.status = "expired";
    }
  }

  return invites;
}

/**
 * Resend an invite by creating a new token with fresh expiry
 * @param inviteId - The ID of the invite to resend
 * @returns Updated invite with new token and expiry
 */
export async function resendInvite(inviteId: string) {
  const invite = await storage.getUserInviteById(inviteId);

  if (!invite) {
    throw new Error("Invite not found");
  }

  if (invite.status === "used") {
    throw new Error("Cannot resend an invite that has already been used");
  }

  // Generate new token and extend expiry
  const token = generateToken();
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);

  return await storage.updateUserInvite(inviteId, {
    token,
    expiresAt,
    status: "pending",
  });
}

/**
 * Check if an email already has a pending invite for an organization
 * @param email - Email address to check
 * @param organizationId - Organization ID
 * @returns True if pending invite exists
 */
export async function hasPendingInvite(email: string, organizationId: string): Promise<boolean> {
  const invites = await storage.getUserInvitesByOrg(organizationId);
  const normalizedEmail = email.toLowerCase().trim();

  return invites.some(
    (invite) =>
      invite.email.toLowerCase() === normalizedEmail &&
      invite.status === "pending" &&
      new Date(invite.expiresAt) > new Date()
  );
}
