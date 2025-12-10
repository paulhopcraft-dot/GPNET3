/**
 * Certificate Ingestion Engine
 * Processes medical certificates from multiple sources with OCR extraction,
 * field parsing, validation, and expiry tracking
 */

import type { WorkCapacity } from "@shared/schema";

// Certificate types recognized by the system
export type CertificateType =
  | 'workcover_certificate'
  | 'medical_certificate'
  | 'fitness_for_duty'
  | 'specialist_report'
  | 'gp_report'
  | 'allied_health_report'
  | 'unknown';

// Source of the certificate
export type CertificateSource =
  | 'worker_upload'
  | 'freshdesk_attachment'
  | 'manager_submission'
  | 'email_attachment'
  | 'api_upload';

// Extracted field with confidence score
export interface ExtractedField<T> {
  value: T;
  confidence: number; // 0-1
  rawText?: string;
  needsReview: boolean;
}

// Extracted certificate data
export interface ExtractedCertificateData {
  certificateType: ExtractedField<CertificateType>;
  issueDate: ExtractedField<string | null>;
  startDate: ExtractedField<string | null>;
  endDate: ExtractedField<string | null>;
  workerName: ExtractedField<string | null>;
  doctorName: ExtractedField<string | null>;
  clinicName: ExtractedField<string | null>;
  diagnosis: ExtractedField<string | null>;
  workCapacity: ExtractedField<WorkCapacity>;
  restrictions: ExtractedField<string[]>;
  hoursPerWeek: ExtractedField<number | null>;
  reviewDate: ExtractedField<string | null>;
  notes: ExtractedField<string | null>;
}

// Validation result
export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

// Ingestion result
export interface IngestionResult {
  success: boolean;
  certificateId: string;
  extractedData: ExtractedCertificateData;
  validation: ValidationResult;
  linkedCaseId?: string;
  linkedWorkerId?: string;
  requiresManualReview: boolean;
  reviewReasons: string[];
  expiryDate?: string;
  daysUntilExpiry?: number;
}

// Certificate record for storage
export interface CertificateRecord {
  id: string;
  caseId: string;
  source: CertificateSource;
  originalFilename: string;
  fileType: string;
  fileSize: number;
  uploadedAt: string;
  processedAt: string;
  extractedData: ExtractedCertificateData;
  validation: ValidationResult;
  status: 'pending_review' | 'approved' | 'rejected' | 'expired';
  reviewedBy?: string;
  reviewedAt?: string;
  reviewNotes?: string;
}

// Expiry tracking
export interface ExpiryAlert {
  certificateId: string;
  caseId: string;
  workerName: string;
  expiryDate: string;
  daysUntilExpiry: number;
  alertLevel: 'info' | 'warning' | 'critical';
  notificationSent: boolean;
}

// Field extraction patterns
const PATTERNS = {
  // Date patterns (various formats)
  date: [
    /(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/g,
    /(\d{1,2})\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+(\d{2,4})/gi,
    /(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+(\d{1,2}),?\s+(\d{2,4})/gi,
  ],

  // Work capacity keywords
  capacity: {
    fit: /\b(fit for (full|normal|pre-injury) dut|full capacity|100%\s*capacity|cleared for (full|normal) work|no restrictions)\b/i,
    partial: /\b(modified dut|partial capacity|light dut|restricted dut|reduced (hours|capacity)|graduated return|suitable dut)\b/i,
    unfit: /\b(unfit for (work|any dut)|total incapacity|no capacity|completely unfit|0%\s*capacity|not fit for work)\b/i,
  },

  // Restriction patterns
  restrictions: [
    /no\s+(heavy\s+)?lifting/i,
    /lifting\s+restrict[a-z]*\s*(to\s+)?(\d+)\s*(kg)?/i,
    /max[a-z]*\s+(\d+)\s*(kg|kilos?)/i,
    /no\s+bending/i,
    /no\s+twisting/i,
    /no\s+repetitive/i,
    /sit[\s\-]?stand/i,
    /desk[\s\-]?based/i,
    /light\s+duties/i,
    /modified\s+duties/i,
    /no\s+driving/i,
    /no\s+climbing/i,
    /reduced\s+hours/i,
    /(\d+)\s*hours?\s*(per\s*)?(day|week)/i,
    /avoid\s+(prolonged\s+)?(standing|sitting|walking)/i,
    /no\s+overtime/i,
    /work\s+from\s+home/i,
    /seated\s+work\s+only/i,
    /no\s+manual\s+handling/i,
    /avoid\s+stress/i,
  ],

  // Doctor/clinic patterns
  doctor: /(?:dr\.?|doctor)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/gi,
  clinic: /(?:clinic|medical\s+centre|surgery|practice)[:\s]+([A-Za-z\s]+?)(?:\n|,|$)/gi,

  // Diagnosis patterns
  diagnosis: [
    /diagnosis[:\s]+([^\n]+)/i,
    /condition[:\s]+([^\n]+)/i,
    /injury[:\s]+([^\n]+)/i,
    /presenting\s+complaint[:\s]+([^\n]+)/i,
    /(lumbar|cervical|thoracic)\s+(strain|sprain|pain)/i,
    /(shoulder|knee|ankle|wrist|hip|elbow)\s+(injury|strain|sprain|pain)/i,
    /(anxiety|depression|ptsd|stress)/i,
    /(fracture|tear|rupture)/i,
    /(tendinitis|tendinopathy|bursitis)/i,
    /(disc\s+)(bulge|herniation|prolapse)/i,
  ],

  // Certificate type indicators
  certificateType: {
    workcover: /\b(workcover|workers?\s*comp|work\s*injury|scheme\s*certificate)\b/i,
    fitness: /\b(fitness\s+for\s+duty|fit\s+for\s+work|capacity\s+certificate)\b/i,
    specialist: /\b(specialist|orthopaedic|psychiatr|psycholog|neurolog|rheumatolog)\b/i,
    gp: /\b(general\s+practitioner|gp|family\s+doctor|treating\s+doctor)\b/i,
    allied: /\b(physiotherap|occupational\s+therap|chiropract|osteopath)\b/i,
  },

  // Worker name patterns
  workerName: [
    /patient[:\s]+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)/i,
    /worker[:\s]+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)/i,
    /name[:\s]+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)/i,
    /re[:\s]+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)/i,
  ],

  // Review date patterns
  reviewDate: /\b(review|reassess|follow[\s\-]?up)[:\s]*(in\s+)?(\d+)\s*(days?|weeks?|months?)/i,
  nextReview: /next\s+(review|appointment)[:\s]+([^\n]+)/i,
};

/**
 * Generate a unique certificate ID
 */
function generateCertificateId(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 8);
  return `CERT-${timestamp}-${random}`.toUpperCase();
}

/**
 * Parse date string to ISO format
 */
function parseDate(dateStr: string): string | null {
  if (!dateStr) return null;

  // Try various date formats
  const formats = [
    // DD/MM/YYYY or DD-MM-YYYY
    /^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/,
    // DD/MM/YY
    /^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2})$/,
  ];

  for (const format of formats) {
    const match = dateStr.match(format);
    if (match) {
      let [, day, month, year] = match;
      if (year.length === 2) {
        year = parseInt(year) > 50 ? `19${year}` : `20${year}`;
      }
      const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
      if (!isNaN(date.getTime())) {
        return date.toISOString().split('T')[0];
      }
    }
  }

  // Try natural date parsing
  const date = new Date(dateStr);
  if (!isNaN(date.getTime())) {
    return date.toISOString().split('T')[0];
  }

  return null;
}

/**
 * Extract dates from text
 */
function extractDates(text: string): string[] {
  const dates: string[] = [];

  for (const pattern of PATTERNS.date) {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      const parsed = parseDate(match[0]);
      if (parsed && !dates.includes(parsed)) {
        dates.push(parsed);
      }
    }
  }

  return dates.sort();
}

/**
 * Extract work capacity from text
 */
function extractWorkCapacity(text: string): ExtractedField<WorkCapacity> {
  if (PATTERNS.capacity.unfit.test(text)) {
    return { value: 'unfit', confidence: 0.9, needsReview: false };
  }
  if (PATTERNS.capacity.fit.test(text)) {
    return { value: 'fit', confidence: 0.9, needsReview: false };
  }
  if (PATTERNS.capacity.partial.test(text)) {
    return { value: 'partial', confidence: 0.85, needsReview: false };
  }

  // Default to unknown with low confidence
  return { value: 'unknown', confidence: 0.3, needsReview: true };
}

/**
 * Extract restrictions from text
 */
function extractRestrictions(text: string): ExtractedField<string[]> {
  const restrictions: string[] = [];

  for (const pattern of PATTERNS.restrictions) {
    const match = text.match(pattern);
    if (match) {
      restrictions.push(match[0].trim());
    }
  }

  const confidence = restrictions.length > 0 ? 0.8 : 0.5;
  return {
    value: restrictions,
    confidence,
    needsReview: restrictions.length === 0
  };
}

/**
 * Extract certificate type
 */
function extractCertificateType(text: string, filename: string): ExtractedField<CertificateType> {
  const combined = `${text} ${filename}`.toLowerCase();

  if (PATTERNS.certificateType.workcover.test(combined)) {
    return { value: 'workcover_certificate', confidence: 0.9, needsReview: false };
  }
  if (PATTERNS.certificateType.fitness.test(combined)) {
    return { value: 'fitness_for_duty', confidence: 0.85, needsReview: false };
  }
  if (PATTERNS.certificateType.specialist.test(combined)) {
    return { value: 'specialist_report', confidence: 0.8, needsReview: false };
  }
  if (PATTERNS.certificateType.allied.test(combined)) {
    return { value: 'allied_health_report', confidence: 0.8, needsReview: false };
  }
  if (PATTERNS.certificateType.gp.test(combined)) {
    return { value: 'gp_report', confidence: 0.75, needsReview: false };
  }

  // Check for generic medical certificate indicators
  if (/\b(medical\s+certificate|sick\s+leave|unfitness)\b/i.test(combined)) {
    return { value: 'medical_certificate', confidence: 0.7, needsReview: true };
  }

  return { value: 'unknown', confidence: 0.3, needsReview: true };
}

/**
 * Extract doctor name
 */
function extractDoctorName(text: string): ExtractedField<string | null> {
  for (const pattern of [PATTERNS.doctor]) {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      if (match[1] && match[1].length > 2) {
        return { value: match[1].trim(), confidence: 0.75, needsReview: false };
      }
    }
  }
  return { value: null, confidence: 0, needsReview: true };
}

/**
 * Extract worker name
 */
function extractWorkerName(text: string): ExtractedField<string | null> {
  for (const pattern of PATTERNS.workerName) {
    const match = text.match(pattern);
    if (match && match[1] && match[1].length > 2) {
      return { value: match[1].trim(), confidence: 0.7, needsReview: true };
    }
  }
  return { value: null, confidence: 0, needsReview: true };
}

/**
 * Extract diagnosis
 */
function extractDiagnosis(text: string): ExtractedField<string | null> {
  for (const pattern of PATTERNS.diagnosis) {
    const match = text.match(pattern);
    if (match) {
      const diagnosis = match[1]?.trim() || match[0].trim();
      return { value: diagnosis, confidence: 0.7, needsReview: false };
    }
  }
  return { value: null, confidence: 0, needsReview: true };
}

/**
 * Extract hours per week
 */
function extractHoursPerWeek(text: string): ExtractedField<number | null> {
  const hourPatterns = [
    /(\d+)\s*hours?\s*(per\s*)?(week|wk)/i,
    /work\s+(\d+)\s*hours?/i,
    /(\d+)\s*hrs?\s*(per\s*)?(week|wk)/i,
  ];

  for (const pattern of hourPatterns) {
    const match = text.match(pattern);
    if (match) {
      const hours = parseInt(match[1]);
      if (hours > 0 && hours <= 60) {
        return { value: hours, confidence: 0.8, needsReview: false };
      }
    }
  }
  return { value: null, confidence: 0, needsReview: false };
}

/**
 * Main extraction function - processes text and extracts all fields
 */
export function extractCertificateData(
  text: string,
  filename: string = ''
): ExtractedCertificateData {
  const dates = extractDates(text);

  // Try to intelligently assign dates
  let issueDate: string | null = null;
  let startDate: string | null = null;
  let endDate: string | null = null;

  if (dates.length >= 3) {
    issueDate = dates[0];
    startDate = dates[1];
    endDate = dates[2];
  } else if (dates.length === 2) {
    startDate = dates[0];
    endDate = dates[1];
    issueDate = dates[0];
  } else if (dates.length === 1) {
    issueDate = dates[0];
    startDate = dates[0];
  }

  // Extract review date
  let reviewDate: string | null = null;
  const reviewMatch = text.match(PATTERNS.reviewDate);
  if (reviewMatch) {
    const amount = parseInt(reviewMatch[3]);
    const unit = reviewMatch[4].toLowerCase();
    const baseDate = endDate ? new Date(endDate) : new Date();

    if (unit.startsWith('day')) {
      baseDate.setDate(baseDate.getDate() + amount);
    } else if (unit.startsWith('week')) {
      baseDate.setDate(baseDate.getDate() + (amount * 7));
    } else if (unit.startsWith('month')) {
      baseDate.setMonth(baseDate.getMonth() + amount);
    }
    reviewDate = baseDate.toISOString().split('T')[0];
  }

  return {
    certificateType: extractCertificateType(text, filename),
    issueDate: {
      value: issueDate,
      confidence: issueDate ? 0.7 : 0,
      needsReview: !issueDate,
    },
    startDate: {
      value: startDate,
      confidence: startDate ? 0.7 : 0,
      needsReview: !startDate,
    },
    endDate: {
      value: endDate,
      confidence: endDate ? 0.7 : 0,
      needsReview: !endDate,
    },
    workerName: extractWorkerName(text),
    doctorName: extractDoctorName(text),
    clinicName: { value: null, confidence: 0, needsReview: true },
    diagnosis: extractDiagnosis(text),
    workCapacity: extractWorkCapacity(text),
    restrictions: extractRestrictions(text),
    hoursPerWeek: extractHoursPerWeek(text),
    reviewDate: {
      value: reviewDate,
      confidence: reviewDate ? 0.6 : 0,
      needsReview: !reviewDate,
    },
    notes: { value: null, confidence: 0, needsReview: false },
  };
}

/**
 * Validate extracted certificate data
 */
export function validateCertificateData(
  data: ExtractedCertificateData
): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Required fields
  if (!data.startDate.value) {
    errors.push('Certificate start date is required');
  }
  if (!data.workCapacity.value || data.workCapacity.value === 'unknown') {
    warnings.push('Work capacity could not be determined');
  }

  // Date logic validation
  if (data.startDate.value && data.endDate.value) {
    const start = new Date(data.startDate.value);
    const end = new Date(data.endDate.value);

    if (end < start) {
      errors.push('End date cannot be before start date');
    }

    const daysDiff = Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    if (daysDiff > 365) {
      warnings.push('Certificate duration exceeds 1 year - verify dates');
    }
  }

  // Future date warning
  if (data.startDate.value) {
    const start = new Date(data.startDate.value);
    const today = new Date();
    if (start > today) {
      warnings.push('Certificate start date is in the future');
    }
  }

  // Capacity/restrictions consistency
  if (data.workCapacity.value === 'fit' && data.restrictions.value.length > 0) {
    warnings.push('Certificate indicates fit for work but lists restrictions');
  }

  // Low confidence fields
  const lowConfidenceFields = Object.entries(data)
    .filter(([, field]) => field && typeof field === 'object' && 'confidence' in field && field.confidence < 0.5)
    .map(([key]) => key);

  if (lowConfidenceFields.length > 0) {
    warnings.push(`Low confidence extraction for: ${lowConfidenceFields.join(', ')}`);
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Calculate days until certificate expiry
 */
export function calculateDaysUntilExpiry(endDate: string | null): number | null {
  if (!endDate) return null;

  const end = new Date(endDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const diffTime = end.getTime() - today.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

/**
 * Determine expiry alert level
 */
export function getExpiryAlertLevel(daysUntilExpiry: number | null): ExpiryAlert['alertLevel'] | null {
  if (daysUntilExpiry === null) return null;
  if (daysUntilExpiry <= 0) return 'critical';
  if (daysUntilExpiry <= 7) return 'warning';
  if (daysUntilExpiry <= 14) return 'info';
  return null;
}

/**
 * Process certificate ingestion
 */
export function processCertificateIngestion(
  text: string,
  source: CertificateSource,
  filename: string,
  fileType: string,
  fileSize: number,
  linkedCaseId?: string
): IngestionResult {
  const certificateId = generateCertificateId();

  // Extract data from text
  const extractedData = extractCertificateData(text, filename);

  // Validate extracted data
  const validation = validateCertificateData(extractedData);

  // Determine if manual review is needed
  const reviewReasons: string[] = [];

  // Check for fields needing review
  Object.entries(extractedData).forEach(([key, field]) => {
    if (field && typeof field === 'object' && 'needsReview' in field && field.needsReview) {
      reviewReasons.push(`${key} requires verification`);
    }
  });

  // Add validation warnings to review reasons
  if (validation.warnings.length > 0) {
    reviewReasons.push(...validation.warnings);
  }

  const requiresManualReview = reviewReasons.length > 0 || !validation.isValid;

  // Calculate expiry info
  const daysUntilExpiry = calculateDaysUntilExpiry(extractedData.endDate.value);

  return {
    success: validation.isValid,
    certificateId,
    extractedData,
    validation,
    linkedCaseId,
    linkedWorkerId: undefined,
    requiresManualReview,
    reviewReasons,
    expiryDate: extractedData.endDate.value || undefined,
    daysUntilExpiry: daysUntilExpiry ?? undefined,
  };
}

/**
 * Get certificates approaching expiry
 */
export function getExpiringCertificates(
  certificates: CertificateRecord[],
  daysThreshold: number = 14
): ExpiryAlert[] {
  const alerts: ExpiryAlert[] = [];

  for (const cert of certificates) {
    if (cert.status === 'expired' || cert.status === 'rejected') continue;

    const endDate = cert.extractedData.endDate.value;
    if (!endDate) continue;

    const daysUntilExpiry = calculateDaysUntilExpiry(endDate);
    if (daysUntilExpiry === null) continue;

    const alertLevel = getExpiryAlertLevel(daysUntilExpiry);
    if (!alertLevel || daysUntilExpiry > daysThreshold) continue;

    alerts.push({
      certificateId: cert.id,
      caseId: cert.caseId,
      workerName: cert.extractedData.workerName.value || 'Unknown',
      expiryDate: endDate,
      daysUntilExpiry,
      alertLevel,
      notificationSent: false,
    });
  }

  return alerts.sort((a, b) => a.daysUntilExpiry - b.daysUntilExpiry);
}

/**
 * Create certificate record for storage
 */
export function createCertificateRecord(
  ingestionResult: IngestionResult,
  source: CertificateSource,
  filename: string,
  fileType: string,
  fileSize: number,
  caseId: string
): CertificateRecord {
  return {
    id: ingestionResult.certificateId,
    caseId,
    source,
    originalFilename: filename,
    fileType,
    fileSize,
    uploadedAt: new Date().toISOString(),
    processedAt: new Date().toISOString(),
    extractedData: ingestionResult.extractedData,
    validation: ingestionResult.validation,
    status: ingestionResult.requiresManualReview ? 'pending_review' : 'approved',
  };
}
