/**
 * Partner-tier routes — only partner-role users hit these.
 *
 *   GET    /api/partner/clients    → list of accessible client orgs
 *   POST   /api/partner/active-org → pick a client (mints new JWT)
 *   DELETE /api/partner/active-org → clear active client (back to picker)
 *   GET    /api/partner/me         → partner org + active org info for header
 *
 * See docs/DECISIONS.md (2026-05-04) and .planning/partner-tier/PLAN.md task B.
 */
import { Router, Response } from "express";
import { z } from "zod";
import { eq, and, count } from "drizzle-orm";
import { db } from "../db";
import {
  partnerUserOrganizations,
  organizations,
  workerCases,
  users,
} from "@shared/schema";
import { authorize, type AuthRequest } from "../middleware/auth";
import { generateAccessToken, setAuthCookieExternal } from "../controllers/auth";
import { logger } from "../lib/logger";

const router = Router();

// All partner endpoints require the partner role.
const requirePartner = authorize(["partner"]);

/**
 * GET /api/partner/clients
 *
 * Returns the list of client organisations this partner user can act on,
 * with an open-case count for each. Used by the picker page sidebar.
 */
router.get("/clients", requirePartner, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;

    // Join access table with organizations to get name/logo.
    const accessibleOrgs = await db
      .select({
        id: organizations.id,
        name: organizations.name,
        logoUrl: organizations.logoUrl,
        kind: organizations.kind,
      })
      .from(partnerUserOrganizations)
      .innerJoin(
        organizations,
        eq(partnerUserOrganizations.organizationId, organizations.id),
      )
      .where(eq(partnerUserOrganizations.userId, userId));

    // Open case count per org. One query per org is acceptable — a partner
    // user typically has 1–20 clients, not thousands. If this grows, switch
    // to a single GROUP BY.
    const clientsWithCounts = await Promise.all(
      accessibleOrgs.map(async (org) => {
        const [{ n }] = await db
          .select({ n: count() })
          .from(workerCases)
          .where(
            and(
              eq(workerCases.organizationId, org.id),
              eq(workerCases.caseStatus, "open"),
            ),
          );
        return {
          id: org.id,
          name: org.name,
          logoUrl: org.logoUrl,
          openCaseCount: Number(n),
        };
      }),
    );

    res.json({ clients: clientsWithCounts });
  } catch (err) {
    logger.api.error("[partner] GET /clients failed", {}, err);
    res.status(500).json({ error: "Internal Server Error", message: "Failed to load clients" });
  }
});

/**
 * POST /api/partner/active-org { organizationId }
 *
 * Verifies the partner user has access to the requested organisation, then
 * mints a fresh JWT with activeOrganizationId set and returns it via cookie.
 */
const activeOrgSchema = z.object({
  organizationId: z.string().min(1),
});

router.post("/active-org", requirePartner, async (req: AuthRequest, res: Response) => {
  try {
    const parsed = activeOrgSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        error: "Bad Request",
        message: "organizationId is required",
        details: parsed.error.flatten(),
      });
    }
    const { organizationId } = parsed.data;
    const userId = req.user!.id;

    // Verify access
    const access = await db
      .select({ orgId: partnerUserOrganizations.organizationId })
      .from(partnerUserOrganizations)
      .where(
        and(
          eq(partnerUserOrganizations.userId, userId),
          eq(partnerUserOrganizations.organizationId, organizationId),
        ),
      )
      .limit(1);

    if (access.length === 0) {
      return res.status(403).json({
        error: "Forbidden",
        message: "You do not have access to this organisation.",
      });
    }

    // Mint new access token with the active org set. The JWT.organizationId
    // field carries the active org so existing route filters Just Work.
    const accessToken = generateAccessToken(
      userId,
      req.user!.email,
      req.user!.role,
      organizationId, // organizationId in JWT = active org for partner
      organizationId, // activeOrganizationId in JWT = same (explicit "picked")
    );
    setAuthCookieExternal(res, accessToken);

    res.json({
      success: true,
      data: { activeOrganizationId: organizationId, accessToken },
    });
  } catch (err) {
    logger.api.error("[partner] POST /active-org failed", {}, err);
    res.status(500).json({ error: "Internal Server Error", message: "Failed to set active organisation" });
  }
});

/**
 * DELETE /api/partner/active-org
 *
 * Clears the active client (used by the "Switch client" link). Mints a fresh
 * JWT with activeOrganizationId=null and the user's home org back in
 * organizationId, so subsequent requests fall through to the picker.
 */
router.delete("/active-org", requirePartner, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;

    // Get the user's home org (workbetter.id) — currently req.user.organizationId
    // is the active org; we need the home org from the DB.
    const homeRow = await db
      .select({ orgId: users.organizationId })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);
    if (homeRow.length === 0) {
      return res.status(401).json({ error: "Unauthorized", message: "User not found" });
    }
    const homeOrgId = homeRow[0].orgId;

    const accessToken = generateAccessToken(
      userId,
      req.user!.email,
      req.user!.role,
      homeOrgId,
      null, // cleared
    );
    setAuthCookieExternal(res, accessToken);

    res.json({ success: true, data: { activeOrganizationId: null } });
  } catch (err) {
    logger.api.error("[partner] DELETE /active-org failed", {}, err);
    res.status(500).json({ error: "Internal Server Error", message: "Failed to clear active organisation" });
  }
});

/**
 * GET /api/partner/me
 *
 * Returns header-relevant context: partner org info and active org info.
 * Used by the header component to render "{partnerName} | {activeName}".
 */
router.get("/me", requirePartner, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const activeOrgId = req.activeOrganizationId ?? null;

    // Home org (the partner org itself) — read from users.organizationId
    const homeRow = await db
      .select({ orgId: users.organizationId })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);
    if (homeRow.length === 0) {
      return res.status(401).json({ error: "Unauthorized", message: "User not found" });
    }
    const partnerOrgId = homeRow[0].orgId;

    const partnerOrgRow = await db
      .select({
        id: organizations.id,
        name: organizations.name,
        logoUrl: organizations.logoUrl,
        kind: organizations.kind,
      })
      .from(organizations)
      .where(eq(organizations.id, partnerOrgId))
      .limit(1);

    let activeOrg: { id: string; name: string; logoUrl: string | null } | null = null;
    if (activeOrgId && activeOrgId !== partnerOrgId) {
      const activeRow = await db
        .select({
          id: organizations.id,
          name: organizations.name,
          logoUrl: organizations.logoUrl,
        })
        .from(organizations)
        .where(eq(organizations.id, activeOrgId))
        .limit(1);
      if (activeRow.length > 0) {
        activeOrg = activeRow[0];
      }
    }

    res.json({
      partnerOrg: partnerOrgRow[0] ?? null,
      activeOrg,
    });
  } catch (err) {
    logger.api.error("[partner] GET /me failed", {}, err);
    res.status(500).json({ error: "Internal Server Error", message: "Failed to load partner context" });
  }
});

export default router;
