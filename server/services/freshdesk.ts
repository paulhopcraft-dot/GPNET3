import type {
  WorkerCase,
  CompanyName,
  ComplianceIndicator,
  WorkStatus,
  CaseCompliance,
  MedicalCertificateInput,
  WorkCapacity,
} from "@shared/schema";
import { isValidCompany, isLegitimateCase } from "@shared/schema";
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';

// High-risk keyword patterns for email detection
const HIGH_RISK_KEYWORDS = [
  /\b(suicid|kill\s*my\s*self|end\s*(my|it\s*all)|don'?t\s*want\s*to\s*live)\b/i,
  /\b(threat|threaten|lawyer|legal\s*action|sue|court)\b/i,
  /\b(harass|discriminat|bully|hostile)\b/i,
  /\b(hopeless|worthless|can'?t\s*go\s*on|no\s*point)\b/i,
  /\b(extreme\s*pain|unbearable|agony|suffering)\b/i,
  /\b(not\s*coping|breakdown|crisis|emergency)\b/i,
  /\b(complaint|ombudsman|fair\s*work|worksafe)\b/i,
  /\b(unsafe|dangerous|injury\s*risk|hazard)\b/i,
];

// Bounce detection patterns
const BOUNCE_PATTERNS = [
  /delivery\s*(has\s*)?fail/i,
  /undeliverable/i,
  /mailbox\s*(not\s*found|unavailable)/i,
  /address\s*rejected/i,
  /user\s*unknown/i,
  /no\s*such\s*(user|address)/i,
  /message\s*not\s*delivered/i,
  /permanent\s*(failure|error)/i,
  /bounce/i,
];

export interface FreshdeskConversation {
  id: number;
  body: string;
  body_text: string;
  incoming: boolean;
  private: boolean;
  user_id: number;
  from_email: string;
  to_emails: string[];
  cc_emails: string[];
  created_at: string;
  attachments: FreshdeskAttachment[];
}

export interface CreateTicketInput {
  subject: string;
  description: string;
  email: string;
  priority?: 1 | 2 | 3 | 4; // 1=Low, 2=Medium, 3=High, 4=Urgent
  status?: 2 | 3 | 4 | 5; // 2=Open, 3=Pending, 4=Resolved, 5=Closed
  type?: string;
  tags?: string[];
  custom_fields?: Record<string, any>;
  cc_emails?: string[];
}

export interface ReplyToTicketInput {
  body: string;
  from_email?: string;
  cc_emails?: string[];
  bcc_emails?: string[];
  private_note?: boolean;
  user_id?: number;
}

export interface HighRiskDetection {
  isHighRisk: boolean;
  triggers: string[];
  severity: 'low' | 'medium' | 'high' | 'critical';
  recommendedAction: string;
}

export interface BounceDetection {
  isBounce: boolean;
  originalEmail?: string;
  bounceReason?: string;
}

export interface TicketMirrorResult {
  ticketId: number;
  caseId?: string;
  action: 'created' | 'updated' | 'replied' | 'synced';
  success: boolean;
  error?: string;
  highRiskDetection?: HighRiskDetection;
  bounceDetection?: BounceDetection;
}

interface FreshdeskAttachment {
  id: number;
  name: string;
  content_type: string;
  size: number;
  attachment_url: string;
  created_at: string;
}

interface FreshdeskTicket {
  id: number;
  subject: string;
  description_text: string;
  status: number;
  priority: number;
  custom_fields: Record<string, any>;
  tags: string[];
  created_at: string;
  updated_at: string;
  due_by?: string;
  responder_id?: number;
  company_id?: number;
  attachments?: FreshdeskAttachment[];
}

interface FreshdeskCompany {
  id: number;
  name: string;
}

interface FreshdeskContact {
  id: number;
  name: string;
  email: string;
}

// Enable dayjs UTC plugin
dayjs.extend(utc);

// Certificate file detection patterns
const CERTIFICATE_FILE_PATTERNS = [
  /medical.*cert/i,
  /cert.*medical/i,
  /workcover/i,
  /capacity.*cert/i,
  /fitness.*work/i,
  /med.*report/i,
  /doctor.*letter/i,
  /gp.*cert/i,
];

const CERTIFICATE_CONTENT_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/tiff',
];

// Medical restriction keywords for extraction
const RESTRICTION_PATTERNS: { pattern: RegExp; category: string }[] = [
  { pattern: /no\s+(heavy\s+)?lifting/i, category: 'lifting' },
  { pattern: /lifting\s+restrict/i, category: 'lifting' },
  { pattern: /max(imum)?\s+(\d+)\s*(kg|kilos?|pounds?|lbs?)/i, category: 'lifting' },
  { pattern: /no\s+bending/i, category: 'bending' },
  { pattern: /avoid\s+bending/i, category: 'bending' },
  { pattern: /no\s+twisting/i, category: 'twisting' },
  { pattern: /no\s+repetitive/i, category: 'repetitive' },
  { pattern: /sit.?stand.*rotation/i, category: 'posture' },
  { pattern: /alternate.*sitting.*standing/i, category: 'posture' },
  { pattern: /desk.?based/i, category: 'duties' },
  { pattern: /light\s+duties/i, category: 'duties' },
  { pattern: /modified\s+duties/i, category: 'duties' },
  { pattern: /no\s+driving/i, category: 'driving' },
  { pattern: /avoid\s+driving/i, category: 'driving' },
  { pattern: /no\s+climbing/i, category: 'climbing' },
  { pattern: /avoid\s+heights/i, category: 'climbing' },
  { pattern: /reduced\s+hours/i, category: 'hours' },
  { pattern: /(\d+)\s*hours?\s*(per\s*)?(day|week)/i, category: 'hours' },
  { pattern: /avoid\s+(prolonged\s+)?(standing|sitting)/i, category: 'posture' },
  { pattern: /no\s+overtime/i, category: 'hours' },
  { pattern: /stress\s+leave/i, category: 'psychological' },
  { pattern: /gradual\s+return/i, category: 'graduated' },
  { pattern: /phased\s+return/i, category: 'graduated' },
];

/**
 * Check if an attachment appears to be a medical certificate
 */
function isCertificateAttachment(attachment: FreshdeskAttachment): boolean {
  // Check content type
  if (!CERTIFICATE_CONTENT_TYPES.includes(attachment.content_type)) {
    return false;
  }

  // Check filename patterns
  const filename = attachment.name.toLowerCase();
  return CERTIFICATE_FILE_PATTERNS.some(pattern => pattern.test(filename));
}

/**
 * Extract medical restrictions from text
 */
function extractRestrictions(text: string): string[] {
  if (!text) return [];

  const restrictions: string[] = [];
  const seen = new Set<string>();

  for (const { pattern, category } of RESTRICTION_PATTERNS) {
    const match = text.match(pattern);
    if (match && !seen.has(category)) {
      restrictions.push(match[0].trim());
      seen.add(category);
    }
  }

  return restrictions;
}

/**
 * Extract diagnosis keywords from text
 */
function extractDiagnosis(text: string): string | undefined {
  if (!text) return undefined;

  const diagnosisPatterns = [
    /diagnosis[:\s]+([^.\n]+)/i,
    /condition[:\s]+([^.\n]+)/i,
    /injury[:\s]+([^.\n]+)/i,
    /(lower\s+back|lumbar|cervical|shoulder|knee|ankle|wrist|hand)\s+(strain|sprain|injury|pain)/i,
    /(ptsd|anxiety|depression|stress)/i,
    /(fracture|tear|rupture)/i,
  ];

  for (const pattern of diagnosisPatterns) {
    const match = text.match(pattern);
    if (match) {
      return match[1]?.trim() || match[0].trim();
    }
  }

  return undefined;
}

/**
 * Find certificate attachments from a ticket
 */
function findCertificateAttachments(ticket: FreshdeskTicket): FreshdeskAttachment[] {
  if (!ticket.attachments || ticket.attachments.length === 0) {
    return [];
  }
  return ticket.attachments.filter(isCertificateAttachment);
}

export class FreshdeskService {
  private domain: string;
  private apiKey: string;
  private baseUrl: string;

  constructor() {
    let domain = process.env.FRESHDESK_DOMAIN;
    const apiKey = process.env.FRESHDESK_API_KEY;

    if (!domain || !apiKey) {
      throw new Error("FRESHDESK_DOMAIN and FRESHDESK_API_KEY must be set");
    }

    // Clean up domain - remove protocol and .freshdesk.com suffix if present
    domain = domain.replace(/^https?:\/\//, '');
    domain = domain.replace(/\.freshdesk\.com.*$/, '');

    this.domain = domain;
    this.apiKey = apiKey;
    this.baseUrl = `https://${domain}.freshdesk.com/api/v2`;
    
    console.log(`Freshdesk service initialized with domain: ${this.domain}`);
  }

  private getAuthHeader(): string {
    return 'Basic ' + Buffer.from(`${this.apiKey}:X`).toString('base64');
  }

  async fetchTickets(): Promise<FreshdeskTicket[]> {
    try {
      // Fetch tickets from the past 6 months (includes both open and closed)
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
      const dateFilter = sixMonthsAgo.toISOString();
      
      let allTickets: FreshdeskTicket[] = [];
      let page = 1;
      const perPage = 100;
      
      console.log(`Fetching tickets updated since ${dateFilter}...`);
      
      while (true) {
        const response = await fetch(
          `${this.baseUrl}/tickets?per_page=${perPage}&page=${page}&include=description&updated_since=${dateFilter}`, 
          {
            headers: {
              'Authorization': this.getAuthHeader(),
              'Content-Type': 'application/json'
            }
          }
        );

        if (!response.ok) {
          throw new Error(`Freshdesk API error: ${response.status} ${response.statusText}`);
        }

        const tickets: FreshdeskTicket[] = await response.json();
        
        if (tickets.length === 0) {
          break; // No more tickets
        }
        
        allTickets.push(...tickets);
        console.log(`Fetched page ${page}: ${tickets.length} tickets (total: ${allTickets.length})`);
        
        if (tickets.length < perPage) {
          break; // Last page
        }
        
        page++;
      }
      
      console.log(`Total tickets fetched: ${allTickets.length}`);
      return allTickets;
    } catch (error) {
      console.error('Error fetching Freshdesk tickets:', error);
      throw error;
    }
  }

  async fetchCompany(companyId: number): Promise<FreshdeskCompany | null> {
    try {
      const response = await fetch(`${this.baseUrl}/companies/${companyId}`, {
        headers: {
          'Authorization': this.getAuthHeader(),
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        return null;
      }

      return await response.json();
    } catch (error) {
      console.error(`Error fetching company ${companyId}:`, error);
      return null;
    }
  }

  async fetchContact(contactId: number): Promise<FreshdeskContact | null> {
    try {
      const response = await fetch(`${this.baseUrl}/contacts/${contactId}`, {
        headers: {
          'Authorization': this.getAuthHeader(),
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        return null;
      }

      return await response.json();
    } catch (error) {
      console.error(`Error fetching contact ${contactId}:`, error);
      return null;
    }
  }

  private mapStatusToWorkStatus(status: number): WorkStatus {
    // Freshdesk status codes: 2=Open, 3=Pending, 4=Resolved, 5=Closed
    switch (status) {
      case 4: // Resolved
      case 5: // Closed
        return "At work";
      default:
        return "Off work";
    }
  }

  private mapPriorityToRiskLevel(priority: number): "High" | "Medium" | "Low" {
    // Freshdesk priority: 1=Low, 2=Medium, 3=High, 4=Urgent
    switch (priority) {
      case 4:
      case 3:
        return "High";
      case 2:
        return "Medium";
      default:
        return "Low";
    }
  }

  /**
   * Compliance rules:
   * - Resolved/closed tickets are automatically Very High.
   * - Default to High when there are no overdue deadlines.
   * - Medium when a follow-up/certificate is due within 7 days, there is no
   *   current certificate, or the case has gone stale (>30 days without updates).
   * - Low when a clear deadline is overdue by up to 1 week.
   * - Very Low when a deadline is overdue by more than 1 week.
   */
  private calculateComplianceIndicator(ticket: FreshdeskTicket): CaseCompliance {
    const now = dayjs().utc();
    const today = now.startOf("day");
    const dueDate = ticket.due_by ? dayjs(ticket.due_by).utc() : null;
    const nextCertificate = ticket.custom_fields?.cf_valid_until
      ? dayjs(ticket.custom_fields.cf_valid_until).utc()
      : null;
    const lastCertificate = ticket.custom_fields?.cf_full_medical_report_date
      ? dayjs(ticket.custom_fields.cf_full_medical_report_date).utc()
      : null;
    const hasCurrentCertificate =
      Boolean(ticket.custom_fields?.cf_latest_medical_certificate) ||
      ticket.tags?.includes("has_certificate") ||
      false;
    const lastUpdated = ticket.updated_at ? dayjs(ticket.updated_at).utc() : null;

    const deadlines = [
      dueDate
        ? { kind: "followUp" as const, label: "Case follow-up", date: dueDate }
        : null,
      nextCertificate
        ? { kind: "certificate" as const, label: "Medical certificate", date: nextCertificate }
        : null,
    ].filter(Boolean) as Array<{
      kind: "followUp" | "certificate";
      label: string;
      date: dayjs.Dayjs;
    }>;

    const diffInDays = (date: dayjs.Dayjs) => date.startOf("day").diff(today, "day");
    const formatDays = (days: number) => (days === 1 ? "1 day" : `${days} days`);
    const lastChecked = new Date().toISOString();

    if (ticket.status === 4 || ticket.status === 5) {
      return {
        indicator: "Very High",
        reason: "Ticket resolved or closed - no outstanding deadlines",
        source: "freshdesk",
        lastChecked,
      };
    }

    const annotatedDeadlines = deadlines.map((deadline) => ({
      ...deadline,
      diff: diffInDays(deadline.date),
    }));

    const overdueDeadlines = annotatedDeadlines
      .filter((deadline) => deadline.diff < 0)
      .sort((a, b) => a.diff - b.diff);

    if (overdueDeadlines.length > 0) {
      const worst = overdueDeadlines[0];
      const overdueDays = Math.abs(worst.diff);
      const indicator: ComplianceIndicator = overdueDays > 7 ? "Very Low" : "Low";
      return {
        indicator,
        reason: `${worst.label} overdue by ${formatDays(overdueDays)}`,
        source: "freshdesk",
        lastChecked,
      };
    }

    const upcomingDeadlines = annotatedDeadlines
      .filter((deadline) => deadline.diff >= 0)
      .sort((a, b) => a.diff - b.diff);

    if (upcomingDeadlines.length > 0) {
      const next = upcomingDeadlines[0];
      const diff = next.diff;
      let indicator: ComplianceIndicator = "High";
      let reason: string;

      if (diff <= 2) {
        indicator = "Medium";
        reason = `${next.label} due ${diff === 0 ? "today" : `in ${formatDays(diff)}`}`;
      } else if (diff <= 7) {
        indicator = "Medium";
        reason = `${next.label} coming up in ${formatDays(diff)}`;
      } else if (diff >= 14) {
        indicator = "Very High";
        reason = `${next.label} not due for ${formatDays(diff)}`;
      } else {
        indicator = "High";
        reason = `${next.label} due in ${formatDays(diff)}`;
      }

      return {
        indicator,
        reason,
        source: "freshdesk",
        lastChecked,
      };
    }

    if (!hasCurrentCertificate) {
      return {
        indicator: "Medium",
        reason: "No current medical certificate on file",
        source: "freshdesk",
        lastChecked,
      };
    }

    if (lastCertificate) {
      const age = today.diff(lastCertificate.startOf("day"), "day");
      if (age > 35) {
        return {
          indicator: "Medium",
          reason: `Latest certificate is ${formatDays(age)} old`,
          source: "freshdesk",
          lastChecked,
        };
      }
    }

    if (lastUpdated) {
      const idleDays = now.diff(lastUpdated, "day");
      if (idleDays > 30) {
        return {
          indicator: "Medium",
          reason: `No ticket updates in ${formatDays(idleDays)} - follow up recommended`,
          source: "freshdesk",
          lastChecked,
        };
      }
    }

    return {
      indicator: "High",
      reason: "No deadlines recorded and certificate details current",
      source: "freshdesk",
      lastChecked,
    };
  }

  private determineNextStep(ticket: FreshdeskTicket, workStatus: WorkStatus): string {
    // If there's a custom action plan, use that
    if (ticket.custom_fields?.cf_injury_and_action_plan?.trim()) {
      return ticket.custom_fields.cf_injury_and_action_plan.trim();
    }

    // Determine next step based on ticket status and context
    const status = ticket.status;
    const priority = ticket.priority;
    const hasCertificate = !!ticket.custom_fields?.cf_latest_medical_certificate;

    // Status codes: 2=Open, 3=Pending, 4=Resolved, 5=Closed
    switch (status) {
      case 2: // Open
        if (priority >= 3) {
          return "Urgent: Contact worker and obtain medical certificate";
        }
        if (!hasCertificate) {
          return "Request updated medical certificate from worker";
        }
        return "Contact worker to assess current status";

      case 3: // Pending
        if (!hasCertificate) {
          return "Follow up with worker for medical documentation";
        }
        return "Awaiting worker response - follow up if no reply within 48 hours";

      case 4: // Resolved
      case 5: // Closed
        if (workStatus === "At work") {
          return "Monitor return to work progress";
        }
        return "Case resolved - archive documentation";

      default:
        return "Review case and determine appropriate action";
    }
  }

  private deriveCapacityFromTicket(
    ticket: FreshdeskTicket,
    fallbackWorkStatus: WorkStatus,
  ): WorkCapacity {
    const haystack = [
      ticket.custom_fields?.cf_check_status,
      ticket.description_text,
      ticket.subject,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    if (/fit for full|full dut(y|ies)|100% capacity|cleared full duty/.test(haystack)) {
      return "fit";
    }
    if (/(modified dut|partial capacity|light dut|reduced capacity)/.test(haystack)) {
      return "partial";
    }
    if (/(no capacity|unfit|not fit|0% capacity|completely unfit)/.test(haystack)) {
      return "unfit";
    }

    // Fall back to case work status
    if (fallbackWorkStatus === "At work") {
      return "partial";
    }
    if (fallbackWorkStatus === "Off work") {
      return "unfit";
    }

    return "unknown";
  }

  private extractCertificateFromTicket(
    ticket: FreshdeskTicket,
    fallbackWorkStatus: WorkStatus,
  ): MedicalCertificateInput | null {
    const issueDateRaw =
      ticket.custom_fields?.cf_full_medical_report_date ||
      ticket.custom_fields?.cf_valid_until ||
      ticket.updated_at ||
      ticket.created_at;

    if (!issueDateRaw) {
      return null;
    }

    const issue = dayjs(issueDateRaw);
    if (!issue.isValid()) {
      return null;
    }

    const startRaw = ticket.custom_fields?.cf_full_medical_report_date || issueDateRaw;
    const endRaw = ticket.custom_fields?.cf_valid_until || startRaw;
    const start = dayjs(startRaw);
    const end = dayjs(endRaw);

    if (!start.isValid() || !end.isValid()) {
      return null;
    }

    const capacity = this.deriveCapacityFromTicket(ticket, fallbackWorkStatus);

    return {
      issueDate: issue.toISOString(),
      startDate: start.toISOString(),
      endDate: end.toISOString(),
      capacity,
      notes: ticket.custom_fields?.cf_check_status || undefined,
      source: "freshdesk",
      documentUrl:
        ticket.custom_fields?.cf_latest_medical_certificate ||
        ticket.custom_fields?.cf_url ||
        undefined,
      sourceReference: ticket.id ? `ticket:${ticket.id}` : undefined,
    };
  }

  private extractCertificateHistory(
    tickets: FreshdeskTicket[],
    caseDefaultWorkStatus: WorkStatus,
  ): MedicalCertificateInput[] {
    const deduped = new Map<string, MedicalCertificateInput>();

    for (const ticket of tickets) {
      const perTicketStatus = this.mapStatusToWorkStatus(ticket.status);
      const certificate = this.extractCertificateFromTicket(
        ticket,
        perTicketStatus || caseDefaultWorkStatus,
      );
      if (!certificate) {
        continue;
      }
      const key = `${certificate.startDate}-${certificate.endDate}-${certificate.capacity}`;
      if (!deduped.has(key)) {
        deduped.set(key, certificate);
      }
    }

    return Array.from(deduped.values()).sort(
      (a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime(),
    );
  }

  private normalizeWorkerName(name: string): string {
    // Remove common prefixes/noise
    let normalized = name.toLowerCase().trim();
    
    // Remove FW:, RE: prefixes
    normalized = normalized.replace(/^(fw|re):\s*/i, '');
    
    // Extract name from patterns like "MARIO SIKETA, Primary Claim - 09250033555"
    const claimPattern = /^([a-z\s]+),\s*primary\s+claim/i;
    const claimMatch = normalized.match(claimPattern);
    if (claimMatch) {
      normalized = claimMatch[1].trim();
    }
    
    // Special handling for known workers
    if ((normalized.includes('jacob') || normalized.includes('pat')) && normalized.includes('gunn')) {
      return 'jacob gunn';
    }
    
    if (normalized === 'gunn' || normalized.match(/^gunn\s*$/)) {
      return 'jacob gunn';
    }
    
    if (normalized.includes('siketa')) {
      if (normalized.includes('mario') || normalized === 'siketa') {
        return 'mario siketa';
      }
    }
    
    // Remove middle names and extra spaces (keep first and last name only)
    const words = normalized.split(/\s+/).filter(w => w.length > 0 && w.length > 1);
    if (words.length > 2) {
      // Keep first and last word only
      return `${words[0]} ${words[words.length - 1]}`;
    }
    
    return words.join(' ');
  }

  private extractCompanyFromDescription(descriptionText: string, knownCompanies: CompanyName[]): string | null {
    if (!descriptionText) {
      return null;
    }

    const text = descriptionText.toLowerCase();

    // Layer 1: Structured form patterns (with permissive character classes including apostrophes)
    const structuredPatterns = [
      /company\s*name[:\s]*([a-z0-9\s&\/.\-()'+]+?)(?:\s*(?:age|date|email|phone|address|abn|acn|contact|\n|$))/i,
      /company:\s*([a-z0-9\s&\/.\-()'+]+?)(?:\s*(?:age|date|email|phone|address|abn|acn|contact|\n|,|$))/i,
      /employer:\s*([a-z0-9\s&\/.\-()'+]+?)(?:\s*(?:age|date|email|phone|address|abn|acn|contact|\n|,|$))/i,
    ];

    for (const pattern of structuredPatterns) {
      const match = descriptionText.match(pattern);
      if (match) {
        const extracted = match[1].trim();
        const normalized = this.normalizeCompanyName(extracted, knownCompanies);
        if (normalized) return normalized;
      }
    }

    // Layer 2: Narrative phrase detectors (case-insensitive keywords, requires capitalized company names)
    const narrativePatterns = [
      /(?:[Ii]nsurer|[Pp]rovider|[Ww]orkcover)\s+(?:for|on behalf of)\s+([A-Z][a-zA-Z0-9\s&\/.\-()'+]+?)(?:\s*(?:[Pp]\/[Ll]|[Pp]ty|[Gg]roup|[Ll]imited|[Ll]td|,|\.|to conduct|$))/,
    ];

    for (const pattern of narrativePatterns) {
      const match = descriptionText.match(pattern);
      if (match) {
        const extracted = match[1].trim();
        const normalized = this.normalizeCompanyName(extracted, knownCompanies);
        if (normalized) return normalized;
      }
    }

    // Layer 3: Direct substring matching against known companies
    for (const company of knownCompanies) {
      const companyLower = company.toLowerCase();
      if (text.includes(companyLower)) {
        return company;
      }
    }

    return null;
  }

  private normalizeCompanyName(extractedName: string, knownCompanies: CompanyName[]): string | null {
    if (!extractedName) {
      return null;
    }

    // Clean and normalize: lowercase, trim, strip punctuation and common suffixes
    const cleaned = extractedName
      .toLowerCase()
      .trim()
      .replace(/\s+(p\/l|pty|ltd|limited|group|human resources|hr|inc|corp|corporation|llc).*$/i, '')
      .replace(/[\/\-()]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    // Map to canonical company names (fuzzy match after normalization)
    for (const company of knownCompanies) {
      const companyNormalized = company
        .toLowerCase()
        .replace(/[\/\-()]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
      
      if (cleaned.includes(companyNormalized) || companyNormalized.includes(cleaned)) {
        return company;
      }
    }

    // If no canonical match but we have a reasonable company name, return the cleaned version
    // with proper title casing
    if (cleaned.length > 2) {
      return extractedName
        .replace(/\s+(p\/l|pty|ltd|limited|group|human resources|hr|inc|corp|corporation|llc).*$/i, '')
        .split(/\s+/)
        .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(' ')
        .trim();
    }

    return null;
  }

  async transformTicketsToWorkerCases(tickets: FreshdeskTicket[]): Promise<Partial<WorkerCase>[]> {
    const companyCache = new Map<number, FreshdeskCompany | null>();
    const validCompanies: CompanyName[] = ["Symmetry", "Allied Health", "Apex Labour", "SafeWorks", "Core Industrial"];

    // Batch fetch all unique company IDs in parallel
    const uniqueCompanyIds = Array.from(new Set(tickets.map(t => t.company_id).filter(id => id != null))) as number[];
    await Promise.all(
      uniqueCompanyIds.map(async (companyId) => {
        const company = await this.fetchCompany(companyId);
        companyCache.set(companyId, company);
      })
    );

    // Group tickets by worker name
    const workerTicketsMap = new Map<string, FreshdeskTicket[]>();

    for (const ticket of tickets) {
      // Skip webhook error messages and system notifications
      if (ticket.subject?.includes('webhook settings') || 
          ticket.subject?.includes('Please recheck') ||
          ticket.description_text?.includes('Automation rule you configured')) {
        continue;
      }

      let companyName: CompanyName | string = "Unknown Company";
      
      if (ticket.company_id) {
        const company = companyCache.get(ticket.company_id);
        if (company) {
          // Use actual company name if it matches our valid companies, otherwise preserve the actual name
          if (validCompanies.includes(company.name as CompanyName)) {
            companyName = company.name as CompanyName;
          } else {
            // For companies outside the predefined list, still preserve the actual name
            companyName = company.name;
          }
        }
      }
      
      // Try to extract company from description if not set via company_id
      if (companyName === "Unknown Company" && ticket.description_text) {
        const extracted = this.extractCompanyFromDescription(ticket.description_text, validCompanies);
        if (extracted) {
          companyName = extracted;
        }
      }

      // Extract worker name from various sources
      // Combine first and last name if both are present
      let workerName = '';
      if (ticket.custom_fields?.cf_worker_first_name && ticket.custom_fields?.cf_workers_name) {
        workerName = `${ticket.custom_fields.cf_worker_first_name} ${ticket.custom_fields.cf_workers_name}`;
      } else if (ticket.custom_fields?.cf_workers_name) {
        workerName = ticket.custom_fields.cf_workers_name;
      } else if (ticket.custom_fields?.cf_worker_first_name) {
        workerName = ticket.custom_fields.cf_worker_first_name;
      }
      
      // Try to extract from description for form submissions
      if (!workerName && ticket.description_text) {
        const fullNameMatch = ticket.description_text.match(/Full Name\s*([A-Za-z\s]+?)(?:Your email|$)/i);
        const basicNameMatch = ticket.description_text.match(/name:\s*([A-Za-z\s]+?)(?:\n|$)/i);
        
        if (fullNameMatch) {
          workerName = fullNameMatch[1].trim();
        } else if (basicNameMatch) {
          workerName = basicNameMatch[1].trim();
        }
      }
      
      // Try to extract from subject line (e.g., "Cobild-New Starter Check-Oliver Smith")
      if (!workerName && ticket.subject) {
        // Special case: Extract name from IME/DXC appointment notifications
        const imeMatch = ticket.subject.match(/re\s+([A-Z\s]+),\s+Primary/i);
        if (imeMatch) {
          workerName = imeMatch[1].trim();
        } else {
          const subjectParts = ticket.subject.split('-');
          if (subjectParts.length >= 3) {
            workerName = subjectParts[subjectParts.length - 1].trim();
          } else if (ticket.subject.toLowerCase().includes('gunn')) {
            workerName = 'Jacob Gunn';
          } else if (ticket.subject.toLowerCase().includes('barclay')) {
            workerName = 'Stuart Barclay';
          } else if (ticket.subject.toLowerCase().includes('siketa')) {
            workerName = 'Mario Siketa';
          }
        }
      }
      
      // Fallback to subject
      if (!workerName) {
        workerName = ticket.subject || `Worker #${ticket.id}`;
      }

      // Group tickets by worker name with smart normalization
      const normalizedWorkerName = this.normalizeWorkerName(workerName);
      if (!workerTicketsMap.has(normalizedWorkerName)) {
        workerTicketsMap.set(normalizedWorkerName, []);
      }
      workerTicketsMap.get(normalizedWorkerName)!.push(ticket);
    }

    // Now merge tickets for each worker into a single case
    const workerCases: Partial<WorkerCase>[] = [];
    
    for (const [normalizedName, ticketGroup] of Array.from(workerTicketsMap.entries())) {
      // Sort tickets by updated_at to get the most recent one first
      const sortedTickets = ticketGroup.sort((a: FreshdeskTicket, b: FreshdeskTicket) => 
        new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
      );
      
      const primaryTicket = sortedTickets[0]; // Most recent ticket
      const ticketIds = sortedTickets.map((t: FreshdeskTicket) => `FD-${t.id}`);
      
      // Get company name (prefer from most recent ticket)
      let companyName: CompanyName | string = "Unknown Company";
      if (primaryTicket.company_id) {
        const company = companyCache.get(primaryTicket.company_id);
        if (company) {
          if (validCompanies.includes(company.name as CompanyName)) {
            companyName = company.name as CompanyName;
          } else {
            companyName = company.name;
          }
        }
      }
      
      if (companyName === "Unknown Company" && primaryTicket.description_text) {
        const extracted = this.extractCompanyFromDescription(primaryTicket.description_text, validCompanies);
        if (extracted) {
          companyName = extracted;
        }
      }

      // Extract worker name from primary ticket (combine first and last name)
      let workerName = '';
      if (primaryTicket.custom_fields?.cf_worker_first_name && primaryTicket.custom_fields?.cf_workers_name) {
        workerName = `${primaryTicket.custom_fields.cf_worker_first_name} ${primaryTicket.custom_fields.cf_workers_name}`;
      } else if (primaryTicket.custom_fields?.cf_workers_name) {
        workerName = primaryTicket.custom_fields.cf_workers_name;
      } else if (primaryTicket.custom_fields?.cf_worker_first_name) {
        workerName = primaryTicket.custom_fields.cf_worker_first_name;
      }
      
      if (!workerName && primaryTicket.description_text) {
        const fullNameMatch = primaryTicket.description_text.match(/Full Name\s*([A-Za-z\s]+?)(?:Your email|$)/i);
        const basicNameMatch = primaryTicket.description_text.match(/name:\s*([A-Za-z\s]+?)(?:\n|$)/i);
        
        if (fullNameMatch) {
          workerName = fullNameMatch[1].trim();
        } else if (basicNameMatch) {
          workerName = basicNameMatch[1].trim();
        }
      }
      
      if (!workerName && primaryTicket.subject) {
        // Special case: Extract name from IME/DXC appointment notifications
        const imeMatch = primaryTicket.subject.match(/re\s+([A-Z\s]+),\s+Primary/i);
        if (imeMatch) {
          workerName = imeMatch[1].trim();
        } else {
          const subjectParts = primaryTicket.subject.split('-');
          if (subjectParts.length >= 3) {
            workerName = subjectParts[subjectParts.length - 1].trim();
          } else if (primaryTicket.subject.toLowerCase().includes('gunn')) {
            workerName = 'Jacob Gunn';
          } else if (primaryTicket.subject.toLowerCase().includes('barclay')) {
            workerName = 'Stuart Barclay';
          } else if (primaryTicket.subject.toLowerCase().includes('siketa')) {
            workerName = 'Mario Siketa';
          }
        }
      }
      
      if (!workerName) {
        workerName = primaryTicket.subject || `Worker #${primaryTicket.id}`;
      }

      // Clean up the worker name for display (proper capitalization)
      const normalizedName = this.normalizeWorkerName(workerName);
      const displayName = normalizedName
        .split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');

      // Validate and parse date of injury with fallback
      let dateOfInjury: Date;
      if (primaryTicket.custom_fields?.cf_injury_date) {
        dateOfInjury = new Date(primaryTicket.custom_fields.cf_injury_date);
        if (isNaN(dateOfInjury.getTime())) {
          dateOfInjury = new Date(primaryTicket.created_at);
        }
      } else {
        dateOfInjury = new Date(primaryTicket.created_at);
      }

      // Validate due date
      let dueDate = "TBD";
      if (primaryTicket.due_by) {
        const dueDateObj = new Date(primaryTicket.due_by);
        if (!isNaN(dueDateObj.getTime())) {
          dueDate = dueDateObj.toLocaleDateString();
        }
      }

      // Calculate full compliance object
      const compliance = this.calculateComplianceIndicator(primaryTicket);

      // Create combined summary mentioning multiple tickets if applicable
      let summary = primaryTicket.subject;
      if (ticketIds.length > 1) {
        summary = `${primaryTicket.subject} (${ticketIds.length} related tickets)`;
      }

      // Get the most recent updated_at timestamp from all merged tickets (already sorted by updated_at)
      const ticketLastUpdatedAt = primaryTicket.updated_at;

      // Determine work status first so we can use it in next step determination
      const workStatus = this.mapStatusToWorkStatus(primaryTicket.status);
      const certificateHistory = this.extractCertificateHistory(sortedTickets, workStatus);
      const latestCertificate = certificateHistory[certificateHistory.length - 1];
      const hasCertificateFlag =
        !!primaryTicket.custom_fields?.cf_latest_medical_certificate ||
        primaryTicket.tags?.includes('has_certificate') ||
        certificateHistory.length > 0 ||
        false;
      const certificateUrl =
        latestCertificate?.documentUrl ||
        primaryTicket.custom_fields?.cf_latest_medical_certificate ||
        primaryTicket.custom_fields?.cf_url ||
        undefined;

      // Build the case object first so we can validate it
      const caseData = {
        id: ticketIds[0], // Use first (most recent) ticket ID as primary ID
        workerName: displayName,
        company: companyName,
        dateOfInjury: dateOfInjury.toISOString().split('T')[0],
        riskLevel: this.mapPriorityToRiskLevel(primaryTicket.priority),
        workStatus,
        hasCertificate: hasCertificateFlag,
        certificateUrl,
        complianceIndicator: compliance.indicator, // Legacy field - extract from compliance object
        compliance, // New structured compliance object
        currentStatus: primaryTicket.custom_fields?.cf_check_status || primaryTicket.description_text || "Pending review",
        nextStep: this.determineNextStep(primaryTicket, workStatus),
        owner: primaryTicket.custom_fields?.cf_case_manager_name || primaryTicket.custom_fields?.cf_consultant || "CLC Team",
        dueDate,
        summary,
        ticketIds,
        ticketCount: ticketIds.length,
        ticketLastUpdatedAt,
        clcLastFollowUp: primaryTicket.custom_fields?.cf_full_medical_report_date || undefined,
        clcNextFollowUp: primaryTicket.custom_fields?.cf_valid_until || undefined,
        certificateHistory,
      };

      // Skip if not a legitimate worker injury case (filters out generic emails, claims without names, etc.)
      if (!isLegitimateCase(caseData)) {
        console.warn(`[Freshdesk Sync] Skipping non-case email: Ticket=${ticketIds[0]}, Worker="${displayName}", Company="${companyName}"`);
        continue;
      }

      workerCases.push(caseData);
    }

    return workerCases;
  }

  /**
   * Detect high-risk language in text content
   */
  detectHighRisk(text: string): HighRiskDetection {
    if (!text) {
      return {
        isHighRisk: false,
        triggers: [],
        severity: 'low',
        recommendedAction: 'No action required',
      };
    }

    const triggers: string[] = [];
    let maxSeverity: 'low' | 'medium' | 'high' | 'critical' = 'low';

    for (const pattern of HIGH_RISK_KEYWORDS) {
      const match = text.match(pattern);
      if (match) {
        triggers.push(match[0]);

        // Determine severity based on keyword type
        if (/suicid|kill\s*my\s*self|end\s*(my|it\s*all)/i.test(match[0])) {
          maxSeverity = 'critical';
        } else if (/threat|lawyer|legal|harass|discriminat/i.test(match[0])) {
          if (maxSeverity !== 'critical') maxSeverity = 'high';
        } else if (/hopeless|worthless|crisis|emergency|breakdown/i.test(match[0])) {
          if (maxSeverity !== 'critical' && maxSeverity !== 'high') maxSeverity = 'high';
        } else {
          if (maxSeverity === 'low') maxSeverity = 'medium';
        }
      }
    }

    const isHighRisk = triggers.length > 0;
    let recommendedAction = 'No action required';

    if (maxSeverity === 'critical') {
      recommendedAction = 'IMMEDIATE: Contact worker immediately. Escalate to supervisor. Consider emergency services if appropriate.';
    } else if (maxSeverity === 'high') {
      recommendedAction = 'URGENT: Review case immediately. Contact worker within 24 hours. Document all communications.';
    } else if (maxSeverity === 'medium') {
      recommendedAction = 'Schedule follow-up with worker within 48 hours. Review case notes for context.';
    }

    return {
      isHighRisk,
      triggers,
      severity: maxSeverity,
      recommendedAction,
    };
  }

  /**
   * Detect bounced email notifications
   */
  detectBounce(text: string, subject: string): BounceDetection {
    const combinedText = `${subject} ${text}`;

    for (const pattern of BOUNCE_PATTERNS) {
      if (pattern.test(combinedText)) {
        // Try to extract original email address
        const emailMatch = text.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/);

        return {
          isBounce: true,
          originalEmail: emailMatch ? emailMatch[1] : undefined,
          bounceReason: pattern.source.replace(/\\s\*/g, ' ').replace(/[\\()]/g, ''),
        };
      }
    }

    return { isBounce: false };
  }

  /**
   * Create a new ticket in Freshdesk
   */
  async createTicket(input: CreateTicketInput): Promise<FreshdeskTicket> {
    const response = await fetch(`${this.baseUrl}/tickets`, {
      method: 'POST',
      headers: {
        'Authorization': this.getAuthHeader(),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        subject: input.subject,
        description: input.description,
        email: input.email,
        priority: input.priority || 1,
        status: input.status || 2,
        type: input.type,
        tags: input.tags,
        custom_fields: input.custom_fields,
        cc_emails: input.cc_emails,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to create Freshdesk ticket: ${response.status} - ${errorText}`);
    }

    return await response.json();
  }

  /**
   * Reply to an existing ticket
   */
  async replyToTicket(ticketId: number, input: ReplyToTicketInput): Promise<FreshdeskConversation> {
    const endpoint = input.private_note
      ? `${this.baseUrl}/tickets/${ticketId}/notes`
      : `${this.baseUrl}/tickets/${ticketId}/reply`;

    const body: any = {
      body: input.body,
    };

    if (!input.private_note) {
      if (input.from_email) body.from_email = input.from_email;
      if (input.cc_emails) body.cc_emails = input.cc_emails;
      if (input.bcc_emails) body.bcc_emails = input.bcc_emails;
    } else {
      body.private = true;
      if (input.user_id) body.user_id = input.user_id;
    }

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Authorization': this.getAuthHeader(),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to reply to ticket ${ticketId}: ${response.status} - ${errorText}`);
    }

    return await response.json();
  }

  /**
   * Get ticket by ID with full details
   */
  async getTicket(ticketId: number): Promise<FreshdeskTicket> {
    const response = await fetch(`${this.baseUrl}/tickets/${ticketId}?include=description`, {
      headers: {
        'Authorization': this.getAuthHeader(),
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch ticket ${ticketId}: ${response.status}`);
    }

    return await response.json();
  }

  /**
   * Get all conversations for a ticket
   */
  async getTicketConversations(ticketId: number): Promise<FreshdeskConversation[]> {
    const response = await fetch(`${this.baseUrl}/tickets/${ticketId}/conversations`, {
      headers: {
        'Authorization': this.getAuthHeader(),
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch conversations for ticket ${ticketId}: ${response.status}`);
    }

    return await response.json();
  }

  /**
   * Update ticket status
   */
  async updateTicketStatus(ticketId: number, status: 2 | 3 | 4 | 5): Promise<FreshdeskTicket> {
    const response = await fetch(`${this.baseUrl}/tickets/${ticketId}`, {
      method: 'PUT',
      headers: {
        'Authorization': this.getAuthHeader(),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ status }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to update ticket ${ticketId}: ${response.status} - ${errorText}`);
    }

    return await response.json();
  }

  /**
   * Update ticket priority
   */
  async updateTicketPriority(ticketId: number, priority: 1 | 2 | 3 | 4): Promise<FreshdeskTicket> {
    const response = await fetch(`${this.baseUrl}/tickets/${ticketId}`, {
      method: 'PUT',
      headers: {
        'Authorization': this.getAuthHeader(),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ priority }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to update ticket ${ticketId} priority: ${response.status} - ${errorText}`);
    }

    return await response.json();
  }

  /**
   * Process incoming webhook from Freshdesk
   */
  async processWebhook(payload: any): Promise<TicketMirrorResult> {
    const ticketId = payload.ticket_id || payload.id;
    if (!ticketId) {
      return {
        ticketId: 0,
        action: 'synced',
        success: false,
        error: 'No ticket ID in webhook payload',
      };
    }

    try {
      // Fetch full ticket details
      const ticket = await this.getTicket(ticketId);

      // Check for high-risk content
      const textToAnalyze = `${ticket.subject} ${ticket.description_text || ''}`;
      const highRiskDetection = this.detectHighRisk(textToAnalyze);

      // Check for bounce
      const bounceDetection = this.detectBounce(ticket.description_text || '', ticket.subject);

      // Transform to worker case
      const workerCases = await this.transformTicketsToWorkerCases([ticket]);
      const caseId = workerCases.length > 0 ? workerCases[0].id : undefined;

      // If high-risk, escalate priority
      if (highRiskDetection.severity === 'critical' || highRiskDetection.severity === 'high') {
        await this.updateTicketPriority(ticketId, 4); // Urgent
      }

      return {
        ticketId,
        caseId,
        action: payload.event_type === 'ticket_created' ? 'created' : 'updated',
        success: true,
        highRiskDetection: highRiskDetection.isHighRisk ? highRiskDetection : undefined,
        bounceDetection: bounceDetection.isBounce ? bounceDetection : undefined,
      };
    } catch (error) {
      return {
        ticketId,
        action: 'synced',
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Get tickets for a specific case by searching worker name
   */
  async getTicketsForCase(workerName: string): Promise<FreshdeskTicket[]> {
    try {
      // Search by worker name in custom fields
      const searchQuery = encodeURIComponent(`"${workerName}"`);
      const response = await fetch(`${this.baseUrl}/search/tickets?query=${searchQuery}`, {
        headers: {
          'Authorization': this.getAuthHeader(),
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        // Fallback to fetching all and filtering
        const allTickets = await this.fetchTickets();
        const normalizedSearch = this.normalizeWorkerName(workerName);
        return allTickets.filter(t => {
          const ticketWorkerName = t.custom_fields?.cf_workers_name || t.custom_fields?.cf_worker_first_name || t.subject;
          const normalizedTicket = this.normalizeWorkerName(ticketWorkerName || '');
          return normalizedTicket === normalizedSearch;
        });
      }

      const result = await response.json();
      return result.results || [];
    } catch (error) {
      console.error('Error searching tickets:', error);
      return [];
    }
  }

  /**
   * Get communication history for a case (all tickets and conversations)
   */
  async getCaseCommunicationHistory(workerName: string): Promise<{
    tickets: FreshdeskTicket[];
    conversations: Map<number, FreshdeskConversation[]>;
    timeline: Array<{
      date: string;
      type: 'ticket_created' | 'reply' | 'note' | 'status_change';
      ticketId: number;
      summary: string;
      incoming: boolean;
      highRisk?: HighRiskDetection;
    }>;
  }> {
    const tickets = await this.getTicketsForCase(workerName);
    const conversations = new Map<number, FreshdeskConversation[]>();
    const timeline: Array<{
      date: string;
      type: 'ticket_created' | 'reply' | 'note' | 'status_change';
      ticketId: number;
      summary: string;
      incoming: boolean;
      highRisk?: HighRiskDetection;
    }> = [];

    // Add ticket creation events
    for (const ticket of tickets) {
      const highRisk = this.detectHighRisk(`${ticket.subject} ${ticket.description_text || ''}`);
      timeline.push({
        date: ticket.created_at,
        type: 'ticket_created',
        ticketId: ticket.id,
        summary: ticket.subject,
        incoming: true,
        highRisk: highRisk.isHighRisk ? highRisk : undefined,
      });

      // Fetch conversations for each ticket
      try {
        const ticketConversations = await this.getTicketConversations(ticket.id);
        conversations.set(ticket.id, ticketConversations);

        // Add conversation events to timeline
        for (const conv of ticketConversations) {
          const convHighRisk = this.detectHighRisk(conv.body_text || conv.body);
          timeline.push({
            date: conv.created_at,
            type: conv.private ? 'note' : 'reply',
            ticketId: ticket.id,
            summary: (conv.body_text || conv.body).substring(0, 100) + '...',
            incoming: conv.incoming,
            highRisk: convHighRisk.isHighRisk ? convHighRisk : undefined,
          });
        }
      } catch (error) {
        console.error(`Error fetching conversations for ticket ${ticket.id}:`, error);
      }
    }

    // Sort timeline by date
    timeline.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    return { tickets, conversations, timeline };
  }
}
