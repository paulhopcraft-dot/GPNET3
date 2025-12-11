import { randomUUID } from "crypto";

// Smart Case Summary Engine
// Synthesizes information from multiple sources for comprehensive case snapshots

export type SummaryType = "full" | "snapshot" | "brief" | "stakeholder" | "handover";

export interface CaseDataSources {
  // Case basics
  caseId: string;
  workerName: string;
  company: string;
  injuryDate: string;
  diagnosis: string;
  workStatus: string;
  riskLevel: string;
  daysOpen: number;

  // Medical info
  currentCapacity?: string;
  restrictions?: string[];
  certificateExpiry?: string;
  treatingPractitioner?: string;

  // Timeline events
  recentEvents?: TimelineEvent[];
  totalEvents?: number;

  // Check-ins
  lastCheckIn?: CheckInData;
  checkInTrend?: "improving" | "stable" | "declining";
  missedCheckIns?: number;

  // Communications
  recentComms?: CommunicationData[];
  sentimentTrend?: "positive" | "neutral" | "negative";
  lastContactDays?: number;

  // Risk signals
  activeFlags?: RiskFlag[];
  complianceIssues?: string[];

  // RTW status
  rtwPhase?: string;
  rtwProgress?: number;
  nextMilestone?: string;

  // Predictions
  predictedDuration?: number;
  rtwProbability?: number;
  deteriorationRisk?: string;
}

export interface TimelineEvent {
  date: string;
  type: string;
  description: string;
  significance: "routine" | "notable" | "critical";
}

export interface CheckInData {
  date: string;
  painScore: number;
  moodScore: number;
  overallScore: number;
  concerns?: string;
}

export interface CommunicationData {
  date: string;
  channel: string;
  direction: "inbound" | "outbound";
  subject: string;
  sentiment?: "positive" | "neutral" | "negative";
}

export interface RiskFlag {
  type: string;
  severity: "low" | "medium" | "high" | "critical";
  message: string;
  since?: string;
}

export interface RecommendedAction {
  id: string;
  priority: "low" | "medium" | "high" | "urgent";
  category: "medical" | "compliance" | "communication" | "rtw" | "administrative";
  action: string;
  rationale: string;
  dueDate?: string;
}

export interface CaseSummary {
  id: string;
  caseId: string;
  generatedAt: string;
  summaryType: SummaryType;

  // Case snapshot
  snapshot: {
    headline: string;
    status: string;
    urgency: "routine" | "attention_needed" | "urgent" | "critical";
    keyPoints: string[];
  };

  // Current situation
  currentSituation: {
    workStatus: string;
    capacity: string;
    restrictions: string;
    daysSinceInjury: number;
    certificateStatus: string;
  };

  // Risk assessment
  risks: {
    overallRisk: string;
    activeFlags: RiskFlag[];
    complianceStatus: "compliant" | "at_risk" | "non_compliant";
    concerns: string[];
  };

  // Progress
  progress: {
    rtwStage: string;
    trend: "improving" | "stable" | "declining" | "unknown";
    milestones: string[];
    barriers: string[];
  };

  // Recommended actions
  recommendedActions: RecommendedAction[];

  // Timeline highlights
  recentHighlights: string[];

  // For stakeholder summaries
  executiveSummary?: string;
}

/**
 * Generate urgency level based on case data
 */
function assessUrgency(data: CaseDataSources): CaseSummary["snapshot"]["urgency"] {
  const criticalFlags = data.activeFlags?.filter(f => f.severity === "critical") || [];
  const highFlags = data.activeFlags?.filter(f => f.severity === "high") || [];

  if (criticalFlags.length > 0) return "critical";
  if (highFlags.length >= 2 || data.deteriorationRisk === "high") return "urgent";
  if (highFlags.length > 0 || data.complianceIssues?.length || data.checkInTrend === "declining") {
    return "attention_needed";
  }
  return "routine";
}

/**
 * Generate headline for case snapshot
 */
function generateHeadline(data: CaseDataSources): string {
  const parts: string[] = [];

  // Work status
  if (data.workStatus === "Off work") {
    parts.push("Worker off work");
  } else if (data.workStatus?.includes("Modified")) {
    parts.push("On modified duties");
  } else if (data.workStatus?.includes("Full")) {
    parts.push("Full duties");
  }

  // Key concern
  if (data.deteriorationRisk === "high") {
    parts.push("deterioration risk identified");
  } else if (data.checkInTrend === "declining") {
    parts.push("declining trend in check-ins");
  } else if (data.lastContactDays && data.lastContactDays > 7) {
    parts.push(`no contact for ${data.lastContactDays} days`);
  } else if (data.certificateExpiry) {
    const daysToExpiry = Math.floor(
      (new Date(data.certificateExpiry).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
    );
    if (daysToExpiry <= 7 && daysToExpiry > 0) {
      parts.push(`certificate expires in ${daysToExpiry} days`);
    } else if (daysToExpiry <= 0) {
      parts.push("certificate expired");
    }
  }

  // Progress indicator
  if (data.rtwProgress && data.rtwProgress > 75) {
    parts.push("nearing RTW completion");
  }

  return parts.join(", ") || `Case open ${data.daysOpen} days`;
}

/**
 * Generate key points for snapshot
 */
function generateKeyPoints(data: CaseDataSources): string[] {
  const points: string[] = [];

  // Diagnosis and duration
  points.push(`${data.diagnosis} - ${data.daysOpen} days since injury`);

  // Current capacity
  if (data.currentCapacity) {
    points.push(`Current capacity: ${data.currentCapacity}`);
  }

  // RTW status
  if (data.rtwPhase) {
    points.push(`RTW Phase: ${data.rtwPhase}${data.rtwProgress ? ` (${data.rtwProgress}% complete)` : ""}`);
  }

  // Check-in status
  if (data.lastCheckIn) {
    const trend = data.checkInTrend || "stable";
    points.push(`Last check-in: Pain ${data.lastCheckIn.painScore}/10, Mood ${data.lastCheckIn.moodScore}/10 (${trend})`);
  }

  // Risk level
  points.push(`Risk level: ${data.riskLevel}`);

  // Active concerns
  const highFlags = data.activeFlags?.filter(f => f.severity === "high" || f.severity === "critical") || [];
  if (highFlags.length > 0) {
    points.push(`${highFlags.length} high-priority flag${highFlags.length > 1 ? "s" : ""} active`);
  }

  return points;
}

/**
 * Generate recommended actions
 */
function generateRecommendedActions(data: CaseDataSources): RecommendedAction[] {
  const actions: RecommendedAction[] = [];

  // Certificate expiry
  if (data.certificateExpiry) {
    const daysToExpiry = Math.floor(
      (new Date(data.certificateExpiry).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
    );
    if (daysToExpiry <= 0) {
      actions.push({
        id: randomUUID(),
        priority: "urgent",
        category: "compliance",
        action: "Obtain updated medical certificate",
        rationale: "Current certificate has expired - worker cannot legally continue on modified duties without valid certificate",
        dueDate: new Date().toISOString().split("T")[0],
      });
    } else if (daysToExpiry <= 7) {
      actions.push({
        id: randomUUID(),
        priority: "high",
        category: "medical",
        action: "Schedule certificate renewal appointment",
        rationale: `Certificate expires in ${daysToExpiry} days`,
        dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
      });
    }
  }

  // Contact gap
  if (data.lastContactDays && data.lastContactDays > 5) {
    actions.push({
      id: randomUUID(),
      priority: data.lastContactDays > 10 ? "high" : "medium",
      category: "communication",
      action: "Contact worker for welfare check",
      rationale: `${data.lastContactDays} days since last contact - regular communication is important for engagement`,
      dueDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split("T")[0],
    });
  }

  // Declining check-ins
  if (data.checkInTrend === "declining") {
    actions.push({
      id: randomUUID(),
      priority: "high",
      category: "medical",
      action: "Review case and consider clinical reassessment",
      rationale: "Check-in scores show declining trend - may indicate deterioration or complications",
    });
  }

  // Missed check-ins
  if (data.missedCheckIns && data.missedCheckIns >= 2) {
    actions.push({
      id: randomUUID(),
      priority: "medium",
      category: "communication",
      action: "Follow up on missed check-ins",
      rationale: `Worker has missed ${data.missedCheckIns} recent check-ins - assess barriers to engagement`,
    });
  }

  // High deterioration risk
  if (data.deteriorationRisk === "high") {
    actions.push({
      id: randomUUID(),
      priority: "urgent",
      category: "medical",
      action: "Arrange urgent clinical review",
      rationale: "Predictive model indicates high deterioration risk - early intervention recommended",
    });
  }

  // Compliance issues
  if (data.complianceIssues && data.complianceIssues.length > 0) {
    actions.push({
      id: randomUUID(),
      priority: "high",
      category: "compliance",
      action: `Address compliance issues: ${data.complianceIssues.join(", ")}`,
      rationale: "Outstanding compliance requirements must be resolved",
    });
  }

  // RTW progression
  if (data.rtwPhase && data.nextMilestone) {
    actions.push({
      id: randomUUID(),
      priority: "medium",
      category: "rtw",
      action: `Progress toward: ${data.nextMilestone}`,
      rationale: `Current RTW phase: ${data.rtwPhase}`,
    });
  }

  // Sort by priority
  const priorityOrder = { urgent: 0, high: 1, medium: 2, low: 3 };
  return actions.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);
}

/**
 * Generate timeline highlights
 */
function generateHighlights(data: CaseDataSources): string[] {
  const highlights: string[] = [];

  if (data.recentEvents) {
    const notable = data.recentEvents
      .filter(e => e.significance === "notable" || e.significance === "critical")
      .slice(0, 5);

    for (const event of notable) {
      const date = new Date(event.date).toLocaleDateString();
      highlights.push(`${date}: ${event.description}`);
    }
  }

  if (highlights.length === 0) {
    highlights.push("No notable events in recent period");
  }

  return highlights;
}

/**
 * Generate executive summary paragraph
 */
function generateExecutiveSummary(data: CaseDataSources, summary: CaseSummary): string {
  const parts: string[] = [];

  // Opening
  parts.push(`${data.workerName} from ${data.company} has been managing a ${data.diagnosis.toLowerCase()} injury for ${data.daysOpen} days.`);

  // Current status
  parts.push(`The worker is currently ${data.workStatus?.toLowerCase() || "off work"} with ${data.currentCapacity || "reduced capacity"}.`);

  // Progress
  if (summary.progress.trend === "improving") {
    parts.push("Recovery is progressing well with improvement shown in recent assessments.");
  } else if (summary.progress.trend === "declining") {
    parts.push("Recent assessments indicate a concerning decline that warrants attention.");
  } else {
    parts.push("Recovery progress has been stable.");
  }

  // Key concern
  if (summary.snapshot.urgency === "critical" || summary.snapshot.urgency === "urgent") {
    const topAction = summary.recommendedActions[0];
    if (topAction) {
      parts.push(`Priority action required: ${topAction.action.toLowerCase()}.`);
    }
  }

  // Outlook
  if (data.rtwProbability && data.rtwProbability > 70) {
    parts.push("Return to work outlook is positive.");
  } else if (data.predictedDuration) {
    parts.push(`Estimated ${data.predictedDuration} days to case resolution.`);
  }

  return parts.join(" ");
}

/**
 * Generate full case summary
 */
export function generateCaseSummary(
  data: CaseDataSources,
  summaryType: SummaryType = "full"
): CaseSummary {
  const urgency = assessUrgency(data);
  const headline = generateHeadline(data);
  const keyPoints = generateKeyPoints(data);
  const recommendedActions = generateRecommendedActions(data);
  const highlights = generateHighlights(data);

  // Determine compliance status
  let complianceStatus: "compliant" | "at_risk" | "non_compliant" = "compliant";
  if (data.complianceIssues && data.complianceIssues.length > 0) {
    complianceStatus = data.complianceIssues.length > 2 ? "non_compliant" : "at_risk";
  }

  // Determine progress trend
  let progressTrend: "improving" | "stable" | "declining" | "unknown" = "unknown";
  if (data.checkInTrend) {
    progressTrend = data.checkInTrend;
  } else if (data.rtwProgress && data.rtwProgress > 50) {
    progressTrend = "improving";
  }

  // Certificate status
  let certificateStatus = "Valid";
  if (data.certificateExpiry) {
    const daysToExpiry = Math.floor(
      (new Date(data.certificateExpiry).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
    );
    if (daysToExpiry <= 0) certificateStatus = "Expired";
    else if (daysToExpiry <= 7) certificateStatus = `Expires in ${daysToExpiry} days`;
  } else {
    certificateStatus = "Not on file";
  }

  // Identify barriers
  const barriers: string[] = [];
  if (data.checkInTrend === "declining") barriers.push("Declining health indicators");
  if (data.lastContactDays && data.lastContactDays > 7) barriers.push("Worker disengagement");
  if (data.sentimentTrend === "negative") barriers.push("Negative sentiment in communications");
  if (data.complianceIssues) barriers.push(...data.complianceIssues);

  const summary: CaseSummary = {
    id: randomUUID(),
    caseId: data.caseId,
    generatedAt: new Date().toISOString(),
    summaryType,

    snapshot: {
      headline,
      status: data.workStatus || "Unknown",
      urgency,
      keyPoints,
    },

    currentSituation: {
      workStatus: data.workStatus || "Unknown",
      capacity: data.currentCapacity || "Not specified",
      restrictions: data.restrictions?.join(", ") || "None specified",
      daysSinceInjury: data.daysOpen,
      certificateStatus,
    },

    risks: {
      overallRisk: data.riskLevel || "Unknown",
      activeFlags: data.activeFlags || [],
      complianceStatus,
      concerns: barriers,
    },

    progress: {
      rtwStage: data.rtwPhase || "Not started",
      trend: progressTrend,
      milestones: data.nextMilestone ? [data.nextMilestone] : [],
      barriers,
    },

    recommendedActions,
    recentHighlights: highlights,
  };

  // Add executive summary for stakeholder/handover types
  if (summaryType === "stakeholder" || summaryType === "handover" || summaryType === "full") {
    summary.executiveSummary = generateExecutiveSummary(data, summary);
  }

  return summary;
}

/**
 * Generate brief snapshot (quick view)
 */
export function generateBriefSnapshot(data: CaseDataSources): {
  headline: string;
  status: string;
  urgency: string;
  topAction: string | null;
  riskLevel: string;
} {
  const urgency = assessUrgency(data);
  const headline = generateHeadline(data);
  const actions = generateRecommendedActions(data);

  return {
    headline,
    status: data.workStatus || "Unknown",
    urgency,
    topAction: actions[0]?.action || null,
    riskLevel: data.riskLevel || "Unknown",
  };
}

/**
 * Compare two summaries to identify significant changes
 */
export function compareSummaries(
  previous: CaseSummary,
  current: CaseSummary
): {
  significantChanges: boolean;
  changes: string[];
} {
  const changes: string[] = [];

  if (previous.snapshot.urgency !== current.snapshot.urgency) {
    changes.push(`Urgency changed from ${previous.snapshot.urgency} to ${current.snapshot.urgency}`);
  }

  if (previous.currentSituation.workStatus !== current.currentSituation.workStatus) {
    changes.push(`Work status changed to ${current.currentSituation.workStatus}`);
  }

  if (previous.risks.overallRisk !== current.risks.overallRisk) {
    changes.push(`Risk level changed to ${current.risks.overallRisk}`);
  }

  if (previous.progress.trend !== current.progress.trend) {
    changes.push(`Progress trend now ${current.progress.trend}`);
  }

  const newFlags = current.risks.activeFlags.filter(
    f => !previous.risks.activeFlags.some(pf => pf.type === f.type)
  );
  if (newFlags.length > 0) {
    changes.push(`${newFlags.length} new risk flag${newFlags.length > 1 ? "s" : ""} raised`);
  }

  return {
    significantChanges: changes.length > 0,
    changes,
  };
}

/**
 * Generate summary for multiple cases (batch)
 */
export function generateBatchSummaries(
  cases: CaseDataSources[]
): { summaries: CaseSummary[]; aggregateStats: object } {
  const summaries = cases.map(c => generateCaseSummary(c, "snapshot"));

  const aggregateStats = {
    totalCases: cases.length,
    byUrgency: {
      critical: summaries.filter(s => s.snapshot.urgency === "critical").length,
      urgent: summaries.filter(s => s.snapshot.urgency === "urgent").length,
      attention_needed: summaries.filter(s => s.snapshot.urgency === "attention_needed").length,
      routine: summaries.filter(s => s.snapshot.urgency === "routine").length,
    },
    byTrend: {
      improving: summaries.filter(s => s.progress.trend === "improving").length,
      stable: summaries.filter(s => s.progress.trend === "stable").length,
      declining: summaries.filter(s => s.progress.trend === "declining").length,
    },
    totalActions: summaries.reduce((sum, s) => sum + s.recommendedActions.length, 0),
    urgentActions: summaries.reduce(
      (sum, s) => sum + s.recommendedActions.filter(a => a.priority === "urgent").length,
      0
    ),
  };

  return { summaries, aggregateStats };
}

/**
 * Create mock case data for testing
 */
export function createMockCaseData(caseId: string): CaseDataSources {
  return {
    caseId,
    workerName: "John Smith",
    company: "ABC Manufacturing",
    injuryDate: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000).toISOString(),
    diagnosis: "Lower back strain",
    workStatus: "Modified duties",
    riskLevel: "Medium",
    daysOpen: 45,
    currentCapacity: "Partial capacity - sedentary duties only",
    restrictions: ["No lifting over 5kg", "Avoid prolonged standing", "Regular breaks required"],
    certificateExpiry: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString(),
    treatingPractitioner: "Dr. Sarah Chen",
    lastCheckIn: {
      date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
      painScore: 5,
      moodScore: 6,
      overallScore: 5.5,
      concerns: "Still experiencing discomfort with prolonged sitting",
    },
    checkInTrend: "stable",
    missedCheckIns: 0,
    lastContactDays: 3,
    sentimentTrend: "neutral",
    activeFlags: [
      { type: "LONG_TAIL_CASE", severity: "medium", message: "Case open > 30 days" },
    ],
    rtwPhase: "Phase 2: Gradual Increase",
    rtwProgress: 40,
    nextMilestone: "Increase to 6 hours/day",
    predictedDuration: 30,
    rtwProbability: 75,
    deteriorationRisk: "low",
    recentEvents: [
      {
        date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
        type: "check_in",
        description: "Weekly check-in completed",
        significance: "routine",
      },
      {
        date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
        type: "rtw_update",
        description: "RTW plan advanced to Phase 2",
        significance: "notable",
      },
    ],
  };
}
