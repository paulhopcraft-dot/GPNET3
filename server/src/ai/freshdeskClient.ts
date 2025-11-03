// Freshdesk API client for AI features
export interface FreshdeskTicket {
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
  conversations?: Array<{
    body_text: string;
    created_at: string;
    user_id?: number;
  }>;
}

const domain = process.env.FRESHDESK_DOMAIN?.replace(/^https?:\/\//, '').replace(/\.freshdesk\.com.*$/, '');
const apiKey = process.env.FRESHDESK_API_KEY;
const baseUrl = domain ? `https://${domain}.freshdesk.com/api/v2` : '';

function getAuthHeader(): string {
  if (!apiKey) throw new Error('FRESHDESK_API_KEY not set');
  return 'Basic ' + Buffer.from(`${apiKey}:X`).toString('base64');
}

export async function getTicket(ticketId: number): Promise<FreshdeskTicket> {
  if (!baseUrl) throw new Error('FRESHDESK_DOMAIN not set');
  
  // Fetch ticket details
  const ticketResponse = await fetch(`${baseUrl}/tickets/${ticketId}`, {
    headers: {
      'Authorization': getAuthHeader(),
      'Content-Type': 'application/json'
    }
  });

  if (!ticketResponse.ok) {
    throw new Error(`Failed to fetch ticket ${ticketId}: ${ticketResponse.statusText}`);
  }

  const ticket: FreshdeskTicket = await ticketResponse.json();

  // Fetch conversations for the ticket
  try {
    const conversationsResponse = await fetch(`${baseUrl}/tickets/${ticketId}/conversations`, {
      headers: {
        'Authorization': getAuthHeader(),
        'Content-Type': 'application/json'
      }
    });

    if (conversationsResponse.ok) {
      ticket.conversations = await conversationsResponse.json();
    }
  } catch (err) {
    console.warn(`Could not fetch conversations for ticket ${ticketId}:`, err);
    ticket.conversations = [];
  }

  return ticket;
}
