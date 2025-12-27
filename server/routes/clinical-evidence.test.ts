// vitest globals are available (describe, it, expect, etc.)

/**
 * Clinical Evidence API - Integration Tests (PRD-3.3, PRD-3.4)
 *
 * These tests require a running database connection.
 * Run with: npm test -- server/routes/clinical-evidence.test.ts
 *
 * Prerequisites:
 * - DATABASE_URL environment variable set
 * - PostgreSQL running with gpnet database
 */

// Skip database tests if DATABASE_URL not set
const skipClinicalDbTests = !process.env.DATABASE_URL;

describe.skipIf(skipClinicalDbTests)("Clinical Evidence Evaluation API - PRD-3.3, PRD-3.4", () => {
  // Dynamic imports to avoid initialization errors when DB not configured
  let db: any;
  let storage: any;
  let workerCases: any;
  let eq: any;
  let evaluateClinicalEvidence: any;

  beforeAll(async () => {
    const dbModule = await import("../db");
    const storageModule = await import("../storage");
    const schemaModule = await import("../../shared/schema");
    const drizzleModule = await import("drizzle-orm");
    const clinicalModule = await import("../services/clinicalEvidence");

    db = dbModule.db;
    storage = storageModule.storage;
    workerCases = schemaModule.workerCases;
    eq = drizzleModule.eq;
    evaluateClinicalEvidence = clinicalModule.evaluateClinicalEvidence;
  });

  const TEST_ORG_ID = "TEST-ORG-CLINICAL-EVIDENCE";
  const createdCaseIds: string[] = [];

  afterAll(async () => {
    // Clean up test data
    for (const caseId of createdCaseIds) {
      await db.delete(workerCases).where(eq(workerCases.id, caseId));
    }
  });

  it("should evaluate clinical evidence for a minimal case", async () => {
    // Create a test case
    const caseData = {
      organizationId: TEST_ORG_ID,
      workerName: "Test Worker",
      company: "Test Company",
      dateOfInjury: "2025-01-01",
      workStatus: "Off work",
      riskLevel: "Medium",
    };

    const workerCase = await storage.createCase(caseData);
    createdCaseIds.push(workerCase.id);

    // Evaluate clinical evidence
    const evaluation = evaluateClinicalEvidence(workerCase);

    expect(evaluation).toBeDefined();
    expect(evaluation.caseId).toBe(workerCase.id);
    expect(evaluation.hasCurrentTreatmentPlan).toBe(false);
    expect(evaluation.hasCurrentCertificate).toBe(false);
    expect(evaluation.flags).toBeDefined();
    expect(evaluation.flags.length).toBeGreaterThan(0);

    // Should have flags for missing plan and certificate
    const flagCodes = evaluation.flags.map((f: any) => f.code);
    expect(flagCodes).toContain("MISSING_TREATMENT_PLAN");
    expect(flagCodes).toContain("NO_RECENT_CERTIFICATE");
  });

  it("should generate recommended actions for cases with flags", async () => {
    // Create a case with non-compliance
    const caseData = {
      organizationId: TEST_ORG_ID,
      workerName: "Non-Compliant Worker",
      company: "Test Company",
      dateOfInjury: "2025-01-01",
      workStatus: "Off work",
      riskLevel: "High",
    };

    const workerCase = await storage.createCase(caseData);
    createdCaseIds.push(workerCase.id);

    // Update with non-compliance status
    await db
      .update(workerCases)
      .set({ complianceStatus: "non_compliant" })
      .where(eq(workerCases.id, workerCase.id));

    // Fetch updated case
    const updatedCase = await storage.getCase(workerCase.id, TEST_ORG_ID);

    // Evaluate clinical evidence
    const evaluation = evaluateClinicalEvidence(updatedCase);

    expect(evaluation.flags.some((f: any) => f.code === "WORKER_NON_COMPLIANT")).toBe(true);
    expect(evaluation.recommendedActions).toBeDefined();
    expect(evaluation.recommendedActions!.length).toBeGreaterThan(0);

    // Should have insurer escalation action
    const escalateAction = evaluation.recommendedActions!.find(
      (a: any) => a.type === "ESCALATE_NON_COMPLIANCE_TO_INSURER"
    );
    expect(escalateAction).toBeDefined();
    expect(escalateAction.target).toBe("INSURER");
  });

  it("should mark duty safety as unsafe for high-risk non-compliant cases", async () => {
    const caseData = {
      organizationId: TEST_ORG_ID,
      workerName: "High Risk Worker",
      company: "Test Company",
      dateOfInjury: "2025-01-01",
      workStatus: "Off work",
      riskLevel: "High",
    };

    const workerCase = await storage.createCase(caseData);
    createdCaseIds.push(workerCase.id);

    // Update with non-compliance and medical constraints
    await db
      .update(workerCases)
      .set({
        complianceStatus: "non_compliant",
        medicalConstraints: {
          noLiftingOverKg: 5,
          noBending: true,
        },
      })
      .where(eq(workerCases.id, workerCase.id));

    const updatedCase = await storage.getCase(workerCase.id, TEST_ORG_ID);
    const evaluation = evaluateClinicalEvidence(updatedCase);

    expect(evaluation.dutySafetyStatus).toBe("unsafe");
    expect(evaluation.flags.some((f: any) => f.severity === "high_risk")).toBe(true);
  });

  it("should recognize treatment plan from medical constraints", async () => {
    const caseData = {
      organizationId: TEST_ORG_ID,
      workerName: "Worker With Plan",
      company: "Test Company",
      dateOfInjury: "2025-01-01",
      workStatus: "At work",
      riskLevel: "Low",
    };

    const workerCase = await storage.createCase(caseData);
    createdCaseIds.push(workerCase.id);

    // Update with medical constraints
    await db
      .update(workerCases)
      .set({
        medicalConstraints: {
          noLiftingOverKg: 10,
          suitableForLightDuties: true,
        },
        functionalCapacity: {
          canLiftKg: 10,
          maxWorkHoursPerDay: 6,
        },
      })
      .where(eq(workerCases.id, workerCase.id));

    const updatedCase = await storage.getCase(workerCase.id, TEST_ORG_ID);
    const evaluation = evaluateClinicalEvidence(updatedCase);

    expect(evaluation.hasCurrentTreatmentPlan).toBe(true);
    // Should not flag for missing treatment plan
    expect(evaluation.flags.some((f: any) => f.code === "MISSING_TREATMENT_PLAN")).toBe(false);
  });

  it("should flag RTW plan failure as high risk", async () => {
    const caseData = {
      organizationId: TEST_ORG_ID,
      workerName: "RTW Failing Worker",
      company: "Test Company",
      dateOfInjury: "2025-01-01",
      workStatus: "At work",
      riskLevel: "Medium",
    };

    const workerCase = await storage.createCase(caseData);
    createdCaseIds.push(workerCase.id);

    // Update with failing RTW plan
    await db
      .update(workerCases)
      .set({ rtwPlanStatus: "failing" })
      .where(eq(workerCases.id, workerCase.id));

    const updatedCase = await storage.getCase(workerCase.id, TEST_ORG_ID);
    const evaluation = evaluateClinicalEvidence(updatedCase);

    expect(evaluation.flags.some((f: any) => f.code === "RTW_PLAN_FAILING")).toBe(true);
    const rtwFlag = evaluation.flags.find((f: any) => f.code === "RTW_PLAN_FAILING");
    expect(rtwFlag?.severity).toBe("high_risk");
    expect(evaluation.isImprovingOnExpectedTimeline).toBe(false);
  });

  it("should flag specialist referral without appointment", async () => {
    const caseData = {
      organizationId: TEST_ORG_ID,
      workerName: "Specialist Referred Worker",
      company: "Test Company",
      dateOfInjury: "2025-01-01",
      workStatus: "Off work",
      riskLevel: "Medium",
    };

    const workerCase = await storage.createCase(caseData);
    createdCaseIds.push(workerCase.id);

    // Update with specialist referral
    await db
      .update(workerCases)
      .set({ specialistStatus: "referred" })
      .where(eq(workerCases.id, workerCase.id));

    const updatedCase = await storage.getCase(workerCase.id, TEST_ORG_ID);
    const evaluation = evaluateClinicalEvidence(updatedCase);

    expect(
      evaluation.flags.some((f: any) => f.code === "SPECIALIST_REFERRED_NO_APPOINTMENT")
    ).toBe(true);

    // Should recommend worker follow-up
    const appointmentAction = evaluation.recommendedActions!.find(
      (a: any) => a.type === "REQUEST_SPECIALIST_APPOINTMENT_STATUS"
    );
    expect(appointmentAction).toBeDefined();
    expect(appointmentAction.target).toBe("WORKER");
  });

  it("should provide explainable flags - PRD-9", async () => {
    const caseData = {
      organizationId: TEST_ORG_ID,
      workerName: "Explainable Worker",
      company: "Test Company",
      dateOfInjury: "2025-01-01",
      workStatus: "Off work",
      riskLevel: "Medium",
    };

    const workerCase = await storage.createCase(caseData);
    createdCaseIds.push(workerCase.id);

    const evaluation = evaluateClinicalEvidence(workerCase);

    // All flags should have code, severity, and message
    evaluation.flags.forEach((flag: any) => {
      expect(flag.code).toBeDefined();
      expect(flag.severity).toMatch(/info|warning|high_risk/);
      expect(flag.message).toBeDefined();
      expect(flag.message.length).toBeGreaterThan(0);
    });
  });

  it("should track multiple flag types simultaneously", async () => {
    const caseData = {
      organizationId: TEST_ORG_ID,
      workerName: "Multi-Flag Worker",
      company: "Test Company",
      dateOfInjury: "2025-01-01",
      workStatus: "Off work",
      riskLevel: "High",
    };

    const workerCase = await storage.createCase(caseData);
    createdCaseIds.push(workerCase.id);

    // Update with multiple issues
    await db
      .update(workerCases)
      .set({
        complianceStatus: "non_compliant",
        rtwPlanStatus: "failing",
        specialistStatus: "referred",
      })
      .where(eq(workerCases.id, workerCase.id));

    const updatedCase = await storage.getCase(workerCase.id, TEST_ORG_ID);
    const evaluation = evaluateClinicalEvidence(updatedCase);

    // Should have multiple flag types
    expect(evaluation.flags.length).toBeGreaterThan(3);

    const flagCodes = evaluation.flags.map((f: any) => f.code);
    expect(flagCodes).toContain("WORKER_NON_COMPLIANT");
    expect(flagCodes).toContain("RTW_PLAN_FAILING");
    expect(flagCodes).toContain("SPECIALIST_REFERRED_NO_APPOINTMENT");

    // Should have multiple high-risk flags
    const highRiskFlags = evaluation.flags.filter((f: any) => f.severity === "high_risk");
    expect(highRiskFlags.length).toBeGreaterThanOrEqual(2);
  });
});
