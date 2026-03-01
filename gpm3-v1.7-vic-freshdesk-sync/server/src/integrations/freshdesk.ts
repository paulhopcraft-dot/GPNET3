import 'dotenv/config';

function b64(input: string) {
  return Buffer.from(input).toString('base64');
}

const DOMAIN = process.env.FRESHDESK_DOMAIN || '';
const API_KEY = process.env.FRESHDESK_API_KEY || '';

if (!DOMAIN) console.warn('[freshdesk] FRESHDESK_DOMAIN not set');
if (!API_KEY) console.warn('[freshdesk] FRESHDESK_API_KEY not set');

const BASE = `https://${DOMAIN}/api/v2`;

const headers = () => ({
  'Authorization': `Basic ${b64(`${API_KEY}:X`)}`,
  'Content-Type': 'application/json',
  'Accept': 'application/json'
});

export type FreshdeskTicket = {
  id: number;
  subject: string;
  description_text?: string;
  status: number;
  priority: number;
  requester_id: number;
  created_at: string;
  updated_at: string;
  custom_fields?: Record<string, any>;
};

export type FreshdeskContact = {
  id: number;
  name?: string;
  email?: string;
};

export async function fetchTickets(params: Record<string, any> = {}): Promise<FreshdeskTicket[]> {
  const q = new URLSearchParams({ per_page: '50', order_by: 'updated_at', order_type: 'desc', ...params });
  const url = `${BASE}/tickets?${q.toString()}`;
  const res = await fetch(url, { headers: headers() });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`[freshdesk] tickets ${res.status}: ${txt}`);
  }
  return await res.json() as FreshdeskTicket[];
}

export async function fetchContact(id: number): Promise<FreshdeskContact | null> {
  const url = `${BASE}/contacts/${id}`;
  const res = await fetch(url, { headers: headers() });
  if (res.status === 404) return null;
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`[freshdesk] contact ${res.status}: ${txt}`);
  }
  return await res.json() as FreshdeskContact;
}
