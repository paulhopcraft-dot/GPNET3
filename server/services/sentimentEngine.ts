/**
 * Behaviour & Sentiment Pattern Engine
 *
 * Analyzes worker interactions across multiple channels to identify patterns
 * that may indicate engagement, distress, or disengagement.
 */

export type SentimentLevel = "very_positive" | "positive" | "neutral" | "negative" | "very_negative";
export type EngagementLevel = "high" | "moderate" | "low" | "disengaged";

export interface SentimentAnalysis {
  caseId: string;
  analysedAt: string;
  overallSentiment: SentimentLevel;
  sentimentScore: number; // -100 to 100
  engagementLevel: EngagementLevel;
  engagementScore: number; // 0 to 100
  trends: SentimentTrend[];
  riskFlags: SentimentRiskFlag[];
  recommendations: string[];
}

export interface SentimentTrend {
  period: string;
  sentimentScore: number;
  keyIndicators: string[];
}

export interface SentimentRiskFlag {
  type: "distress" | "disengagement" | "conflict" | "hopelessness" | "frustration";
  severity: "low" | "medium" | "high" | "critical";
  indicators: string[];
  recommendation: string;
}

export interface CommunicationPattern {
  responseTime: "fast" | "normal" | "slow" | "unresponsive";
  communicationFrequency: "high" | "normal" | "low" | "minimal";
  messageLength: "detailed" | "normal" | "brief" | "minimal";
  toneIndicators: string[];
}

export interface TextAnalysisResult {
  sentiment: SentimentLevel;
  score: number;
  keywords: string[];
  emotionalIndicators: string[];
  concernPatterns: string[];
}

// Keywords and patterns for sentiment analysis
const POSITIVE_INDICATORS = [
  "thank you", "grateful", "improving", "better", "hopeful", "progress",
  "appreciate", "good", "great", "excellent", "happy", "optimistic",
  "looking forward", "recovery", "feel good", "getting stronger"
];

const NEGATIVE_INDICATORS = [
  "frustrated", "angry", "upset", "worse", "pain", "struggling",
  "difficult", "can't", "impossible", "hopeless", "give up", "depressed",
  "anxious", "worried", "scared", "overwhelmed", "exhausted", "unfair"
];

const DISTRESS_PATTERNS = [
  "can't take it anymore", "give up", "no point", "end it",
  "can't go on", "too much", "breaking point", "crisis"
];

const DISENGAGEMENT_PATTERNS = [
  "don't care", "what's the point", "waste of time", "not going to",
  "won't bother", "leave me alone", "stop contacting"
];

class SentimentEngineService {
  /**
   * Analyze text for sentiment
   */
  analyzeText(text: string): TextAnalysisResult {
    const lowerText = text.toLowerCase();
    let score = 0;
    const keywords: string[] = [];
    const emotionalIndicators: string[] = [];
    const concernPatterns: string[] = [];

    // Count positive indicators
    POSITIVE_INDICATORS.forEach(indicator => {
      if (lowerText.includes(indicator)) {
        score += 10;
        keywords.push(indicator);
        emotionalIndicators.push(`positive: ${indicator}`);
      }
    });

    // Count negative indicators
    NEGATIVE_INDICATORS.forEach(indicator => {
      if (lowerText.includes(indicator)) {
        score -= 10;
        keywords.push(indicator);
        emotionalIndicators.push(`negative: ${indicator}`);
      }
    });

    // Check for distress patterns
    DISTRESS_PATTERNS.forEach(pattern => {
      if (lowerText.includes(pattern)) {
        score -= 25;
        concernPatterns.push(`distress: ${pattern}`);
      }
    });

    // Check for disengagement patterns
    DISENGAGEMENT_PATTERNS.forEach(pattern => {
      if (lowerText.includes(pattern)) {
        score -= 15;
        concernPatterns.push(`disengagement: ${pattern}`);
      }
    });

    // Normalize score to -100 to 100
    score = Math.max(-100, Math.min(100, score));

    // Determine sentiment level
    let sentiment: SentimentLevel;
    if (score >= 40) sentiment = "very_positive";
    else if (score >= 15) sentiment = "positive";
    else if (score >= -15) sentiment = "neutral";
    else if (score >= -40) sentiment = "negative";
    else sentiment = "very_negative";

    return {
      sentiment,
      score,
      keywords,
      emotionalIndicators,
      concernPatterns,
    };
  }

  /**
   * Analyze communication patterns from a series of messages
   */
  analyzeCommunicationPatterns(messages: Array<{ text: string; timestamp: string; fromWorker: boolean }>): CommunicationPattern {
    const workerMessages = messages.filter(m => m.fromWorker);

    // Analyze response time
    let responseTime: CommunicationPattern["responseTime"] = "normal";
    // In a full implementation, we'd calculate actual response times

    // Analyze frequency
    let communicationFrequency: CommunicationPattern["communicationFrequency"] = "normal";
    if (workerMessages.length > 10) communicationFrequency = "high";
    else if (workerMessages.length < 3) communicationFrequency = "low";
    else if (workerMessages.length === 0) communicationFrequency = "minimal";

    // Analyze message length
    const avgLength = workerMessages.length > 0
      ? workerMessages.reduce((sum, m) => sum + m.text.length, 0) / workerMessages.length
      : 0;
    let messageLength: CommunicationPattern["messageLength"] = "normal";
    if (avgLength > 200) messageLength = "detailed";
    else if (avgLength < 30) messageLength = "brief";
    else if (avgLength < 10) messageLength = "minimal";

    // Aggregate tone indicators
    const toneIndicators: string[] = [];
    workerMessages.forEach(m => {
      const analysis = this.analyzeText(m.text);
      toneIndicators.push(...analysis.emotionalIndicators.slice(0, 2));
    });

    return {
      responseTime,
      communicationFrequency,
      messageLength,
      toneIndicators: [...new Set(toneIndicators)].slice(0, 5),
    };
  }

  /**
   * Perform full sentiment analysis for a case
   */
  performFullAnalysis(
    caseId: string,
    discussionNotes: Array<{ text: string; timestamp: string }>,
    checkinData?: { painScores: number[]; moodScores: number[] }
  ): SentimentAnalysis {
    const analysisResults = discussionNotes.map(note => this.analyzeText(note.text));

    // Calculate overall sentiment score
    const totalScore = analysisResults.length > 0
      ? analysisResults.reduce((sum, r) => sum + r.score, 0) / analysisResults.length
      : 0;

    // Determine overall sentiment level
    let overallSentiment: SentimentLevel;
    if (totalScore >= 40) overallSentiment = "very_positive";
    else if (totalScore >= 15) overallSentiment = "positive";
    else if (totalScore >= -15) overallSentiment = "neutral";
    else if (totalScore >= -40) overallSentiment = "negative";
    else overallSentiment = "very_negative";

    // Calculate engagement level
    const engagementScore = this.calculateEngagementScore(discussionNotes, checkinData);
    let engagementLevel: EngagementLevel;
    if (engagementScore >= 75) engagementLevel = "high";
    else if (engagementScore >= 50) engagementLevel = "moderate";
    else if (engagementScore >= 25) engagementLevel = "low";
    else engagementLevel = "disengaged";

    // Generate trends (simplified - would use time-based analysis in production)
    const trends = this.generateTrends(analysisResults, discussionNotes);

    // Identify risk flags
    const riskFlags = this.identifyRiskFlags(analysisResults, engagementScore);

    // Generate recommendations
    const recommendations = this.generateRecommendations(overallSentiment, engagementLevel, riskFlags);

    return {
      caseId,
      analysedAt: new Date().toISOString(),
      overallSentiment,
      sentimentScore: Math.round(totalScore),
      engagementLevel,
      engagementScore,
      trends,
      riskFlags,
      recommendations,
    };
  }

  /**
   * Quick sentiment check for a single text
   */
  quickSentimentCheck(text: string): { level: SentimentLevel; needsAttention: boolean } {
    const analysis = this.analyzeText(text);
    const needsAttention = analysis.concernPatterns.length > 0 || analysis.score < -30;

    return {
      level: analysis.sentiment,
      needsAttention,
    };
  }

  // Private helper methods

  private calculateEngagementScore(
    discussionNotes: Array<{ text: string; timestamp: string }>,
    checkinData?: { painScores: number[]; moodScores: number[] }
  ): number {
    let score = 50; // Base score

    // Communication frequency factor
    if (discussionNotes.length > 5) score += 15;
    else if (discussionNotes.length < 2) score -= 15;

    // Message detail factor
    const avgLength = discussionNotes.length > 0
      ? discussionNotes.reduce((sum, n) => sum + n.text.length, 0) / discussionNotes.length
      : 0;
    if (avgLength > 150) score += 10;
    else if (avgLength < 30) score -= 10;

    // Check-in compliance factor
    if (checkinData) {
      if (checkinData.painScores.length >= 4) score += 15;
      if (checkinData.moodScores.length >= 4) score += 10;
    }

    return Math.max(0, Math.min(100, score));
  }

  private generateTrends(
    analysisResults: TextAnalysisResult[],
    notes: Array<{ text: string; timestamp: string }>
  ): SentimentTrend[] {
    if (analysisResults.length < 2) return [];

    const trends: SentimentTrend[] = [];
    const midpoint = Math.floor(analysisResults.length / 2);

    // First half
    const firstHalf = analysisResults.slice(0, midpoint);
    const firstHalfScore = firstHalf.reduce((sum, r) => sum + r.score, 0) / firstHalf.length;
    trends.push({
      period: "Earlier Period",
      sentimentScore: Math.round(firstHalfScore),
      keyIndicators: this.aggregateKeywords(firstHalf),
    });

    // Second half
    const secondHalf = analysisResults.slice(midpoint);
    const secondHalfScore = secondHalf.reduce((sum, r) => sum + r.score, 0) / secondHalf.length;
    trends.push({
      period: "Recent Period",
      sentimentScore: Math.round(secondHalfScore),
      keyIndicators: this.aggregateKeywords(secondHalf),
    });

    return trends;
  }

  private aggregateKeywords(results: TextAnalysisResult[]): string[] {
    const allKeywords = results.flatMap(r => r.keywords);
    const counts = new Map<string, number>();
    allKeywords.forEach(k => {
      counts.set(k, (counts.get(k) || 0) + 1);
    });
    return Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([keyword]) => keyword);
  }

  private identifyRiskFlags(
    analysisResults: TextAnalysisResult[],
    engagementScore: number
  ): SentimentRiskFlag[] {
    const flags: SentimentRiskFlag[] = [];

    // Check for distress
    const distressPatterns = analysisResults.flatMap(r => r.concernPatterns.filter(p => p.startsWith("distress")));
    if (distressPatterns.length > 0) {
      flags.push({
        type: "distress",
        severity: distressPatterns.length >= 3 ? "critical" : distressPatterns.length >= 2 ? "high" : "medium",
        indicators: distressPatterns,
        recommendation: "Immediate welfare check recommended. Consider referral to EAP or mental health support.",
      });
    }

    // Check for disengagement
    const disengagementPatterns = analysisResults.flatMap(r => r.concernPatterns.filter(p => p.startsWith("disengagement")));
    if (disengagementPatterns.length > 0 || engagementScore < 25) {
      flags.push({
        type: "disengagement",
        severity: engagementScore < 15 ? "high" : "medium",
        indicators: disengagementPatterns,
        recommendation: "Re-engage worker through personal outreach. Review case management approach.",
      });
    }

    // Check for frustration
    const negativeCount = analysisResults.filter(r => r.score < -20).length;
    if (negativeCount >= 3) {
      flags.push({
        type: "frustration",
        severity: negativeCount >= 5 ? "high" : "medium",
        indicators: ["Repeated negative sentiment in communications"],
        recommendation: "Address worker concerns directly. Consider case review meeting.",
      });
    }

    // Check for hopelessness
    const veryNegativeCount = analysisResults.filter(r => r.score < -50).length;
    if (veryNegativeCount >= 2) {
      flags.push({
        type: "hopelessness",
        severity: "high",
        indicators: ["Expressions of hopelessness or giving up"],
        recommendation: "Urgent intervention required. Reassess RTW plan and provide additional support.",
      });
    }

    return flags;
  }

  private generateRecommendations(
    sentiment: SentimentLevel,
    engagement: EngagementLevel,
    flags: SentimentRiskFlag[]
  ): string[] {
    const recommendations: string[] = [];

    // Sentiment-based recommendations
    if (sentiment === "very_negative" || sentiment === "negative") {
      recommendations.push("Schedule a welfare check-in call with the worker");
      recommendations.push("Review recent case events for triggers of negative sentiment");
    }

    // Engagement-based recommendations
    if (engagement === "disengaged" || engagement === "low") {
      recommendations.push("Implement proactive communication schedule (2-3 touchpoints per week)");
      recommendations.push("Consider alternative communication methods (phone call vs email)");
    }

    // Flag-based recommendations
    if (flags.some(f => f.severity === "critical")) {
      recommendations.unshift("URGENT: Critical flags detected - immediate case review required");
    }

    // Default recommendation
    if (recommendations.length === 0 && sentiment !== "very_positive") {
      recommendations.push("Continue regular monitoring and maintain current communication frequency");
    }

    return recommendations;
  }
}

export const sentimentEngineService = new SentimentEngineService();
