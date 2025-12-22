import { describe, it, expect, vi } from "vitest";
import { extractCertificateData, checkExpiringCertificates } from "./certificateService";
import type { MedicalCertificateDB } from "@shared/schema";

describe("extractCertificateData", () => {
  it("returns extracted data with confidence scores", async () => {
    const mockCertificate: MedicalCertificateDB = {
      id: "cert-123",
      caseId: "case-456",
      organizationId: "org-789",
      issueDate: new Date("2025-01-15"),
      startDate: new Date("2025-01-15"),
      endDate: new Date("2025-02-15"),
      capacity: "partial",
      certificateType: "medical_certificate",
      treatingPractitioner: "Dr. Smith",
      practitionerType: "gp",
      notes: "Back injury",
      source: "manual",
      documentUrl: "https://example.com/cert.pdf",
      restrictions: null,
      rawExtractedData: null,
      extractionConfidence: null,
      requiresReview: true,
      reviewedAt: null,
      reviewedBy: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await extractCertificateData(mockCertificate);

    expect(result).toBeDefined();
    expect(result.rawText).toContain("PLACEHOLDER");
    expect(result.confidence).toBeDefined();
    expect(result.confidence.overall).toBeGreaterThan(0);
    expect(result.confidence.overall).toBeLessThanOrEqual(1);
    expect(result.extractedFields).toBeDefined();
  });

  it("includes field-level confidence scores", async () => {
    const mockCertificate: MedicalCertificateDB = {
      id: "cert-123",
      caseId: "case-456",
      organizationId: "org-789",
      issueDate: new Date("2025-01-15"),
      startDate: new Date("2025-01-15"),
      endDate: new Date("2025-02-15"),
      capacity: "fit",
      certificateType: "medical_certificate",
      treatingPractitioner: null,
      practitionerType: null,
      notes: null,
      source: "manual",
      documentUrl: null,
      restrictions: null,
      rawExtractedData: null,
      extractionConfidence: null,
      requiresReview: false,
      reviewedAt: null,
      reviewedBy: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await extractCertificateData(mockCertificate);

    expect(result.confidence.fields).toBeDefined();
    expect(result.confidence.fields.issueDate).toBeDefined();
    expect(result.confidence.fields.startDate).toBeDefined();
    expect(result.confidence.fields.endDate).toBeDefined();
    expect(result.confidence.fields.capacity).toBeDefined();
  });

  it("extracts date fields from certificate", async () => {
    const issueDate = new Date("2025-03-01");
    const startDate = new Date("2025-03-01");
    const endDate = new Date("2025-03-31");

    const mockCertificate: MedicalCertificateDB = {
      id: "cert-123",
      caseId: "case-456",
      organizationId: "org-789",
      issueDate,
      startDate,
      endDate,
      capacity: "unfit",
      certificateType: "medical_certificate",
      treatingPractitioner: "Dr. Jones",
      practitionerType: "specialist",
      notes: null,
      source: "manual",
      documentUrl: null,
      restrictions: null,
      rawExtractedData: null,
      extractionConfidence: null,
      requiresReview: false,
      reviewedAt: null,
      reviewedBy: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await extractCertificateData(mockCertificate);

    expect(result.extractedFields.issueDate).toBe("2025-03-01");
    expect(result.extractedFields.startDate).toBe("2025-03-01");
    expect(result.extractedFields.endDate).toBe("2025-03-31");
    expect(result.extractedFields.practitionerName).toBe("Dr. Jones");
    expect(result.extractedFields.capacity).toBe("unfit");
  });
});

describe("checkExpiringCertificates", () => {
  it("creates alerts for certificates expiring within 7 days", async () => {
    const mockStorage = {
      getExpiringCertificates: vi.fn().mockResolvedValue([
        {
          id: "cert-expiring",
          caseId: "case-123",
          organizationId: "org-456",
          endDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // 3 days from now
        },
      ]),
      createExpiryAlert: vi.fn().mockResolvedValue({}),
    };

    await checkExpiringCertificates(mockStorage as any, "org-456");

    expect(mockStorage.getExpiringCertificates).toHaveBeenCalledWith("org-456", 30);
    expect(mockStorage.createExpiryAlert).toHaveBeenCalledWith({
      certificateId: "cert-expiring",
      alertType: "expiring_soon",
      alertDate: expect.any(Date),
    });
  });

  it("creates expired alerts for past-due certificates", async () => {
    const mockStorage = {
      getExpiringCertificates: vi.fn().mockResolvedValue([
        {
          id: "cert-expired",
          caseId: "case-123",
          organizationId: "org-456",
          endDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // 1 day ago
        },
      ]),
      createExpiryAlert: vi.fn().mockResolvedValue({}),
    };

    await checkExpiringCertificates(mockStorage as any, "org-456");

    expect(mockStorage.createExpiryAlert).toHaveBeenCalledWith({
      certificateId: "cert-expired",
      alertType: "expired",
      alertDate: expect.any(Date),
    });
  });

  it("does not create alerts for certificates expiring in more than 7 days", async () => {
    const mockStorage = {
      getExpiringCertificates: vi.fn().mockResolvedValue([
        {
          id: "cert-future",
          caseId: "case-123",
          organizationId: "org-456",
          endDate: new Date(Date.now() + 20 * 24 * 60 * 60 * 1000), // 20 days from now
        },
      ]),
      createExpiryAlert: vi.fn().mockResolvedValue({}),
    };

    await checkExpiringCertificates(mockStorage as any, "org-456");

    expect(mockStorage.createExpiryAlert).not.toHaveBeenCalled();
  });
});
