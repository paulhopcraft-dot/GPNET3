import { randomUUID } from "crypto";
import { WorkerCase } from "../../shared/schema";

// Treatment plan generator for worker injury cases

export type TreatmentType =
  | "physiotherapy"
  | "occupational_therapy"
  | "gp_review"
  | "specialist_review"
  | "psychological_support"
  | "pain_management"
  | "exercise_program"
  | "hydrotherapy"
  | "medication_review"
  | "workplace_assessment"
  | "functional_capacity_evaluation"
  | "case_conference";

export type TreatmentPriority = "essential" | "recommended" | "optional";
export type TreatmentFrequency = "daily" | "twice_weekly" | "weekly" | "fortnightly" | "monthly" | "as_needed" | "once";

export interface TreatmentItem {
  id: string;
  type: TreatmentType;
  name: string;
  description: string;
  priority: TreatmentPriority;
  frequency: TreatmentFrequency;
  durationWeeks: number;
  estimatedSessions: number;
  provider: string;
  goals: string[];
  notes?: string;
}

export interface TreatmentMilestone {
  id: string;
  weekNumber: number;
  description: string;
  expectedOutcome: string;
  assessmentCriteria: string[];
}

export interface TreatmentPlan {
  id: string;
  caseId: string;
  workerName: string;
  createdAt: string;
  injuryCategory: string;
  currentCapacity: string;

  // Treatment items
  treatments: TreatmentItem[];

  // Timeline
  totalDurationWeeks: number;
  milestones: TreatmentMilestone[];

  // Goals
  shortTermGoals: string[];
  longTermGoals: string[];

  // Monitoring
  reviewFrequency: string;
  escalationTriggers: string[];

  // Summary
  summary: string;
  rationale: string;
}

// Treatment templates by injury category
const TREATMENT_TEMPLATES: Record<string, Partial<TreatmentItem>[]> = {
  musculoskeletal_minor: [
    { type: "physiotherapy", name: "Physiotherapy", priority: "essential", frequency: "twice_weekly", durationWeeks: 4, estimatedSessions: 8 },
    { type: "gp_review", name: "GP Review", priority: "essential", frequency: "fortnightly", durationWeeks: 4, estimatedSessions: 2 },
    { type: "exercise_program", name: "Home Exercise Program", priority: "recommended", frequency: "daily", durationWeeks: 6, estimatedSessions: 42 },
  ],
  musculoskeletal_moderate: [
    { type: "physiotherapy", name: "Physiotherapy", priority: "essential", frequency: "twice_weekly", durationWeeks: 8, estimatedSessions: 16 },
    { type: "gp_review", name: "GP Review", priority: "essential", frequency: "fortnightly", durationWeeks: 8, estimatedSessions: 4 },
    { type: "specialist_review", name: "Specialist Consultation", priority: "essential", frequency: "once", durationWeeks: 2, estimatedSessions: 1 },
    { type: "pain_management", name: "Pain Management", priority: "recommended", frequency: "as_needed", durationWeeks: 8, estimatedSessions: 4 },
    { type: "exercise_program", name: "Supervised Exercise", priority: "essential", frequency: "twice_weekly", durationWeeks: 8, estimatedSessions: 16 },
  ],
  musculoskeletal_severe: [
    { type: "specialist_review", name: "Specialist Review", priority: "essential", frequency: "monthly", durationWeeks: 12, estimatedSessions: 3 },
    { type: "physiotherapy", name: "Intensive Physiotherapy", priority: "essential", frequency: "twice_weekly", durationWeeks: 12, estimatedSessions: 24 },
    { type: "pain_management", name: "Pain Management Program", priority: "essential", frequency: "weekly", durationWeeks: 8, estimatedSessions: 8 },
    { type: "gp_review", name: "GP Monitoring", priority: "essential", frequency: "fortnightly", durationWeeks: 12, estimatedSessions: 6 },
    { type: "functional_capacity_evaluation", name: "FCE Assessment", priority: "essential", frequency: "once", durationWeeks: 6, estimatedSessions: 1 },
    { type: "occupational_therapy", name: "Occupational Therapy", priority: "recommended", frequency: "weekly", durationWeeks: 8, estimatedSessions: 8 },
  ],
  psychological: [
    { type: "psychological_support", name: "Psychology Sessions", priority: "essential", frequency: "weekly", durationWeeks: 12, estimatedSessions: 12 },
    { type: "gp_review", name: "GP Mental Health Plan", priority: "essential", frequency: "monthly", durationWeeks: 12, estimatedSessions: 3 },
    { type: "medication_review", name: "Medication Review", priority: "recommended", frequency: "monthly", durationWeeks: 12, estimatedSessions: 3 },
    { type: "exercise_program", name: "Wellness Activities", priority: "recommended", frequency: "twice_weekly", durationWeeks: 12, estimatedSessions: 24 },
  ],
  surgical: [
    { type: "specialist_review", name: "Surgical Follow-up", priority: "essential", frequency: "fortnightly", durationWeeks: 8, estimatedSessions: 4 },
    { type: "physiotherapy", name: "Post-Surgical Rehab", priority: "essential", frequency: "twice_weekly", durationWeeks: 12, estimatedSessions: 24 },
    { type: "gp_review", name: "GP Wound/Recovery Check", priority: "essential", frequency: "weekly", durationWeeks: 4, estimatedSessions: 4 },
    { type: "pain_management", name: "Post-Op Pain Management", priority: "essential", frequency: "as_needed", durationWeeks: 6, estimatedSessions: 6 },
    { type: "occupational_therapy", name: "Return to Function OT", priority: "recommended", frequency: "weekly", durationWeeks: 8, estimatedSessions: 8 },
  ],
  mixed_physical_psych: [
    { type: "physiotherapy", name: "Physiotherapy", priority: "essential", frequency: "twice_weekly", durationWeeks: 10, estimatedSessions: 20 },
    { type: "psychological_support", name: "Psychology Sessions", priority: "essential", frequency: "weekly", durationWeeks: 12, estimatedSessions: 12 },
    { type: "gp_review", name: "GP Coordination", priority: "essential", frequency: "fortnightly", durationWeeks: 12, estimatedSessions: 6 },
    { type: "case_conference", name: "Multidisciplinary Review", priority: "essential", frequency: "monthly", durationWeeks: 12, estimatedSessions: 3 },
    { type: "pain_management", name: "Pain Psychology", priority: "recommended", frequency: "fortnightly", durationWeeks: 10, estimatedSessions: 5 },
  ],
  chronic: [
    { type: "specialist_review", name: "Specialist Management", priority: "essential", frequency: "monthly", durationWeeks: 24, estimatedSessions: 6 },
    { type: "physiotherapy", name: "Maintenance Physio", priority: "essential", frequency: "weekly", durationWeeks: 24, estimatedSessions: 24 },
    { type: "psychological_support", name: "Chronic Pain Psychology", priority: "essential", frequency: "fortnightly", durationWeeks: 24, estimatedSessions: 12 },
    { type: "gp_review", name: "GP Long-term Care", priority: "essential", frequency: "monthly", durationWeeks: 24, estimatedSessions: 6 },
    { type: "functional_capacity_evaluation", name: "Periodic FCE", priority: "recommended", frequency: "once", durationWeeks: 12, estimatedSessions: 2 },
    { type: "workplace_assessment", name: "Ergonomic Assessment", priority: "recommended", frequency: "once", durationWeeks: 4, estimatedSessions: 1 },
  ],
};

// Provider mapping
const PROVIDER_MAP: Record<TreatmentType, string> = {
  physiotherapy: "Registered Physiotherapist",
  occupational_therapy: "Occupational Therapist",
  gp_review: "General Practitioner",
  specialist_review: "Medical Specialist",
  psychological_support: "Clinical Psychologist",
  pain_management: "Pain Specialist / GP",
  exercise_program: "Exercise Physiologist / Physio",
  hydrotherapy: "Hydrotherapy Physiotherapist",
  medication_review: "GP / Pharmacist",
  workplace_assessment: "Occupational Therapist",
  functional_capacity_evaluation: "Accredited FCE Assessor",
  case_conference: "Multidisciplinary Team",
};

// Goal templates
const GOAL_TEMPLATES: Record<string, { shortTerm: string[]; longTerm: string[] }> = {
  musculoskeletal_minor: {
    shortTerm: [
      "Reduce pain to manageable levels (≤3/10)",
      "Restore basic range of motion",
      "Return to modified duties within 2 weeks",
    ],
    longTerm: [
      "Full return to pre-injury duties",
      "Prevention of re-injury through education",
      "Independent self-management of condition",
    ],
  },
  musculoskeletal_moderate: {
    shortTerm: [
      "Achieve consistent pain reduction",
      "Regain 75% functional capacity",
      "Return to light duties within 4 weeks",
    ],
    longTerm: [
      "Return to full duties with appropriate modifications",
      "Build strength and resilience",
      "Develop ongoing maintenance routine",
    ],
  },
  musculoskeletal_severe: {
    shortTerm: [
      "Stabilize condition post-treatment",
      "Establish effective pain management",
      "Begin graduated mobility program",
    ],
    longTerm: [
      "Maximize functional recovery within limitations",
      "Sustainable return to suitable work",
      "Long-term condition management plan",
    ],
  },
  psychological: {
    shortTerm: [
      "Establish therapeutic rapport",
      "Develop coping strategies for symptoms",
      "Improve sleep and daily functioning",
    ],
    longTerm: [
      "Return to pre-injury psychological functioning",
      "Build resilience and stress management skills",
      "Sustainable return to work with support",
    ],
  },
  surgical: {
    shortTerm: [
      "Successful wound healing",
      "Manage post-operative pain",
      "Begin early mobilization as cleared",
    ],
    longTerm: [
      "Complete surgical recovery",
      "Restore functional capacity",
      "Return to appropriate duties",
    ],
  },
  mixed_physical_psych: {
    shortTerm: [
      "Address both physical and psychological symptoms",
      "Establish coordinated care team",
      "Develop integrated treatment approach",
    ],
    longTerm: [
      "Holistic recovery addressing all aspects",
      "Sustainable return to work",
      "Ongoing wellbeing management",
    ],
  },
  chronic: {
    shortTerm: [
      "Optimize current function",
      "Develop self-management strategies",
      "Identify sustainable work capacity",
    ],
    longTerm: [
      "Maximize quality of life within limitations",
      "Stable long-term employment outcome",
      "Effective ongoing condition management",
    ],
  },
};

// Milestone templates
const MILESTONE_TEMPLATES: Record<string, TreatmentMilestone[]> = {
  musculoskeletal_minor: [
    { id: "", weekNumber: 1, description: "Initial assessment complete", expectedOutcome: "Treatment plan established", assessmentCriteria: ["Pain baseline recorded", "Range of motion measured", "Goals agreed"] },
    { id: "", weekNumber: 2, description: "Modified duties commenced", expectedOutcome: "Worker at work on light duties", assessmentCriteria: ["Work capacity confirmed", "Duties suitable", "No aggravation"] },
    { id: "", weekNumber: 4, description: "Treatment review", expectedOutcome: "Significant improvement", assessmentCriteria: ["Pain reduced 50%", "ROM improved", "Progressing to full duties"] },
  ],
  musculoskeletal_moderate: [
    { id: "", weekNumber: 2, description: "Specialist consultation", expectedOutcome: "Diagnosis confirmed, plan agreed", assessmentCriteria: ["Investigation results reviewed", "Treatment pathway clear"] },
    { id: "", weekNumber: 4, description: "Modified duties if suitable", expectedOutcome: "Graduated return commenced", assessmentCriteria: ["Capacity confirmed", "Suitable duties available"] },
    { id: "", weekNumber: 8, description: "Progress review", expectedOutcome: "On track for recovery", assessmentCriteria: ["Symptoms improving", "Function increasing", "RTW progressing"] },
  ],
  default: [
    { id: "", weekNumber: 2, description: "Initial treatment response", expectedOutcome: "Treatment engagement confirmed", assessmentCriteria: ["Attending appointments", "Responding to treatment"] },
    { id: "", weekNumber: 6, description: "Mid-treatment review", expectedOutcome: "Progress assessment", assessmentCriteria: ["Measurable improvement", "Plan adjustment if needed"] },
    { id: "", weekNumber: 12, description: "Treatment completion/review", expectedOutcome: "Goals achieved or revised", assessmentCriteria: ["Outcome assessment", "Future plan determined"] },
  ],
};

/**
 * Categorize injury from case data
 */
function categorizeInjury(workerCase: WorkerCase): string {
  const text = [
    workerCase.summary,
    workerCase.aiSummary,
    workerCase.currentStatus,
    workerCase.specialistReportSummary?.diagnosisSummary,
  ].filter(Boolean).join(" ").toLowerCase();

  const psychKeywords = ["ptsd", "psychological", "anxiety", "depression", "stress", "mental"];
  const surgeryKeywords = ["surgery", "surgical", "operation", "post-op"];
  const severeKeywords = ["fracture", "herniated", "rupture", "tear", "disc prolapse"];
  const chronicKeywords = ["chronic", "permanent", "degenerative", "long-term"];

  const hasPsych = psychKeywords.some(k => text.includes(k));
  const hasSurgery = surgeryKeywords.some(k => text.includes(k)) || workerCase.specialistReportSummary?.surgeryLikely;
  const hasSevere = severeKeywords.some(k => text.includes(k));
  const hasChronic = chronicKeywords.some(k => text.includes(k));

  if (hasSurgery) return "surgical";
  if (hasChronic) return "chronic";
  if (hasPsych && hasSevere) return "mixed_physical_psych";
  if (hasPsych) return "psychological";
  if (hasSevere) return "musculoskeletal_severe";
  if (workerCase.riskLevel === "High") return "musculoskeletal_moderate";
  if (workerCase.workStatus === "Off work") return "musculoskeletal_moderate";

  return "musculoskeletal_minor";
}

/**
 * Generate treatment description based on type and case
 */
function generateDescription(type: TreatmentType, workerCase: WorkerCase): string {
  const descriptions: Record<TreatmentType, string> = {
    physiotherapy: "Hands-on treatment and exercise prescription to restore movement, strength, and function",
    occupational_therapy: "Assessment and intervention to enable participation in meaningful daily activities and work",
    gp_review: "Medical review to monitor recovery, manage medications, and coordinate care",
    specialist_review: "Expert assessment and management of specific injury or condition",
    psychological_support: "Evidence-based therapy to address psychological impacts and support recovery",
    pain_management: "Comprehensive approach to reducing pain and improving function",
    exercise_program: "Structured exercise to build strength, flexibility, and endurance",
    hydrotherapy: "Water-based exercise for low-impact rehabilitation",
    medication_review: "Review and optimization of pain relief and other medications",
    workplace_assessment: "On-site evaluation to identify modifications and support safe return to work",
    functional_capacity_evaluation: "Comprehensive assessment of physical capabilities for work",
    case_conference: "Coordinated meeting with all treating providers to align care",
  };
  return descriptions[type];
}

/**
 * Generate treatment goals based on type
 */
function generateGoals(type: TreatmentType, workerCase: WorkerCase): string[] {
  const goalSets: Record<TreatmentType, string[]> = {
    physiotherapy: ["Reduce pain and inflammation", "Restore range of motion", "Build strength and stability", "Prevent recurrence"],
    occupational_therapy: ["Enable daily activities", "Adapt work tasks", "Improve functional independence"],
    gp_review: ["Monitor recovery progress", "Adjust medications as needed", "Coordinate with specialists"],
    specialist_review: ["Confirm diagnosis", "Determine optimal treatment", "Guide recovery expectations"],
    psychological_support: ["Reduce psychological distress", "Develop coping strategies", "Support return to work confidence"],
    pain_management: ["Reduce pain intensity", "Improve pain coping", "Minimize medication dependence"],
    exercise_program: ["Build cardiovascular fitness", "Improve strength", "Increase activity tolerance"],
    hydrotherapy: ["Low-impact conditioning", "Pain relief through warm water", "Improve mobility"],
    medication_review: ["Optimize pain relief", "Minimize side effects", "Plan medication reduction"],
    workplace_assessment: ["Identify suitable duties", "Recommend modifications", "Support safe RTW"],
    functional_capacity_evaluation: ["Objectively measure capacity", "Identify limitations", "Guide RTW planning"],
    case_conference: ["Align treatment approach", "Address barriers", "Coordinate next steps"],
  };
  return goalSets[type] || ["Support recovery", "Improve function"];
}

/**
 * Generate a treatment plan for a case
 */
export function generateTreatmentPlan(workerCase: WorkerCase): TreatmentPlan {
  const injuryCategory = categorizeInjury(workerCase);
  const template = TREATMENT_TEMPLATES[injuryCategory] || TREATMENT_TEMPLATES.musculoskeletal_moderate;
  const goals = GOAL_TEMPLATES[injuryCategory] || GOAL_TEMPLATES.musculoskeletal_moderate;
  const milestoneTemplate = MILESTONE_TEMPLATES[injuryCategory] || MILESTONE_TEMPLATES.default;

  // Build treatments
  const treatments: TreatmentItem[] = template.map(t => ({
    id: randomUUID(),
    type: t.type!,
    name: t.name!,
    description: generateDescription(t.type!, workerCase),
    priority: t.priority!,
    frequency: t.frequency!,
    durationWeeks: t.durationWeeks!,
    estimatedSessions: t.estimatedSessions!,
    provider: PROVIDER_MAP[t.type!],
    goals: generateGoals(t.type!, workerCase),
  }));

  // Calculate total duration
  const totalDurationWeeks = Math.max(...treatments.map(t => t.durationWeeks));

  // Build milestones
  const milestones: TreatmentMilestone[] = milestoneTemplate.map(m => ({
    ...m,
    id: randomUUID(),
  }));

  // Determine current capacity
  const currentCapacity = workerCase.latestCertificate?.capacity ||
    (workerCase.workStatus === "At work" ? "partial" : "unfit");

  // Escalation triggers
  const escalationTriggers = [
    "No improvement after 4 weeks of treatment",
    "Significant worsening of symptoms",
    "New symptoms or complications",
    "Worker disengagement from treatment",
    "Unable to progress RTW plan",
  ];

  // Generate summary
  const essentialCount = treatments.filter(t => t.priority === "essential").length;
  const summary = `Treatment plan for ${injuryCategory.replace(/_/g, " ")} injury includes ${essentialCount} essential treatments over ${totalDurationWeeks} weeks. Focus on ${goals.shortTerm[0].toLowerCase()} with goal of ${goals.longTerm[0].toLowerCase()}.`;

  const rationale = `Based on ${workerCase.riskLevel} risk level, ${workerCase.workStatus.toLowerCase()} status, and ${injuryCategory.replace(/_/g, " ")} injury classification. Treatment intensity and duration calibrated to achieve sustainable recovery and return to work.`;

  return {
    id: randomUUID(),
    caseId: workerCase.id,
    workerName: workerCase.workerName,
    createdAt: new Date().toISOString(),
    injuryCategory: injuryCategory.replace(/_/g, " "),
    currentCapacity,
    treatments,
    totalDurationWeeks,
    milestones,
    shortTermGoals: goals.shortTerm,
    longTermGoals: goals.longTerm,
    reviewFrequency: workerCase.riskLevel === "High" ? "Weekly" : "Fortnightly",
    escalationTriggers,
    summary,
    rationale,
  };
}

/**
 * Get treatment plan summary as text
 */
export function getTreatmentPlanSummary(plan: TreatmentPlan): string {
  const lines: string[] = [];

  lines.push(`**Treatment Plan for ${plan.workerName}**`);
  lines.push(`Category: ${plan.injuryCategory} | Duration: ${plan.totalDurationWeeks} weeks`);
  lines.push("");
  lines.push("**Essential Treatments:**");

  plan.treatments
    .filter(t => t.priority === "essential")
    .forEach(t => {
      lines.push(`- ${t.name}: ${t.frequency.replace(/_/g, " ")} for ${t.durationWeeks} weeks (${t.provider})`);
    });

  lines.push("");
  lines.push("**Short-term Goals:**");
  plan.shortTermGoals.forEach(g => lines.push(`- ${g}`));

  lines.push("");
  lines.push("**Key Milestones:**");
  plan.milestones.forEach(m => lines.push(`- Week ${m.weekNumber}: ${m.description}`));

  return lines.join("\n");
}
