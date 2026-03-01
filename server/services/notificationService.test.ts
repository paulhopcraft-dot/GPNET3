import { describe, it, expect, beforeEach, vi } from "vitest";
import { generatePendingNotifications } from "./notificationService";
import type { IStorage } from "../storage";
import type { WorkerCase, InsertNotification } from "@shared/schema";

// Mock storage
function createMockStorage(): IStorage {
  const notifications: InsertNotification[] = [];
  const dedupeKeys = new Set<string>();

  return {
    getGPNet2Cases: vi.fn(async () => []),
    createNotification: vi.fn(async (notification: InsertNotification) => {
      notifications.push(notification);
      if (notification.dedupeKey) {
        dedupeKeys.add(notification.dedupeKey);
      }
      return { ...notification, id: `notif-${notifications.length}`, createdAt: new Date(), sentAt: null };
    }),
    notificationExistsByDedupeKey: vi.fn(async (key: string) => dedupeKeys.has(key)),
    getOverdueActions: vi.fn(async () => []),
    getCaseCompliance: vi.fn(async () => ({ status: "compliant" })),
    listWorkers: vi.fn(async () => []),
    getCertificatesByCase: vi.fn(async () => []),
    // Add other required methods as stubs
  } as any;
}

describe("Check-in Notification Generation", () => {
  let storage: IStorage;
  const organizationId = "org-123";
  const now = new Date("2024-01-15T10:00:00Z");

  beforeEach(() => {
    storage = createMockStorage();
    vi.setSystemTime(now);
  });

  it("should generate check-in for case off work >7 days without recent follow-up", async () => {
    const eightDaysAgo = new Date(now);
    eightDaysAgo.setDate(eightDaysAgo.getDate() - 8);

    const cases: WorkerCase[] = [
      {
        id: "case-1",
        organizationId,
        workerName: "John Doe",
        company: "Test Co",
        workStatus: "Off work",
        employmentStatus: "ACTIVE",
        clcLastFollowUp: eightDaysAgo.toISOString(),
        dateOfInjury: "2024-01-01",
        riskLevel: "Medium",
        hasCertificate: true,
        complianceIndicator: "Medium",
        currentStatus: "Active",
        nextStep: "Follow up",
        owner: "Manager",
        dueDate: "2024-01-20",
        summary: "Test case",
        ticketIds: [],
        ticketCount: 1,
      } as WorkerCase,
    ];

    vi.mocked(storage.getGPNet2Cases).mockResolvedValue(cases);

    await generatePendingNotifications(storage, organizationId);

    expect(storage.createNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "check_in_follow_up",
        caseId: "case-1",
        organizationId,
        status: "pending",
      })
    );
  });

  it("should NOT generate check-in for case with recent follow-up (<7 days)", async () => {
    const fiveDaysAgo = new Date(now);
    fiveDaysAgo.setDate(fiveDaysAgo.getDate() - 5);

    const cases: WorkerCase[] = [
      {
        id: "case-2",
        organizationId,
        workerName: "Jane Smith",
        company: "Test Co",
        workStatus: "Off work",
        employmentStatus: "ACTIVE",
        clcLastFollowUp: fiveDaysAgo.toISOString(),
        dateOfInjury: "2024-01-01",
        riskLevel: "Low",
        hasCertificate: true,
        complianceIndicator: "High",
        currentStatus: "Active",
        nextStep: "Monitor",
        owner: "Manager",
        dueDate: "2024-01-25",
        summary: "Test case",
        ticketIds: [],
        ticketCount: 1,
      } as WorkerCase,
    ];

    vi.mocked(storage.getGPNet2Cases).mockResolvedValue(cases);

    await generatePendingNotifications(storage, organizationId);

    const checkInCalls = vi.mocked(storage.createNotification).mock.calls.filter(
      call => call[0].type === "check_in_follow_up"
    );
    expect(checkInCalls).toHaveLength(0);
  });

  it("should NOT generate check-in for worker at work", async () => {
    const eightDaysAgo = new Date(now);
    eightDaysAgo.setDate(eightDaysAgo.getDate() - 8);

    const cases: WorkerCase[] = [
      {
        id: "case-3",
        organizationId,
        workerName: "Bob Worker",
        company: "Test Co",
        workStatus: "At work",
        employmentStatus: "ACTIVE",
        clcLastFollowUp: eightDaysAgo.toISOString(),
        dateOfInjury: "2024-01-01",
        riskLevel: "Low",
        hasCertificate: true,
        complianceIndicator: "High",
        currentStatus: "Returned",
        nextStep: "Monitor",
        owner: "Manager",
        dueDate: "2024-01-25",
        summary: "Test case",
        ticketIds: [],
        ticketCount: 1,
      } as WorkerCase,
    ];

    vi.mocked(storage.getGPNet2Cases).mockResolvedValue(cases);

    await generatePendingNotifications(storage, organizationId);

    const checkInCalls = vi.mocked(storage.createNotification).mock.calls.filter(
      call => call[0].type === "check_in_follow_up"
    );
    expect(checkInCalls).toHaveLength(0);
  });

  it("should NOT generate check-in for terminated case", async () => {
    const eightDaysAgo = new Date(now);
    eightDaysAgo.setDate(eightDaysAgo.getDate() - 8);

    const cases: WorkerCase[] = [
      {
        id: "case-4",
        organizationId,
        workerName: "Alice Terminated",
        company: "Test Co",
        workStatus: "Off work",
        employmentStatus: "TERMINATED",
        clcLastFollowUp: eightDaysAgo.toISOString(),
        dateOfInjury: "2024-01-01",
        riskLevel: "High",
        hasCertificate: false,
        complianceIndicator: "Low",
        currentStatus: "Closed",
        nextStep: "None",
        owner: "Manager",
        dueDate: "2024-01-10",
        summary: "Test case",
        ticketIds: [],
        ticketCount: 1,
      } as WorkerCase,
    ];

    vi.mocked(storage.getGPNet2Cases).mockResolvedValue(cases);

    await generatePendingNotifications(storage, organizationId);

    const checkInCalls = vi.mocked(storage.createNotification).mock.calls.filter(
      call => call[0].type === "check_in_follow_up"
    );
    expect(checkInCalls).toHaveLength(0);
  });

  it("should handle NULL clcLastFollowUp (first check-in after 7 days from injury)", async () => {
    const eightDaysAgo = new Date(now);
    eightDaysAgo.setDate(eightDaysAgo.getDate() - 8);

    const cases: WorkerCase[] = [
      {
        id: "case-5",
        organizationId,
        workerName: "New Case",
        company: "Test Co",
        workStatus: "Off work",
        employmentStatus: "ACTIVE",
        clcLastFollowUp: undefined,
        dateOfInjury: eightDaysAgo.toISOString(),
        riskLevel: "Medium",
        hasCertificate: false,
        complianceIndicator: "Medium",
        currentStatus: "Active",
        nextStep: "Get certificate",
        owner: "Manager",
        dueDate: "2024-01-20",
        summary: "New case",
        ticketIds: [],
        ticketCount: 1,
      } as WorkerCase,
    ];

    vi.mocked(storage.getGPNet2Cases).mockResolvedValue(cases);

    await generatePendingNotifications(storage, organizationId);

    expect(storage.createNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "check_in_follow_up",
        caseId: "case-5",
      })
    );
  });

  it("should NOT duplicate check-in if dedupe key exists", async () => {
    const eightDaysAgo = new Date(now);
    eightDaysAgo.setDate(eightDaysAgo.getDate() - 8);

    const cases: WorkerCase[] = [
      {
        id: "case-6",
        organizationId,
        workerName: "Duplicate Test",
        company: "Test Co",
        workStatus: "Off work",
        employmentStatus: "ACTIVE",
        clcLastFollowUp: eightDaysAgo.toISOString(),
        dateOfInjury: "2024-01-01",
        riskLevel: "Low",
        hasCertificate: true,
        complianceIndicator: "High",
        currentStatus: "Active",
        nextStep: "Follow up",
        owner: "Manager",
        dueDate: "2024-01-20",
        summary: "Test case",
        ticketIds: [],
        ticketCount: 1,
      } as WorkerCase,
    ];

    vi.mocked(storage.getGPNet2Cases).mockResolvedValue(cases);

    // First generation should create notification
    await generatePendingNotifications(storage, organizationId);
    const firstCallCount = vi.mocked(storage.createNotification).mock.calls.length;

    // Second generation should skip (dedupe key exists)
    await generatePendingNotifications(storage, organizationId);
    const secondCallCount = vi.mocked(storage.createNotification).mock.calls.length;

    // Should not create duplicate
    expect(secondCallCount).toBe(firstCallCount);
  });

  it("should include proper notification content", async () => {
    const eightDaysAgo = new Date(now);
    eightDaysAgo.setDate(eightDaysAgo.getDate() - 8);

    const cases: WorkerCase[] = [
      {
        id: "case-7",
        organizationId,
        workerName: "Content Test",
        company: "Acme Corp",
        workStatus: "Off work",
        employmentStatus: "ACTIVE",
        clcLastFollowUp: eightDaysAgo.toISOString(),
        dateOfInjury: "2024-01-01",
        riskLevel: "High",
        hasCertificate: true,
        complianceIndicator: "Medium",
        currentStatus: "Active",
        nextStep: "Check in",
        owner: "Manager",
        dueDate: "2024-01-18",
        summary: "Test case",
        ticketIds: [],
        ticketCount: 1,
      } as WorkerCase,
    ];

    vi.mocked(storage.getGPNet2Cases).mockResolvedValue(cases);

    await generatePendingNotifications(storage, organizationId);

    expect(storage.createNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "check_in_follow_up",
        subject: expect.stringContaining("Content Test"),
        priority: "medium",
      })
    );

    // Verify body contains both worker name and company
    const call = vi.mocked(storage.createNotification).mock.calls[0];
    expect(call[0].body).toContain("Content Test");
    expect(call[0].body).toContain("Acme Corp");
  });
});
