// vitest globals are available (describe, it, expect, etc.)

/**
 * Claims Intake Flow - Integration Tests
 *
 * These tests require a running database connection.
 * Run with: npm test -- server/routes/cases.test.ts
 *
 * Prerequisites:
 * - DATABASE_URL environment variable set
 * - PostgreSQL running with gpnet database
 */

// Skip database tests if DATABASE_URL not set
const skipDbTests = !process.env.DATABASE_URL;

describe.skipIf(skipDbTests)("createCase", () => {
  // Dynamic imports to avoid initialization errors when DB not configured
  let db: any;
  let storage: any;
  let workerCases: any;
  let eq: any;

  beforeAll(async () => {
    const dbModule = await import("../db");
    const storageModule = await import("../storage");
    const schemaModule = await import("../../shared/schema");
    const drizzleModule = await import("drizzle-orm");

    db = dbModule.db;
    storage = storageModule.storage;
    workerCases = schemaModule.workerCases;
    eq = drizzleModule.eq;
  });
  const TEST_ORG_ID = "TEST-ORG-CLAIMS";
  const createdCaseIds: string[] = [];

  afterAll(async () => {
    // Clean up test data
    for (const caseId of createdCaseIds) {
      await db.delete(workerCases).where(eq(workerCases.id, caseId));
    }
  });

  it("should create a new case with required fields", async () => {
    const caseData = {
      organizationId: TEST_ORG_ID,
      workerName: "John Smith",
      company: "Test Company",
      dateOfInjury: "2025-01-15",
      workStatus: "Off work",
      riskLevel: "Medium",
    };

    const result = await storage.createCase(caseData);
    createdCaseIds.push(result.id);

    expect(result).toBeDefined();
    expect(result.id).toBeDefined();
    expect(result.workerName).toBe("John Smith");
    expect(result.company).toBe("Test Company");
    expect(result.dateOfInjury).toBe("2025-01-15");
    expect(result.workStatus).toBe("Off work");
    expect(result.riskLevel).toBe("Medium");
    expect(result.organizationId).toBe(TEST_ORG_ID);
    expect(result.hasCertificate).toBe(false);
    expect(result.currentStatus).toBe("New claim - awaiting initial assessment");
    expect(result.nextStep).toBe("Schedule initial contact with worker");
    expect(result.owner).toBe("Unassigned");
  });

  it("should create a new case with optional summary", async () => {
    const caseData = {
      organizationId: TEST_ORG_ID,
      workerName: "Jane Doe",
      company: "Another Company",
      dateOfInjury: "2025-01-10",
      workStatus: "At work",
      riskLevel: "Low",
      summary: "Minor back strain from lifting",
    };

    const result = await storage.createCase(caseData);
    createdCaseIds.push(result.id);

    expect(result.summary).toBe("Minor back strain from lifting");
  });

  it("should auto-generate summary if not provided", async () => {
    const caseData = {
      organizationId: TEST_ORG_ID,
      workerName: "Bob Wilson",
      company: "Corp Inc",
      dateOfInjury: "2025-01-12",
      workStatus: "Off work",
      riskLevel: "High",
    };

    const result = await storage.createCase(caseData);
    createdCaseIds.push(result.id);

    expect(result.summary).toBe("New claim for Bob Wilson");
  });

  it("should set due date 7 days from creation", async () => {
    const now = new Date();
    const expectedDueDate = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    const caseData = {
      organizationId: TEST_ORG_ID,
      workerName: "Test Due Date",
      company: "Due Date Corp",
      dateOfInjury: "2025-01-01",
      workStatus: "Off work",
      riskLevel: "Medium",
    };

    const result = await storage.createCase(caseData);
    createdCaseIds.push(result.id);

    // Check due date is approximately 7 days from now (within 1 day tolerance)
    const resultDueDate = new Date(result.dueDate);
    const diffDays = Math.abs((resultDueDate.getTime() - expectedDueDate.getTime()) / (1000 * 60 * 60 * 24));
    expect(diffDays).toBeLessThan(1);
  });

  it("should create case with correct compliance indicator", async () => {
    const caseData = {
      organizationId: TEST_ORG_ID,
      workerName: "Compliance Test",
      company: "Compliance Corp",
      dateOfInjury: "2025-01-05",
      workStatus: "Off work",
      riskLevel: "High",
    };

    const result = await storage.createCase(caseData);
    createdCaseIds.push(result.id);

    expect(result.complianceIndicator).toBe("Medium");
  });

  it("should persist case to database", async () => {
    const caseData = {
      organizationId: TEST_ORG_ID,
      workerName: "Persist Test",
      company: "Persist Corp",
      dateOfInjury: "2025-01-08",
      workStatus: "At work",
      riskLevel: "Low",
    };

    const result = await storage.createCase(caseData);
    createdCaseIds.push(result.id);

    // Verify case was persisted by fetching it
    const fetchedCase = await storage.getGPNet2CaseById(result.id, TEST_ORG_ID);
    expect(fetchedCase).not.toBeNull();
    expect(fetchedCase?.workerName).toBe("Persist Test");
  });
});
