import { randomUUID } from "crypto";

// Worker Behaviour & Sentiment Pattern Engine
// Analyzes worker interactions across multiple channels to identify patterns

export interface SentimentScore {
  value: number;          // -1 (very negative) to 1 (very positive)
  magnitude: number;      // 0-1 intensity
  confidence: number;     // 0-1 confidence level
}

export interface InteractionRecord {
  id: string;
  caseId: string;
  timestamp: string;
  channel: "email" | "checkin" | "interview" | "avatar" | "appointment" | "phone";
  direction: "inbound" | "outbound";
  content?: string;
  sentiment?: SentimentScore;
  attended?: boolean;      // For appointments
  responseTime?: number;   // Hours to respond
}

export interface SentimentTrend {
  period: string;          // ISO date
  averageSentiment: number;
  sampleCount: number;
  direction: "improving" | "stable" | "declining";
}

export interface EngagementMetrics {
  overallScore: number;              // 0-100
  responsiveness: number;            // 0-100 how quickly they respond
  appointmentAttendance: number;     // 0-100 percentage
  checkinCompletion: number;         // 0-100 percentage
  communicationVolume: "low" | "normal" | "high";
  lastInteraction: string | null;
  daysSinceContact: number;
}

export interface BehaviourFlag {
  id: string;
  type: BehaviourFlagType;
  severity: "low" | "medium" | "high" | "critical";
  message: string;
  details: string;
  triggeredAt: string;
  indicators: string[];
  suggestedAction: string;
}

export type BehaviourFlagType =
  | "negative_sentiment_trend"
  | "disengagement"
  | "missed_appointments"
  | "communication_withdrawal"
  | "distress_language"
  | "frustration_escalation"
  | "hopelessness_markers"
  | "conflict_indicators"
  | "non_compliance_pattern";

export interface WorkerBehaviourAnalysis {
  caseId: string;
  workerName: string;
  analysisDate: string;

  // Sentiment analysis
  currentSentiment: SentimentScore;
  sentimentTrend: SentimentTrend[];
  sentimentSummary: string;

  // Engagement metrics
  engagement: EngagementMetrics;
  engagementTrend: "improving" | "stable" | "declining";

  // Risk flags
  flags: BehaviourFlag[];
  riskLevel: "low" | "moderate" | "high" | "critical";

  // Recommendations
  recommendations: string[];
  priorityScore: number;     // 0-100 for case prioritization
}

// Linguistic markers for sentiment analysis
const DISTRESS_MARKERS = [
  "can't cope", "giving up", "no point", "worthless", "hopeless",
  "end it", "nobody cares", "abandoned", "forgotten", "too much",
  "breaking point", "can't go on", "falling apart", "desperate"
];

const FRUSTRATION_MARKERS = [
  "ridiculous", "unacceptable", "incompetent", "waste of time",
  "no one listens", "sick of", "fed up", "complaint", "lawyer",
  "fair work", "going to media", "lawsuit", "discrimination"
];

const POSITIVE_MARKERS = [
  "thank you", "grateful", "improving", "feeling better", "hopeful",
  "progress", "appreciate", "helpful", "confident", "optimistic",
  "getting stronger", "ready to return", "managing well"
];

const ENGAGEMENT_MARKERS = [
  "looking forward", "happy to", "will do", "understood", "agree",
  "committed", "working on", "trying my best", "making progress"
];

/**
 * Analyze text for sentiment
 */
export function analyzeSentiment(text: string): SentimentScore {
  if (!text || text.trim().length === 0) {
    return { value: 0, magnitude: 0, confidence: 0 };
  }

  const lowerText = text.toLowerCase();
  const words = lowerText.split(/\s+/);

  let positiveCount = 0;
  let negativeCount = 0;
  let distressCount = 0;
  let frustrationCount = 0;

  // Check for marker phrases
  for (const marker of POSITIVE_MARKERS) {
    if (lowerText.includes(marker)) positiveCount += 2;
  }

  for (const marker of ENGAGEMENT_MARKERS) {
    if (lowerText.includes(marker)) positiveCount += 1;
  }

  for (const marker of DISTRESS_MARKERS) {
    if (lowerText.includes(marker)) {
      distressCount += 3;
      negativeCount += 2;
    }
  }

  for (const marker of FRUSTRATION_MARKERS) {
    if (lowerText.includes(marker)) {
      frustrationCount += 2;
      negativeCount += 1;
    }
  }

  // Simple word-level sentiment
  const positiveWords = ["good", "great", "better", "well", "happy", "thanks", "pleased"];
  const negativeWords = ["bad", "worse", "pain", "difficult", "hard", "struggle", "problem"];

  for (const word of words) {
    if (positiveWords.includes(word)) positiveCount++;
    if (negativeWords.includes(word)) negativeCount++;
  }

  // Calculate sentiment value
  const total = positiveCount + negativeCount;
  let value = 0;
  let magnitude = 0;

  if (total > 0) {
    value = (positiveCount - negativeCount) / total;
    magnitude = Math.min(1, total / 20);  // Normalize magnitude
  }

  // Adjust for distress/frustration (these are more impactful)
  if (distressCount > 0) {
    value = Math.min(value, -0.5);
    magnitude = Math.max(magnitude, 0.8);
  }
  if (frustrationCount > 0) {
    value = Math.min(value, -0.3);
    magnitude = Math.max(magnitude, 0.6);
  }

  // Confidence based on sample size
  const confidence = Math.min(1, words.length / 50);

  return {
    value: Math.max(-1, Math.min(1, value)),
    magnitude,
    confidence
  };
}

/**
 * Detect distress language in text
 */
export function detectDistressLanguage(text: string): { detected: boolean; markers: string[] } {
  const lowerText = text.toLowerCase();
  const foundMarkers: string[] = [];

  for (const marker of DISTRESS_MARKERS) {
    if (lowerText.includes(marker)) {
      foundMarkers.push(marker);
    }
  }

  return {
    detected: foundMarkers.length > 0,
    markers: foundMarkers
  };
}

/**
 * Detect frustration escalation
 */
export function detectFrustration(text: string): { detected: boolean; markers: string[]; legalThreat: boolean } {
  const lowerText = text.toLowerCase();
  const foundMarkers: string[] = [];
  const legalMarkers = ["lawyer", "fair work", "lawsuit", "legal action", "going to media"];
  let legalThreat = false;

  for (const marker of FRUSTRATION_MARKERS) {
    if (lowerText.includes(marker)) {
      foundMarkers.push(marker);
      if (legalMarkers.some(lm => marker.includes(lm))) {
        legalThreat = true;
      }
    }
  }

  return {
    detected: foundMarkers.length > 0,
    markers: foundMarkers,
    legalThreat
  };
}

/**
 * Calculate engagement metrics from interaction history
 */
export function calculateEngagement(interactions: InteractionRecord[]): EngagementMetrics {
  if (interactions.length === 0) {
    return {
      overallScore: 0,
      responsiveness: 0,
      appointmentAttendance: 0,
      checkinCompletion: 0,
      communicationVolume: "low",
      lastInteraction: null,
      daysSinceContact: 999
    };
  }

  // Sort by timestamp
  const sorted = [...interactions].sort((a, b) =>
    new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );

  const lastInteraction = sorted[0]?.timestamp || null;
  const now = new Date();
  const daysSinceContact = lastInteraction
    ? Math.floor((now.getTime() - new Date(lastInteraction).getTime()) / (1000 * 60 * 60 * 24))
    : 999;

  // Calculate appointment attendance
  const appointments = interactions.filter(i => i.channel === "appointment");
  const attendedAppointments = appointments.filter(i => i.attended === true);
  const appointmentAttendance = appointments.length > 0
    ? (attendedAppointments.length / appointments.length) * 100
    : 100;

  // Calculate check-in completion
  const checkins = interactions.filter(i => i.channel === "checkin");
  const completedCheckins = checkins.filter(i => i.content && i.content.length > 0);
  const checkinCompletion = checkins.length > 0
    ? (completedCheckins.length / checkins.length) * 100
    : 100;

  // Calculate responsiveness (average response time)
  const responseTimes = interactions
    .filter(i => i.responseTime !== undefined)
    .map(i => i.responseTime as number);
  const avgResponseTime = responseTimes.length > 0
    ? responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length
    : 48;
  // Convert to score (faster = higher score)
  const responsiveness = Math.max(0, Math.min(100, 100 - (avgResponseTime * 2)));

  // Communication volume (last 30 days)
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const recentInteractions = interactions.filter(i => new Date(i.timestamp) > thirtyDaysAgo);
  const inboundRecent = recentInteractions.filter(i => i.direction === "inbound");
  let communicationVolume: "low" | "normal" | "high" = "normal";
  if (inboundRecent.length < 2) communicationVolume = "low";
  else if (inboundRecent.length > 10) communicationVolume = "high";

  // Overall engagement score
  const overallScore = Math.round(
    (appointmentAttendance * 0.3) +
    (checkinCompletion * 0.3) +
    (responsiveness * 0.2) +
    (daysSinceContact < 7 ? 20 : daysSinceContact < 14 ? 10 : 0)
  );

  return {
    overallScore: Math.min(100, overallScore),
    responsiveness: Math.round(responsiveness),
    appointmentAttendance: Math.round(appointmentAttendance),
    checkinCompletion: Math.round(checkinCompletion),
    communicationVolume,
    lastInteraction,
    daysSinceContact
  };
}

/**
 * Calculate sentiment trend from historical data
 */
export function calculateSentimentTrend(
  interactions: InteractionRecord[],
  periodDays: number = 7
): SentimentTrend[] {
  if (interactions.length === 0) return [];

  // Sort by timestamp
  const sorted = [...interactions]
    .filter(i => i.sentiment)
    .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

  if (sorted.length === 0) return [];

  const trends: SentimentTrend[] = [];
  const startDate = new Date(sorted[0].timestamp);
  const endDate = new Date(sorted[sorted.length - 1].timestamp);

  let currentDate = new Date(startDate);
  while (currentDate <= endDate) {
    const periodEnd = new Date(currentDate.getTime() + periodDays * 24 * 60 * 60 * 1000);
    const periodInteractions = sorted.filter(i => {
      const ts = new Date(i.timestamp);
      return ts >= currentDate && ts < periodEnd;
    });

    if (periodInteractions.length > 0) {
      const avgSentiment = periodInteractions.reduce((sum, i) =>
        sum + (i.sentiment?.value || 0), 0) / periodInteractions.length;

      // Determine direction based on previous period
      let direction: "improving" | "stable" | "declining" = "stable";
      if (trends.length > 0) {
        const prev = trends[trends.length - 1].averageSentiment;
        const diff = avgSentiment - prev;
        if (diff > 0.1) direction = "improving";
        else if (diff < -0.1) direction = "declining";
      }

      trends.push({
        period: currentDate.toISOString().split("T")[0],
        averageSentiment: Math.round(avgSentiment * 100) / 100,
        sampleCount: periodInteractions.length,
        direction
      });
    }

    currentDate = periodEnd;
  }

  return trends;
}

/**
 * Generate behaviour flags based on analysis
 */
export function generateBehaviourFlags(
  interactions: InteractionRecord[],
  engagement: EngagementMetrics,
  sentimentTrends: SentimentTrend[]
): BehaviourFlag[] {
  const flags: BehaviourFlag[] = [];
  const now = new Date().toISOString();

  // Check for negative sentiment trend
  if (sentimentTrends.length >= 3) {
    const recent = sentimentTrends.slice(-3);
    const declining = recent.every(t => t.direction === "declining" || t.averageSentiment < -0.2);
    if (declining) {
      flags.push({
        id: randomUUID(),
        type: "negative_sentiment_trend",
        severity: "high",
        message: "Worker sentiment has been declining over recent weeks",
        details: `Average sentiment dropped from ${recent[0].averageSentiment.toFixed(2)} to ${recent[recent.length - 1].averageSentiment.toFixed(2)}`,
        triggeredAt: now,
        indicators: ["Consecutive weeks of declining sentiment", "Increasingly negative language"],
        suggestedAction: "Schedule a welfare check call with the worker"
      });
    }
  }

  // Check for disengagement
  if (engagement.daysSinceContact > 14) {
    flags.push({
      id: randomUUID(),
      type: "disengagement",
      severity: engagement.daysSinceContact > 28 ? "critical" : "high",
      message: `No contact from worker in ${engagement.daysSinceContact} days`,
      details: "Worker may be disengaging from the case management process",
      triggeredAt: now,
      indicators: [`${engagement.daysSinceContact} days since last contact`],
      suggestedAction: "Attempt outreach via multiple channels (phone, email, SMS)"
    });
  }

  // Check for missed appointments
  if (engagement.appointmentAttendance < 50) {
    flags.push({
      id: randomUUID(),
      type: "missed_appointments",
      severity: engagement.appointmentAttendance < 25 ? "high" : "medium",
      message: "Worker has poor appointment attendance",
      details: `Only ${engagement.appointmentAttendance}% of appointments attended`,
      triggeredAt: now,
      indicators: ["Multiple missed appointments", "Pattern of non-attendance"],
      suggestedAction: "Discuss barriers to attendance and consider alternative arrangements"
    });
  }

  // Check for communication withdrawal
  if (engagement.communicationVolume === "low" && engagement.overallScore < 40) {
    flags.push({
      id: randomUUID(),
      type: "communication_withdrawal",
      severity: "medium",
      message: "Worker communication has significantly reduced",
      details: "Limited inbound communication in recent period",
      triggeredAt: now,
      indicators: ["Low communication volume", "Reduced engagement"],
      suggestedAction: "Proactive outreach to maintain connection"
    });
  }

  // Check for distress language in recent interactions
  const recentInteractions = interactions
    .filter(i => i.content)
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, 5);

  for (const interaction of recentInteractions) {
    if (interaction.content) {
      const distress = detectDistressLanguage(interaction.content);
      if (distress.detected) {
        flags.push({
          id: randomUUID(),
          type: "distress_language",
          severity: distress.markers.length > 2 ? "critical" : "high",
          message: "Distress language detected in worker communication",
          details: `Concerning phrases found: "${distress.markers.join('", "')}"`,
          triggeredAt: now,
          indicators: distress.markers,
          suggestedAction: "Immediate welfare check required - consider escalation to mental health support"
        });
        break; // Only add one distress flag
      }

      const frustration = detectFrustration(interaction.content);
      if (frustration.detected) {
        flags.push({
          id: randomUUID(),
          type: frustration.legalThreat ? "conflict_indicators" : "frustration_escalation",
          severity: frustration.legalThreat ? "critical" : "medium",
          message: frustration.legalThreat
            ? "Worker has indicated potential legal action or complaints"
            : "Worker expressing frustration with process",
          details: `Phrases detected: "${frustration.markers.join('", "')}"`,
          triggeredAt: now,
          indicators: frustration.markers,
          suggestedAction: frustration.legalThreat
            ? "Escalate to senior case manager and document all interactions"
            : "Address concerns promptly and review case handling"
        });
        break;
      }
    }
  }

  // Check for non-compliance pattern
  if (engagement.checkinCompletion < 50 && engagement.appointmentAttendance < 70) {
    flags.push({
      id: randomUUID(),
      type: "non_compliance_pattern",
      severity: "medium",
      message: "Worker showing pattern of non-compliance",
      details: `Check-in completion: ${engagement.checkinCompletion}%, Appointment attendance: ${engagement.appointmentAttendance}%`,
      triggeredAt: now,
      indicators: ["Low check-in completion", "Missed appointments"],
      suggestedAction: "Review barriers to compliance and consider case conference"
    });
  }

  return flags;
}

/**
 * Generate complete behaviour analysis for a case
 */
export function analyzeWorkerBehaviour(
  caseId: string,
  workerName: string,
  interactions: InteractionRecord[]
): WorkerBehaviourAnalysis {
  // Analyze all text content for sentiment
  const textInteractions = interactions.filter(i => i.content);
  for (const interaction of textInteractions) {
    if (!interaction.sentiment && interaction.content) {
      interaction.sentiment = analyzeSentiment(interaction.content);
    }
  }

  // Calculate current sentiment (weighted average of recent interactions)
  const recentWithSentiment = interactions
    .filter(i => i.sentiment)
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, 10);

  let currentSentiment: SentimentScore = { value: 0, magnitude: 0, confidence: 0 };
  if (recentWithSentiment.length > 0) {
    const totalWeight = recentWithSentiment.reduce((sum, _, i) => sum + (1 / (i + 1)), 0);
    currentSentiment = {
      value: recentWithSentiment.reduce((sum, int, i) =>
        sum + ((int.sentiment?.value || 0) * (1 / (i + 1))), 0) / totalWeight,
      magnitude: recentWithSentiment.reduce((sum, int, i) =>
        sum + ((int.sentiment?.magnitude || 0) * (1 / (i + 1))), 0) / totalWeight,
      confidence: recentWithSentiment.reduce((sum, int) =>
        sum + (int.sentiment?.confidence || 0), 0) / recentWithSentiment.length
    };
  }

  // Calculate trends and engagement
  const sentimentTrend = calculateSentimentTrend(interactions);
  const engagement = calculateEngagement(interactions);

  // Determine engagement trend
  let engagementTrend: "improving" | "stable" | "declining" = "stable";
  if (engagement.daysSinceContact > 14 || engagement.overallScore < 40) {
    engagementTrend = "declining";
  } else if (engagement.overallScore > 80 && engagement.daysSinceContact < 7) {
    engagementTrend = "improving";
  }

  // Generate flags
  const flags = generateBehaviourFlags(interactions, engagement, sentimentTrend);

  // Determine overall risk level
  let riskLevel: "low" | "moderate" | "high" | "critical" = "low";
  const criticalFlags = flags.filter(f => f.severity === "critical");
  const highFlags = flags.filter(f => f.severity === "high");
  if (criticalFlags.length > 0) riskLevel = "critical";
  else if (highFlags.length >= 2) riskLevel = "high";
  else if (highFlags.length === 1 || flags.length >= 3) riskLevel = "moderate";

  // Generate recommendations
  const recommendations = generateRecommendations(flags, engagement, currentSentiment);

  // Calculate priority score (higher = needs more attention)
  let priorityScore = 50;
  if (riskLevel === "critical") priorityScore = 100;
  else if (riskLevel === "high") priorityScore = 80;
  else if (riskLevel === "moderate") priorityScore = 60;
  priorityScore += (100 - engagement.overallScore) * 0.2;
  priorityScore -= currentSentiment.value * 10;

  // Generate summary
  const sentimentSummary = generateSentimentSummary(currentSentiment, sentimentTrend, engagement);

  return {
    caseId,
    workerName,
    analysisDate: new Date().toISOString(),
    currentSentiment,
    sentimentTrend,
    sentimentSummary,
    engagement,
    engagementTrend,
    flags,
    riskLevel,
    recommendations,
    priorityScore: Math.min(100, Math.max(0, Math.round(priorityScore)))
  };
}

/**
 * Generate recommendations based on analysis
 */
function generateRecommendations(
  flags: BehaviourFlag[],
  engagement: EngagementMetrics,
  sentiment: SentimentScore
): string[] {
  const recommendations: string[] = [];

  // Add flag-based recommendations
  for (const flag of flags.slice(0, 3)) {
    recommendations.push(flag.suggestedAction);
  }

  // Add engagement-based recommendations
  if (engagement.daysSinceContact > 7 && !flags.some(f => f.type === "disengagement")) {
    recommendations.push("Consider proactive check-in to maintain engagement");
  }

  if (engagement.responsiveness < 50) {
    recommendations.push("Review communication methods - worker may prefer different contact channels");
  }

  // Add sentiment-based recommendations
  if (sentiment.value < -0.3 && !flags.some(f => f.type.includes("sentiment"))) {
    recommendations.push("Worker may benefit from additional psychosocial support");
  }

  if (sentiment.value > 0.3) {
    recommendations.push("Positive engagement - good opportunity to progress RTW planning");
  }

  return [...new Set(recommendations)].slice(0, 5);
}

/**
 * Generate sentiment summary text
 */
function generateSentimentSummary(
  sentiment: SentimentScore,
  trends: SentimentTrend[],
  engagement: EngagementMetrics
): string {
  const parts: string[] = [];

  // Current sentiment description
  if (sentiment.value > 0.3) {
    parts.push("Worker is expressing generally positive sentiment");
  } else if (sentiment.value < -0.3) {
    parts.push("Worker communications indicate negative affect");
  } else {
    parts.push("Worker sentiment appears neutral");
  }

  // Trend description
  if (trends.length >= 2) {
    const recentTrend = trends[trends.length - 1].direction;
    if (recentTrend === "improving") {
      parts.push("with improvement noted over recent period");
    } else if (recentTrend === "declining") {
      parts.push("with concerning decline in recent period");
    }
  }

  // Engagement context
  if (engagement.overallScore > 70) {
    parts.push("Engagement levels are good.");
  } else if (engagement.overallScore < 40) {
    parts.push("Engagement has been limited.");
  }

  return parts.join(", ") + ".";
}

/**
 * Get cases ranked by behaviour risk
 */
export function rankCasesByBehaviourRisk(
  analyses: WorkerBehaviourAnalysis[]
): WorkerBehaviourAnalysis[] {
  return [...analyses].sort((a, b) => b.priorityScore - a.priorityScore);
}

/**
 * Create mock interaction records for testing
 */
export function createMockInteractions(caseId: string): InteractionRecord[] {
  const now = new Date();
  return [
    {
      id: randomUUID(),
      caseId,
      timestamp: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      channel: "email",
      direction: "inbound",
      content: "Thank you for your help. I'm feeling a bit better this week and hopeful about returning to work soon.",
      responseTime: 24
    },
    {
      id: randomUUID(),
      caseId,
      timestamp: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString(),
      channel: "checkin",
      direction: "inbound",
      content: "Pain is about the same. Still struggling with some tasks but managing."
    },
    {
      id: randomUUID(),
      caseId,
      timestamp: new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000).toISOString(),
      channel: "appointment",
      direction: "outbound",
      attended: true
    },
    {
      id: randomUUID(),
      caseId,
      timestamp: new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000).toISOString(),
      channel: "email",
      direction: "inbound",
      content: "This process is taking too long. I'm getting frustrated with all the paperwork.",
      responseTime: 12
    }
  ];
}
