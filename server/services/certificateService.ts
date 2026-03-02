import type { MedicalCertificateDB, OcrExtractedData } from "@shared/schema";
import type { IStorage } from "../storage";
import type { ProcessedDocument } from "./pdfProcessor";
import { logger } from "../lib/logger";

const CONFIDENCE_THRESHOLD = 0.8;

/**
 * Extract data from a document using Claude Vision.
 *
 * DISABLED: Vision (PDF/image analysis) requires passing base64 data which the
 * Claude CLI `-p` flag cannot handle. Returns empty extraction result until a
 * vision-capable alternative is set up.
 */
export async function extractFromDocument(
  document: ProcessedDocument
): Promise<OcrExtractedData> {
  logger.certificate.warn(
    "Vision OCR disabled — certificate AI extraction requires API-based vision. Returning empty result.",
    { fileName: document.fileName }
  );
  return {
    rawText: "",
    extractedFields: { restrictions: [] },
    confidence: { overall: 0, fields: {} },
  };
}

/**
 * Extract data from medical certificate using OCR
 *
 * @deprecated Use extractFromDocument() for new implementations
 * This function is kept for backward compatibility with existing certificate records
 */
export async function extractCertificateData(
  certificate: MedicalCertificateDB
): Promise<OcrExtractedData> {
  logger.certificate.info(`OCR extraction requested`, { certificateId: certificate.id });

  // If certificate has a file URL, we could download and process it
  // For now, return existing data with medium confidence
  if (certificate.fileUrl) {
    logger.certificate.warn(`Certificate has fileUrl, but download not implemented yet`);
  }

  // Return existing data from the certificate record
  const extractedData: OcrExtractedData = {
    rawText: certificate.notes || "No raw text available - certificate data from database",
    extractedFields: {
      issueDate: certificate.issueDate?.toISOString().split("T")[0],
      startDate: certificate.startDate?.toISOString().split("T")[0],
      endDate: certificate.endDate?.toISOString().split("T")[0],
      practitionerName: certificate.treatingPractitioner || undefined,
      capacity: certificate.capacity,
      restrictions: [],
    },
    confidence: {
      overall: 0.6, // Lower confidence since data wasn't extracted from document
      fields: {
        issueDate: certificate.issueDate ? 0.8 : 0,
        startDate: certificate.startDate ? 0.8 : 0,
        endDate: certificate.endDate ? 0.8 : 0,
        practitionerName: certificate.treatingPractitioner ? 0.7 : 0,
        capacity: certificate.capacity ? 0.6 : 0,
      },
    },
  };

  return extractedData;
}

/**
 * Determine if extracted data requires manual review
 */
export function requiresReview(extractedData: OcrExtractedData): boolean {
  return extractedData.confidence.overall < CONFIDENCE_THRESHOLD;
}

/**
 * Check for expiring certificates and create alerts
 * This should be called by a scheduled job (cron)
 */
export async function checkExpiringCertificates(
  storage: IStorage,
  organizationId: string
): Promise<void> {
  logger.certificate.info(`Checking for expiring certificates`, { organizationId });

  // Get certificates expiring in next 30 days
  const expiringCertificates = await storage.getExpiringCertificates(organizationId, 30);

  for (const cert of expiringCertificates) {
    const daysUntilExpiry = Math.ceil(
      (cert.endDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
    );

    let alertType: "expiring_soon" | "expired";

    if (daysUntilExpiry <= 0) {
      alertType = "expired";
    } else if (daysUntilExpiry <= 7) {
      alertType = "expiring_soon";
    } else {
      continue; // Don't alert for certificates expiring in more than 7 days
    }

    // Create alert (will be ignored if already exists due to UNIQUE constraint)
    await storage.createExpiryAlert({
      certificateId: cert.id,
      alertType,
      alertDate: new Date(),
    });

    logger.certificate.info(`Created alert for certificate`, { alertType, certificateId: cert.id });
  }
}
