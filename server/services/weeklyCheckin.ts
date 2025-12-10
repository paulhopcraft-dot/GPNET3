import { randomUUID } from "crypto";

// Weekly check-in system for worker welfare monitoring

export interface CheckInQuestion {
  id: string;
  category: "pain" | "mood" | "adl" | "work" | "general";
  question: string;
  type: "scale" | "yes_no" | "multiple_choice" | "text";
  options?: string[];
  required: boolean;
}

export interface CheckInResponse {
  questionId: string;
  value: string | number;
  notes?: string;
}

export interface CheckIn {
  id: string;
  caseId: string;
  workerName: string;
  scheduledDate: string;
  completedDate: string | null;
  status: "pending" | "completed" | "missed" | "skipped";
  responses: CheckInResponse[];
  scores: CheckInScores;
  riskSignals: RiskSignal[];
  summary: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CheckInScores {
  painScore: number | null;       // 0-10 scale
  moodScore: number | null;       // 0-10 scale
  adlScore: number | null;        // 0-100 percentage
  workReadiness: number | null;   // 0-10 scale
  overallWellbeing: number | null; // 0-10 scale
}

export interface RiskSignal {
  id: string;
  type: "pain_increase" | "mood_decline" | "adl_decline" | "concerning_text" | "missed_checkin" | "disengagement";
  severity: "low" | "medium" | "high";
  message: string;
  details?: string;
  requiresAction: boolean;
}

export interface CheckInTrend {
  caseId: string;
  workerName: string;
  checkInCount: number;
  missedCount: number;
  engagementRate: number;
  trends: {
    pain: TrendDirection;
    mood: TrendDirection;
    adl: TrendDirection;
    overall: TrendDirection;
  };
  averageScores: CheckInScores;
  recentRiskSignals: RiskSignal[];
  lastCheckIn: string | null;
  nextCheckInDue: string | null;
}

export type TrendDirection = "improving" | "stable" | "declining" | "unknown";

// Standard check-in questions
export const CHECKIN_QUESTIONS: CheckInQuestion[] = [
  // Pain category
  {
    id: "pain_level",
    category: "pain",
    question: "On a scale of 0-10, how would you rate your pain level today? (0 = no pain, 10 = worst pain)",
    type: "scale",
    required: true,
  },
  {
    id: "pain_compared",
    category: "pain",
    question: "Compared to last week, is your pain better, same, or worse?",
    type: "multiple_choice",
    options: ["Much better", "Slightly better", "About the same", "Slightly worse", "Much worse"],
    required: true,
  },
  {
    id: "pain_medication",
    category: "pain",
    question: "Are you taking medication for pain as prescribed?",
    type: "yes_no",
    required: true,
  },

  // Mood category
  {
    id: "mood_level",
    category: "mood",
    question: "On a scale of 0-10, how would you rate your mood/mental wellbeing today? (0 = very low, 10 = excellent)",
    type: "scale",
    required: true,
  },
  {
    id: "sleep_quality",
    category: "mood",
    question: "How has your sleep been this week?",
    type: "multiple_choice",
    options: ["Very good", "Good", "Fair", "Poor", "Very poor"],
    required: true,
  },
  {
    id: "anxiety_stress",
    category: "mood",
    question: "Have you experienced significant anxiety or stress this week?",
    type: "multiple_choice",
    options: ["Not at all", "A little", "Moderate", "Quite a lot", "Extreme"],
    required: true,
  },

  // ADL category
  {
    id: "adl_self_care",
    category: "adl",
    question: "Can you manage basic self-care activities (bathing, dressing, eating)?",
    type: "multiple_choice",
    options: ["Fully independent", "Mostly independent", "Need some help", "Need significant help", "Cannot manage"],
    required: true,
  },
  {
    id: "adl_mobility",
    category: "adl",
    question: "How is your mobility this week?",
    type: "multiple_choice",
    options: ["Normal", "Slightly limited", "Moderately limited", "Significantly limited", "Severely limited"],
    required: true,
  },
  {
    id: "adl_household",
    category: "adl",
    question: "Can you perform household tasks (cooking, cleaning, shopping)?",
    type: "multiple_choice",
    options: ["Fully", "Mostly", "Partially", "Very little", "Not at all"],
    required: true,
  },

  // Work category
  {
    id: "work_readiness",
    category: "work",
    question: "On a scale of 0-10, how ready do you feel to return to work or increase your hours? (0 = not ready, 10 = fully ready)",
    type: "scale",
    required: false,
  },
  {
    id: "work_concerns",
    category: "work",
    question: "Do you have any concerns about returning to work?",
    type: "yes_no",
    required: false,
  },
  {
    id: "work_support",
    category: "work",
    question: "Do you feel supported by your employer in your recovery?",
    type: "multiple_choice",
    options: ["Very supported", "Supported", "Neutral", "Not very supported", "Not at all supported"],
    required: false,
  },

  // General
  {
    id: "treatment_following",
    category: "general",
    question: "Are you following your treatment plan as prescribed?",
    type: "yes_no",
    required: true,
  },
  {
    id: "appointments_attended",
    category: "general",
    question: "Have you attended all scheduled medical appointments?",
    type: "yes_no",
    required: true,
  },
  {
    id: "additional_comments",
    category: "general",
    question: "Is there anything else you'd like to share about how you're doing?",
    type: "text",
    required: false,
  },
];

// Concerning keywords in free text
const CONCERNING_KEYWORDS = [
  "hopeless", "depressed", "anxious", "can't cope", "give up",
  "suicidal", "self-harm", "hurt myself", "end it", "no point",
  "scared", "terrified", "panic", "overwhelmed", "breaking down",
  "angry", "furious", "hate", "unfair", "discrimination",
  "worse", "deteriorating", "getting worse", "unbearable",
];

/**
 * Calculate scores from check-in responses
 */
export function calculateScores(responses: CheckInResponse[]): CheckInScores {
  const getResponse = (id: string) => responses.find((r) => r.questionId === id);

  // Pain score (direct from scale)
  const painResp = getResponse("pain_level");
  const painScore = painResp && typeof painResp.value === "number" ? painResp.value : null;

  // Mood score (direct from scale)
  const moodResp = getResponse("mood_level");
  const moodScore = moodResp && typeof moodResp.value === "number" ? moodResp.value : null;

  // ADL score (average of ADL questions converted to percentage)
  const adlQuestions = ["adl_self_care", "adl_mobility", "adl_household"];
  const adlValues: number[] = [];
  for (const qId of adlQuestions) {
    const resp = getResponse(qId);
    if (resp && typeof resp.value === "string") {
      // Map options to percentage
      const mapping: Record<string, number> = {
        "Fully independent": 100, "Normal": 100, "Fully": 100,
        "Mostly independent": 80, "Slightly limited": 80, "Mostly": 80,
        "Need some help": 60, "Moderately limited": 60, "Partially": 60,
        "Need significant help": 40, "Significantly limited": 40, "Very little": 40,
        "Cannot manage": 20, "Severely limited": 20, "Not at all": 20,
      };
      const val = mapping[resp.value];
      if (val !== undefined) adlValues.push(val);
    }
  }
  const adlScore = adlValues.length > 0
    ? Math.round(adlValues.reduce((a, b) => a + b, 0) / adlValues.length)
    : null;

  // Work readiness (direct from scale)
  const workResp = getResponse("work_readiness");
  const workReadiness = workResp && typeof workResp.value === "number" ? workResp.value : null;

  // Overall wellbeing (average of pain inverted + mood)
  let overallWellbeing: number | null = null;
  if (painScore !== null && moodScore !== null) {
    const invertedPain = 10 - painScore; // Higher is better
    overallWellbeing = Math.round((invertedPain + moodScore) / 2 * 10) / 10;
  }

  return {
    painScore,
    moodScore,
    adlScore,
    workReadiness,
    overallWellbeing,
  };
}

/**
 * Detect risk signals from check-in responses
 */
export function detectRiskSignals(
  responses: CheckInResponse[],
  scores: CheckInScores,
  previousScores?: CheckInScores
): RiskSignal[] {
  const signals: RiskSignal[] = [];

  // High pain level
  if (scores.painScore !== null && scores.painScore >= 8) {
    signals.push({
      id: randomUUID(),
      type: "pain_increase",
      severity: scores.painScore >= 9 ? "high" : "medium",
      message: `High pain level reported: ${scores.painScore}/10`,
      requiresAction: scores.painScore >= 9,
    });
  }

  // Pain increase compared to previous
  if (previousScores && previousScores.painScore !== null && scores.painScore !== null) {
    const increase = scores.painScore - previousScores.painScore;
    if (increase >= 3) {
      signals.push({
        id: randomUUID(),
        type: "pain_increase",
        severity: increase >= 4 ? "high" : "medium",
        message: `Pain increased by ${increase} points since last check-in`,
        details: `Previous: ${previousScores.painScore}/10, Current: ${scores.painScore}/10`,
        requiresAction: increase >= 4,
      });
    }
  }

  // Low mood
  if (scores.moodScore !== null && scores.moodScore <= 3) {
    signals.push({
      id: randomUUID(),
      type: "mood_decline",
      severity: scores.moodScore <= 2 ? "high" : "medium",
      message: `Low mood reported: ${scores.moodScore}/10`,
      requiresAction: scores.moodScore <= 2,
    });
  }

  // Mood decline
  if (previousScores && previousScores.moodScore !== null && scores.moodScore !== null) {
    const decline = previousScores.moodScore - scores.moodScore;
    if (decline >= 3) {
      signals.push({
        id: randomUUID(),
        type: "mood_decline",
        severity: decline >= 4 ? "high" : "medium",
        message: `Mood declined by ${decline} points since last check-in`,
        details: `Previous: ${previousScores.moodScore}/10, Current: ${scores.moodScore}/10`,
        requiresAction: decline >= 4,
      });
    }
  }

  // ADL decline
  if (scores.adlScore !== null && scores.adlScore <= 40) {
    signals.push({
      id: randomUUID(),
      type: "adl_decline",
      severity: scores.adlScore <= 30 ? "high" : "medium",
      message: `Low ADL capability: ${scores.adlScore}%`,
      requiresAction: scores.adlScore <= 30,
    });
  }

  // Check for concerning text in responses
  const textResponses = responses.filter((r) => typeof r.value === "string" && r.value.length > 10);
  for (const resp of textResponses) {
    const text = (resp.value as string).toLowerCase();
    const foundKeywords = CONCERNING_KEYWORDS.filter((kw) => text.includes(kw));
    if (foundKeywords.length > 0) {
      const severity = foundKeywords.some((kw) =>
        ["suicidal", "self-harm", "hurt myself", "end it"].includes(kw)
      ) ? "high" : "medium";

      signals.push({
        id: randomUUID(),
        type: "concerning_text",
        severity,
        message: "Concerning language detected in response",
        details: `Keywords found: ${foundKeywords.join(", ")}`,
        requiresAction: severity === "high",
      });
    }
  }

  // Pain getting worse response
  const painCompared = responses.find((r) => r.questionId === "pain_compared");
  if (painCompared?.value === "Much worse") {
    signals.push({
      id: randomUUID(),
      type: "pain_increase",
      severity: "medium",
      message: "Worker reports pain is much worse than last week",
      requiresAction: true,
    });
  }

  // Sleep issues
  const sleepResp = responses.find((r) => r.questionId === "sleep_quality");
  if (sleepResp?.value === "Very poor") {
    signals.push({
      id: randomUUID(),
      type: "mood_decline",
      severity: "medium",
      message: "Worker reports very poor sleep quality",
      requiresAction: false,
    });
  }

  // High anxiety/stress
  const anxietyResp = responses.find((r) => r.questionId === "anxiety_stress");
  if (anxietyResp?.value === "Extreme" || anxietyResp?.value === "Quite a lot") {
    signals.push({
      id: randomUUID(),
      type: "mood_decline",
      severity: anxietyResp.value === "Extreme" ? "high" : "medium",
      message: `Worker reports ${anxietyResp.value.toLowerCase()} anxiety/stress`,
      requiresAction: anxietyResp.value === "Extreme",
    });
  }

  // Not following treatment
  const treatmentResp = responses.find((r) => r.questionId === "treatment_following");
  if (treatmentResp?.value === "No" || treatmentResp?.value === false) {
    signals.push({
      id: randomUUID(),
      type: "disengagement",
      severity: "medium",
      message: "Worker not following treatment plan as prescribed",
      requiresAction: true,
    });
  }

  // Missed appointments
  const appointmentsResp = responses.find((r) => r.questionId === "appointments_attended");
  if (appointmentsResp?.value === "No" || appointmentsResp?.value === false) {
    signals.push({
      id: randomUUID(),
      type: "disengagement",
      severity: "medium",
      message: "Worker has missed scheduled medical appointments",
      requiresAction: true,
    });
  }

  return signals;
}

/**
 * Generate a summary from check-in responses
 */
export function generateCheckInSummary(
  responses: CheckInResponse[],
  scores: CheckInScores,
  riskSignals: RiskSignal[]
): string {
  const parts: string[] = [];

  // Overall status
  if (scores.overallWellbeing !== null) {
    if (scores.overallWellbeing >= 7) {
      parts.push("Worker is doing well overall.");
    } else if (scores.overallWellbeing >= 5) {
      parts.push("Worker is managing but has some challenges.");
    } else if (scores.overallWellbeing >= 3) {
      parts.push("Worker is struggling and needs support.");
    } else {
      parts.push("Worker is in significant distress - urgent attention needed.");
    }
  }

  // Pain status
  if (scores.painScore !== null) {
    if (scores.painScore <= 3) {
      parts.push("Pain is well controlled.");
    } else if (scores.painScore <= 6) {
      parts.push("Experiencing moderate pain.");
    } else {
      parts.push(`High pain level (${scores.painScore}/10).`);
    }
  }

  // Mood status
  if (scores.moodScore !== null) {
    if (scores.moodScore <= 3) {
      parts.push("Mood is very low - consider mental health support.");
    } else if (scores.moodScore <= 5) {
      parts.push("Mood could be better - monitor closely.");
    }
  }

  // ADL status
  if (scores.adlScore !== null && scores.adlScore < 60) {
    parts.push(`ADL capability at ${scores.adlScore}% - may need assistance.`);
  }

  // Risk signals summary
  const highRisks = riskSignals.filter((s) => s.severity === "high");
  if (highRisks.length > 0) {
    parts.push(`${highRisks.length} high-priority concern(s) requiring action.`);
  }

  // Work concerns
  const workConcerns = responses.find((r) => r.questionId === "work_concerns");
  if (workConcerns?.value === "Yes" || workConcerns?.value === true) {
    parts.push("Has concerns about returning to work.");
  }

  return parts.join(" ");
}

/**
 * Calculate trends from multiple check-ins
 */
export function calculateTrends(checkIns: CheckIn[]): {
  pain: TrendDirection;
  mood: TrendDirection;
  adl: TrendDirection;
  overall: TrendDirection;
} {
  if (checkIns.length < 2) {
    return { pain: "unknown", mood: "unknown", adl: "unknown", overall: "unknown" };
  }

  // Sort by date, most recent first
  const sorted = [...checkIns]
    .filter((c) => c.status === "completed")
    .sort((a, b) => new Date(b.completedDate!).getTime() - new Date(a.completedDate!).getTime());

  if (sorted.length < 2) {
    return { pain: "unknown", mood: "unknown", adl: "unknown", overall: "unknown" };
  }

  const recent = sorted.slice(0, 3); // Last 3 check-ins
  const earlier = sorted.slice(3, 6); // Previous 3

  const calcTrend = (
    recentVals: (number | null)[],
    earlierVals: (number | null)[],
    higherIsBetter: boolean
  ): TrendDirection => {
    const recentFiltered = recentVals.filter((v) => v !== null) as number[];
    const earlierFiltered = earlierVals.filter((v) => v !== null) as number[];

    if (recentFiltered.length === 0 || earlierFiltered.length === 0) return "unknown";

    const recentAvg = recentFiltered.reduce((a, b) => a + b, 0) / recentFiltered.length;
    const earlierAvg = earlierFiltered.reduce((a, b) => a + b, 0) / earlierFiltered.length;

    const diff = recentAvg - earlierAvg;
    const threshold = higherIsBetter ? 1 : -1; // 1 point change is significant

    if (Math.abs(diff) < Math.abs(threshold)) return "stable";
    if ((higherIsBetter && diff > 0) || (!higherIsBetter && diff < 0)) return "improving";
    return "declining";
  };

  // For pain, lower is better (invert)
  const painTrend = calcTrend(
    recent.map((c) => c.scores.painScore),
    earlier.length > 0 ? earlier.map((c) => c.scores.painScore) : recent.slice(1).map((c) => c.scores.painScore),
    false // Lower pain is better
  );

  // For mood, higher is better
  const moodTrend = calcTrend(
    recent.map((c) => c.scores.moodScore),
    earlier.length > 0 ? earlier.map((c) => c.scores.moodScore) : recent.slice(1).map((c) => c.scores.moodScore),
    true
  );

  // For ADL, higher is better
  const adlTrend = calcTrend(
    recent.map((c) => c.scores.adlScore),
    earlier.length > 0 ? earlier.map((c) => c.scores.adlScore) : recent.slice(1).map((c) => c.scores.adlScore),
    true
  );

  // Overall trend
  const overallTrend = calcTrend(
    recent.map((c) => c.scores.overallWellbeing),
    earlier.length > 0 ? earlier.map((c) => c.scores.overallWellbeing) : recent.slice(1).map((c) => c.scores.overallWellbeing),
    true
  );

  return { pain: painTrend, mood: moodTrend, adl: adlTrend, overall: overallTrend };
}

/**
 * Create a new check-in for a case
 */
export function createCheckIn(caseId: string, workerName: string, scheduledDate?: string): CheckIn {
  const now = new Date();
  return {
    id: randomUUID(),
    caseId,
    workerName,
    scheduledDate: scheduledDate || now.toISOString().split("T")[0],
    completedDate: null,
    status: "pending",
    responses: [],
    scores: {
      painScore: null,
      moodScore: null,
      adlScore: null,
      workReadiness: null,
      overallWellbeing: null,
    },
    riskSignals: [],
    summary: null,
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
  };
}

/**
 * Process and complete a check-in with responses
 */
export function completeCheckIn(
  checkIn: CheckIn,
  responses: CheckInResponse[],
  previousScores?: CheckInScores
): CheckIn {
  const scores = calculateScores(responses);
  const riskSignals = detectRiskSignals(responses, scores, previousScores);
  const summary = generateCheckInSummary(responses, scores, riskSignals);

  return {
    ...checkIn,
    completedDate: new Date().toISOString(),
    status: "completed",
    responses,
    scores,
    riskSignals,
    summary,
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Get next check-in due date (weekly)
 */
export function getNextCheckInDate(lastCheckInDate?: string): string {
  const base = lastCheckInDate ? new Date(lastCheckInDate) : new Date();
  const next = new Date(base);
  next.setDate(next.getDate() + 7);
  return next.toISOString().split("T")[0];
}

/**
 * Generate check-in trend summary for a case
 */
export function generateTrendSummary(
  caseId: string,
  workerName: string,
  checkIns: CheckIn[]
): CheckInTrend {
  const completed = checkIns.filter((c) => c.status === "completed");
  const missed = checkIns.filter((c) => c.status === "missed");

  const trends = calculateTrends(completed);

  // Calculate average scores
  const avgScores: CheckInScores = {
    painScore: null,
    moodScore: null,
    adlScore: null,
    workReadiness: null,
    overallWellbeing: null,
  };

  if (completed.length > 0) {
    const validPain = completed.filter((c) => c.scores.painScore !== null);
    const validMood = completed.filter((c) => c.scores.moodScore !== null);
    const validAdl = completed.filter((c) => c.scores.adlScore !== null);
    const validWork = completed.filter((c) => c.scores.workReadiness !== null);
    const validOverall = completed.filter((c) => c.scores.overallWellbeing !== null);

    if (validPain.length > 0) {
      avgScores.painScore = Math.round(
        validPain.reduce((sum, c) => sum + c.scores.painScore!, 0) / validPain.length * 10
      ) / 10;
    }
    if (validMood.length > 0) {
      avgScores.moodScore = Math.round(
        validMood.reduce((sum, c) => sum + c.scores.moodScore!, 0) / validMood.length * 10
      ) / 10;
    }
    if (validAdl.length > 0) {
      avgScores.adlScore = Math.round(
        validAdl.reduce((sum, c) => sum + c.scores.adlScore!, 0) / validAdl.length
      );
    }
    if (validWork.length > 0) {
      avgScores.workReadiness = Math.round(
        validWork.reduce((sum, c) => sum + c.scores.workReadiness!, 0) / validWork.length * 10
      ) / 10;
    }
    if (validOverall.length > 0) {
      avgScores.overallWellbeing = Math.round(
        validOverall.reduce((sum, c) => sum + c.scores.overallWellbeing!, 0) / validOverall.length * 10
      ) / 10;
    }
  }

  // Get recent risk signals
  const recentRiskSignals = completed
    .slice(0, 3)
    .flatMap((c) => c.riskSignals)
    .filter((s) => s.severity === "high" || s.requiresAction);

  // Get last check-in date
  const sortedCompleted = [...completed].sort(
    (a, b) => new Date(b.completedDate!).getTime() - new Date(a.completedDate!).getTime()
  );
  const lastCheckIn = sortedCompleted[0]?.completedDate || null;

  return {
    caseId,
    workerName,
    checkInCount: completed.length,
    missedCount: missed.length,
    engagementRate: checkIns.length > 0
      ? Math.round((completed.length / checkIns.length) * 100)
      : 100,
    trends,
    averageScores: avgScores,
    recentRiskSignals,
    lastCheckIn,
    nextCheckInDue: getNextCheckInDate(lastCheckIn || undefined),
  };
}
