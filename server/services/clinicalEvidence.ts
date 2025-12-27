import {
  WorkerCase,
  ClinicalEvidenceEvaluation,
  ClinicalEvidenceFlag,
  DutySafetyStatus,
} from "../../shared/schema";
import { buildClinicalActionRecommendations } from "./clinicalActions";

const CERTIFICATE_STALE_DAYS = 42;
const SPECIALIST_OUTDATED_DAYS = 90;

function daysSince(date: Date): number {
  const now = Date.now();
  return Math.floor((now - date.getTime()) / (1000 * 60 * 60 * 24));
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
  // Check for active AI-generated treatment plan
  const treatmentPlan = workerCase.clinical_status_json?.treatmentPlan;
  if (treatmentPlan && treatmentPlan.status === "active") {
    return true;
  }

  // Fallback: check for medical constraints or functional capacity documentation
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

  // Check for outdated treatment plan (>90 days old)
  const treatmentPlan = workerCase.clinical_status_json?.treatmentPlan;
  if (treatmentPlan && treatmentPlan.status === "active" && treatmentPlan.generatedAt) {
    const planAge = daysSince(new Date(treatmentPlan.generatedAt));
    if (planAge > 90) {
      addFlag(flags, {
        code: "TREATMENT_PLAN_OUTDATED",
        severity: "warning",
        message: `Treatment plan is ${planAge} days old and may need review.`,
        details: `Plan generated on ${new Date(treatmentPlan.generatedAt).toLocaleDateString("en-AU")}`,
      });
    }
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
