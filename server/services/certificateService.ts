import type { MedicalCertificateDB, OcrExtractedData } from "@shared/schema";
import type { IStorage } from "../storage";

/**
 * Extract data from medical certificate using OCR
 *
 * Phase 1: Returns placeholder data with mock confidence scores
 * Phase 2 (future): Integrate with actual OCR provider (Anthropic Claude Vision, Google Vision, etc.)
 */
export async function extractCertificateData(
  certificate: MedicalCertificateDB
): Promise<OcrExtractedData> {
  // Phase 1: Placeholder implementation
  // Returns mock extracted data to support the interface

  console.log(`[Certificate Service] OCR extraction requested for certificate ${certificate.id}`);
  console.log(`[Certificate Service] Phase 1: Using placeholder OCR implementation`);

  // Simulate OCR processing delay
  await new Promise(resolve => setTimeout(resolve, 500));

  // Return placeholder extracted data
  const extractedData: OcrExtractedData = {
    rawText: "PLACEHOLDER: OCR integration pending. This would contain the raw text extracted from the certificate image.",
    extractedFields: {
      issueDate: certificate.issueDate?.toISOString().split('T')[0],
      startDate: certificate.startDate?.toISOString().split('T')[0],
      endDate: certificate.endDate?.toISOString().split('T')[0],
      practitionerName: certificate.treatingPractitioner || undefined,
      capacity: certificate.capacity,
      restrictions: [],
    },
    confidence: {
      overall: 0.75, // Mock confidence score - below 0.8 threshold to trigger review
      fields: {
        issueDate: 0.95,
        startDate: 0.90,
        endDate: 0.85,
        practitionerName: 0.70,
        capacity: 0.60,
        restrictions: 0.50,
      },
    },
  };

  console.log(`[Certificate Service] OCR extraction complete. Overall confidence: ${extractedData.confidence.overall}`);

  return extractedData;
}

/**
 * Process uploaded certificate file
 *
 * Phase 1: Placeholder that accepts file metadata
 * Phase 2 (future): Upload to storage, extract text via OCR, update certificate record
 */
export async function processCertificateUpload(
  certificateId: string,
  file: {
    fileName: string;
    fileUrl: string;
    mimeType: string;
  }
): Promise<void> {
  console.log(`[Certificate Service] Processing uploaded file for certificate ${certificateId}`);
  console.log(`[Certificate Service] File: ${file.fileName} (${file.mimeType})`);
  console.log(`[Certificate Service] Phase 1: File upload integration pending`);

  // Phase 2 would include:
  // 1. Upload file to storage (S3, Azure Blob, etc.)
  // 2. Call extractCertificateData() to perform OCR
  // 3. Update certificate with extracted data
  // 4. Create alerts if needed (low confidence, expiring soon, etc.)
}

/**
 * Check for expiring certificates and create alerts
 * This should be called by a scheduled job (cron)
 */
export async function checkExpiringCertificates(
  storage: IStorage,
  organizationId: string
): Promise<void> {
  console.log(`[Certificate Service] Checking for expiring certificates in organization ${organizationId}`);

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

    console.log(`[Certificate Service] Created ${alertType} alert for certificate ${cert.id}`);
  }
}
