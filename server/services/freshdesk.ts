import type { WorkerCase } from "@/shared/schema";

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
    const domain = process.env.FRESHDESK_DOMAIN;
    const apiKey = process.env.FRESHDESK_API_KEY;

    if (!domain || !apiKey) {
      throw new Error("FRESHDESK_DOMAIN and FRESHDESK_API_KEY must be set");
    }

    this.domain = domain;
    this.apiKey = apiKey;
    this.baseUrl = `https://${domain}.freshdesk.com/api/v2`;
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

  private mapStatusToWorkStatus(status: number): string {
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

    for (const ticket of tickets) {
      let companyName = "Unknown Company";
      
      if (ticket.company_id) {
        if (!companyCache.has(ticket.company_id)) {
          const company = await this.fetchCompany(ticket.company_id);
          companyCache.set(ticket.company_id, company);
        }
        const company = companyCache.get(ticket.company_id);
        if (company) {
          companyName = company.name;
        }
      }

      const workerName = ticket.custom_fields?.worker_name || 
                        ticket.subject?.split('-')[0]?.trim() || 
                        `Worker #${ticket.id}`;

      const dateOfInjury = ticket.custom_fields?.date_of_injury 
        ? new Date(ticket.custom_fields.date_of_injury)
        : new Date(ticket.created_at);

      const dueDate = ticket.due_by 
        ? new Date(ticket.due_by).toLocaleDateString()
        : "TBD";

      workerCases.push({
        id: `FD-${ticket.id}`,
        workerName,
        company: companyName,
        dateOfInjury,
        riskLevel: this.mapPriorityToRiskLevel(ticket.priority),
        workStatus: this.mapStatusToWorkStatus(ticket.status),
        hasCertificate: ticket.tags?.includes('has_certificate') || false,
        certificateUrl: ticket.custom_fields?.certificate_url || null,
        complianceIndicator: this.calculateComplianceIndicator(ticket),
        currentStatus: ticket.description_text || "No description",
        nextStep: ticket.custom_fields?.next_step || "Review case",
        owner: "CLC Team",
        dueDate,
        summary: ticket.subject,
        clcLastFollowUp: ticket.custom_fields?.last_follow_up || null,
        clcNextFollowUp: ticket.custom_fields?.next_follow_up || null,
        createdAt: new Date(ticket.created_at),
        updatedAt: new Date(ticket.updated_at)
      });
    }

    return workerCases;
  }
}
