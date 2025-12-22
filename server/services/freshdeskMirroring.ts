/**
 * Freshdesk Ticket Mirroring Service (PRD-7, PRD-3.6)
 *
 * Mirrors Freshdesk ticket data into GPNet as timeline evidence.
 * Per PRD-3.6: Original content preserved as evidence
 * Per PRD-3.3: Append-only, immutable, attributable
 *
 * Capabilities:
 * - Fetch and store ticket conversations
 * - Create timeline events from ticket updates
 * - Webhook handling for real-time sync
 */

import { storage } from "../storage";
import { logAuditEvent, AuditEventTypes } from "./auditLogger";

// Freshdesk API types
export interface FreshdeskConversation {
  id: number;
  body: string;
  body_text: string;
  incoming: boolean;
  to_emails: string[];
  from_email: string;
  cc_emails: string[];
  bcc_emails: string[];
  user_id: number;
  support_email: string | null;
  source: number; // 0=Reply, 1=Note, 2=Tweet, 5=Email, 7=WhatsApp
  created_at: string;
  updated_at: string;
  attachments: FreshdeskAttachment[];
}

export interface FreshdeskAttachment {
  id: number;
  name: string;
  content_type: string;
  size: number;
  attachment_url: string;
  created_at: string;
}

export interface FreshdeskWebhookPayload {
  freshdesk_webhook: {
    ticket_id: number;
    ticket_subject: string;
    ticket_status: number;
    ticket_priority: number;
    ticket_type: string | null;
    ticket_description: string;
    ticket_description_text: string;
    ticket_created_at: string;
    ticket_updated_at: string;
    ticket_due_by: string | null;
    ticket_tags: string[];
    ticket_custom_fields: Record<string, unknown>;
    triggered_event: string; // "ticket_created", "ticket_updated", "reply_added", etc.
    requester_name: string;
    requester_email: string;
    company_name: string | null;
  };
}

// Mirror result for logging
export interface MirrorResult {
  ticketId: number;
  caseId: string | null;
  conversationsMirrored: number;
  timelineEventsCreated: number;
  success: boolean;
  error?: string;
}

// Conversation source types (Freshdesk API)
const CONVERSATION_SOURCES: Record<number, string> = {
  0: "reply",
  1: "note",
  2: "tweet",
  5: "email",
  7: "whatsapp",
};

class FreshdeskMirroringService {
  private domain: string | null = null;
  private apiKey: string | null = null;
  private baseUrl: string | null = null;

  constructor() {
    this.initializeIfConfigured();
  }

  private initializeIfConfigured(): boolean {
    let domain = process.env.FRESHDESK_DOMAIN;
    const apiKey = process.env.FRESHDESK_API_KEY;

    if (!domain || !apiKey) {
      return false;
    }

    // Clean up domain
    domain = domain.replace(/^https?:\/\//, "");
    domain = domain.replace(/\.freshdesk\.com.*$/, "");

    this.domain = domain;
    this.apiKey = apiKey;
    this.baseUrl = `https://${domain}.freshdesk.com/api/v2`;
    return true;
  }

  isConfigured(): boolean {
    return !!(this.domain && this.apiKey && this.baseUrl);
  }

  private getAuthHeader(): string {
    if (!this.apiKey) {
      throw new Error("Freshdesk not configured");
    }
    return "Basic " + Buffer.from(`${this.apiKey}:X`).toString("base64");
  }

  /**
   * Fetch all conversations for a ticket
   */
  async fetchTicketConversations(ticketId: number): Promise<FreshdeskConversation[]> {
    if (!this.isConfigured()) {
      console.log("[Freshdesk Mirror] Not configured, skipping conversation fetch");
      return [];
    }

    try {
      const response = await fetch(`${this.baseUrl}/tickets/${ticketId}/conversations`, {
        headers: {
          Authorization: this.getAuthHeader(),
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        if (response.status === 404) {
          return [];
        }
        throw new Error(`Freshdesk API error: ${response.status}`);
      }

      return (await response.json()) as FreshdeskConversation[];
    } catch (error) {
      console.error(`[Freshdesk Mirror] Error fetching conversations for ticket ${ticketId}:`, error);
      return [];
    }
  }

  /**
   * Fetch a single ticket
   */
  async fetchTicket(ticketId: number): Promise<Record<string, unknown> | null> {
    if (!this.isConfigured()) {
      return null;
    }

    try {
      const response = await fetch(`${this.baseUrl}/tickets/${ticketId}?include=conversations,company`, {
        headers: {
          Authorization: this.getAuthHeader(),
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        if (response.status === 404) {
          return null;
        }
        throw new Error(`Freshdesk API error: ${response.status}`);
      }

      return (await response.json()) as Record<string, unknown>;
    } catch (error) {
      console.error(`[Freshdesk Mirror] Error fetching ticket ${ticketId}:`, error);
      return null;
    }
  }

  /**
   * Map Freshdesk ticket ID to GPNet case ID
   */
  async findCaseByTicketId(ticketId: number): Promise<string | null> {
    // Look for case with this ticket in its ticketIds array
    // The ticketId format in GPNet is "FD-{id}"
    const freshdeskId = `FD-${ticketId}`;

    try {
      // Get all cases and find one with this ticket
      // Note: In production, this should be a database query
      const cases = await storage.getGPNet2Cases("*"); // Admin fetch

      for (const workerCase of cases) {
        if (workerCase.ticketIds?.includes(freshdeskId)) {
          return workerCase.id;
        }
      }

      return null;
    } catch {
      return null;
    }
  }

  /**
   * Mirror ticket conversations to case timeline
   */
  async mirrorTicketConversations(
    ticketId: number,
    caseId: string,
    organizationId: string
  ): Promise<number> {
    const conversations = await this.fetchTicketConversations(ticketId);

    if (conversations.length === 0) {
      return 0;
    }

    console.log(
      `[Freshdesk Mirror] Mirroring ${conversations.length} conversations for ticket ${ticketId}`
    );

    let mirrored = 0;

    for (const conv of conversations) {
      try {
        // Create a discussion note from the conversation
        // This integrates with the existing timeline infrastructure
        await storage.upsertCaseDiscussionNotes([
          {
            id: `fd-conv-${conv.id}`,
            caseId,
            organizationId,
            workerName: "", // Will be filled from case
            timestamp: new Date(conv.created_at),
            rawText: conv.body_text || conv.body || "",
            summary: `${conv.incoming ? "Incoming" : "Outgoing"} ${CONVERSATION_SOURCES[conv.source] || "message"}: ${(conv.body_text || "").substring(0, 200)}`,
            nextSteps: [],
            riskFlags: [],
            updatesCompliance: false,
            updatesRecoveryTimeline: false,
          },
        ]);
        mirrored++;
      } catch (error) {
        console.error(`[Freshdesk Mirror] Error mirroring conversation ${conv.id}:`, error);
      }
    }

    return mirrored;
  }

  /**
   * Handle Freshdesk webhook event
   */
  async handleWebhook(
    payload: FreshdeskWebhookPayload,
    organizationId: string
  ): Promise<MirrorResult> {
    const { freshdesk_webhook: webhook } = payload;
    const ticketId = webhook.ticket_id;

    console.log(
      `[Freshdesk Mirror] Webhook received: ${webhook.triggered_event} for ticket ${ticketId}`
    );

    // Find associated case
    const caseId = await this.findCaseByTicketId(ticketId);

    if (!caseId) {
      console.log(`[Freshdesk Mirror] No case found for ticket ${ticketId}`);
      return {
        ticketId,
        caseId: null,
        conversationsMirrored: 0,
        timelineEventsCreated: 0,
        success: true, // Not an error, just no matching case
      };
    }

    try {
      // Mirror conversations
      const conversationsMirrored = await this.mirrorTicketConversations(
        ticketId,
        caseId,
        organizationId
      );

      // Log audit event
      await logAuditEvent({
        userId: "system",
        organizationId,
        eventType: AuditEventTypes.FRESHDESK_SYNC,
        resourceType: "worker_case",
        resourceId: caseId,
        metadata: {
          ticketId,
          triggeredEvent: webhook.triggered_event,
          conversationsMirrored,
        },
      });

      return {
        ticketId,
        caseId,
        conversationsMirrored,
        timelineEventsCreated: conversationsMirrored,
        success: true,
      };
    } catch (error) {
      console.error(`[Freshdesk Mirror] Error processing webhook for ticket ${ticketId}:`, error);
      return {
        ticketId,
        caseId,
        conversationsMirrored: 0,
        timelineEventsCreated: 0,
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Full sync: Mirror all conversations for all tickets in a case
   */
  async fullSyncCase(caseId: string, organizationId: string): Promise<MirrorResult[]> {
    const workerCase = await storage.getGPNet2CaseById(caseId, organizationId);

    if (!workerCase) {
      return [];
    }

    const results: MirrorResult[] = [];

    for (const ticketId of workerCase.ticketIds || []) {
      // Extract numeric ID from "FD-123" format
      const numericId = parseInt(ticketId.replace("FD-", ""), 10);

      if (isNaN(numericId)) {
        continue;
      }

      const conversationsMirrored = await this.mirrorTicketConversations(
        numericId,
        caseId,
        organizationId
      );

      results.push({
        ticketId: numericId,
        caseId,
        conversationsMirrored,
        timelineEventsCreated: conversationsMirrored,
        success: true,
      });
    }

    return results;
  }
}

// Export singleton instance
export const freshdeskMirroringService = new FreshdeskMirroringService();
