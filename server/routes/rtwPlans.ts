/**
 * RTW Plans API Router
 * GEN-09: Preview plan (via recommend endpoint)
 * GEN-10: Save plan as draft (via POST endpoint)
 *
 * Provides HTTP interface for frontend wizard to get recommendations
 * and save draft plans with full validation.
 */

import { Router } from "express";
import { z } from "zod";
import type { AuthRequest } from "../middleware/auth";
import { storage } from "../storage";
import {
  recommendPlanType,
  filterDutiesForPlan,
  type DutySuitabilityInput,
} from "../services/planGenerator";
import {
  generateDefaultSchedule,
  validateCustomSchedule,
  generatePartialHoursSchedule,
  generateNormalHoursSchedule,
} from "../services/scheduleCalculator";
import { calculateDutySuitability } from "../services/functionalAbilityCalculator";
import { generateModificationSuggestions } from "../services/modificationSuggester";
import { logAuditEvent, getRequestMetadata } from "../services/auditLogger";
import { logger } from "../lib/logger";

const router = Router();

// ============================================================================
// Validation Schemas
// ============================================================================

const recommendQuerySchema = z.object({
  caseId: z.string().min(1, "caseId required"),
  roleId: z.string().min(1, "roleId required"),
});

const createPlanSchema = z.object({
  caseId: z.string().min(1),
  roleId: z.string().min(1),
  planType: z.enum(["normal_hours", "partial_hours", "graduated_return"]),
  startDate: z.string(),
  schedule: z.array(z.object({
    weekNumber: z.number().min(1),
    hoursPerDay: z.number().min(1).max(12),
    daysPerWeek: z.number().min(1).max(7),
  })).min(1, "At least one week required"),
  selectedDutyIds: z.array(z.string()).min(1, "At least one duty required"),
});

// ============================================================================
// Routes
// ============================================================================

/**
 * GET /api/rtw-plans/recommend
 * GEN-01, GEN-02, GEN-03: Get plan type recommendation and default schedule
 *
 * Returns plan type recommendation, default schedule based on plan type,
 * and filtered duties with suitability assessments.
 */
router.get("/recommend", async (req: AuthRequest, res) => {
  try {
    // Validate query parameters
    const queryResult = recommendQuerySchema.safeParse(req.query);
    if (!queryResult.success) {
      return res.status(400).json({
        error: "Validation failed",
        details: queryResult.error.errors,
      });
    }

    const { caseId, roleId } = queryResult.data;
    const organizationId = req.user!.organizationId;

    // Get current restrictions for case
    const restrictionsResult = await storage.getCurrentRestrictions(caseId, organizationId);
    if (!restrictionsResult) {
      return res.status(404).json({
        error: "No current restrictions found for this case",
        hint: "Ensure a valid medical certificate with extracted restrictions exists",
      });
    }

    // Get duties for role with demands
    const duties = await storage.getRoleDutiesWithDemands(roleId, organizationId);
    if (duties.length === 0) {
      return res.status(404).json({
        error: "No duties found for this role",
        hint: "Add duties to the role before generating a plan",
      });
    }

    // Calculate suitability for each duty
    const dutySuitability: DutySuitabilityInput[] = duties.map(duty => {
      const result = calculateDutySuitability(
        duty.demands,
        restrictionsResult.restrictions,
        duty.isModifiable
      );
      const suggestions = generateModificationSuggestions({
        dutyName: duty.name,
        dutyDescription: duty.description || "",
        demandComparisons: result.demandComparisons,
        isModifiable: duty.isModifiable,
      });
      return {
        duty,
        suitability: result.overallSuitability,
        modificationSuggestions: suggestions,
      };
    });

    // Get plan type recommendation
    const recommendation = recommendPlanType(restrictionsResult.restrictions, dutySuitability);

    // Generate appropriate schedule based on plan type
    const scheduleConfig = {
      startDate: new Date(),
      restrictionReviewDate: restrictionsResult.restrictions.nextExaminationDate
        ? new Date(restrictionsResult.restrictions.nextExaminationDate)
        : null,
      maxHoursPerDay: restrictionsResult.maxWorkHoursPerDay,
      maxDaysPerWeek: restrictionsResult.maxWorkDaysPerWeek,
    };

    let defaultSchedule;
    switch (recommendation.planType) {
      case "normal_hours":
        defaultSchedule = generateNormalHoursSchedule(scheduleConfig);
        break;
      case "partial_hours":
        defaultSchedule = generatePartialHoursSchedule(scheduleConfig);
        break;
      case "graduated_return":
      default:
        defaultSchedule = generateDefaultSchedule(scheduleConfig);
        break;
    }

    // Filter duties for inclusion
    const filteredDuties = filterDutiesForPlan(dutySuitability, true);

    logger.api.info("Generated RTW plan recommendation", {
      caseId,
      roleId,
      planType: recommendation.planType,
      dutiesCount: duties.length,
      includedDuties: filteredDuties.filter(d => d.isIncluded).length,
    });

    res.json({
      success: true,
      data: {
        recommendation,
        defaultSchedule: defaultSchedule.map(week => ({
          weekNumber: week.weekNumber,
          hoursPerDay: week.hoursPerDay,
          daysPerWeek: week.daysPerWeek,
          totalHoursPerWeek: week.totalHoursPerWeek,
          startDate: week.startDate.toISOString(),
          endDate: week.endDate.toISOString(),
          notes: week.notes,
        })),
        restrictionReviewDate: restrictionsResult.restrictions.nextExaminationDate || null,
        restrictions: {
          maxHoursPerDay: restrictionsResult.maxWorkHoursPerDay,
          maxDaysPerWeek: restrictionsResult.maxWorkDaysPerWeek,
        },
        duties: filteredDuties.map(d => ({
          dutyId: d.dutyId,
          dutyName: d.dutyName,
          suitability: d.suitability,
          isIncluded: d.isIncluded,
          modificationNotes: d.modificationNotes,
          excludedReason: d.excludedReason,
        })),
      },
    });
  } catch (err) {
    logger.api.error("RTW plan recommendation failed", {
      caseId: req.query.caseId,
      roleId: req.query.roleId,
    }, err);
    res.status(500).json({
      error: "Failed to generate recommendation",
      details: err instanceof Error ? err.message : "Unknown error",
    });
  }
});

/**
 * POST /api/rtw-plans
 * GEN-10: Save plan as draft
 *
 * Creates a new RTW plan with version 1 in draft status.
 * Validates duties are suitable and schedule respects restrictions.
 */
router.post("/", async (req: AuthRequest, res) => {
  try {
    // Validate request body
    const bodyResult = createPlanSchema.safeParse(req.body);
    if (!bodyResult.success) {
      return res.status(400).json({
        error: "Validation failed",
        details: bodyResult.error.errors,
      });
    }

    const planData = bodyResult.data;
    const userId = req.user!.id;
    const organizationId = req.user!.organizationId;

    // Verify case belongs to organization
    const workerCase = await storage.getGPNet2CaseById(planData.caseId, organizationId);
    if (!workerCase) {
      return res.status(404).json({ error: "Case not found" });
    }

    // Get restrictions and validate schedule
    const restrictionsResult = await storage.getCurrentRestrictions(planData.caseId, organizationId);
    if (!restrictionsResult) {
      return res.status(400).json({
        error: "No current restrictions - cannot create plan",
        hint: "Ensure a valid medical certificate exists for this case",
      });
    }

    // Validate schedule against restrictions
    const scheduleForValidation = planData.schedule.map(s => ({
      weekNumber: s.weekNumber,
      hoursPerDay: s.hoursPerDay,
      daysPerWeek: s.daysPerWeek,
      totalHoursPerWeek: s.hoursPerDay * s.daysPerWeek,
      startDate: new Date(planData.startDate),
      endDate: new Date(planData.startDate),
    }));

    const restrictionReviewDate = restrictionsResult.restrictions.nextExaminationDate
      ? new Date(restrictionsResult.restrictions.nextExaminationDate)
      : null;

    const scheduleValidation = validateCustomSchedule(
      scheduleForValidation,
      restrictionsResult.restrictions,
      restrictionReviewDate
    );

    if (!scheduleValidation.valid) {
      return res.status(400).json({
        error: "Schedule validation failed",
        details: scheduleValidation.errors,
        warnings: scheduleValidation.warnings,
      });
    }

    // Get selected duties and verify suitability
    const duties = await storage.getDutiesByIds(planData.selectedDutyIds, organizationId);
    if (duties.length !== planData.selectedDutyIds.length) {
      const foundIds = duties.map(d => d.id);
      const missingIds = planData.selectedDutyIds.filter(id => !foundIds.includes(id));
      return res.status(400).json({
        error: "One or more selected duties not found",
        details: { missingDutyIds: missingIds },
      });
    }

    // Verify no not_suitable duties included
    const dutySuitabilityChecks = duties.map(duty => {
      const result = calculateDutySuitability(
        duty.demands,
        restrictionsResult.restrictions,
        duty.isModifiable
      );
      return {
        duty,
        suitability: result.overallSuitability,
      };
    });

    const notSuitable = dutySuitabilityChecks.filter(d => d.suitability === "not_suitable");
    if (notSuitable.length > 0) {
      return res.status(400).json({
        error: "Plan includes not-suitable duties",
        details: notSuitable.map(d => ({
          dutyId: d.duty.id,
          dutyName: d.duty.name,
        })),
      });
    }

    // Build duty list for plan creation
    const dutySuitabilityInputs: DutySuitabilityInput[] = dutySuitabilityChecks.map(d => ({
      duty: d.duty,
      suitability: d.suitability,
      modificationSuggestions: [],
    }));

    const filteredDuties = filterDutiesForPlan(dutySuitabilityInputs, true);

    // Create plan using storage method
    const result = await storage.createRTWPlan({
      organizationId,
      caseId: planData.caseId,
      roleId: planData.roleId,
      planType: planData.planType,
      startDate: new Date(planData.startDate),
      restrictionReviewDate,
      createdBy: userId,
      schedule: planData.schedule,
      duties: filteredDuties,
    });

    // Log audit event
    await logAuditEvent({
      userId,
      organizationId,
      eventType: "case.create" as any, // RTW plan creation - using closest available type
      resourceType: "rtw_plan",
      resourceId: result.planId,
      metadata: {
        caseId: planData.caseId,
        planType: planData.planType,
        weekCount: planData.schedule.length,
        dutyCount: planData.selectedDutyIds.length,
        versionId: result.versionId,
      },
      ...getRequestMetadata(req),
    });

    logger.api.info("RTW plan created", {
      planId: result.planId,
      versionId: result.versionId,
      caseId: planData.caseId,
      planType: planData.planType,
    });

    res.status(201).json({
      success: true,
      planId: result.planId,
      versionId: result.versionId,
      message: "RTW plan created as draft",
    });
  } catch (err) {
    logger.api.error("RTW plan creation failed", {
      caseId: req.body?.caseId,
    }, err);
    res.status(500).json({
      error: "Failed to create plan",
      details: err instanceof Error ? err.message : "Unknown error",
    });
  }
});

/**
 * GET /api/rtw-plans/:planId
 * Get plan details by ID
 */
router.get("/:planId", async (req: AuthRequest, res) => {
  try {
    const { planId } = req.params;
    const organizationId = req.user!.organizationId;

    const plan = await storage.getRTWPlanById(planId, organizationId);
    if (!plan) {
      return res.status(404).json({ error: "Plan not found" });
    }

    res.json({
      success: true,
      data: plan,
    });
  } catch (err) {
    logger.api.error("RTW plan get failed", {
      planId: req.params.planId,
    }, err);
    res.status(500).json({
      error: "Failed to get plan",
      details: err instanceof Error ? err.message : "Unknown error",
    });
  }
});

export default router;
