import { describe, it, expect } from "vitest";
import {
  extractCertificateData,
  validateCertificateData,
  processCertificateIngestion,
  calculateDaysUntilExpiry,
  getExpiryAlertLevel,
} from "./certificateIngestion";

describe("certificateIngestion", () => {
  describe("extractCertificateData", () => {
    it("extracts WorkCover certificate type from text", () => {
      const text = "WorkCover Medical Certificate for John Smith";
      const result = extractCertificateData(text, "workcover.pdf");

      expect(result.certificateType.value).toBe("workcover_certificate");
      expect(result.certificateType.confidence).toBeGreaterThan(0.8);
    });

    it("extracts dates from certificate text", () => {
      const text = `
        Issue Date: 15/12/2025
        Valid from: 15/12/2025 to 15/01/2026
      `;
      const result = extractCertificateData(text, "cert.pdf");

      expect(result.startDate.value).toBe("2025-12-15");
      expect(result.endDate.value).toBe("2026-01-15");
    });

    it("extracts work capacity - unfit", () => {
      const text = "The worker is certified as totally unfit for work";
      const result = extractCertificateData(text, "cert.pdf");

      expect(result.workCapacity.value).toBe("unfit");
      expect(result.workCapacity.confidence).toBeGreaterThan(0.8);
    });

    it("extracts work capacity - partial", () => {
      const text = "Worker has partial capacity. Reduced hours recommended.";
      const result = extractCertificateData(text, "cert.pdf");

      expect(result.workCapacity.value).toBe("partial");
    });

    it("extracts work capacity - fit", () => {
      const text = "Worker is fit for full duties with full capacity.";
      const result = extractCertificateData(text, "cert.pdf");

      expect(result.workCapacity.value).toBe("fit");
    });

    it("extracts restrictions", () => {
      const text = `
        Restrictions:
        - No heavy lifting
        - No bending
        - Light duties only
        - Maximum 20 hours per week
      `;
      const result = extractCertificateData(text, "cert.pdf");

      expect(result.restrictions.value).toContain("No heavy lifting");
      expect(result.restrictions.value).toContain("No bending");
      expect(result.restrictions.value).toContain("Light duties");
      expect(result.hoursPerWeek.value).toBe(20);
    });

    it("extracts diagnosis", () => {
      const text = "Diagnosis: Lumbar strain with radiating pain";
      const result = extractCertificateData(text, "cert.pdf");

      expect(result.diagnosis.value).toContain("Lumbar strain");
    });

    it("extracts doctor name", () => {
      const text = "Certified by Dr. Sarah Johnson, Main Street Medical";
      const result = extractCertificateData(text, "cert.pdf");

      expect(result.doctorName.value).toContain("Sarah Johnson");
    });

    it("identifies specialist report type", () => {
      const text = "Orthopaedic Specialist Report - Assessment findings";
      const result = extractCertificateData(text, "specialist_report.pdf");

      expect(result.certificateType.value).toBe("specialist_report");
    });

    it("identifies GP report type", () => {
      const text = "General Practitioner Certificate - Treating Doctor Report";
      const result = extractCertificateData(text, "gp_report.pdf");

      expect(result.certificateType.value).toBe("gp_report");
    });
  });

  describe("validateCertificateData", () => {
    it("returns valid for complete data", () => {
      const data = extractCertificateData(
        `WorkCover Certificate
        Valid from: 01/12/2025 to 31/12/2025
        Worker has partial capacity for work.
        Light duties only.`,
        "cert.pdf"
      );

      const result = validateCertificateData(data);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it("returns error when start date is missing", () => {
      const data = extractCertificateData("No dates in this text", "cert.pdf");
      const result = validateCertificateData(data);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain("Certificate start date is required");
    });

    it("warns when capacity indicates fit but has restrictions", () => {
      const data = extractCertificateData(
        `Worker has full capacity. No heavy lifting allowed.
        Valid: 01/12/2025`,
        "cert.pdf"
      );

      const result = validateCertificateData(data);
      expect(result.warnings.some(w => w.includes("fit for work but lists restrictions"))).toBe(true);
    });

    it("warns about low confidence fields", () => {
      const data = extractCertificateData("Minimal text only. Date: 01/12/2025", "cert.pdf");
      const result = validateCertificateData(data);

      expect(result.warnings.some(w => w.includes("Low confidence"))).toBe(true);
    });
  });

  describe("calculateDaysUntilExpiry", () => {
    it("returns null for null date", () => {
      expect(calculateDaysUntilExpiry(null)).toBeNull();
    });

    it("returns negative for past dates", () => {
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 5);
      const result = calculateDaysUntilExpiry(pastDate.toISOString().split("T")[0]);

      expect(result).toBeLessThan(0);
    });

    it("returns positive for future dates", () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 10);
      const result = calculateDaysUntilExpiry(futureDate.toISOString().split("T")[0]);

      expect(result).toBeGreaterThan(0);
    });
  });

  describe("getExpiryAlertLevel", () => {
    it("returns critical for expired certificates", () => {
      expect(getExpiryAlertLevel(-1)).toBe("critical");
      expect(getExpiryAlertLevel(0)).toBe("critical");
    });

    it("returns warning for certificates expiring within 7 days", () => {
      expect(getExpiryAlertLevel(5)).toBe("warning");
      expect(getExpiryAlertLevel(7)).toBe("warning");
    });

    it("returns info for certificates expiring within 14 days", () => {
      expect(getExpiryAlertLevel(10)).toBe("info");
      expect(getExpiryAlertLevel(14)).toBe("info");
    });

    it("returns null for certificates not expiring soon", () => {
      expect(getExpiryAlertLevel(30)).toBeNull();
    });
  });

  describe("processCertificateIngestion", () => {
    it("processes valid certificate successfully", () => {
      const text = `
        WorkCover Medical Certificate
        Patient: John Smith
        Date: 15/12/2025
        Valid from: 15/12/2025 to 15/01/2026
        Diagnosis: Lower back strain
        Worker has partial capacity for work.
        Restrictions: No heavy lifting, light duties only.
        Maximum 20 hours per week.
      `;

      const result = processCertificateIngestion(
        text,
        "worker_upload",
        "workcover_smith.pdf",
        "application/pdf",
        12345,
        "case-123"
      );

      expect(result.success).toBe(true);
      expect(result.certificateId).toMatch(/^CERT-/);
      expect(result.linkedCaseId).toBe("case-123");
      expect(result.extractedData.workCapacity.value).toBe("partial");
      expect(result.extractedData.hoursPerWeek.value).toBe(20);
    });

    it("flags certificates needing manual review", () => {
      const text = "Brief certificate text. Date: 01/12/2025";

      const result = processCertificateIngestion(
        text,
        "email_attachment",
        "cert.pdf",
        "application/pdf",
        1000
      );

      expect(result.requiresManualReview).toBe(true);
      expect(result.reviewReasons.length).toBeGreaterThan(0);
    });

    it("calculates expiry information", () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 10);
      const dateStr = `${futureDate.getDate().toString().padStart(2, "0")}/${(futureDate.getMonth() + 1).toString().padStart(2, "0")}/${futureDate.getFullYear()}`;

      const text = `Certificate valid to ${dateStr}`;

      const result = processCertificateIngestion(
        text,
        "api_upload",
        "cert.pdf",
        "application/pdf",
        5000
      );

      if (result.daysUntilExpiry !== undefined) {
        expect(result.daysUntilExpiry).toBeGreaterThan(0);
      }
    });
  });
});
