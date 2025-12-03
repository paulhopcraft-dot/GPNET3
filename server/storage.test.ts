import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { db } from "./db";
import { storage } from "./storage";
import { workerCases, medicalCertificates, caseDiscussionNotes, caseAttachments, terminationProcesses } from "../shared/schema";
import { eq } from "drizzle-orm";

describe("getCaseTimeline", () => {
  const TEST_CASE_ID = "TEST-TIMELINE-001";
  const EMPTY_CASE_ID = "TEST-EMPTY-001";

  beforeAll(async () => {
    // Clean up any existing test data
    await db.delete(caseAttachments).where(eq(caseAttachments.caseId, TEST_CASE_ID));
    await db.delete(caseDiscussionNotes).where(eq(caseDiscussionNotes.caseId, TEST_CASE_ID));
    await db.delete(medicalCertificates).where(eq(medicalCertificates.caseId, TEST_CASE_ID));
    await db.delete(terminationProcesses).where(eq(terminationProcesses.workerCaseId, TEST_CASE_ID));
    await db.delete(workerCases).where(eq(workerCases.id, TEST_CASE_ID));

    await db.delete(workerCases).where(eq(workerCases.id, EMPTY_CASE_ID));

    // Create test worker case
    await db.insert(workerCases).values({
      id: TEST_CASE_ID,
      workerName: "Test Worker",
      company: "Test Company",
      dateOfInjury: new Date("2025-01-01"),
      injuryType: "Test Injury",
      currentStatus: "active",
      createdAt: new Date("2025-01-01T10:00:00Z"),
    });

    // Create empty worker case
    await db.insert(workerCases).values({
      id: EMPTY_CASE_ID,
      workerName: "Empty Worker",
      company: "Empty Company",
      dateOfInjury: new Date("2025-01-01"),
      injuryType: "Empty Injury",
      currentStatus: "active",
      createdAt: new Date("2025-01-01T10:00:00Z"),
    });

    // Create test medical certificate (unfit capacity for warning severity)
    await db.insert(medicalCertificates).values({
      id: "CERT-001",
      caseId: TEST_CASE_ID,
      issueDate: new Date("2025-01-15"),
      startDate: new Date("2025-01-15"),
      endDate: new Date("2025-01-22"),
      capacity: "unfit",
      notes: "Test certificate",
      createdAt: new Date("2025-01-15T09:00:00Z"),
    });

    // Create test discussion note with critical risk flags
    await db.insert(caseDiscussionNotes).values({
      id: "NOTE-001",
      caseId: TEST_CASE_ID,
      summary: "Worker missed appointment - critical compliance issue",
      timestamp: new Date("2025-01-10T14:00:00Z"),
      riskFlags: ["critical", "non-compliance", "escalation"],
      nextSteps: ["Follow up immediately"],
      updatesCompliance: true,
      updatesRecoveryTimeline: false,
    });

    // Create test attachment
    await db.insert(caseAttachments).values({
      id: "ATT-001",
      caseId: TEST_CASE_ID,
      name: "medical-report.pdf",
      type: "application/pdf",
      url: "https://example.com/report.pdf",
      createdAt: new Date("2025-01-20T16:30:00Z"),
    });
  });

  afterAll(async () => {
    // Clean up test data
    await db.delete(caseAttachments).where(eq(caseAttachments.caseId, TEST_CASE_ID));
    await db.delete(caseDiscussionNotes).where(eq(caseDiscussionNotes.caseId, TEST_CASE_ID));
    await db.delete(medicalCertificates).where(eq(medicalCertificates.caseId, TEST_CASE_ID));
    await db.delete(terminationProcesses).where(eq(terminationProcesses.workerCaseId, TEST_CASE_ID));
    await db.delete(workerCases).where(eq(workerCases.id, TEST_CASE_ID));
    await db.delete(workerCases).where(eq(workerCases.id, EMPTY_CASE_ID));
  });

  it("returns timeline events for a valid case", async () => {
    const events = await storage.getCaseTimeline(TEST_CASE_ID);

    expect(events).toBeDefined();
    expect(Array.isArray(events)).toBe(true);
    expect(events.length).toBeGreaterThan(0);

    // Should have at least: 1 certificate, 1 note, 1 attachment, 1 case_created
    expect(events.length).toBeGreaterThanOrEqual(4);

    // Check that all events have required fields
    for (const event of events) {
      expect(event.id).toBeDefined();
      expect(event.caseId).toBe(TEST_CASE_ID);
      expect(event.eventType).toBeDefined();
      expect(event.timestamp).toBeDefined();
      expect(event.title).toBeDefined();
    }
  });

  it("returns empty array for case with no events", async () => {
    const events = await storage.getCaseTimeline(EMPTY_CASE_ID);

    expect(events).toBeDefined();
    expect(Array.isArray(events)).toBe(true);
    // Should only have case_created event
    expect(events.length).toBe(1);
    expect(events[0].eventType).toBe("case_created");
  });

  it("sorts events by timestamp descending (newest first)", async () => {
    const events = await storage.getCaseTimeline(TEST_CASE_ID);

    expect(events.length).toBeGreaterThan(1);

    // Verify timestamps are in descending order
    for (let i = 0; i < events.length - 1; i++) {
      const currentTime = new Date(events[i].timestamp).getTime();
      const nextTime = new Date(events[i + 1].timestamp).getTime();
      expect(currentTime).toBeGreaterThanOrEqual(nextTime);
    }
  });

  it("respects the limit parameter", async () => {
    const limit = 2;
    const events = await storage.getCaseTimeline(TEST_CASE_ID, limit);

    expect(events).toBeDefined();
    expect(Array.isArray(events)).toBe(true);
    expect(events.length).toBeLessThanOrEqual(limit);
  });

  it("applies correct severity levels to events", async () => {
    const events = await storage.getCaseTimeline(TEST_CASE_ID);

    // Find the certificate event (unfit capacity should be "warning")
    const certEvent = events.find((e) => e.eventType === "certificate_added");
    expect(certEvent).toBeDefined();
    expect(certEvent!.severity).toBe("warning");

    // Find the discussion note (with critical risk flags should be "critical")
    const noteEvent = events.find((e) => e.eventType === "discussion_note");
    expect(noteEvent).toBeDefined();
    expect(noteEvent!.severity).toBe("critical");

    // Attachment should have "info" severity
    const attachmentEvent = events.find((e) => e.eventType === "attachment_uploaded");
    expect(attachmentEvent).toBeDefined();
    expect(attachmentEvent!.severity).toBe("info");
  });

  it("preserves event metadata", async () => {
    const events = await storage.getCaseTimeline(TEST_CASE_ID);

    // Check certificate metadata
    const certEvent = events.find((e) => e.eventType === "certificate_added");
    expect(certEvent).toBeDefined();
    expect(certEvent!.metadata).toBeDefined();
    expect(certEvent!.metadata!.capacity).toBe("unfit");
    expect(certEvent!.metadata!.startDate).toBeDefined();
    expect(certEvent!.metadata!.endDate).toBeDefined();

    // Check discussion note metadata
    const noteEvent = events.find((e) => e.eventType === "discussion_note");
    expect(noteEvent).toBeDefined();
    expect(noteEvent!.metadata).toBeDefined();
    expect(noteEvent!.metadata!.riskFlags).toBeDefined();
    expect(Array.isArray(noteEvent!.metadata!.riskFlags)).toBe(true);
    expect(noteEvent!.metadata!.riskFlags).toContain("critical");

    // Check attachment metadata
    const attachmentEvent = events.find((e) => e.eventType === "attachment_uploaded");
    expect(attachmentEvent).toBeDefined();
    expect(attachmentEvent!.metadata).toBeDefined();
    expect(attachmentEvent!.metadata!.name).toBe("medical-report.pdf");
    expect(attachmentEvent!.metadata!.type).toBe("application/pdf");
  });

  it("includes all expected event types", async () => {
    const events = await storage.getCaseTimeline(TEST_CASE_ID);

    const eventTypes = events.map((e) => e.eventType);

    // Should have these event types based on our test data
    expect(eventTypes).toContain("certificate_added");
    expect(eventTypes).toContain("discussion_note");
    expect(eventTypes).toContain("attachment_uploaded");
    expect(eventTypes).toContain("case_created");
  });

  it("assigns correct icons to event types", async () => {
    const events = await storage.getCaseTimeline(TEST_CASE_ID);

    const certEvent = events.find((e) => e.eventType === "certificate_added");
    expect(certEvent!.icon).toBe("medical_information");

    const noteEvent = events.find((e) => e.eventType === "discussion_note");
    expect(noteEvent!.icon).toBe("forum");

    const attachmentEvent = events.find((e) => e.eventType === "attachment_uploaded");
    expect(attachmentEvent!.icon).toBe("attach_file");

    const caseCreatedEvent = events.find((e) => e.eventType === "case_created");
    expect(caseCreatedEvent!.icon).toBe("person_add");
  });
});
