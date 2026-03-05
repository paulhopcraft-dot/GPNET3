/**
 * Action Rationale — Phase 2 Explanation Layer
 *
 * Computes a plain-English "why now" rationale for each case action.
 * This is computed at response time, not persisted — no DB migration needed.
 */

import type { CaseAction, CaseActionDB } from "@shared/schema";

type AnyAction = CaseAction | CaseActionDB;

const MS_PER_DAY = 1000 * 60 * 60 * 24;

function daysBetween(a: Date, b: Date): number {
  return Math.round(Math.abs(b.getTime() - a.getTime()) / MS_PER_DAY);
}

function daysUntil(date: string | Date | null | undefined): number | null {
  if (!date) return null;
  const d = typeof date === "string" ? new Date(date) : date;
  if (isNaN(d.getTime())) return null;
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  d.setHours(0, 0, 0, 0);
  return Math.ceil((d.getTime() - now.getTime()) / MS_PER_DAY);
}

/**
 * Returns a one-line rationale explaining why the given action is needed now.
 * Falls back to a generic rationale if specific context is unavailable.
 */
export function computeActionRationale(action: AnyAction): string {
  const due = daysUntil(action.dueDate ?? null);

  switch (action.type) {
    case "chase_certificate": {
      if (due !== null && due <= 0) {
        const overdue = Math.abs(due);
        return `Certificate expired ${overdue === 0 ? "today" : `${overdue} day${overdue === 1 ? "" : "s"} ago`}. A gap in certification means no duties can be assigned to the worker.`;
      }
      if (due !== null && due <= 3) {
        return `Current certificate expires in ${due === 0 ? "today" : `${due} day${due === 1 ? "" : "s"}`}. Request an updated certificate before expiry to avoid a break in cover.`;
      }
      return "A valid medical certificate must be on file at all times during an active claim (WIRC Act 2013, s112). Request an updated certificate from the treating GP.";
    }

    case "review_case": {
      if (due !== null && due < 0) {
        const overdue = Math.abs(due);
        return `Case review is overdue by ${overdue} day${overdue === 1 ? "" : "s"}. Regular reviews are required at least every 8 weeks (WorkSafe Claims Manual, ch.7) to maintain compliance.`;
      }
      if (action.notes?.toLowerCase().includes("rtw")) {
        return "Worker has capacity for modified duties. An RTW plan must be in place within 10 weeks of the claim under WorkSafe RTW Code of Practice, cl.4.3.";
      }
      return "Case files must be reviewed at least every 8 weeks (WorkSafe Claims Manual, ch.7). Stale reviews increase risk of missed compliance obligations.";
    }

    case "follow_up": {
      if (due !== null && due <= 0) {
        return `Follow-up is overdue. Delayed contact may affect RTW cooperation obligations under WIRC Act 2013, s82-83.`;
      }
      if (action.notes?.toLowerCase().includes("employer")) {
        return "Employer consultation is required to identify suitable duties now that the worker's certificate shows capacity for modified work (WIRC Act 2013, s82(2)).";
      }
      if (action.notes?.toLowerCase().includes("treatment") || action.notes?.toLowerCase().includes("gp")) {
        return "Worker is behind expected recovery timeline. A treatment plan review may identify opportunities to adjust the approach and accelerate recovery.";
      }
      return "Active follow-up is required to maintain RTW momentum and meet cooperation obligations (WIRC Act 2013, s82-83).";
    }

    default:
      return "Action required to maintain case compliance.";
  }
}
