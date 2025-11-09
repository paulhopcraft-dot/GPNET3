import type { WorkerCase, CompanyName, ComplianceIndicator, WorkStatus } from "@shared/schema";
import { isValidCompany, isLegitimateCase } from "@shared/schema";

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

  private calculateComplianceIndicator(ticket: FreshdeskTicket): "On track" | "At risk" | "Overdue" {
    if (!ticket.due_by) {
      return "On track";
    }

    const dueDate = new Date(ticket.due_by);
    const now = new Date();
    const daysUntilDue = Math.floor((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    if (daysUntilDue < 0) {
      return "Overdue";
    } else if (daysUntilDue <= 3) {
      return "At risk";
    } else {
      return "On track";
    }
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
        const companyNameMatch = ticket.description_text.match(/Company Name\s*([A-Za-z\s&]+?)(?:Age|$)/i);
        const basicCompanyMatch = ticket.description_text.match(/company:\s*([A-Za-z\s&]+?)(?:\n|$)/i);
        
        if (companyNameMatch) {
          companyName = companyNameMatch[1].trim();
        } else if (basicCompanyMatch) {
          companyName = basicCompanyMatch[1].trim();
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

      const dateOfInjury = ticket.custom_fields?.cf_injury_date 
        ? new Date(ticket.custom_fields.cf_injury_date)
        : new Date(ticket.created_at);

      const dueDate = ticket.due_by 
        ? new Date(ticket.due_by).toLocaleDateString()
        : "TBD";

      const compliance = this.calculateComplianceIndicator(ticket);
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
        const companyNameMatch = primaryTicket.description_text.match(/Company Name\s*([A-Za-z\s&]+?)(?:Age|$)/i);
        const basicCompanyMatch = primaryTicket.description_text.match(/company:\s*([A-Za-z\s&]+?)(?:\n|$)/i);
        
        if (companyNameMatch) {
          companyName = companyNameMatch[1].trim();
        } else if (basicCompanyMatch) {
          companyName = basicCompanyMatch[1].trim();
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

      const compliance = this.calculateComplianceIndicator(primaryTicket);
      const complianceIndicator: ComplianceIndicator = 
        compliance === "On track" ? "Low" :
        compliance === "At risk" ? "Medium" : "High";

      // Create combined summary mentioning multiple tickets if applicable
      let summary = primaryTicket.subject;
      if (ticketIds.length > 1) {
        summary = `${primaryTicket.subject} (${ticketIds.length} related tickets)`;
      }

      // Get the most recent updated_at timestamp from all merged tickets (already sorted by updated_at)
      const ticketLastUpdatedAt = primaryTicket.updated_at;

      // Build the case object first so we can validate it
      const caseData = {
        id: ticketIds[0], // Use first (most recent) ticket ID as primary ID
        workerName: displayName,
        company: companyName,
        dateOfInjury: dateOfInjury.toISOString().split('T')[0],
        riskLevel: this.mapPriorityToRiskLevel(primaryTicket.priority),
        workStatus: this.mapStatusToWorkStatus(primaryTicket.status),
        hasCertificate: !!primaryTicket.custom_fields?.cf_latest_medical_certificate || primaryTicket.tags?.includes('has_certificate') || false,
        certificateUrl: primaryTicket.custom_fields?.cf_latest_medical_certificate || primaryTicket.custom_fields?.cf_url || undefined,
        complianceIndicator,
        currentStatus: primaryTicket.custom_fields?.cf_check_status || primaryTicket.description_text || "Pending review",
        nextStep: primaryTicket.custom_fields?.cf_injury_and_action_plan || "Review case details",
        owner: primaryTicket.custom_fields?.cf_case_manager_name || primaryTicket.custom_fields?.cf_consultant || "CLC Team",
        dueDate,
        summary,
        ticketIds,
        ticketCount: ticketIds.length,
        ticketLastUpdatedAt,
        clcLastFollowUp: primaryTicket.custom_fields?.cf_full_medical_report_date || undefined,
        clcNextFollowUp: primaryTicket.custom_fields?.cf_valid_until || undefined,
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
}
