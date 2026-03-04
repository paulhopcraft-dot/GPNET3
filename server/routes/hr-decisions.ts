/**
 * Phase 5.1 — HR Decisions Queue API
 *
 * Surfaces cases that require HR/employer input. Each "decision item" has:
 * - A trigger condition (what caused it)
 * - A plain-English label and rationale
 * - A legislative reference where applicable
 * - A deadline (if applicable)
 * - Quick-action links
 */

import { Router, Response } from "express";
import { authorize, type AuthRequest } from "../middleware/auth";
import { storage } from "../storage";
import { db } from "../db";
import { workerCases, rtwPlans, terminationProcesses } from "@shared/schema";
import { eq, and, lte, gte, isNull, or, inArray } from "drizzle-orm";
import { logger } from "../lib/logger";
import { LIFECYCLE_STAGE_LABELS } from "@shared/schema";

const router = Router();
const requireAuth = authorize();

const MS_PER_WEEK = 7 * 24 * 60 * 60 * 1000;

export interface HRDecisionItem {
  id: string;                    // Unique ID for this decision (caseId + triggerCode)
  caseId: string;
  workerName: string;
  company: string;
  injuryType?: string;
  daysOffWork: number;
  triggerCode: string;           // Machine identifier
  label: string;                 // Plain-English label
  rationale: string;             // Why this needs attention
  legislativeRef?: string;       // e.g., "WIRC Act 2013 s82"
  deadline?: string;             // ISO date if there is a deadline
  urgency: "critical" | "high" | "medium";
  actions: Array<{
    label: string;
    href: string;
  }>;
}

/**
 * GET /api/hr/decisions
 * Returns all cases needing HR/employer decisions, sorted by urgency.
 */
router.get("/decisions", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user!;
    const orgId = user.organizationId;

    // Fetch all open cases
    const openCases = await db
      .select()
      .from(workerCases)
      .where(and(
        eq(workerCases.organizationId, orgId),
        or(eq(workerCases.caseStatus, "open"), isNull(workerCases.caseStatus))
      ));

    if (openCases.length === 0) {
      return res.json({ decisions: [], total: 0 });
    }

    const caseIds = openCases.map(c => c.id);

    // Fetch RTW plans for these cases
    const plans = await db
      .select()
      .from(rtwPlans)
      .where(inArray(rtwPlans.caseId, caseIds));

    const planByCaseId = new Map(plans.map(p => [p.caseId, p]));

    // Fetch termination processes
    const terminations = await db
      .select()
      .from(terminationProcesses)
      .where(inArray(terminationProcesses.workerCaseId, caseIds));

    const termByCaseId = new Map(terminations.map(t => [t.workerCaseId, t]));

    const decisions: HRDecisionItem[] = [];
    const now = Date.now();

    for (const c of openCases) {
      const injuryDate = c.dateOfInjury;
      const daysOffWork = injuryDate
        ? Math.floor((now - new Date(injuryDate).getTime()) / 86_400_000)
        : 0;
      const weeksOffWork = daysOffWork / 7;

      const plan = planByCaseId.get(c.id);
      const term = termByCaseId.get(c.id);

      const baseActions = [
        { label: "View Case", href: `/summary/${c.id}` },
      ];

      // Trigger 1: RTW plan pending employer review
      if (plan?.status === "pending_employer_review") {
        decisions.push({
          id: `${c.id}:rtw_review`,
          caseId: c.id,
          workerName: c.workerName,
          company: c.company,
          daysOffWork,
          triggerCode: "RTW_PENDING_REVIEW",
          label: "RTW plan ready for your review",
          rationale: "The case manager has submitted a Return to Work plan that requires your approval before it can proceed. You can approve, request changes, or reject the plan.",
          urgency: "high",
          actions: [
            { label: "Review RTW Plan", href: `/rtw-plans?caseId=${c.id}` },
            ...baseActions,
          ],
        });
      }

      // Trigger 2: Termination eligibility (52+ weeks)
      if (weeksOffWork >= 52 && !term) {
        decisions.push({
          id: `${c.id}:s82_eligibility`,
          caseId: c.id,
          workerName: c.workerName,
          company: c.company,
          daysOffWork,
          triggerCode: "S82_TERMINATION_ELIGIBLE",
          label: "Termination eligibility — review required",
          rationale: `${c.workerName} has been off work for ${Math.floor(weeksOffWork)} weeks. Under s82 of the WIRC Act 2013, you may now be eligible to terminate employment. This requires a structured process including assessment of suitable duties and pre-termination procedures.`,
          legislativeRef: "WIRC Act 2013 s82",
          urgency: "critical",
          actions: [
            { label: "Start Termination Process", href: `/termination/${c.id}` },
            ...baseActions,
          ],
        });
      }

      // Trigger 3: Approaching termination eligibility (48+ weeks — warning)
      if (weeksOffWork >= 48 && weeksOffWork < 52 && !term) {
        const weeksRemaining = Math.ceil(52 - weeksOffWork);
        const deadlineDate = new Date(new Date(injuryDate!).getTime() + 52 * MS_PER_WEEK);
        decisions.push({
          id: `${c.id}:s82_approaching`,
          caseId: c.id,
          workerName: c.workerName,
          company: c.company,
          daysOffWork,
          triggerCode: "S82_APPROACHING",
          label: `Approaching 52-week threshold — ${weeksRemaining} weeks remaining`,
          rationale: `${c.workerName} will reach the s82 termination eligibility threshold in ${weeksRemaining} weeks. Begin preparing suitable duties assessment and stakeholder consultations now to meet statutory obligations.`,
          legislativeRef: "WIRC Act 2013 s82",
          deadline: deadlineDate.toISOString(),
          urgency: "high",
          actions: [
            { label: "View RTW Plan", href: `/rtw-plans?caseId=${c.id}` },
            ...baseActions,
          ],
        });
      }

      // Trigger 4: Suitable duties assessment overdue (>7 days since RTW plan active, no employer input)
      if (
        plan &&
        plan.status === "in_progress" &&
        plan.updatedAt &&
        (now - new Date(plan.updatedAt).getTime()) > 7 * 24 * 60 * 60 * 1000
      ) {
        const overdueBy = Math.floor((now - new Date(plan.updatedAt).getTime()) / 86_400_000) - 7;
        if (overdueBy > 0) {
          decisions.push({
            id: `${c.id}:duties_assessment`,
            caseId: c.id,
            workerName: c.workerName,
            company: c.company,
            daysOffWork,
            triggerCode: "DUTIES_ASSESSMENT_OVERDUE",
            label: "Workplace assessment needed",
            rationale: `The RTW plan has been active for more than 7 days but the suitable duties workplace assessment has not been completed. This is now ${overdueBy} days overdue.`,
            urgency: overdueBy > 14 ? "critical" : "high",
            actions: [
              { label: "Complete Duties Assessment", href: `/rtw-plans?caseId=${c.id}` },
              ...baseActions,
            ],
          });
        }
      }

      // Trigger 5: Pre-termination meeting due
      if (term?.preTerminationInviteSentDate && !term.preTerminationMeetingHeld) {
        const inviteDate = new Date(term.preTerminationInviteSentDate);
        const meetingDue = new Date(inviteDate.getTime() + 14 * 24 * 60 * 60 * 1000);
        if (now >= meetingDue.getTime()) {
          decisions.push({
            id: `${c.id}:pre_term_meeting`,
            caseId: c.id,
            workerName: c.workerName,
            company: c.company,
            daysOffWork,
            triggerCode: "PRE_TERMINATION_MEETING_DUE",
            label: "Pre-termination meeting scheduling required",
            rationale: "The pre-termination invite was sent more than 14 days ago but the meeting has not been recorded as held. Please schedule or record the meeting outcome.",
            urgency: "critical",
            deadline: meetingDue.toISOString(),
            actions: [
              { label: "View Termination Process", href: `/termination/${c.id}` },
              ...baseActions,
            ],
          });
        }
      }
    }

    // Sort: critical first, then high, then by days off work descending
    const URGENCY_ORDER = { critical: 0, high: 1, medium: 2 };
    decisions.sort((a, b) => {
      const uDiff = URGENCY_ORDER[a.urgency] - URGENCY_ORDER[b.urgency];
      if (uDiff !== 0) return uDiff;
      return b.daysOffWork - a.daysOffWork;
    });

    return res.json({ decisions, total: decisions.length });
  } catch (err) {
    logger.api.error("[HR Decisions] Error", {}, err);
    return res.status(500).json({ error: "Failed to load decision queue" });
  }
});

/**
 * GET /api/hr/portfolio
 * Summary statistics for HR/employer portfolio view.
 */
router.get("/portfolio", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user!;
    const orgId = user.organizationId;

    const now = Date.now();
    const MS_PER_DAY = 24 * 60 * 60 * 1000;
    const thirtyDaysAgo = new Date(now - 30 * MS_PER_DAY);

    const allCases = await db
      .select({
        id: workerCases.id,
        caseStatus: workerCases.caseStatus,
        complianceIndicator: workerCases.complianceIndicator,
        dateOfInjury: workerCases.dateOfInjury,
        createdAt: workerCases.createdAt,
      })
      .from(workerCases)
      .where(eq(workerCases.organizationId, orgId));

    const openCases = allCases.filter(c => c.caseStatus === "open" || c.caseStatus == null);
    const newThisMonth = allCases.filter(c => c.createdAt && new Date(c.createdAt) >= thirtyDaysAgo).length;

    // Compliance score: % of open cases that are High or Very High compliance
    const compliantCount = openCases.filter(c =>
      c.complianceIndicator === "High" || c.complianceIndicator === "Very High"
    ).length;
    const complianceScore = openCases.length > 0
      ? Math.round((compliantCount / openCases.length) * 100)
      : 100;

    // Approaching termination (48+ weeks)
    const approachingTermination = openCases.filter(c => {
      if (!c.dateOfInjury) return false;
      const weeksOff = (now - new Date(c.dateOfInjury).getTime()) / (7 * MS_PER_DAY);
      return weeksOff >= 48;
    }).length;

    return res.json({
      activeClaims: openCases.length,
      newThisMonth,
      complianceScore,
      complianceDelta: null,          // Would need historical data
      approachingTermination,
      totalCases: allCases.length,
    });
  } catch (err) {
    logger.api.error("[HR Portfolio] Error", {}, err);
    return res.status(500).json({ error: "Failed to load portfolio summary" });
  }
});

export default router;
