import { describe, it, expect } from "vitest";
import {
  CHECKIN_QUESTIONS,
  createCheckIn,
  completeCheckIn,
  calculateScores,
  detectRiskSignals,
  generateTrendSummary,
  getNextCheckInDate,
  CheckInResponse,
  CheckIn,
} from "./weeklyCheckin";

describe("weeklyCheckin", () => {
  describe("CHECKIN_QUESTIONS", () => {
    it("has 15 questions", () => {
      expect(CHECKIN_QUESTIONS).toHaveLength(15);
    });

    it("has questions in all categories", () => {
      const categories = [...new Set(CHECKIN_QUESTIONS.map(q => q.category))];
      expect(categories).toContain("pain");
      expect(categories).toContain("mood");
      expect(categories).toContain("adl");
      expect(categories).toContain("work");
      expect(categories).toContain("general");
    });

    it("has valid type for each question", () => {
      CHECKIN_QUESTIONS.forEach(q => {
        expect(["scale", "yes_no", "multiple_choice", "text"]).toContain(q.type);
      });
    });

    it("has options for multiple_choice questions", () => {
      const multiChoiceQuestions = CHECKIN_QUESTIONS.filter(
        q => q.type === "multiple_choice"
      );
      multiChoiceQuestions.forEach(q => {
        expect(q.options).toBeDefined();
        expect(q.options!.length).toBeGreaterThan(0);
      });
    });
  });

  describe("createCheckIn", () => {
    it("creates a check-in with pending status", () => {
      const checkIn = createCheckIn("case-123", "John Smith");

      expect(checkIn.caseId).toBe("case-123");
      expect(checkIn.workerName).toBe("John Smith");
      expect(checkIn.status).toBe("pending");
      expect(checkIn.id).toBeDefined();
      expect(checkIn.responses).toEqual([]);
    });

    it("generates unique IDs for each check-in", () => {
      const checkIn1 = createCheckIn("case-1", "Worker 1");
      const checkIn2 = createCheckIn("case-2", "Worker 2");

      expect(checkIn1.id).not.toBe(checkIn2.id);
    });

    it("uses provided scheduled date", () => {
      const checkIn = createCheckIn("case-123", "John Smith", "2025-12-15");

      expect(checkIn.scheduledDate).toBe("2025-12-15");
    });
  });

  describe("calculateScores", () => {
    it("calculates pain score from scale response", () => {
      const responses: CheckInResponse[] = [
        { questionId: "pain_level", value: 5 },
      ];
      const scores = calculateScores(responses);

      expect(scores.painScore).toBe(5);
    });

    it("calculates mood score from scale response", () => {
      const responses: CheckInResponse[] = [
        { questionId: "mood_level", value: 7 },
      ];
      const scores = calculateScores(responses);

      expect(scores.moodScore).toBe(7);
    });

    it("calculates ADL score as percentage", () => {
      const responses: CheckInResponse[] = [
        { questionId: "adl_self_care", value: "Fully independent" },
        { questionId: "adl_mobility", value: "Normal" },
        { questionId: "adl_household", value: "Fully" },
      ];
      const scores = calculateScores(responses);

      expect(scores.adlScore).toBe(100);
    });

    it("calculates overall wellbeing from pain and mood", () => {
      const responses: CheckInResponse[] = [
        { questionId: "pain_level", value: 4 }, // Inverted: 6
        { questionId: "mood_level", value: 8 },
      ];
      const scores = calculateScores(responses);

      // (6 + 8) / 2 = 7
      expect(scores.overallWellbeing).toBe(7);
    });

    it("returns null for missing values", () => {
      const responses: CheckInResponse[] = [];
      const scores = calculateScores(responses);

      expect(scores.painScore).toBeNull();
      expect(scores.moodScore).toBeNull();
      expect(scores.adlScore).toBeNull();
    });
  });

  describe("completeCheckIn", () => {
    it("marks check-in as completed with scores", () => {
      const checkIn = createCheckIn("case-123", "John Smith");
      const responses: CheckInResponse[] = [
        { questionId: "pain_level", value: 5 },
        { questionId: "mood_level", value: 6 },
        { questionId: "adl_self_care", value: "Mostly independent" },
        { questionId: "adl_mobility", value: "Slightly limited" },
        { questionId: "adl_household", value: "Mostly" },
      ];

      const result = completeCheckIn(checkIn, responses);

      expect(result.status).toBe("completed");
      expect(result.completedDate).toBeDefined();
      expect(result.scores.painScore).toBe(5);
      expect(result.scores.moodScore).toBe(6);
      expect(result.scores.adlScore).toBe(80);
    });

    it("detects risk signals for high pain", () => {
      const checkIn = createCheckIn("case-123", "John Smith");
      const responses: CheckInResponse[] = [
        { questionId: "pain_level", value: 9 },
        { questionId: "mood_level", value: 5 },
      ];

      const result = completeCheckIn(checkIn, responses);

      expect(result.riskSignals.length).toBeGreaterThan(0);
      expect(result.riskSignals.some(s => s.type === "pain_increase")).toBe(true);
    });

    it("detects risk signals for low mood", () => {
      const checkIn = createCheckIn("case-123", "John Smith");
      const responses: CheckInResponse[] = [
        { questionId: "pain_level", value: 3 },
        { questionId: "mood_level", value: 2 },
      ];

      const result = completeCheckIn(checkIn, responses);

      expect(result.riskSignals.some(s => s.type === "mood_decline")).toBe(true);
    });

    it("generates summary for completed check-in", () => {
      const checkIn = createCheckIn("case-123", "John Smith");
      const responses: CheckInResponse[] = [
        { questionId: "pain_level", value: 3 },
        { questionId: "mood_level", value: 7 },
      ];

      const result = completeCheckIn(checkIn, responses);

      expect(result.summary).toBeDefined();
      expect(result.summary!.length).toBeGreaterThan(0);
    });
  });

  describe("detectRiskSignals", () => {
    it("detects concerning text in responses", () => {
      const responses: CheckInResponse[] = [
        { questionId: "additional_comments", value: "I feel hopeless and can't cope anymore" },
      ];
      const scores = calculateScores(responses);
      const signals = detectRiskSignals(responses, scores);

      expect(signals.some(s => s.type === "concerning_text")).toBe(true);
    });

    it("detects disengagement when not following treatment", () => {
      const responses: CheckInResponse[] = [
        { questionId: "treatment_following", value: "No" },
      ];
      const scores = calculateScores(responses);
      const signals = detectRiskSignals(responses, scores);

      expect(signals.some(s => s.type === "disengagement")).toBe(true);
    });

    it("detects pain increase from previous scores", () => {
      const responses: CheckInResponse[] = [
        { questionId: "pain_level", value: 8 },
      ];
      const scores = calculateScores(responses);
      const previousScores = { painScore: 4, moodScore: 6, adlScore: 80, workReadiness: null, overallWellbeing: 5 };
      const signals = detectRiskSignals(responses, scores, previousScores);

      expect(signals.some(s => s.type === "pain_increase" && s.message.includes("increased"))).toBe(true);
    });
  });

  describe("generateTrendSummary", () => {
    it("returns summary for no check-ins", () => {
      const summary = generateTrendSummary("case-123", "John Smith", []);

      expect(summary.checkInCount).toBe(0);
      expect(summary.trends.overall).toBe("unknown");
    });

    it("calculates averages for completed check-ins", () => {
      const checkIn = createCheckIn("case-123", "John Smith");
      const responses: CheckInResponse[] = [
        { questionId: "pain_level", value: 4 },
        { questionId: "mood_level", value: 6 },
      ];
      const completed = completeCheckIn(checkIn, responses);

      const summary = generateTrendSummary("case-123", "John Smith", [completed]);

      expect(summary.checkInCount).toBe(1);
      expect(summary.averageScores.painScore).toBe(4);
      expect(summary.averageScores.moodScore).toBe(6);
    });

    it("calculates engagement rate", () => {
      const completed: CheckIn = {
        ...createCheckIn("case-123", "Worker"),
        status: "completed",
        completedDate: new Date().toISOString(),
        scores: { painScore: 5, moodScore: 6, adlScore: 70, workReadiness: null, overallWellbeing: 5.5 },
        riskSignals: [],
        summary: "Test",
      };
      const missed: CheckIn = {
        ...createCheckIn("case-123", "Worker"),
        status: "missed",
      };

      const summary = generateTrendSummary("case-123", "Worker", [completed, missed]);

      expect(summary.engagementRate).toBe(50); // 1 completed out of 2
      expect(summary.missedCount).toBe(1);
    });

    it("calculates next check-in due date", () => {
      const summary = generateTrendSummary("case-123", "John Smith", []);

      expect(summary.nextCheckInDue).toBeDefined();
    });
  });

  describe("getNextCheckInDate", () => {
    it("returns date 7 days from now if no last check-in", () => {
      const nextDate = getNextCheckInDate();
      const expected = new Date();
      expected.setDate(expected.getDate() + 7);

      expect(nextDate).toBe(expected.toISOString().split("T")[0]);
    });

    it("returns date 7 days from last check-in", () => {
      const lastDate = "2025-12-01";
      const nextDate = getNextCheckInDate(lastDate);

      expect(nextDate).toBe("2025-12-08");
    });
  });
});
