import type { FreshdeskAttachment } from "./freshdesk";

/**
 * PDF Processor Service
 *
 * Downloads PDF attachments from Freshdesk and prepares them for Claude Vision OCR.
 * Claude can process PDFs directly as base64-encoded documents.
 */

export interface ProcessedDocument {
  fileName: string;
  mimeType: string;
  base64Data: string;
  sizeBytes: number;
  sourceUrl: string;
}

/**
 * Check if an attachment is a certificate PDF or image
 */
export function isCertificateAttachment(attachment: FreshdeskAttachment): boolean {
  const name = attachment.name.toLowerCase();
  const contentType = attachment.content_type.toLowerCase();

  // Check for PDF or image types
  const isPdfOrImage =
    contentType.includes("pdf") ||
    contentType.includes("image/") ||
    name.endsWith(".pdf") ||
    name.endsWith(".png") ||
    name.endsWith(".jpg") ||
    name.endsWith(".jpeg");

  // Check for certificate-related keywords
  const hasCertKeyword =
    name.includes("cert") ||
    name.includes("medical") ||
    name.includes("doctor") ||
    name.includes("gp") ||
    name.includes("capacity") ||
    name.includes("fitness") ||
    name.includes("work");

  // Accept all PDFs/images, or files with certificate keywords
  return isPdfOrImage || hasCertKeyword;
}

/**
 * Download a file from URL and return as base64
 */
export async function downloadAsBase64(
  url: string,
  authHeader?: string
): Promise<{ base64: string; contentType: string; size: number }> {
  const headers: Record<string, string> = {};

  if (authHeader) {
    headers["Authorization"] = authHeader;
  }

  const response = await fetch(url, { headers });

  if (!response.ok) {
    throw new Error(`Failed to download file: ${response.status} ${response.statusText}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  const base64 = buffer.toString("base64");
  const contentType = response.headers.get("content-type") || "application/octet-stream";

  return {
    base64,
    contentType,
    size: buffer.length,
  };
}

/**
 * Process a Freshdesk attachment for Claude Vision
 */
export async function processAttachment(
  attachment: FreshdeskAttachment,
  freshdeskAuthHeader: string
): Promise<ProcessedDocument> {
  console.log(`[PDF Processor] Downloading attachment: ${attachment.name} (${attachment.content_type})`);

  const { base64, contentType, size } = await downloadAsBase64(
    attachment.attachment_url,
    freshdeskAuthHeader
  );

  console.log(`[PDF Processor] Downloaded ${size} bytes, content-type: ${contentType}`);

  return {
    fileName: attachment.name,
    mimeType: contentType,
    base64Data: base64,
    sizeBytes: size,
    sourceUrl: attachment.attachment_url,
  };
}

/**
 * Filter and process certificate attachments from a list
 */
export async function processCertificateAttachments(
  attachments: FreshdeskAttachment[],
  freshdeskAuthHeader: string
): Promise<ProcessedDocument[]> {
  const certificateAttachments = attachments.filter(isCertificateAttachment);

  if (certificateAttachments.length === 0) {
    return [];
  }

  console.log(`[PDF Processor] Found ${certificateAttachments.length} potential certificate attachments`);

  const processed: ProcessedDocument[] = [];

  for (const attachment of certificateAttachments) {
    try {
      const doc = await processAttachment(attachment, freshdeskAuthHeader);
      processed.push(doc);
    } catch (error) {
      console.error(`[PDF Processor] Failed to process attachment ${attachment.name}:`, error);
      // Continue with other attachments
    }
  }

  return processed;
}
