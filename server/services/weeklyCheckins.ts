/**
 * Weekly Check-ins Module
 *
 * Manages weekly worker check-ins to track recovery progress,
 * mood, functional status, and engagement.
 */

import { db } from "../db";
import { workerCases } from "../../shared/schema";
import { eq } from "drizzle-orm";

export interface CheckinQuestion {
  id: string;
  text: string;
  type: "scale" | "yesno" | "text" | "multiselect";
  options?: string[];
  required: boolean;
  category: "pain" | "function" | "mood" | "work" | "compliance";
}

export interface CheckinResponse {
  questionId: string;
  value: string | number | boolean | string[];
}

export interface WeeklyCheckin {
  id: string;
  caseId: string;
  workerName: string;
  week: number;
  completedAt: string;
  responses: CheckinResponse[];
  painScore: number;
  moodScore: number;
  functionScore: number;
  overallStatus: "improving" | "stable" | "declining";
  flags: string[];
  notes?: string;
}

export interface CheckinSummary {
  caseId: string;
  totalCheckins: number;
  averagePainScore: number;
  averageMoodScore: number;
  averageFunctionScore: number;
  trend: "improving" | "stable" | "declining";
  lastCheckin?: WeeklyCheckin;
  missedCheckins: number;
  complianceRate: number;
}

// Standard check-in questions
const CHECKIN_QUESTIONS: CheckinQuestion[] = [
  {
    id: "pain_level",
    text: "How would you rate your pain level today? (0 = no pain, 10 = worst pain)",
    type: "scale",
    required: true,
    category: "pain",
  },
  {
    id: "pain_change",
    text: "Compared to last week, is your pain better, worse, or about the same?",
    type: "multiselect",
    options: ["Better", "About the same", "Worse"],
    required: true,
    category: "pain",
  },
  {
    id: "daily_activities",
    text: "How well can you perform daily activities?",
    type: "scale",
    required: true,
    category: "function",
  },
  {
    id: "work_readiness",
    text: "How ready do you feel to increase your work hours or duties?",
    type: "scale",
    required: true,
    category: "work",
  },
  {
    id: "mood_level",
    text: "How would you rate your overall mood this week?",
    type: "scale",
    required: true,
    category: "mood",
  },
  {
    id: "sleep_quality",
    text: "How would you rate your sleep quality this week?",
    type: "scale",
    required: false,
    category: "function",
  },
  {
    id: "medication_compliance",
    text: "Have you been taking your medications as prescribed?",
    type: "yesno",
    required: true,
    category: "compliance",
  },
  {
    id: "appointment_attendance",
    text: "Have you attended all scheduled appointments this week?",
    type: "yesno",
    required: true,
    category: "compliance",
  },
  {
    id: "exercise_compliance",
    text: "Have you been following your exercise or physio program?",
    type: "yesno",
    required: false,
    category: "compliance",
  },
  {
    id: "concerns",
    text: "Do you have any concerns or issues you'd like to discuss?",
    type: "text",
    required: false,
    category: "mood",
  },
];

class WeeklyCheckinsService {
  /**
   * Get the check-in questions for a case
   */
  getQuestions(): CheckinQuestion[] {
    return CHECKIN_QUESTIONS;
  }

  /**
   * Submit a weekly check-in
   */
  async submitCheckin(
    caseId: string,
    workerName: string,
    responses: CheckinResponse[],
    notes?: string
  ): Promise<WeeklyCheckin> {
    // Calculate scores from responses
    const painScore = this.extractScore(responses, "pain_level");
    const moodScore = this.extractScore(responses, "mood_level");
    const functionScore = this.extractScore(responses, "daily_activities");

    // Identify flags
    const flags = this.identifyFlags(responses, painScore, moodScore);

    // Determine overall status based on pain change
    const painChange = responses.find(r => r.questionId === "pain_change");
    let overallStatus: "improving" | "stable" | "declining" = "stable";
    if (painChange) {
      if (painChange.value === "Better") overallStatus = "improving";
      else if (painChange.value === "Worse") overallStatus = "declining";
    }

    // Calculate week number (placeholder - in real implementation would track)
    const weekNumber = Math.floor(Date.now() / (7 * 24 * 60 * 60 * 1000)) % 52;

    const checkin: WeeklyCheckin = {
      id: `checkin-${caseId}-${Date.now()}`,
      caseId,
      workerName,
      week: weekNumber,
      completedAt: new Date().toISOString(),
      responses,
      painScore,
      moodScore,
      functionScore,
      overallStatus,
      flags,
      notes,
    };

    // In a full implementation, we would save this to the database
    // For now, we'll return the checkin object

    return checkin;
  }

  /**
   * Get check-in summary for a case
   */
  async getCheckinSummary(caseId: string, checkins: WeeklyCheckin[]): Promise<CheckinSummary> {
    if (checkins.length === 0) {
      return {
        caseId,
        totalCheckins: 0,
        averagePainScore: 0,
        averageMoodScore: 0,
        averageFunctionScore: 0,
        trend: "stable",
        missedCheckins: 0,
        complianceRate: 0,
      };
    }

    // Calculate averages
    const avgPain = checkins.reduce((sum, c) => sum + c.painScore, 0) / checkins.length;
    const avgMood = checkins.reduce((sum, c) => sum + c.moodScore, 0) / checkins.length;
    const avgFunction = checkins.reduce((sum, c) => sum + c.functionScore, 0) / checkins.length;

    // Determine trend from recent check-ins
    const recent = checkins.slice(-3);
    let improvingCount = 0;
    let decliningCount = 0;
    recent.forEach(c => {
      if (c.overallStatus === "improving") improvingCount++;
      if (c.overallStatus === "declining") decliningCount++;
    });

    let trend: "improving" | "stable" | "declining" = "stable";
    if (improvingCount > decliningCount) trend = "improving";
    else if (decliningCount > improvingCount) trend = "declining";

    // Calculate compliance rate based on responses
    const complianceResponses = checkins.flatMap(c =>
      c.responses.filter(r =>
        r.questionId === "medication_compliance" ||
        r.questionId === "appointment_attendance"
      )
    );
    const compliantResponses = complianceResponses.filter(r => r.value === true).length;
    const complianceRate = complianceResponses.length > 0
      ? Math.round((compliantResponses / complianceResponses.length) * 100)
      : 100;

    return {
      caseId,
      totalCheckins: checkins.length,
      averagePainScore: Math.round(avgPain * 10) / 10,
      averageMoodScore: Math.round(avgMood * 10) / 10,
      averageFunctionScore: Math.round(avgFunction * 10) / 10,
      trend,
      lastCheckin: checkins[checkins.length - 1],
      missedCheckins: 0, // Would calculate based on expected schedule
      complianceRate,
    };
  }

  /**
   * Generate check-in reminder
   */
  generateReminder(caseId: string, workerName: string, daysSinceLastCheckin: number): {
    subject: string;
    body: string;
    urgency: "normal" | "high";
  } {
    const urgency = daysSinceLastCheckin > 10 ? "high" : "normal";

    return {
      subject: `Weekly Check-in Reminder - GPNet`,
      body: `Hi ${workerName},

It's time for your weekly check-in. Regular check-ins help us track your progress and ensure you're getting the support you need.

Please complete your check-in at your earliest convenience.

${daysSinceLastCheckin > 7 ? `Note: Your last check-in was ${daysSinceLastCheckin} days ago. Regular check-ins are important for your case management.` : ""}

Thank you for your cooperation.

Best regards,
GPNet Case Management Team`,
      urgency,
    };
  }

  /**
   * Analyze check-in trends for a case
   */
  analyzetrends(checkins: WeeklyCheckin[]): {
    painTrend: number; // -100 to 100, negative = improving
    moodTrend: number;
    functionTrend: number;
    concerningPatterns: string[];
    positiveIndicators: string[];
  } {
    if (checkins.length < 2) {
      return {
        painTrend: 0,
        moodTrend: 0,
        functionTrend: 0,
        concerningPatterns: [],
        positiveIndicators: [],
      };
    }

    // Calculate trends (compare first half to second half)
    const midpoint = Math.floor(checkins.length / 2);
    const firstHalf = checkins.slice(0, midpoint);
    const secondHalf = checkins.slice(midpoint);

    const avgPainFirst = firstHalf.reduce((s, c) => s + c.painScore, 0) / firstHalf.length;
    const avgPainSecond = secondHalf.reduce((s, c) => s + c.painScore, 0) / secondHalf.length;
    const painTrend = Math.round((avgPainSecond - avgPainFirst) * 10);

    const avgMoodFirst = firstHalf.reduce((s, c) => s + c.moodScore, 0) / firstHalf.length;
    const avgMoodSecond = secondHalf.reduce((s, c) => s + c.moodScore, 0) / secondHalf.length;
    const moodTrend = Math.round((avgMoodSecond - avgMoodFirst) * 10);

    const avgFunctionFirst = firstHalf.reduce((s, c) => s + c.functionScore, 0) / firstHalf.length;
    const avgFunctionSecond = secondHalf.reduce((s, c) => s + c.functionScore, 0) / secondHalf.length;
    const functionTrend = Math.round((avgFunctionSecond - avgFunctionFirst) * 10);

    // Identify patterns
    const concerningPatterns: string[] = [];
    const positiveIndicators: string[] = [];

    if (painTrend > 20) concerningPatterns.push("Pain levels increasing over time");
    if (painTrend < -20) positiveIndicators.push("Pain levels decreasing over time");

    if (moodTrend < -20) concerningPatterns.push("Mood declining over time");
    if (moodTrend > 20) positiveIndicators.push("Mood improving over time");

    if (functionTrend > 20) positiveIndicators.push("Functional capacity improving");
    if (functionTrend < -20) concerningPatterns.push("Functional capacity declining");

    // Check for consistent high pain
    const recentHighPain = secondHalf.filter(c => c.painScore >= 7).length;
    if (recentHighPain >= secondHalf.length * 0.5) {
      concerningPatterns.push("Consistently high pain levels reported");
    }

    // Check for flags
    const recentFlags = secondHalf.flatMap(c => c.flags);
    if (recentFlags.includes("critical")) {
      concerningPatterns.push("Critical flags raised in recent check-ins");
    }

    return {
      painTrend,
      moodTrend,
      functionTrend,
      concerningPatterns,
      positiveIndicators,
    };
  }

  // Private helper methods

  private extractScore(responses: CheckinResponse[], questionId: string): number {
    const response = responses.find(r => r.questionId === questionId);
    if (!response) return 5; // Default middle score
    const value = Number(response.value);
    return isNaN(value) ? 5 : value;
  }

  private identifyFlags(responses: CheckinResponse[], painScore: number, moodScore: number): string[] {
    const flags: string[] = [];

    // High pain flag
    if (painScore >= 8) {
      flags.push("high_pain");
    }

    // Low mood flag
    if (moodScore <= 3) {
      flags.push("low_mood");
    }

    // Non-compliance flags
    const medicationCompliance = responses.find(r => r.questionId === "medication_compliance");
    if (medicationCompliance?.value === false) {
      flags.push("medication_non_compliance");
    }

    const appointmentAttendance = responses.find(r => r.questionId === "appointment_attendance");
    if (appointmentAttendance?.value === false) {
      flags.push("missed_appointments");
    }

    // Concerns flag
    const concerns = responses.find(r => r.questionId === "concerns");
    if (concerns?.value && String(concerns.value).length > 0) {
      flags.push("has_concerns");
    }

    // Critical flag for combination of issues
    if (painScore >= 9 || moodScore <= 2 || flags.length >= 3) {
      flags.push("critical");
    }

    return flags;
  }
}

export const weeklyCheckinsService = new WeeklyCheckinsService();
