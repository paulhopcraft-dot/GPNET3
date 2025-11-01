import type { WorkerCase, CompanyName, ComplianceIndicator, WorkStatus } from "@shared/schema";

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
      const response = await fetch(`${this.baseUrl}/tickets?per_page=100&include=description`, {
        headers: {
          'Authorization': this.getAuthHeader(),
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Freshdesk API error: ${response.status} ${response.statusText}`);
      }

      return await response.json();
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

  async transformTicketsToWorkerCases(tickets: FreshdeskTicket[]): Promise<Partial<WorkerCase>[]> {
    const workerCases: Partial<WorkerCase>[] = [];
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

    for (const ticket of tickets) {
      let companyName: CompanyName | string = "Unknown Company";
      
      if (ticket.company_id) {
        const company = companyCache.get(ticket.company_id);
        if (company) {
          // Use actual company name if it matches our valid companies, otherwise preserve the actual name
          if (validCompanies.includes(company.name as CompanyName)) {
            companyName = company.name as CompanyName;
          } else {
            // For companies outside the predefined list, still preserve the actual name
            // but we'll need to handle this in the database layer
            companyName = company.name;
          }
        }
      }

      const workerName = ticket.custom_fields?.cf_workers_name || 
                        ticket.custom_fields?.cf_worker_first_name ||
                        ticket.subject?.split('-')[0]?.trim() || 
                        ticket.subject;

      const dateOfInjury = ticket.custom_fields?.cf_injury_date 
        ? new Date(ticket.custom_fields.cf_injury_date)
        : new Date(ticket.created_at);

      const dueDate = ticket.due_by 
        ? new Date(ticket.due_by).toLocaleDateString()
        : "TBD";

      const compliance = this.calculateComplianceIndicator(ticket);
      const complianceIndicator: ComplianceIndicator = 
        compliance === "On track" ? "Low" :
        compliance === "At risk" ? "Medium" : "High";

      workerCases.push({
        id: `FD-${ticket.id}`,
        workerName,
        company: companyName,
        dateOfInjury: dateOfInjury.toISOString().split('T')[0],
        riskLevel: this.mapPriorityToRiskLevel(ticket.priority),
        workStatus: this.mapStatusToWorkStatus(ticket.status),
        hasCertificate: !!ticket.custom_fields?.cf_latest_medical_certificate || ticket.tags?.includes('has_certificate') || false,
        certificateUrl: ticket.custom_fields?.cf_latest_medical_certificate || ticket.custom_fields?.cf_url || undefined,
        complianceIndicator,
        currentStatus: ticket.custom_fields?.cf_check_status || ticket.description_text || "Pending review",
        nextStep: ticket.custom_fields?.cf_injury_and_action_plan || "Review case details",
        owner: ticket.custom_fields?.cf_case_manager_name || ticket.custom_fields?.cf_consultant || "CLC Team",
        dueDate,
        summary: ticket.subject,
        clcLastFollowUp: ticket.custom_fields?.cf_full_medical_report_date || undefined,
        clcNextFollowUp: ticket.custom_fields?.cf_valid_until || undefined,
      });
    }

    return workerCases;
  }
}
