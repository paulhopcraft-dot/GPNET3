import {
  WorkerCase,
  MedicalCertificate,
  ClinicalEvidenceFlag,
  WorkCapacity,
  RiskLevel,
  WorkStatus,
  RTWPlanStatus,
  ComplianceStatus,
  SpecialistStatus,
} from "../../shared/schema";
import { estimateRecoveryTimeline, RecoveryEstimate } from "./recoveryEstimator";

// Comprehensive worker profile summary

export interface WorkerProfileSummary {
  // Identity & Basic Info
  caseId: string;
  workerName: string;
  company: string;
  dateOfInjury: string;
  daysSinceInjury: number;
  caseOwner: string;

  // Current Status Snapshot
  statusSnapshot: {
    workStatus: WorkStatus;
    riskLevel: RiskLevel;
    complianceStatus: ComplianceStatus | "unknown";
    rtwPlanStatus: RTWPlanStatus | "not_planned";
    specialistStatus: SpecialistStatus | "none";
    employmentStatus: string;
  };

  // Medical Summary
  medicalSummary: {
    currentCapacity: WorkCapacity;
    hasCertificate: boolean;
    certificateExpiry: string | null;
    restrictions: string[];
    functionalLimits: string[];
    specialistDiagnosis: string | null;
    isImproving: boolean | null;
    surgeryPlanned: boolean;
  };

  // Recovery Progress
  recoveryProgress: {
    estimatedRecoveryDate: string | null;
    progressIndicator: "on_track" | "delayed" | "significantly_delayed" | "unknown";
    daysOffWork: number;
    injuryCategory: string;
    confidenceLevel: "low" | "medium" | "high";
  };

  // Active Flags & Risks
  activeFlags: {
    highRisk: ClinicalEvidenceFlag[];
    warnings: ClinicalEvidenceFlag[];
    info: ClinicalEvidenceFlag[];
  };
  riskFactorCount: number;
  positiveFactorCount: number;

  // Engagement Metrics
  engagement: {
    lastActivity: string | null;
    daysSinceLastActivity: number | null;
    lastFollowUp: string | null;
    nextFollowUp: string | null;
    ticketCount: number;
    hasRecentActivity: boolean;
  };

  // Key Actions & Next Steps
  nextStep: string;
  recommendations: string[];

  // AI Summary
  aiSummary: string | null;

  // Timestamps
  generatedAt: string;
}

export interface ProfileSection {
  title: string;
  items: ProfileItem[];
  severity?: "normal" | "warning" | "critical";
}

export interface ProfileItem {
  label: string;
  value: string;
  highlight?: boolean;
  severity?: "normal" | "warning" | "critical";
}

/**
 * Calculate days between two dates
 */
function daysBetween(date1: Date, date2: Date): number {
  return Math.floor((date2.getTime() - date1.getTime()) / (1000 * 60 * 60 * 24));
}

/**
 * Extract restrictions from medical constraints
 */
function extractRestrictions(workerCase: WorkerCase): string[] {
  const restrictions: string[] = [];
  const mc = workerCase.medicalConstraints;

  if (!mc) return restrictions;

  if (mc.noLiftingOverKg !== undefined) {
    restrictions.push(`No lifting over ${mc.noLiftingOverKg}kg`);
  }
  if (mc.noBending) restrictions.push("No bending");
  if (mc.noTwisting) restrictions.push("No twisting");
  if (mc.noProlongedStanding) restrictions.push("No prolonged standing");
  if (mc.noProlongedSitting) restrictions.push("No prolonged sitting");
  if (mc.noDriving) restrictions.push("No driving");
  if (mc.noClimbing) restrictions.push("No climbing");
  if (mc.otherConstraints) restrictions.push(mc.otherConstraints);

  return restrictions;
}

/**
 * Extract functional limits from functional capacity
 */
function extractFunctionalLimits(workerCase: WorkerCase): string[] {
  const limits: string[] = [];
  const fc = workerCase.functionalCapacity;

  if (!fc) return limits;

  if (fc.canLiftKg !== undefined) {
    limits.push(`Can lift up to ${fc.canLiftKg}kg`);
  }
  if (fc.canStandMinutes !== undefined) {
    limits.push(`Can stand up to ${fc.canStandMinutes} min`);
  }
  if (fc.canSitMinutes !== undefined) {
    limits.push(`Can sit up to ${fc.canSitMinutes} min`);
  }
  if (fc.canWalkMinutes !== undefined) {
    limits.push(`Can walk up to ${fc.canWalkMinutes} min`);
  }
  if (fc.maxWorkHoursPerDay !== undefined) {
    limits.push(`Max ${fc.maxWorkHoursPerDay} hours/day`);
  }
  if (fc.maxWorkDaysPerWeek !== undefined) {
    limits.push(`Max ${fc.maxWorkDaysPerWeek} days/week`);
  }
  if (fc.otherCapacityNotes) {
    limits.push(fc.otherCapacityNotes);
  }

  return limits;
}

/**
 * Group flags by severity
 */
function groupFlagsBySeverity(flags: ClinicalEvidenceFlag[]): {
  highRisk: ClinicalEvidenceFlag[];
  warnings: ClinicalEvidenceFlag[];
  info: ClinicalEvidenceFlag[];
} {
  return {
    highRisk: flags.filter((f) => f.severity === "high_risk"),
    warnings: flags.filter((f) => f.severity === "warning"),
    info: flags.filter((f) => f.severity === "info"),
  };
}

/**
 * Generate comprehensive worker profile summary
 */
export function generateWorkerProfile(
  workerCase: WorkerCase,
  certificates: MedicalCertificate[] = []
): WorkerProfileSummary {
  const now = new Date();
  const injuryDate = workerCase.dateOfInjury ? new Date(workerCase.dateOfInjury) : null;
  const daysSinceInjury = injuryDate && !Number.isNaN(injuryDate.getTime())
    ? daysBetween(injuryDate, now)
    : 0;

  // Get recovery estimate
  const recoveryEstimate = estimateRecoveryTimeline(workerCase, certificates);

  // Calculate engagement metrics
  let lastActivity: string | null = null;
  let daysSinceLastActivity: number | null = null;

  if (workerCase.ticketLastUpdatedAt) {
    lastActivity = workerCase.ticketLastUpdatedAt;
    const lastActivityDate = new Date(workerCase.ticketLastUpdatedAt);
    if (!Number.isNaN(lastActivityDate.getTime())) {
      daysSinceLastActivity = daysBetween(lastActivityDate, now);
    }
  }

  // Get certificate expiry
  let certificateExpiry: string | null = null;
  if (workerCase.latestCertificate?.endDate) {
    certificateExpiry = workerCase.latestCertificate.endDate;
  }

  // Group flags
  const flags = workerCase.clinicalEvidence?.flags || [];
  const groupedFlags = groupFlagsBySeverity(flags);

  // Build profile
  const profile: WorkerProfileSummary = {
    caseId: workerCase.id,
    workerName: workerCase.workerName,
    company: workerCase.company,
    dateOfInjury: workerCase.dateOfInjury,
    daysSinceInjury,
    caseOwner: workerCase.owner,

    statusSnapshot: {
      workStatus: workerCase.workStatus as WorkStatus,
      riskLevel: workerCase.riskLevel as RiskLevel,
      complianceStatus: workerCase.complianceStatus || "unknown",
      rtwPlanStatus: workerCase.rtwPlanStatus || "not_planned",
      specialistStatus: workerCase.specialistStatus || "none",
      employmentStatus: workerCase.employmentStatus || "ACTIVE",
    },

    medicalSummary: {
      currentCapacity: workerCase.latestCertificate?.capacity ||
        (workerCase.workStatus === "At work" ? "partial" : "unfit"),
      hasCertificate: workerCase.hasCertificate,
      certificateExpiry,
      restrictions: extractRestrictions(workerCase),
      functionalLimits: extractFunctionalLimits(workerCase),
      specialistDiagnosis: workerCase.specialistReportSummary?.diagnosisSummary || null,
      isImproving: workerCase.specialistReportSummary?.improving ?? null,
      surgeryPlanned: workerCase.specialistReportSummary?.surgeryLikely || false,
    },

    recoveryProgress: {
      estimatedRecoveryDate: recoveryEstimate.estimatedRecoveryDate,
      progressIndicator: recoveryEstimate.progressIndicator,
      daysOffWork: recoveryEstimate.daysOffWork,
      injuryCategory: recoveryEstimate.injuryCategory.replace(/_/g, " "),
      confidenceLevel: recoveryEstimate.confidenceLevel,
    },

    activeFlags: groupedFlags,
    riskFactorCount: recoveryEstimate.riskFactors.length,
    positiveFactorCount: recoveryEstimate.positiveFactors.length,

    engagement: {
      lastActivity,
      daysSinceLastActivity,
      lastFollowUp: workerCase.clcLastFollowUp || null,
      nextFollowUp: workerCase.clcNextFollowUp || null,
      ticketCount: workerCase.ticketCount,
      hasRecentActivity: daysSinceLastActivity !== null && daysSinceLastActivity <= 14,
    },

    nextStep: workerCase.nextStep,
    recommendations: recoveryEstimate.recommendations,

    aiSummary: workerCase.aiSummary || null,

    generatedAt: now.toISOString(),
  };

  return profile;
}

/**
 * Format profile as structured sections for UI display
 */
export function formatProfileSections(profile: WorkerProfileSummary): ProfileSection[] {
  const sections: ProfileSection[] = [];

  // Basic Info Section
  sections.push({
    title: "Worker Information",
    items: [
      { label: "Name", value: profile.workerName },
      { label: "Company", value: profile.company },
      { label: "Case Owner", value: profile.caseOwner },
      { label: "Date of Injury", value: profile.dateOfInjury },
      { label: "Days Since Injury", value: `${profile.daysSinceInjury} days` },
    ],
  });

  // Status Section
  const statusSeverity = profile.statusSnapshot.riskLevel === "High" ? "critical" :
    profile.statusSnapshot.riskLevel === "Medium" ? "warning" : "normal";

  sections.push({
    title: "Current Status",
    severity: statusSeverity,
    items: [
      {
        label: "Work Status",
        value: profile.statusSnapshot.workStatus,
        highlight: profile.statusSnapshot.workStatus === "Off work",
      },
      {
        label: "Risk Level",
        value: profile.statusSnapshot.riskLevel,
        severity: statusSeverity,
      },
      { label: "Compliance", value: profile.statusSnapshot.complianceStatus },
      { label: "RTW Plan", value: profile.statusSnapshot.rtwPlanStatus.replace(/_/g, " ") },
      { label: "Employment", value: profile.statusSnapshot.employmentStatus },
    ],
  });

  // Medical Section
  const medicalSeverity = profile.medicalSummary.currentCapacity === "unfit" ? "warning" : "normal";
  const medicalItems: ProfileItem[] = [
    { label: "Current Capacity", value: profile.medicalSummary.currentCapacity },
    { label: "Certificate", value: profile.medicalSummary.hasCertificate ? "Yes" : "No" },
  ];

  if (profile.medicalSummary.certificateExpiry) {
    medicalItems.push({ label: "Certificate Expires", value: profile.medicalSummary.certificateExpiry });
  }

  if (profile.medicalSummary.restrictions.length > 0) {
    medicalItems.push({
      label: "Restrictions",
      value: profile.medicalSummary.restrictions.join(", "),
    });
  }

  if (profile.medicalSummary.functionalLimits.length > 0) {
    medicalItems.push({
      label: "Functional Limits",
      value: profile.medicalSummary.functionalLimits.join(", "),
    });
  }

  if (profile.medicalSummary.specialistDiagnosis) {
    medicalItems.push({ label: "Diagnosis", value: profile.medicalSummary.specialistDiagnosis });
  }

  if (profile.medicalSummary.isImproving !== null) {
    medicalItems.push({
      label: "Improving",
      value: profile.medicalSummary.isImproving ? "Yes" : "No",
      severity: profile.medicalSummary.isImproving ? "normal" : "warning",
    });
  }

  if (profile.medicalSummary.surgeryPlanned) {
    medicalItems.push({
      label: "Surgery",
      value: "Planned",
      severity: "warning",
    });
  }

  sections.push({
    title: "Medical Summary",
    severity: medicalSeverity,
    items: medicalItems,
  });

  // Recovery Progress Section
  const progressSeverity = profile.recoveryProgress.progressIndicator === "significantly_delayed" ? "critical" :
    profile.recoveryProgress.progressIndicator === "delayed" ? "warning" : "normal";

  const progressItems: ProfileItem[] = [
    { label: "Injury Category", value: profile.recoveryProgress.injuryCategory },
    {
      label: "Progress",
      value: profile.recoveryProgress.progressIndicator.replace(/_/g, " "),
      severity: progressSeverity,
    },
    { label: "Days Off Work", value: `${profile.recoveryProgress.daysOffWork} days` },
  ];

  if (profile.recoveryProgress.estimatedRecoveryDate) {
    progressItems.push({
      label: "Est. Recovery",
      value: profile.recoveryProgress.estimatedRecoveryDate,
    });
  }

  progressItems.push({
    label: "Confidence",
    value: profile.recoveryProgress.confidenceLevel,
  });

  sections.push({
    title: "Recovery Progress",
    severity: progressSeverity,
    items: progressItems,
  });

  // Engagement Section
  const engagementSeverity = !profile.engagement.hasRecentActivity ? "warning" : "normal";
  const engagementItems: ProfileItem[] = [
    { label: "Ticket Count", value: `${profile.engagement.ticketCount}` },
  ];

  if (profile.engagement.lastActivity) {
    engagementItems.push({
      label: "Last Activity",
      value: `${profile.engagement.daysSinceLastActivity} days ago`,
      severity: (profile.engagement.daysSinceLastActivity || 0) > 30 ? "warning" : "normal",
    });
  }

  if (profile.engagement.lastFollowUp) {
    engagementItems.push({ label: "Last Follow-up", value: profile.engagement.lastFollowUp });
  }

  if (profile.engagement.nextFollowUp) {
    engagementItems.push({ label: "Next Follow-up", value: profile.engagement.nextFollowUp });
  }

  sections.push({
    title: "Engagement",
    severity: engagementSeverity,
    items: engagementItems,
  });

  // Flags Section (only if there are flags)
  const totalFlags = profile.activeFlags.highRisk.length +
    profile.activeFlags.warnings.length +
    profile.activeFlags.info.length;

  if (totalFlags > 0) {
    const flagItems: ProfileItem[] = [];

    if (profile.activeFlags.highRisk.length > 0) {
      flagItems.push({
        label: "High Risk",
        value: profile.activeFlags.highRisk.map(f => f.message).join("; "),
        severity: "critical",
      });
    }

    if (profile.activeFlags.warnings.length > 0) {
      flagItems.push({
        label: "Warnings",
        value: profile.activeFlags.warnings.map(f => f.message).join("; "),
        severity: "warning",
      });
    }

    if (profile.activeFlags.info.length > 0) {
      flagItems.push({
        label: "Info",
        value: profile.activeFlags.info.map(f => f.message).join("; "),
      });
    }

    sections.push({
      title: "Active Flags",
      severity: profile.activeFlags.highRisk.length > 0 ? "critical" : "warning",
      items: flagItems,
    });
  }

  // Recommendations Section
  if (profile.recommendations.length > 0) {
    sections.push({
      title: "Recommendations",
      items: profile.recommendations.map((rec, idx) => ({
        label: `${idx + 1}`,
        value: rec,
      })),
    });
  }

  return sections;
}

/**
 * Generate a one-line status summary for the worker
 */
export function getStatusLine(profile: WorkerProfileSummary): string {
  const parts: string[] = [];

  // Work status
  parts.push(profile.statusSnapshot.workStatus);

  // Risk level if high/medium
  if (profile.statusSnapshot.riskLevel !== "Low") {
    parts.push(`${profile.statusSnapshot.riskLevel} risk`);
  }

  // Progress indicator
  if (profile.recoveryProgress.progressIndicator !== "on_track" &&
      profile.recoveryProgress.progressIndicator !== "unknown") {
    parts.push(profile.recoveryProgress.progressIndicator.replace(/_/g, " "));
  }

  // Key flag count
  const flagCount = profile.activeFlags.highRisk.length + profile.activeFlags.warnings.length;
  if (flagCount > 0) {
    parts.push(`${flagCount} active flag${flagCount > 1 ? "s" : ""}`);
  }

  return parts.join(" | ");
}
