import { db } from '../db/client.js';
import { cases, caseProgress } from '../db/schema.js';
import { fetchTickets, fetchContact, FreshdeskTicket } from '../integrations/freshdesk.js';
import { eq, asc } from 'drizzle-orm';

type Risk = 'Low'|'Medium'|'High';
type WorkStatus = 'Not working'|'Suitable duties'|'Full duties';

function inferWorkerName(ticket: FreshdeskTicket, requester?: {name?: string, email?: string}) {
  return requester?.name || (requester?.email ? requester.email.split('@')[0] : `Req${ticket.requester_id}`);
}

function inferEmployer(ticket: FreshdeskTicket) {
  const text = ticket.description_text || '';
  const m = text.match(/Employer\s*:\s*(.+)/i);
  return m ? m[1].trim().slice(0, 200) : 'Unknown Employer';
}

function mapStatusToWorkStatus(status: number): WorkStatus {
  if (status === 4 || status === 5) return 'Full duties';
  if (status === 3) return 'Suitable duties';
  return 'Not working';
}

function adjustRiskFromText(base: Risk, text: string): Risk {
  const t = text.toLowerCase();
  if (/(unresponsive|no contact|failed to attend|non-?compliance)/.test(t)) return 'High';
  if (/(certificate received|fit for dut(y|ies)|improved)/.test(t)) return base === 'High' ? 'Medium' : 'Low';
  return base;
}

function progressDeltaFromText(text: string): number {
  const t = text.toLowerCase();
  if (/(fit for dut(y|ies)|certificate received|upgrade duties)/.test(t)) return 10;
  if (/(review scheduled|rtw plan|physio|gp review)/.test(t)) return 5;
  if (/(unresponsive|no contact|failed to attend)/.test(t)) return -5;
  return 0;
}

export async function syncFreshdeskOnce() {
  const tickets = await fetchTickets({});
  let updated = 0, created = 0;

  for (const tk of tickets) {
    const contact = tk.requester_id ? await fetchContact(tk.requester_id) : null;
    const workerName = inferWorkerName(tk, contact || undefined);
    const employer = inferEmployer(tk);
    const workStatus = mapStatusToWorkStatus(tk.status);
    let risk: Risk = 'Medium';

    const exCase = (await db.select().from(cases).where(eq(cases.id, workerName))).at(0);
    if (exCase) risk = exCase.risk as Risk;

    const text = (tk.description_text || '') + ' ' + (tk.subject || '');
    risk = adjustRiskFromText(risk, text);

    if (exCase) {
      await db.update(cases).set({ employer, workStatus, risk }).where(eq(cases.id, workerName));
      updated++;
    } else {
      await db.insert(cases).values({
        id: workerName,
        workerName,
        employer,
        injuryDate: new Date().toISOString().slice(0,10),
        workStatus,
        risk,
        isWorkCover: true,
        expectedRecoveryDate: new Date(Date.now() + 1000*60*60*24*120).toISOString().slice(0,10)
      });
      created++;
    }

    const delta = progressDeltaFromText(text);
    if (delta !== 0) {
      const rows = await db.select().from(caseProgress).where(eq(caseProgress.caseId, workerName)).orderBy(asc(caseProgress.date));
      const last = rows.at(-1);
      const lastCap = last ? last.capacity : 0;
      const nextCap = Math.max(0, Math.min(100, lastCap + delta));
      await db.insert(caseProgress).values({
        caseId: workerName,
        date: new Date().toISOString().slice(0,10),
        capacity: nextCap
      });
    }
  }

  return { created, updated, total: tickets.length };
}

let timer: NodeJS.Timeout | null = null;

export function startFreshdeskScheduler() {
  const minutes = Number(process.env.FRESHDESK_SYNC_INTERVAL_MIN || 10);
  if (timer) clearInterval(timer);
  timer = setInterval(async () => {
    try {
      const res = await syncFreshdeskOnce();
      console.log(`[freshdesk-sync] OK created=${res.created} updated=${res.updated} total=${res.total}`);
    } catch (e) {
      console.error('[freshdesk-sync] error', e);
    }
  }, minutes * 60 * 1000);
  console.log(`[freshdesk-sync] scheduler started (every ${minutes} min)`);
}
