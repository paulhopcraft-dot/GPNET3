/**
 * Claims Intake Service
 * Handles new worker injury case creation with validation and workflow initiation
 */

import type { WorkerCase, CompanyName, WorkStatus, ComplianceIndicator } from "@shared/schema";
import { FreshdeskService, CreateTicketInput } from "./freshdesk";

// Injury types with expected documentation requirements
const INJURY_TYPES = {
  MUSCULOSKELETAL: {
    label: 'Musculoskeletal',
    subtypes: ['Back/Spine', 'Shoulder', 'Knee', 'Wrist/Hand', 'Neck', 'Hip', 'Ankle/Foot', 'Elbow'],
    requiredDocs: ['Medical Certificate', 'GP Report'],
    optionalDocs: ['Imaging Results', 'Specialist Referral'],
  },
  PSYCHOLOGICAL: {
    label: 'Psychological',
    subtypes: ['Anxiety', 'Depression', 'PTSD', 'Work Stress', 'Burnout', 'Adjustment Disorder'],
    requiredDocs: ['Medical Certificate', 'GP Report', 'Psychiatrist/Psychologist Report'],
    optionalDocs: ['Treatment Plan', 'Medication List'],
  },
  SOFT_TISSUE: {
    label: 'Soft Tissue',
    subtypes: ['Strain', 'Sprain', 'Contusion', 'Laceration', 'Burn'],
    requiredDocs: ['Medical Certificate'],
    optionalDocs: ['Emergency Room Report', 'Incident Report'],
  },
  FRACTURE: {
    label: 'Fracture/Bone',
    subtypes: ['Simple Fracture', 'Compound Fracture', 'Stress Fracture'],
    requiredDocs: ['Medical Certificate', 'X-Ray/Imaging Report', 'Orthopaedic Report'],
    optionalDocs: ['Surgery Report', 'Rehabilitation Plan'],
  },
  NEUROLOGICAL: {
    label: 'Neurological',
    subtypes: ['Concussion', 'Nerve Damage', 'Carpal Tunnel', 'Sciatica'],
    requiredDocs: ['Medical Certificate', 'Neurologist Report'],
    optionalDocs: ['MRI Results', 'Nerve Conduction Study'],
  },
  OCCUPATIONAL_DISEASE: {
    label: 'Occupational Disease',
    subtypes: ['Hearing Loss', 'Respiratory Condition', 'Skin Condition', 'Repetitive Strain'],
    requiredDocs: ['Medical Certificate', 'Specialist Report', 'Exposure History'],
    optionalDocs: ['Workplace Assessment', 'Audiometry Results'],
  },
} as const;

export type InjuryType = keyof typeof INJURY_TYPES;

// Claim sources
export type ClaimSource = 'freshdesk' | 'portal' | 'phone' | 'email' | 'employer_notification' | 'insurer_referral';

// Validation result
export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

export interface ValidationError {
  field: string;
  message: string;
  code: string;
}

export interface ValidationWarning {
  field: string;
  message: string;
  suggestion?: string;
}

// Claims intake form data
export interface ClaimsIntakeForm {
  // Worker details
  workerFirstName: string;
  workerLastName: string;
  workerEmail?: string;
  workerPhone?: string;
  workerDateOfBirth?: string;

  // Employment details
  company: string;
  jobTitle?: string;
  employmentStartDate?: string;

  // Injury details
  dateOfInjury: string;
  injuryType: InjuryType;
  injurySubtype?: string;
  injuryDescription: string;
  bodyPartAffected?: string;

  // Incident details
  incidentLocation?: string;
  incidentWitnessed?: boolean;
  witnessNames?: string;
  supervisorNotified?: boolean;
  supervisorName?: string;

  // Medical details
  treatingDoctorName?: string;
  treatingDoctorClinic?: string;
  hospitalVisit?: boolean;
  hospitalName?: string;

  // Work status
  currentWorkStatus: 'working_full' | 'working_modified' | 'off_work';
  expectedReturnDate?: string;

  // Claim details
  claimSource: ClaimSource;
  claimNumber?: string;
  insurerName?: string;

  // Case management
  assignedCaseManager?: string;
  priority?: 'low' | 'medium' | 'high' | 'urgent';

  // Notes
  additionalNotes?: string;
}

// Intake result
export interface IntakeResult {
  success: boolean;
  caseId?: string;
  freshdeskTicketId?: number;
  validation: ValidationResult;
  nextSteps: string[];
  requiredDocuments: string[];
  assignedTo?: string;
}

/**
 * Get all available injury types
 */
export function getInjuryTypes(): Array<{
  type: InjuryType;
  label: string;
  subtypes: readonly string[];
  requiredDocs: readonly string[];
}> {
  return Object.entries(INJURY_TYPES).map(([type, config]) => ({
    type: type as InjuryType,
    label: config.label,
    subtypes: config.subtypes,
    requiredDocs: config.requiredDocs,
  }));
}

/**
 * Validate intake form data
 */
export function validateIntakeForm(form: ClaimsIntakeForm): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];

  // Required field validations
  if (!form.workerFirstName?.trim()) {
    errors.push({ field: 'workerFirstName', message: 'Worker first name is required', code: 'REQUIRED' });
  }

  if (!form.workerLastName?.trim()) {
    errors.push({ field: 'workerLastName', message: 'Worker last name is required', code: 'REQUIRED' });
  }

  if (!form.company?.trim()) {
    errors.push({ field: 'company', message: 'Company name is required', code: 'REQUIRED' });
  }

  if (!form.dateOfInjury) {
    errors.push({ field: 'dateOfInjury', message: 'Date of injury is required', code: 'REQUIRED' });
  } else {
    const injuryDate = new Date(form.dateOfInjury);
    const today = new Date();

    if (injuryDate > today) {
      errors.push({ field: 'dateOfInjury', message: 'Date of injury cannot be in the future', code: 'INVALID_DATE' });
    }

    const daysSinceInjury = Math.floor((today.getTime() - injuryDate.getTime()) / (1000 * 60 * 60 * 24));
    if (daysSinceInjury > 365) {
      warnings.push({
        field: 'dateOfInjury',
        message: 'Injury occurred more than a year ago',
        suggestion: 'Verify claim eligibility and statute of limitations',
      });
    } else if (daysSinceInjury > 30) {
      warnings.push({
        field: 'dateOfInjury',
        message: 'Late notification - injury occurred more than 30 days ago',
        suggestion: 'Document reason for delayed reporting',
      });
    }
  }

  if (!form.injuryType) {
    errors.push({ field: 'injuryType', message: 'Injury type is required', code: 'REQUIRED' });
  } else if (!INJURY_TYPES[form.injuryType]) {
    errors.push({ field: 'injuryType', message: 'Invalid injury type', code: 'INVALID' });
  }

  if (!form.injuryDescription?.trim()) {
    errors.push({ field: 'injuryDescription', message: 'Injury description is required', code: 'REQUIRED' });
  } else if (form.injuryDescription.length < 20) {
    warnings.push({
      field: 'injuryDescription',
      message: 'Injury description is brief',
      suggestion: 'Add more detail about how the injury occurred',
    });
  }

  if (!form.currentWorkStatus) {
    errors.push({ field: 'currentWorkStatus', message: 'Current work status is required', code: 'REQUIRED' });
  }

  if (!form.claimSource) {
    errors.push({ field: 'claimSource', message: 'Claim source is required', code: 'REQUIRED' });
  }

  // Email validation
  if (form.workerEmail) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(form.workerEmail)) {
      errors.push({ field: 'workerEmail', message: 'Invalid email format', code: 'INVALID_FORMAT' });
    }
  } else {
    warnings.push({
      field: 'workerEmail',
      message: 'No email address provided',
      suggestion: 'Email is recommended for worker communication',
    });
  }

  // Phone validation
  if (form.workerPhone) {
    const phoneRegex = /^[\d\s\-+()]{8,}$/;
    if (!phoneRegex.test(form.workerPhone)) {
      warnings.push({
        field: 'workerPhone',
        message: 'Phone number format may be incorrect',
        suggestion: 'Verify phone number is valid',
      });
    }
  } else {
    warnings.push({
      field: 'workerPhone',
      message: 'No phone number provided',
      suggestion: 'Phone number recommended for urgent contact',
    });
  }

  // Psychological injury specific warnings
  if (form.injuryType === 'PSYCHOLOGICAL') {
    if (!form.treatingDoctorName) {
      warnings.push({
        field: 'treatingDoctorName',
        message: 'Treating practitioner not specified for psychological injury',
        suggestion: 'Mental health claims require specialist documentation',
      });
    }
  }

  // Work status consistency check
  if (form.currentWorkStatus === 'off_work' && !form.expectedReturnDate) {
    warnings.push({
      field: 'expectedReturnDate',
      message: 'No expected return date for worker currently off work',
      suggestion: 'Request medical certificate with expected duration',
    });
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Generate a unique case ID
 */
function generateCaseId(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 8);
  return `GPNet-${timestamp}-${random}`.toUpperCase();
}

/**
 * Map work status from intake form to system work status
 */
function mapWorkStatus(intakeStatus: ClaimsIntakeForm['currentWorkStatus']): WorkStatus {
  switch (intakeStatus) {
    case 'working_full':
      return 'At work';
    case 'working_modified':
      return 'Modified duties';
    case 'off_work':
      return 'Off work';
    default:
      return 'Off work';
  }
}

/**
 * Determine initial risk level based on injury type and circumstances
 */
function determineInitialRiskLevel(form: ClaimsIntakeForm): 'High' | 'Medium' | 'Low' {
  // High risk indicators
  if (form.injuryType === 'PSYCHOLOGICAL') return 'High';
  if (form.injuryType === 'NEUROLOGICAL') return 'High';
  if (form.priority === 'urgent' || form.priority === 'high') return 'High';
  if (form.hospitalVisit) return 'High';

  // Medium risk indicators
  if (form.injuryType === 'FRACTURE') return 'Medium';
  if (form.currentWorkStatus === 'off_work') return 'Medium';

  // Calculate days since injury
  const injuryDate = new Date(form.dateOfInjury);
  const today = new Date();
  const daysSinceInjury = Math.floor((today.getTime() - injuryDate.getTime()) / (1000 * 60 * 60 * 24));

  if (daysSinceInjury > 14 && form.currentWorkStatus !== 'working_full') return 'Medium';

  return 'Low';
}

/**
 * Determine initial compliance indicator
 */
function determineInitialCompliance(form: ClaimsIntakeForm): ComplianceIndicator {
  // New cases start with Medium compliance - awaiting initial documentation
  return 'Medium';
}

/**
 * Generate next steps based on intake data
 */
function generateNextSteps(form: ClaimsIntakeForm): string[] {
  const steps: string[] = [];
  const injuryConfig = INJURY_TYPES[form.injuryType];

  // Document collection
  steps.push(`Obtain ${injuryConfig.requiredDocs.join(', ')}`);

  // Work status specific steps
  if (form.currentWorkStatus === 'off_work') {
    steps.push('Request medical certificate with expected return date');
    steps.push('Schedule initial worker phone consultation');
  } else if (form.currentWorkStatus === 'working_modified') {
    steps.push('Confirm modified duties are within medical restrictions');
    steps.push('Document current work arrangements');
  }

  // Psychological specific steps
  if (form.injuryType === 'PSYCHOLOGICAL') {
    steps.push('Arrange psychological assessment appointment');
    steps.push('Coordinate with HR regarding workplace factors');
  }

  // Employer notification
  if (!form.supervisorNotified) {
    steps.push('Confirm employer has been notified of injury');
  }

  // GP contact
  if (form.treatingDoctorName) {
    steps.push(`Contact treating GP (${form.treatingDoctorName}) for initial report`);
  } else {
    steps.push('Identify and contact treating medical practitioner');
  }

  // Insurer notification for workers comp
  if (!form.claimNumber) {
    steps.push('Lodge claim with insurer and obtain claim number');
  }

  // Initial check-in
  steps.push('Schedule first weekly check-in with worker');

  return steps;
}

/**
 * Process new claims intake
 */
export async function processClaimsIntake(
  form: ClaimsIntakeForm,
  options: {
    createFreshdeskTicket?: boolean;
    autoAssign?: boolean;
  } = {}
): Promise<IntakeResult> {
  // Validate the form
  const validation = validateIntakeForm(form);

  if (!validation.isValid) {
    return {
      success: false,
      validation,
      nextSteps: [],
      requiredDocuments: [],
    };
  }

  // Generate case ID
  const caseId = generateCaseId();

  // Get injury configuration
  const injuryConfig = INJURY_TYPES[form.injuryType];

  // Build worker case data
  const workerName = `${form.workerFirstName.trim()} ${form.workerLastName.trim()}`;

  const workerCase: Partial<WorkerCase> = {
    id: caseId,
    workerName,
    company: form.company as CompanyName,
    dateOfInjury: form.dateOfInjury,
    riskLevel: determineInitialRiskLevel(form),
    workStatus: mapWorkStatus(form.currentWorkStatus),
    hasCertificate: false,
    complianceIndicator: determineInitialCompliance(form),
    compliance: {
      indicator: determineInitialCompliance(form),
      reason: 'New case - awaiting initial documentation',
      source: 'intake',
      lastChecked: new Date().toISOString(),
    },
    currentStatus: `New ${injuryConfig.label} injury claim - ${form.injuryDescription.substring(0, 100)}`,
    nextStep: generateNextSteps(form)[0],
    owner: form.assignedCaseManager || 'CLC Team',
    dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toLocaleDateString(), // 7 days from now
    summary: `${injuryConfig.label} injury: ${form.injurySubtype || form.injuryType}. ${form.injuryDescription}`,
    ticketIds: [caseId],
    ticketCount: 1,
  };

  // Create Freshdesk ticket if requested
  let freshdeskTicketId: number | undefined;

  if (options.createFreshdeskTicket && form.workerEmail) {
    try {
      const freshdesk = new FreshdeskService();
      const ticketInput: CreateTicketInput = {
        subject: `New Claim: ${workerName} - ${injuryConfig.label} Injury`,
        description: `
New Worker Injury Claim

Worker: ${workerName}
Company: ${form.company}
Date of Injury: ${form.dateOfInjury}
Injury Type: ${injuryConfig.label}${form.injurySubtype ? ` - ${form.injurySubtype}` : ''}

Description:
${form.injuryDescription}

Work Status: ${form.currentWorkStatus.replace('_', ' ')}
${form.expectedReturnDate ? `Expected Return: ${form.expectedReturnDate}` : ''}

${form.treatingDoctorName ? `Treating Doctor: ${form.treatingDoctorName}` : ''}
${form.treatingDoctorClinic ? `Clinic: ${form.treatingDoctorClinic}` : ''}

${form.additionalNotes ? `Notes:\n${form.additionalNotes}` : ''}

Case ID: ${caseId}
        `.trim(),
        email: form.workerEmail,
        priority: form.priority === 'urgent' ? 4 : form.priority === 'high' ? 3 : form.priority === 'medium' ? 2 : 1,
        tags: ['new_claim', form.injuryType.toLowerCase()],
        custom_fields: {
          cf_workers_name: form.workerLastName,
          cf_worker_first_name: form.workerFirstName,
          cf_injury_date: form.dateOfInjury,
        },
      };

      const ticket = await freshdesk.createTicket(ticketInput);
      freshdeskTicketId = ticket.id;
      workerCase.ticketIds = [`FD-${ticket.id}`];
    } catch (error) {
      console.error('Failed to create Freshdesk ticket:', error);
      // Continue without Freshdesk ticket - not a fatal error
      validation.warnings.push({
        field: 'freshdesk',
        message: 'Failed to create Freshdesk ticket',
        suggestion: 'Manually create ticket in Freshdesk',
      });
    }
  }

  // Generate next steps and required documents
  const nextSteps = generateNextSteps(form);
  const requiredDocuments = [...injuryConfig.requiredDocs];

  return {
    success: true,
    caseId,
    freshdeskTicketId,
    validation,
    nextSteps,
    requiredDocuments,
    assignedTo: workerCase.owner,
  };
}

/**
 * Get intake form template with default values
 */
export function getIntakeFormTemplate(): Partial<ClaimsIntakeForm> {
  return {
    claimSource: 'portal',
    currentWorkStatus: 'off_work',
    priority: 'medium',
    supervisorNotified: false,
    hospitalVisit: false,
    incidentWitnessed: false,
  };
}

/**
 * Get required documents for an injury type
 */
export function getRequiredDocuments(injuryType: InjuryType): {
  required: string[];
  optional: string[];
} {
  const config = INJURY_TYPES[injuryType];
  if (!config) {
    return { required: ['Medical Certificate'], optional: [] };
  }
  return {
    required: [...config.requiredDocs],
    optional: [...config.optionalDocs],
  };
}
