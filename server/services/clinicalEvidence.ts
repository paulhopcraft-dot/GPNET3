import {
  WorkerCase,
  ClinicalEvidenceEvaluation,
  ClinicalEvidenceFlag,
  DutySafetyStatus,
} from "../../shared/schema";
import { buildClinicalActionRecommendations } from "./clinicalActions";

const CERTIFICATE_STALE_DAYS = 42;
const CERTIFICATE_EXPIRING_SOON_DAYS = 7;
const SPECIALIST_OUTDATED_DAYS = 90;
const DISENGAGED_THRESHOLD_DAYS = 30;
const LONG_TAIL_THRESHOLD_DAYS = 180;

// Psychological injury keywords for detection
const PSYCH_KEYWORDS = [
  "ptsd",
  "post-traumatic",
  "posttraumatic",
  "psychological",
  "psych",
  "mental health",
  "anxiety",
  "depression",
  "stress",
  "trauma",
  "psychiatric",
  "psychosocial",
];

function daysSince(date: Date): number {
  const now = Date.now();
  return Math.floor((now - date.getTime()) / (1000 * 60 * 60 * 24));
}

function daysUntil(date: Date): number {
  const now = Date.now();
  return Math.floor((date.getTime() - now) / (1000 * 60 * 60 * 24));
}

function containsPsychKeywords(text: string | undefined | null): boolean {
  if (!text) return false;
  const lowerText = text.toLowerCase();
  return PSYCH_KEYWORDS.some((keyword) => lowerText.includes(keyword));
}

function latestCertificateDate(workerCase: WorkerCase): Date | null {
  if (workerCase.latestCertificate?.endDate) {
    const d = new Date(workerCase.latestCertificate.endDate);
    if (!Number.isNaN(d.getTime())) return d;
  }
  if (workerCase.latestCertificate?.startDate) {
    const d = new Date(workerCase.latestCertificate.startDate);
    if (!Number.isNaN(d.getTime())) return d;
  }
  if (workerCase.certificateHistory && workerCase.certificateHistory.length > 0) {
    const last = workerCase.certificateHistory[workerCase.certificateHistory.length - 1];
    const end = last.endDate || last.startDate;
    if (end) {
      const d = new Date(end);
      if (!Number.isNaN(d.getTime())) return d;
    }
  }
  return null;
}

function hasMeaningfulTreatmentPlan(workerCase: WorkerCase): boolean {
  const constraints = workerCase.medicalConstraints;
  const functional = workerCase.functionalCapacity;
  const specialistFunctional = workerCase.specialistReportSummary?.functionalSummary;

  const constraintValues = constraints
    ? Object.values(constraints).filter((v) => v !== undefined && v !== null && v !== false)
    : [];
  const functionalValues = functional
    ? Object.values(functional).filter((v) => v !== undefined && v !== null)
    : [];

  return (
    (constraintValues.length > 0 && constraintValues.some((v) => v !== "")) ||
    (functionalValues.length > 0 && functionalValues.some((v) => v !== "")) ||
    Boolean(specialistFunctional && specialistFunctional.trim() !== "")
  );
}

function addFlag(flags: ClinicalEvidenceFlag[], flag: ClinicalEvidenceFlag) {
  flags.push(flag);
}

export function evaluateClinicalEvidence(workerCase: WorkerCase): ClinicalEvidenceEvaluation {
  const flags: ClinicalEvidenceFlag[] = [];

  const hasTreatmentPlan = hasMeaningfulTreatmentPlan(workerCase);
  const latestCertDate = latestCertificateDate(workerCase);
  const hasCert = Boolean(workerCase.hasCertificate || workerCase.certificateHistory?.length);

  if (!hasTreatmentPlan && workerCase.dateOfInjury) {
    addFlag(flags, {
      code: "MISSING_TREATMENT_PLAN",
      severity: "warning",
      message: "No clear treatment plan, constraints, or capacity documented.",
    });
  }

  let hasCurrentCertificate = false;
  if (hasCert && latestCertDate) {
    const age = daysSince(latestCertDate);
    if (age > CERTIFICATE_STALE_DAYS) {
      addFlag(flags, {
        code: "CERTIFICATE_OUT_OF_DATE",
        severity: workerCase.riskLevel === "High" ? "high_risk" : "warning",
        message: `Latest certificate is ${age} days old.`,
        details: `Last certificate dated ${latestCertDate.toISOString()}`,
      });
    } else {
      hasCurrentCertificate = true;
    }
  } else if (workerCase.dateOfInjury) {
    addFlag(flags, {
      code: "NO_RECENT_CERTIFICATE",
      severity: "warning",
      message: "No certificate on file for this injury.",
    });
  }

  let isImprovingOnExpectedTimeline: boolean | null = null;
  if (workerCase.rtwPlanStatus === "working_well") {
    isImprovingOnExpectedTimeline = true;
  } else if (workerCase.rtwPlanStatus === "failing") {
    isImprovingOnExpectedTimeline = false;
    addFlag(flags, {
      code: "RTW_PLAN_FAILING",
      severity: "high_risk",
      message: "RTW plan is failing.",
    });
  }

  if (workerCase.complianceStatus === "non_compliant") {
    addFlag(flags, {
      code: "WORKER_NON_COMPLIANT",
      severity: "high_risk",
      message: "Worker marked as non-compliant.",
    });
  }

  const specialistStatus = workerCase.specialistStatus || "none";
  const specialistSummary = workerCase.specialistReportSummary;
  const lastAppointmentDate = specialistSummary?.lastAppointmentDate
    ? new Date(specialistSummary.lastAppointmentDate)
    : null;
  let specialistReportPresent = Boolean(specialistSummary);
  let specialistReportCurrent: boolean | null = null;

  if (specialistStatus === "referred") {
    addFlag(flags, {
      code: "SPECIALIST_REFERRED_NO_APPOINTMENT",
      severity: "warning",
      message: "Specialist referral recorded but no appointment information.",
    });
  } else if (specialistStatus === "appointment_booked" && lastAppointmentDate) {
    if (lastAppointmentDate.getTime() < Date.now()) {
      addFlag(flags, {
        code: "SPECIALIST_APPOINTMENT_OVERDUE",
        severity: "warning",
        message: "Specialist appointment date is in the past; follow-up needed.",
        details: `Last appointment date: ${lastAppointmentDate.toISOString()}`,
      });
    }
  } else if (specialistStatus === "seen_waiting_report") {
    if (!specialistSummary) {
      addFlag(flags, {
        code: "SPECIALIST_SEEN_NO_REPORT",
        severity: "warning",
        message: "Specialist seen but report not recorded.",
      });
    }
  } else if (specialistStatus === "report_received") {
    if (lastAppointmentDate && daysSince(lastAppointmentDate) > SPECIALIST_OUTDATED_DAYS) {
      addFlag(flags, {
        code: "SPECIALIST_REPORT_OUTDATED",
        severity: "warning",
        message: "Specialist report may be outdated.",
        details: `Last appointment ${daysSince(lastAppointmentDate)} days ago.`,
      });
      specialistReportCurrent = false;
    } else {
      specialistReportCurrent = true;
    }
  }

  const highRiskPresent = flags.some((f) => f.severity === "high_risk");
  let dutySafetyStatus: DutySafetyStatus = "unknown";

  if (
    (workerCase.complianceStatus === "non_compliant" ||
      workerCase.rtwPlanStatus === "failing" ||
      highRiskPresent) &&
    (workerCase.medicalConstraints || workerCase.riskLevel === "High")
  ) {
    dutySafetyStatus = "unsafe";
  } else if (
    hasCurrentCertificate &&
    hasTreatmentPlan &&
    !highRiskPresent &&
    workerCase.rtwPlanStatus === "working_well" &&
    workerCase.complianceStatus !== "non_compliant"
  ) {
    dutySafetyStatus = "safe";
  }

  if (
    !hasTreatmentPlan &&
    !hasCurrentCertificate &&
    !workerCase.specialistStatus &&
    !workerCase.complianceStatus &&
    !workerCase.rtwPlanStatus
  ) {
    addFlag(flags, {
      code: "EVIDENCE_INCOMPLETE",
      severity: "warning",
      message: "Insufficient clinical evidence recorded.",
    });
  }

  // NEW: Certificate expiring soon (within 7 days)
  if (hasCert && latestCertDate) {
    const daysRemaining = daysUntil(latestCertDate);
    if (daysRemaining >= 0 && daysRemaining <= CERTIFICATE_EXPIRING_SOON_DAYS) {
      addFlag(flags, {
        code: "CERTIFICATE_EXPIRING_SOON",
        severity: "warning",
        message: `Certificate expires in ${daysRemaining} day${daysRemaining === 1 ? "" : "s"}.`,
        details: `Expiry date: ${latestCertDate.toISOString().split("T")[0]}`,
      });
    }
  }

  // NEW: Overdue CLC follow-up
  if (workerCase.clcNextFollowUp) {
    const nextFollowUp = new Date(workerCase.clcNextFollowUp);
    if (!Number.isNaN(nextFollowUp.getTime())) {
      const overdueDays = daysSince(nextFollowUp);
      if (overdueDays > 0) {
        addFlag(flags, {
          code: "OVERDUE_FOLLOW_UP",
          severity: overdueDays > 14 ? "high_risk" : "warning",
          message: `CLC follow-up overdue by ${overdueDays} day${overdueDays === 1 ? "" : "s"}.`,
          details: `Scheduled: ${nextFollowUp.toISOString().split("T")[0]}`,
        });
      }
    }
  }

  // NEW: Worker disengaged (no activity in 30+ days)
  const lastActivityDate = workerCase.ticketLastUpdatedAt
    ? new Date(workerCase.ticketLastUpdatedAt)
    : null;
  if (lastActivityDate && !Number.isNaN(lastActivityDate.getTime())) {
    const inactiveDays = daysSince(lastActivityDate);
    if (inactiveDays > DISENGAGED_THRESHOLD_DAYS) {
      addFlag(flags, {
        code: "WORKER_DISENGAGED",
        severity: inactiveDays > 60 ? "high_risk" : "warning",
        message: `No case activity for ${inactiveDays} days.`,
        details: `Last activity: ${lastActivityDate.toISOString().split("T")[0]}`,
      });
    }
  }

  // NEW: Long-tail case (open 180+ days without resolution)
  if (workerCase.dateOfInjury && workerCase.workStatus === "Off work") {
    const injuryDate = new Date(workerCase.dateOfInjury);
    if (!Number.isNaN(injuryDate.getTime())) {
      const caseDuration = daysSince(injuryDate);
      if (caseDuration > LONG_TAIL_THRESHOLD_DAYS) {
        addFlag(flags, {
          code: "LONG_TAIL_CASE",
          severity: "high_risk",
          message: `Case open for ${caseDuration} days with worker still off work.`,
          details: `Injury date: ${injuryDate.toISOString().split("T")[0]}`,
        });
      }
    }
  }

  // NEW: Psychological injury marker
  const textToScan = [
    workerCase.summary,
    workerCase.aiSummary,
    workerCase.currentStatus,
    workerCase.aiWorkStatusClassification,
  ].join(" ");
  if (containsPsychKeywords(textToScan)) {
    addFlag(flags, {
      code: "PSYCHOLOGICAL_INJURY_MARKER",
      severity: "info",
      message: "Psychological or mental health component detected.",
      details: "Case may require specialized psych support or IME referral.",
    });
  }

  const lastClinicalUpdateDate =
    latestCertDate?.toISOString() ||
    specialistSummary?.lastAppointmentDate ||
    undefined;

  const evaluation: ClinicalEvidenceEvaluation = {
    caseId: workerCase.id,
    hasCurrentTreatmentPlan: hasTreatmentPlan,
    hasCurrentCertificate,
    isImprovingOnExpectedTimeline,
    dutySafetyStatus,
    specialistStatus,
    specialistReportPresent,
    specialistReportCurrent,
    rtwPlanStatus: workerCase.rtwPlanStatus,
    complianceStatus: workerCase.complianceStatus,
    flags,
    lastClinicalUpdateDate,
  };

  evaluation.recommendedActions = buildClinicalActionRecommendations(workerCase, evaluation);
  return evaluation;
}
