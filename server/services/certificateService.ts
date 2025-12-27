import Anthropic from "@anthropic-ai/sdk";
import type { MedicalCertificateDB, OcrExtractedData } from "@shared/schema";
import type { IStorage } from "../storage";
import type { ProcessedDocument } from "./pdfProcessor";

const MODEL = "claude-sonnet-4-20250514";
const CONFIDENCE_THRESHOLD = 0.8;

/**
 * Certificate OCR Extraction Response from Claude Vision
 */
interface VisionExtractionResponse {
  issueDate?: string;
  startDate?: string;
  endDate?: string;
  practitionerName?: string;
  practitionerType?: "gp" | "specialist" | "physiotherapist" | "psychologist" | "other";
  capacity?: "fit" | "partial" | "unfit" | "unknown";
  restrictions?: string[];
  notes?: string;
  rawText: string;
  confidence: {
    overall: number;
    issueDate?: number;
    startDate?: number;
    endDate?: number;
    practitionerName?: number;
    capacity?: number;
  };
}

/**
 * Build the extraction prompt for Claude Vision
 */
function buildExtractionPrompt(): string {
  return `You are analyzing a medical certificate document. Extract the following information:

1. **Issue Date**: The date the certificate was issued/signed
2. **Start Date**: When the work restrictions begin (often same as issue date)
3. **End Date**: When the certificate expires or work restrictions end
4. **Practitioner Name**: The doctor/practitioner who signed the certificate
5. **Practitioner Type**: One of: gp, specialist, physiotherapist, psychologist, other
6. **Capacity**: The worker's capacity - one of:
   - "fit" = Fit for full duties
   - "partial" = Fit for modified/light duties
   - "unfit" = Totally unfit for work
   - "unknown" = Cannot determine
7. **Restrictions**: List any work restrictions mentioned (e.g., "no lifting over 5kg", "seated work only")
8. **Notes**: Any other relevant clinical notes

Respond ONLY with a JSON object in this exact format:
{
  "issueDate": "YYYY-MM-DD or null",
  "startDate": "YYYY-MM-DD or null",
  "endDate": "YYYY-MM-DD or null",
  "practitionerName": "Dr Name or null",
  "practitionerType": "gp|specialist|physiotherapist|psychologist|other",
  "capacity": "fit|partial|unfit|unknown",
  "restrictions": ["restriction 1", "restriction 2"],
  "notes": "any additional notes",
  "rawText": "key text extracted from the certificate",
  "confidence": {
    "overall": 0.0-1.0,
    "issueDate": 0.0-1.0,
    "startDate": 0.0-1.0,
    "endDate": 0.0-1.0,
    "practitionerName": 0.0-1.0,
    "capacity": 0.0-1.0
  }
}

Set confidence values based on how clearly you can read each field:
- 1.0 = Clearly visible and unambiguous
- 0.8-0.9 = Mostly clear, minor uncertainty
- 0.5-0.7 = Partially visible or ambiguous
- 0.0-0.4 = Cannot determine or field not present

If you cannot read the document or it's not a medical certificate, set overall confidence to 0.`;
}

/**
 * Extract data from a document using Claude Vision
 */
export async function extractFromDocument(
  document: ProcessedDocument
): Promise<OcrExtractedData> {
  console.log(`[Certificate Service] Starting Vision OCR for: ${document.fileName}`);

  if (!process.env.ANTHROPIC_API_KEY) {
    console.error("[Certificate Service] ANTHROPIC_API_KEY not set");
    throw new Error("ANTHROPIC_API_KEY is required for OCR extraction");
  }

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  // Determine media type for Claude
  let mediaType: "application/pdf" | "image/png" | "image/jpeg" | "image/gif" | "image/webp";
  if (document.mimeType.includes("pdf")) {
    mediaType = "application/pdf";
  } else if (document.mimeType.includes("png")) {
    mediaType = "image/png";
  } else if (document.mimeType.includes("jpeg") || document.mimeType.includes("jpg")) {
    mediaType = "image/jpeg";
  } else if (document.mimeType.includes("gif")) {
    mediaType = "image/gif";
  } else if (document.mimeType.includes("webp")) {
    mediaType = "image/webp";
  } else {
    // Default to PDF for unknown types
    mediaType = "application/pdf";
  }

  try {
    // Build content blocks - PDFs use document type, images use image type
    const contentBlocks: Anthropic.MessageCreateParams["messages"][0]["content"] = [];

    if (mediaType === "application/pdf") {
      // PDF documents
      contentBlocks.push({
        type: "document" as const,
        source: {
          type: "base64" as const,
          media_type: mediaType,
          data: document.base64Data,
        },
      } as Anthropic.DocumentBlockParam);
    } else {
      // Images
      contentBlocks.push({
        type: "image",
        source: {
          type: "base64",
          media_type: mediaType as "image/png" | "image/jpeg" | "image/gif" | "image/webp",
          data: document.base64Data,
        },
      });
    }

    contentBlocks.push({
      type: "text",
      text: buildExtractionPrompt(),
    });

    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 2048,
      messages: [
        {
          role: "user",
          content: contentBlocks,
        },
      ],
    });

    // Extract text response
    const textContent = response.content.find((c) => c.type === "text");
    if (!textContent || textContent.type !== "text") {
      throw new Error("No text response from Claude Vision");
    }

    // Parse JSON response
    let parsed: VisionExtractionResponse;
    try {
      // Handle potential markdown code blocks
      let jsonStr = textContent.text.trim();
      if (jsonStr.startsWith("```json")) {
        jsonStr = jsonStr.slice(7);
      } else if (jsonStr.startsWith("```")) {
        jsonStr = jsonStr.slice(3);
      }
      if (jsonStr.endsWith("```")) {
        jsonStr = jsonStr.slice(0, -3);
      }
      parsed = JSON.parse(jsonStr.trim());
    } catch {
      console.error("[Certificate Service] Failed to parse Vision response:", textContent.text);
      throw new Error("Failed to parse OCR response as JSON");
    }

    console.log(`[Certificate Service] Vision OCR complete. Confidence: ${parsed.confidence?.overall ?? 0}`);

    // Convert to OcrExtractedData format
    const extractedData: OcrExtractedData = {
      rawText: parsed.rawText || "",
      extractedFields: {
        issueDate: parsed.issueDate || undefined,
        startDate: parsed.startDate || undefined,
        endDate: parsed.endDate || undefined,
        practitionerName: parsed.practitionerName || undefined,
        capacity: parsed.capacity || undefined,
        restrictions: parsed.restrictions || [],
      },
      confidence: {
        overall: parsed.confidence?.overall ?? 0,
        fields: {
          issueDate: parsed.confidence?.issueDate ?? 0,
          startDate: parsed.confidence?.startDate ?? 0,
          endDate: parsed.confidence?.endDate ?? 0,
          practitionerName: parsed.confidence?.practitionerName ?? 0,
          capacity: parsed.confidence?.capacity ?? 0,
        },
      },
    };

    return extractedData;
  } catch (error) {
    console.error("[Certificate Service] Vision API error:", error);
    throw error;
  }
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
  console.log(`[Certificate Service] OCR extraction requested for certificate ${certificate.id}`);

  // If certificate has a file URL, we could download and process it
  // For now, return existing data with medium confidence
  if (certificate.fileUrl) {
    console.log(`[Certificate Service] Certificate has fileUrl, but download not implemented yet`);
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
