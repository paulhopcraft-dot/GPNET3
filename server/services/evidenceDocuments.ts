import { randomUUID } from "crypto";

// Evidence & Document Management Engine
// Centralized storage, organization, and retrieval for case-related documentation

export type DocumentType =
  | "medical_certificate"
  | "workcover_certificate"
  | "fitness_certificate"
  | "incident_report"
  | "witness_statement"
  | "clinical_notes"
  | "specialist_report"
  | "imaging_report"
  | "pathology_report"
  | "signed_statement"
  | "correspondence"
  | "rtw_plan"
  | "other";

export type DocumentFormat = "pdf" | "image" | "doc" | "docx" | "xlsx" | "txt" | "unknown";

export type DocumentStatus = "pending" | "verified" | "rejected" | "expired" | "superseded";

export interface DocumentMetadata {
  title: string;
  description?: string;
  documentType: DocumentType;
  format: DocumentFormat;
  mimeType: string;
  sizeBytes: number;
  pageCount?: number;
  author?: string;
  source?: string;
  dateCreated?: string;     // When the document was created/issued
  dateReceived: string;     // When we received it
  expiryDate?: string;      // For certificates
  tags: string[];
  customFields?: Record<string, string>;
}

export interface DocumentVersion {
  versionId: string;
  versionNumber: number;
  uploadedAt: string;
  uploadedBy: string;
  changeNote?: string;
  fileHash: string;
  sizeBytes: number;
}

export interface DocumentLink {
  linkType: "case" | "worker" | "timeline_event" | "certificate" | "claim";
  targetId: string;
  targetName?: string;
  linkedAt: string;
  linkedBy?: string;
}

export interface DocumentAccessLog {
  accessId: string;
  documentId: string;
  accessType: "view" | "download" | "edit" | "delete" | "share";
  userId: string;
  userName?: string;
  timestamp: string;
  ipAddress?: string;
  userAgent?: string;
}

export interface Document {
  id: string;
  metadata: DocumentMetadata;
  status: DocumentStatus;
  versions: DocumentVersion[];
  currentVersion: number;
  links: DocumentLink[];
  previewUrl?: string;
  thumbnailUrl?: string;
  fullTextContent?: string;    // Extracted text for search
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  isConfidential: boolean;
  retentionPolicy?: string;
}

export interface DocumentSearchResult {
  document: Document;
  relevanceScore: number;
  matchedTerms: string[];
  snippets: string[];
}

export interface DocumentUploadResult {
  success: boolean;
  document?: Document;
  error?: string;
  warnings?: string[];
  virusScanStatus: "clean" | "infected" | "pending" | "skipped";
}

export interface DocumentFilter {
  caseId?: string;
  workerId?: string;
  documentTypes?: DocumentType[];
  status?: DocumentStatus[];
  dateFrom?: string;
  dateTo?: string;
  tags?: string[];
  searchQuery?: string;
}

export interface DocumentStats {
  totalDocuments: number;
  byType: Record<DocumentType, number>;
  byStatus: Record<DocumentStatus, number>;
  totalSizeBytes: number;
  recentUploads: number;
  expiringSoon: number;
}

// In-memory document store (would be database in production)
const documentStore: Map<string, Document> = new Map();
const accessLogs: DocumentAccessLog[] = [];

// Document type labels for display
export const DOCUMENT_TYPE_LABELS: Record<DocumentType, string> = {
  medical_certificate: "Medical Certificate",
  workcover_certificate: "WorkCover Certificate",
  fitness_certificate: "Fitness for Work Certificate",
  incident_report: "Incident Report",
  witness_statement: "Witness Statement",
  clinical_notes: "Clinical Notes",
  specialist_report: "Specialist Report",
  imaging_report: "Imaging/Radiology Report",
  pathology_report: "Pathology Report",
  signed_statement: "Signed Statement",
  correspondence: "Correspondence",
  rtw_plan: "Return to Work Plan",
  other: "Other Document",
};

/**
 * Detect document format from MIME type
 */
export function detectFormat(mimeType: string): DocumentFormat {
  if (mimeType === "application/pdf") return "pdf";
  if (mimeType.startsWith("image/")) return "image";
  if (mimeType.includes("word") || mimeType === "application/msword") return "doc";
  if (mimeType.includes("wordprocessingml")) return "docx";
  if (mimeType.includes("spreadsheet") || mimeType.includes("excel")) return "xlsx";
  if (mimeType === "text/plain") return "txt";
  return "unknown";
}

/**
 * Detect document type from filename and content
 */
export function detectDocumentType(filename: string, content?: string): DocumentType {
  const lowerName = filename.toLowerCase();
  const lowerContent = (content || "").toLowerCase();

  if (lowerName.includes("workcover") || lowerContent.includes("workcover")) {
    return "workcover_certificate";
  }
  if (lowerName.includes("certificate") || lowerName.includes("cert")) {
    if (lowerName.includes("fitness") || lowerContent.includes("fit for work")) {
      return "fitness_certificate";
    }
    return "medical_certificate";
  }
  if (lowerName.includes("incident") || lowerContent.includes("incident report")) {
    return "incident_report";
  }
  if (lowerName.includes("witness") || lowerContent.includes("witness statement")) {
    return "witness_statement";
  }
  if (lowerName.includes("specialist") || lowerContent.includes("specialist opinion")) {
    return "specialist_report";
  }
  if (lowerName.includes("imaging") || lowerName.includes("xray") || lowerName.includes("mri") || lowerName.includes("ct scan")) {
    return "imaging_report";
  }
  if (lowerName.includes("pathology") || lowerName.includes("blood") || lowerName.includes("lab")) {
    return "pathology_report";
  }
  if (lowerName.includes("clinical") || lowerName.includes("notes")) {
    return "clinical_notes";
  }
  if (lowerName.includes("rtw") || lowerName.includes("return to work")) {
    return "rtw_plan";
  }
  if (lowerName.includes("statement") || lowerContent.includes("i hereby declare")) {
    return "signed_statement";
  }
  if (lowerName.includes("letter") || lowerName.includes("email") || lowerName.includes("correspondence")) {
    return "correspondence";
  }

  return "other";
}

/**
 * Generate a simple hash for file content
 */
function generateFileHash(content: string): string {
  let hash = 0;
  for (let i = 0; i < content.length; i++) {
    const char = content.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(16).padStart(8, "0");
}

/**
 * Simulate virus scan
 */
function simulateVirusScan(filename: string): "clean" | "infected" {
  // Simulate - in production would use actual AV service
  const suspiciousPatterns = [".exe", ".bat", ".cmd", ".scr", ".pif"];
  if (suspiciousPatterns.some(p => filename.toLowerCase().endsWith(p))) {
    return "infected";
  }
  return "clean";
}

/**
 * Extract text content from document (simulated)
 */
export function extractTextContent(filename: string, mimeType: string): string {
  // In production, would use OCR/PDF extraction libraries
  const docType = detectDocumentType(filename);

  // Return sample content based on document type
  switch (docType) {
    case "medical_certificate":
      return "Medical Certificate. This is to certify that the patient has been examined and is unfit for work from [date] to [date]. Diagnosis: [condition]. Restrictions: [restrictions].";
    case "incident_report":
      return "Incident Report. Date of incident: [date]. Location: [location]. Description of incident: Worker reported injury while performing duties. Witnesses: [names].";
    case "specialist_report":
      return "Specialist Medical Report. Patient examined on [date]. Findings: [findings]. Recommendations: [recommendations]. Prognosis: [prognosis].";
    default:
      return `Document content for ${filename}`;
  }
}

/**
 * Upload a new document
 */
export function uploadDocument(
  filename: string,
  mimeType: string,
  sizeBytes: number,
  uploadedBy: string,
  options: {
    caseId?: string;
    workerId?: string;
    title?: string;
    description?: string;
    documentType?: DocumentType;
    tags?: string[];
    dateCreated?: string;
    expiryDate?: string;
    isConfidential?: boolean;
  } = {}
): DocumentUploadResult {
  const warnings: string[] = [];

  // Virus scan
  const virusScanStatus = simulateVirusScan(filename);
  if (virusScanStatus === "infected") {
    return {
      success: false,
      error: "File failed virus scan and was rejected",
      virusScanStatus: "infected",
    };
  }

  // Validate file size (max 50MB)
  if (sizeBytes > 50 * 1024 * 1024) {
    return {
      success: false,
      error: "File exceeds maximum size of 50MB",
      virusScanStatus: "clean",
    };
  }

  const format = detectFormat(mimeType);
  const detectedType = options.documentType || detectDocumentType(filename);
  const textContent = extractTextContent(filename, mimeType);

  // Check for unsupported formats
  if (format === "unknown") {
    warnings.push("Document format not fully supported - preview may not be available");
  }

  const now = new Date().toISOString();
  const documentId = randomUUID();
  const versionId = randomUUID();

  const document: Document = {
    id: documentId,
    metadata: {
      title: options.title || filename,
      description: options.description,
      documentType: detectedType,
      format,
      mimeType,
      sizeBytes,
      dateCreated: options.dateCreated,
      dateReceived: now,
      expiryDate: options.expiryDate,
      tags: options.tags || [],
    },
    status: "pending",
    versions: [
      {
        versionId,
        versionNumber: 1,
        uploadedAt: now,
        uploadedBy,
        fileHash: generateFileHash(filename + now),
        sizeBytes,
      },
    ],
    currentVersion: 1,
    links: [],
    previewUrl: `/api/documents/${documentId}/preview`,
    thumbnailUrl: `/api/documents/${documentId}/thumbnail`,
    fullTextContent: textContent,
    createdAt: now,
    updatedAt: now,
    createdBy: uploadedBy,
    isConfidential: options.isConfidential || false,
  };

  // Auto-link to case if provided
  if (options.caseId) {
    document.links.push({
      linkType: "case",
      targetId: options.caseId,
      linkedAt: now,
      linkedBy: uploadedBy,
    });
  }

  // Auto-link to worker if provided
  if (options.workerId) {
    document.links.push({
      linkType: "worker",
      targetId: options.workerId,
      linkedAt: now,
      linkedBy: uploadedBy,
    });
  }

  // Check for expiring certificates
  if (options.expiryDate) {
    const expiryDate = new Date(options.expiryDate);
    const daysUntilExpiry = Math.floor((expiryDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    if (daysUntilExpiry < 0) {
      document.status = "expired";
      warnings.push("Document has already expired");
    } else if (daysUntilExpiry < 7) {
      warnings.push(`Document expires in ${daysUntilExpiry} days`);
    }
  }

  documentStore.set(documentId, document);

  // Log access
  logAccess(documentId, "edit", uploadedBy, "Document uploaded");

  return {
    success: true,
    document,
    warnings: warnings.length > 0 ? warnings : undefined,
    virusScanStatus: "clean",
  };
}

/**
 * Get document by ID
 */
export function getDocument(documentId: string): Document | null {
  return documentStore.get(documentId) || null;
}

/**
 * Update document metadata
 */
export function updateDocumentMetadata(
  documentId: string,
  updates: Partial<DocumentMetadata>,
  updatedBy: string
): Document | null {
  const doc = documentStore.get(documentId);
  if (!doc) return null;

  doc.metadata = { ...doc.metadata, ...updates };
  doc.updatedAt = new Date().toISOString();

  documentStore.set(documentId, doc);
  logAccess(documentId, "edit", updatedBy, "Metadata updated");

  return doc;
}

/**
 * Upload new version of document
 */
export function uploadNewVersion(
  documentId: string,
  sizeBytes: number,
  uploadedBy: string,
  changeNote?: string
): Document | null {
  const doc = documentStore.get(documentId);
  if (!doc) return null;

  const now = new Date().toISOString();
  const newVersion = doc.currentVersion + 1;

  doc.versions.push({
    versionId: randomUUID(),
    versionNumber: newVersion,
    uploadedAt: now,
    uploadedBy,
    changeNote,
    fileHash: generateFileHash(documentId + now),
    sizeBytes,
  });

  doc.currentVersion = newVersion;
  doc.updatedAt = now;
  doc.metadata.sizeBytes = sizeBytes;

  // Mark previous version as superseded if it was a certificate
  if (doc.status === "verified" && doc.metadata.documentType.includes("certificate")) {
    doc.status = "verified"; // Keep verified
  }

  documentStore.set(documentId, doc);
  logAccess(documentId, "edit", uploadedBy, `Version ${newVersion} uploaded`);

  return doc;
}

/**
 * Link document to entity
 */
export function linkDocument(
  documentId: string,
  linkType: DocumentLink["linkType"],
  targetId: string,
  targetName?: string,
  linkedBy?: string
): Document | null {
  const doc = documentStore.get(documentId);
  if (!doc) return null;

  // Check if link already exists
  const existingLink = doc.links.find(
    l => l.linkType === linkType && l.targetId === targetId
  );
  if (existingLink) return doc;

  doc.links.push({
    linkType,
    targetId,
    targetName,
    linkedAt: new Date().toISOString(),
    linkedBy,
  });

  doc.updatedAt = new Date().toISOString();
  documentStore.set(documentId, doc);

  return doc;
}

/**
 * Update document status
 */
export function updateDocumentStatus(
  documentId: string,
  status: DocumentStatus,
  updatedBy: string
): Document | null {
  const doc = documentStore.get(documentId);
  if (!doc) return null;

  doc.status = status;
  doc.updatedAt = new Date().toISOString();

  documentStore.set(documentId, doc);
  logAccess(documentId, "edit", updatedBy, `Status changed to ${status}`);

  return doc;
}

/**
 * Search documents
 */
export function searchDocuments(
  query: string,
  filter?: DocumentFilter
): DocumentSearchResult[] {
  const results: DocumentSearchResult[] = [];
  const lowerQuery = query.toLowerCase();
  const queryTerms = lowerQuery.split(/\s+/).filter(t => t.length > 2);

  for (const doc of documentStore.values()) {
    // Apply filters
    if (filter) {
      if (filter.documentTypes && !filter.documentTypes.includes(doc.metadata.documentType)) {
        continue;
      }
      if (filter.status && !filter.status.includes(doc.status)) {
        continue;
      }
      if (filter.caseId && !doc.links.some(l => l.linkType === "case" && l.targetId === filter.caseId)) {
        continue;
      }
      if (filter.workerId && !doc.links.some(l => l.linkType === "worker" && l.targetId === filter.workerId)) {
        continue;
      }
      if (filter.tags && !filter.tags.some(t => doc.metadata.tags.includes(t))) {
        continue;
      }
      if (filter.dateFrom && doc.metadata.dateReceived < filter.dateFrom) {
        continue;
      }
      if (filter.dateTo && doc.metadata.dateReceived > filter.dateTo) {
        continue;
      }
    }

    // Search in title, description, and full text
    const searchableText = [
      doc.metadata.title,
      doc.metadata.description || "",
      doc.fullTextContent || "",
      doc.metadata.tags.join(" "),
    ].join(" ").toLowerCase();

    const matchedTerms = queryTerms.filter(term => searchableText.includes(term));

    if (matchedTerms.length > 0 || query.length === 0) {
      // Calculate relevance score
      let relevanceScore = matchedTerms.length / Math.max(queryTerms.length, 1);

      // Boost for title matches
      if (doc.metadata.title.toLowerCase().includes(lowerQuery)) {
        relevanceScore += 0.5;
      }

      // Generate snippets
      const snippets: string[] = [];
      if (doc.fullTextContent) {
        for (const term of matchedTerms.slice(0, 2)) {
          const idx = doc.fullTextContent.toLowerCase().indexOf(term);
          if (idx >= 0) {
            const start = Math.max(0, idx - 30);
            const end = Math.min(doc.fullTextContent.length, idx + term.length + 30);
            snippets.push("..." + doc.fullTextContent.substring(start, end) + "...");
          }
        }
      }

      results.push({
        document: doc,
        relevanceScore: Math.min(1, relevanceScore),
        matchedTerms,
        snippets,
      });
    }
  }

  // Sort by relevance
  return results.sort((a, b) => b.relevanceScore - a.relevanceScore);
}

/**
 * Get documents for a case
 */
export function getCaseDocuments(caseId: string): Document[] {
  const docs: Document[] = [];

  for (const doc of documentStore.values()) {
    if (doc.links.some(l => l.linkType === "case" && l.targetId === caseId)) {
      docs.push(doc);
    }
  }

  return docs.sort((a, b) =>
    new Date(b.metadata.dateReceived).getTime() - new Date(a.metadata.dateReceived).getTime()
  );
}

/**
 * Get expiring documents
 */
export function getExpiringDocuments(daysAhead: number = 14): Document[] {
  const now = Date.now();
  const cutoff = now + daysAhead * 24 * 60 * 60 * 1000;
  const expiring: Document[] = [];

  for (const doc of documentStore.values()) {
    if (doc.metadata.expiryDate && doc.status !== "expired" && doc.status !== "superseded") {
      const expiryTime = new Date(doc.metadata.expiryDate).getTime();
      if (expiryTime <= cutoff && expiryTime > now) {
        expiring.push(doc);
      }
    }
  }

  return expiring.sort((a, b) =>
    new Date(a.metadata.expiryDate!).getTime() - new Date(b.metadata.expiryDate!).getTime()
  );
}

/**
 * Get document statistics
 */
export function getDocumentStats(caseId?: string): DocumentStats {
  const docs = caseId ? getCaseDocuments(caseId) : Array.from(documentStore.values());
  const now = Date.now();
  const weekAgo = now - 7 * 24 * 60 * 60 * 1000;
  const twoWeeksAhead = now + 14 * 24 * 60 * 60 * 1000;

  const byType: Record<DocumentType, number> = {} as Record<DocumentType, number>;
  const byStatus: Record<DocumentStatus, number> = {} as Record<DocumentStatus, number>;
  let totalSizeBytes = 0;
  let recentUploads = 0;
  let expiringSoon = 0;

  for (const doc of docs) {
    byType[doc.metadata.documentType] = (byType[doc.metadata.documentType] || 0) + 1;
    byStatus[doc.status] = (byStatus[doc.status] || 0) + 1;
    totalSizeBytes += doc.metadata.sizeBytes;

    if (new Date(doc.createdAt).getTime() > weekAgo) {
      recentUploads++;
    }

    if (doc.metadata.expiryDate) {
      const expiryTime = new Date(doc.metadata.expiryDate).getTime();
      if (expiryTime > now && expiryTime <= twoWeeksAhead) {
        expiringSoon++;
      }
    }
  }

  return {
    totalDocuments: docs.length,
    byType,
    byStatus,
    totalSizeBytes,
    recentUploads,
    expiringSoon,
  };
}

/**
 * Log document access
 */
export function logAccess(
  documentId: string,
  accessType: DocumentAccessLog["accessType"],
  userId: string,
  userName?: string
): void {
  accessLogs.push({
    accessId: randomUUID(),
    documentId,
    accessType,
    userId,
    userName,
    timestamp: new Date().toISOString(),
  });
}

/**
 * Get access logs for a document
 */
export function getAccessLogs(documentId: string): DocumentAccessLog[] {
  return accessLogs
    .filter(log => log.documentId === documentId)
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
}

/**
 * Delete document (soft delete by status change)
 */
export function deleteDocument(documentId: string, deletedBy: string): boolean {
  const doc = documentStore.get(documentId);
  if (!doc) return false;

  // For audit trail, we don't actually delete - just mark as rejected
  doc.status = "rejected";
  doc.updatedAt = new Date().toISOString();

  documentStore.set(documentId, doc);
  logAccess(documentId, "delete", deletedBy, "Document deleted");

  return true;
}

/**
 * Initialize with sample documents
 */
export function initializeSampleDocuments(): void {
  if (documentStore.size > 0) return;

  const sampleDocs = [
    {
      filename: "WorkCover_Certificate_Nov2024.pdf",
      mimeType: "application/pdf",
      sizeBytes: 125000,
      caseId: "1",
      documentType: "workcover_certificate" as DocumentType,
      expiryDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      filename: "Incident_Report_Warehouse.pdf",
      mimeType: "application/pdf",
      sizeBytes: 85000,
      caseId: "1",
      documentType: "incident_report" as DocumentType,
    },
    {
      filename: "GP_Clinical_Notes.docx",
      mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      sizeBytes: 45000,
      caseId: "2",
      documentType: "clinical_notes" as DocumentType,
    },
    {
      filename: "MRI_Lumbar_Spine.pdf",
      mimeType: "application/pdf",
      sizeBytes: 2500000,
      caseId: "2",
      documentType: "imaging_report" as DocumentType,
    },
  ];

  for (const doc of sampleDocs) {
    uploadDocument(doc.filename, doc.mimeType, doc.sizeBytes, "system", {
      caseId: doc.caseId,
      documentType: doc.documentType,
      expiryDate: doc.expiryDate,
    });
  }
}

// Initialize sample data
initializeSampleDocuments();
