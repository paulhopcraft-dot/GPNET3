/**
 * Phase 7.2 — Compliance Deadline Events
 *
 * Computes synthetic timeline events for upcoming and overdue
 * compliance milestones. These are NOT stored in the DB — they are
 * computed at response time and merged into the timeline output.
 */

import type { TimelineEvent, CaseClinicalStatus } from "@shared/schema";

/** Minimal case shape needed for deadline computation (works with WorkerCase and WorkerCaseDB) */
interface CaseForDeadlines {
  id: string;
  dateOfInjury: string | Date;
  workStatus: string | null;
  clinicalStatusJson?: CaseClinicalStatus | Record<string, any> | null;
}

/** Add business days (Mon–Fri) to a date */
function addBusinessDays(start: Date, days: number): Date {
  const result = new Date(start);
  let added = 0;
  while (added < days) {
    result.setDate(result.getDate() + 1);
    const day = result.getDay();
    if (day !== 0 && day !== 6) added++;
  }
  return result;
}

function addWeeks(start: Date, weeks: number): Date {
  const d = new Date(start);
  d.setDate(d.getDate() + weeks * 7);
  return d;
}

function daysDiff(a: Date, b: Date): number {
  return Math.round((b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24));
}

type DeadlineSeverity = "info" | "warning" | "critical";

function deadlineSeverity(deadlineDate: Date, today: Date): DeadlineSeverity {
  const days = daysDiff(today, deadlineDate);
  if (days < 0) return "critical";   // Overdue
  if (days <= 7) return "warning";   // Due within a week
  return "info";                     // Upcoming
}

function deadlinePrefix(deadlineDate: Date, today: Date): string {
  const days = daysDiff(today, deadlineDate);
  if (days < 0) return `Overdue by ${Math.abs(days)} day${Math.abs(days) !== 1 ? "s" : ""}`;
  if (days === 0) return "Due today";
  if (days <= 7) return `Due in ${days} day${days !== 1 ? "s" : ""}`;
  return `Due ${deadlineDate.toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" })}`;
}

interface ComplianceDeadline {
  ruleCode: string;
  title: string;
  description: string;
  deadlineDate: Date;
  legislativeRef: string;
  applicable: boolean;
}

/**
 * Compute all compliance deadlines for a case.
 * Returns only applicable milestones (skips those not relevant to this case).
 */
export function computeComplianceDeadlines(
  workerCase: CaseForDeadlines,
  latestCertEndDate?: Date | null,
): TimelineEvent[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const injuryDate = new Date(workerCase.dateOfInjury as string);
  const isOffWork = workerCase.workStatus === "Off work";
  const weeksSince = daysDiff(injuryDate, today) / 7;
  const clinicalStatus = workerCase.clinicalStatusJson as { rtwPlanStatus?: string } | null | undefined;
  const rtwStatus = clinicalStatus?.rtwPlanStatus;

  const deadlines: ComplianceDeadline[] = [
    // 1. Claim notification — 10 business days from injury
    {
      ruleCode: "CLAIM_NOTIFICATION",
      title: "Claim Notification Deadline (s25)",
      description: "Employer must notify the insurer within 10 business days of becoming aware of the injury.",
      deadlineDate: addBusinessDays(injuryDate, 10),
      legislativeRef: "WIRC Act 2013, s25",
      applicable: weeksSince < 4, // Only show for recent claims
    },

    // 2. RTW plan — 10 weeks from injury (serious injuries)
    {
      ruleCode: "RTW_PLAN_10WK",
      title: "RTW Plan Due (10 Weeks)",
      description: "A return-to-work plan must be developed within 10 weeks of injury for serious injuries.",
      deadlineDate: addWeeks(injuryDate, 10),
      legislativeRef: "WorkSafe RTW Code of Practice, cl.4.3",
      applicable: isOffWork && (rtwStatus === "not_planned" || rtwStatus === "planned_not_started" || !rtwStatus),
    },

    // 3. 13-week payment step-down
    {
      ruleCode: "PAYMENT_STEPDOWN",
      title: "Payment Step-Down to 80% (13 Weeks)",
      description: "Weekly compensation reduces to 80% of PIAWE at 13 weeks off work.",
      deadlineDate: addWeeks(injuryDate, 13),
      legislativeRef: "WIRC Act 2013, s114",
      applicable: isOffWork && weeksSince < 16,
    },

    // 4. 52-week payment step-down
    {
      ruleCode: "PAYMENT_STEPDOWN_52WK",
      title: "Payment Step-Down to 75% (52 Weeks)",
      description: "Weekly compensation reduces to 75% of PIAWE at 52 weeks off work.",
      deadlineDate: addWeeks(injuryDate, 52),
      legislativeRef: "WIRC Act 2013, s114(2)",
      applicable: isOffWork && weeksSince > 40 && weeksSince < 60,
    },

    // 5. 52-week termination protection expires
    {
      ruleCode: "TERMINATION_ELIGIBILITY",
      title: "Termination Protection Expires (52 Weeks)",
      description: "Employer's obligation not to terminate solely due to injury expires after 52 weeks of incapacity.",
      deadlineDate: addWeeks(injuryDate, 52),
      legislativeRef: "WIRC Act 2013, s242",
      applicable: isOffWork && weeksSince > 44 && weeksSince < 60,
    },

    // 6. 130-week payment cessation
    {
      ruleCode: "PAYMENT_STEPDOWN_130WK",
      title: "Payment Cessation Risk (130 Weeks)",
      description: "Weekly compensation generally ceases at 130 weeks unless serious injury threshold is met.",
      deadlineDate: addWeeks(injuryDate, 130),
      legislativeRef: "WIRC Act 2013, s114(3)",
      applicable: isOffWork && weeksSince > 118 && weeksSince < 140,
    },

    // 7. Certificate expiry (from latest cert)
    ...(latestCertEndDate && isOffWork ? [{
      ruleCode: "CERT_CURRENT",
      title: "Medical Certificate Expires",
      description: "Current medical certificate expires. A new certificate is required for continued weekly payments.",
      deadlineDate: latestCertEndDate,
      legislativeRef: "WIRC Act 2013, s112",
      applicable: daysDiff(today, latestCertEndDate) <= 14, // Only show within 14 days
    }] : []),
  ];

  return deadlines
    .filter(d => d.applicable)
    .map((d, idx): TimelineEvent => {
      const severity = deadlineSeverity(d.deadlineDate, today);
      const prefix = deadlinePrefix(d.deadlineDate, today);
      return {
        id: `compliance-deadline-${d.ruleCode}-${idx}`,
        caseId: workerCase.id,
        eventType: "compliance_deadline",
        timestamp: d.deadlineDate.toISOString(),
        title: d.title,
        description: `${prefix}. ${d.description}`,
        severity,
        icon: severity === "critical" ? "error" : severity === "warning" ? "schedule" : "event",
        metadata: {
          ruleCode: d.ruleCode,
          legislativeRef: d.legislativeRef,
          isOverdue: daysDiff(today, d.deadlineDate) < 0,
          isFuture: daysDiff(today, d.deadlineDate) > 0,
        },
      };
    });
}
