/**
 * Functional Ability Matrix API Routes
 * FAM-02, FAM-06, FAM-07: Calculate and return suitability matrix for duty templates
 *
 * This API operates on duty TEMPLATES (rtwDuties table), not plan instances.
 * It provides a suitability preview BEFORE an RTW plan is created.
 * Override functionality is deferred to Phase 8 (Approval Workflow) when plan instances exist.
 */

import { Router } from "express";
import { eq, and } from "drizzle-orm";
import type { AuthRequest } from "../middleware/auth";
import { storage } from "../storage";
import { db } from "../db";
import { rtwDuties, rtwDutyDemands, rtwRoles } from "@shared/schema";
import type { DemandFrequency, RestrictionCapability, RTWDutyDemandsDB } from "@shared/schema";
import {
  calculateDutySuitability,
  type SuitabilityLevel,
  type DemandComparison,
} from "../services/functionalAbilityCalculator";
import { generateModificationSuggestions } from "../services/modificationSuggester";
import { logger } from "../lib/logger";

const router = Router();

/**
 * Response type for a single duty's suitability assessment
 */
interface DutySuitabilityResponse {
  dutyId: string; // Template ID from rtwDuties table
  dutyName: string;
  dutyDescription: string | null;
  isModifiable: boolean;
  suitability: SuitabilityLevel;
  reasons: string[];
  modificationSuggestions: string[];
  demandDetails: Array<{
    demand: string;
    frequency: DemandFrequency;
    capability: RestrictionCapability;
    match: SuitabilityLevel;
  }>;
}

/**
 * Response type for the matrix endpoint
 */
interface MatrixResponse {
  success: true;
  data: {
    caseId: string;
    roleId: string;
    roleName: string;
    calculatedAt: string;
    confidence: number;
    warnings: string[];
    duties: DutySuitabilityResponse[];
  };
}

/**
 * GET /api/functional-ability/matrix
 * Calculate suitability matrix for all duty TEMPLATES in a role
 *
 * Query params:
 * - caseId: Worker case ID (required)
 * - roleId: RTW role ID (required)
 *
 * Returns suitability assessment for each duty template in the role.
 * This is a PREVIEW operation before plan creation.
 */
router.get("/matrix", async (req: AuthRequest, res) => {
  try {
    const { caseId, roleId } = req.query;

    // Validate required parameters
    if (!caseId || typeof caseId !== "string") {
      return res.status(400).json({
        error: "Missing required parameter: caseId",
      });
    }

    if (!roleId || typeof roleId !== "string") {
      return res.status(400).json({
        error: "Missing required parameter: roleId",
      });
    }

    const organizationId = req.user!.organizationId;

    // Get current restrictions from storage
    const restrictionsResult = await storage.getCurrentRestrictions(caseId, organizationId);

    if (!restrictionsResult) {
      return res.status(404).json({
        error: "No current medical restrictions found",
        hint: "Ensure a valid medical certificate with extracted restrictions exists for this case",
      });
    }

    // Get role info
    const [role] = await db
      .select({ id: rtwRoles.id, name: rtwRoles.name })
      .from(rtwRoles)
      .where(
        and(
          eq(rtwRoles.id, roleId),
          eq(rtwRoles.organizationId, organizationId),
          eq(rtwRoles.isActive, true)
        )
      )
      .limit(1);

    if (!role) {
      return res.status(404).json({
        error: "Role not found",
        hint: "Ensure the role exists and belongs to your organization",
      });
    }

    // Query duty TEMPLATES for the role
    const dutiesWithDemands = await db
      .select({
        duty: rtwDuties,
        demands: rtwDutyDemands,
      })
      .from(rtwDuties)
      .leftJoin(rtwDutyDemands, eq(rtwDuties.id, rtwDutyDemands.dutyId))
      .where(
        and(
          eq(rtwDuties.roleId, roleId),
          eq(rtwDuties.organizationId, organizationId),
          eq(rtwDuties.isActive, true)
        )
      );

    if (dutiesWithDemands.length === 0) {
      return res.status(404).json({
        error: "No active duties found for this role",
        hint: "Add duties to the role before calculating suitability",
      });
    }

    // Calculate suitability for each duty template
    const allWarnings: string[] = [...(restrictionsResult.source === "combined"
      ? [`Restrictions combined from ${restrictionsResult.certificateCount} certificates`]
      : [])];
    let minConfidence = 1;

    const dutyResults: DutySuitabilityResponse[] = dutiesWithDemands.map((row) => {
      const duty = row.duty;
      const demands = row.demands as RTWDutyDemandsDB | null;

      // Calculate suitability
      const suitabilityResult = calculateDutySuitability(
        demands,
        restrictionsResult.restrictions,
        duty.isModifiable
      );

      // Generate modification suggestions
      const modificationSuggestions = generateModificationSuggestions({
        dutyName: duty.name,
        dutyDescription: duty.description || "",
        demandComparisons: suitabilityResult.demandComparisons,
        isModifiable: duty.isModifiable,
      });

      // Track minimum confidence and aggregate warnings
      if (suitabilityResult.confidence < minConfidence) {
        minConfidence = suitabilityResult.confidence;
      }
      allWarnings.push(...suitabilityResult.warnings);

      // Transform demand comparisons to response format
      const demandDetails = suitabilityResult.demandComparisons.map((comp: DemandComparison) => ({
        demand: comp.demand,
        frequency: comp.frequency,
        capability: comp.capability,
        match: comp.match,
      }));

      return {
        dutyId: duty.id, // Template ID, NOT planDutyId
        dutyName: duty.name,
        dutyDescription: duty.description,
        isModifiable: duty.isModifiable,
        suitability: suitabilityResult.overallSuitability,
        reasons: suitabilityResult.reasons,
        modificationSuggestions,
        demandDetails,
      };
    });

    // Deduplicate warnings
    const uniqueWarnings = Array.from(new Set(allWarnings));

    const response: MatrixResponse = {
      success: true,
      data: {
        caseId,
        roleId,
        roleName: role.name,
        calculatedAt: new Date().toISOString(),
        confidence: minConfidence,
        warnings: uniqueWarnings,
        duties: dutyResults,
      },
    };

    logger.api.info("Calculated functional ability matrix", {
      caseId,
      roleId,
      dutiesCount: dutyResults.length,
      confidence: minConfidence,
    });

    res.json(response);
  } catch (err) {
    logger.api.error("Failed to calculate functional ability matrix", {
      caseId: req.query.caseId,
      roleId: req.query.roleId,
    }, err);
    res.status(500).json({
      error: "Failed to calculate functional ability matrix",
      details: err instanceof Error ? err.message : "Unknown error",
    });
  }
});

export default router;
