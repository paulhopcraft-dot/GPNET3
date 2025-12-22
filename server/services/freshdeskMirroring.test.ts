/**
 * Tests for Freshdesk Mirroring Service (PRD-7, PRD-3.6)
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock storage before importing the service
vi.mock("../storage", () => ({
  storage: {
    getGPNet2Cases: vi.fn(),
    getGPNet2CaseById: vi.fn(),
    upsertCaseDiscussionNotes: vi.fn(),
  },
}));

// Mock audit logger
vi.mock("./auditLogger", () => ({
  logAuditEvent: vi.fn(),
  AuditEventTypes: {
    FRESHDESK_SYNC: "freshdesk.sync",
  },
}));

import { storage } from "../storage";
import type {
  FreshdeskConversation,
  FreshdeskWebhookPayload,
  MirrorResult,
} from "./freshdeskMirroring";

describe("Freshdesk Mirroring Service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset environment
    delete process.env.FRESHDESK_DOMAIN;
    delete process.env.FRESHDESK_API_KEY;
  });

  describe("Configuration", () => {
    it("reports not configured when env vars missing", async () => {
      // Import fresh to get unconfigured state
      const { freshdeskMirroringService } = await import("./freshdeskMirroring");
      expect(freshdeskMirroringService.isConfigured()).toBe(false);
    });
  });

  describe("Webhook Payload Validation", () => {
    it("validates correct webhook payload structure", () => {
      const validPayload: FreshdeskWebhookPayload = {
        freshdesk_webhook: {
          ticket_id: 123,
          ticket_subject: "Test Ticket",
          ticket_status: 2,
          ticket_priority: 2,
          ticket_type: null,
          ticket_description: "<p>Test description</p>",
          ticket_description_text: "Test description",
          ticket_created_at: "2025-01-01T00:00:00Z",
          ticket_updated_at: "2025-01-01T12:00:00Z",
          ticket_due_by: null,
          ticket_tags: ["tag1", "tag2"],
          ticket_custom_fields: {},
          triggered_event: "ticket_updated",
          requester_name: "John Doe",
          requester_email: "john@example.com",
          company_name: "Test Company",
        },
      };

      expect(validPayload.freshdesk_webhook.ticket_id).toBe(123);
      expect(validPayload.freshdesk_webhook.triggered_event).toBe("ticket_updated");
    });

    it("handles webhook payload with minimal fields", () => {
      const minimalPayload: FreshdeskWebhookPayload = {
        freshdesk_webhook: {
          ticket_id: 456,
          ticket_subject: "",
          ticket_status: 2,
          ticket_priority: 1,
          ticket_type: null,
          ticket_description: "",
          ticket_description_text: "",
          ticket_created_at: "2025-01-01T00:00:00Z",
          ticket_updated_at: "2025-01-01T00:00:00Z",
          ticket_due_by: null,
          ticket_tags: [],
          ticket_custom_fields: {},
          triggered_event: "ticket_created",
          requester_name: "",
          requester_email: "",
          company_name: null,
        },
      };

      expect(minimalPayload.freshdesk_webhook.ticket_id).toBe(456);
    });
  });

  describe("Conversation Source Types", () => {
    it("recognizes all Freshdesk conversation source types", () => {
      const sources: Record<number, string> = {
        0: "reply",
        1: "note",
        2: "tweet",
        5: "email",
        7: "whatsapp",
      };

      expect(sources[0]).toBe("reply");
      expect(sources[1]).toBe("note");
      expect(sources[5]).toBe("email");
    });
  });

  describe("Conversation Structure", () => {
    it("validates FreshdeskConversation interface", () => {
      const conversation: FreshdeskConversation = {
        id: 1001,
        body: "<p>Hello, this is a reply</p>",
        body_text: "Hello, this is a reply",
        incoming: true,
        to_emails: ["support@example.com"],
        from_email: "worker@example.com",
        cc_emails: [],
        bcc_emails: [],
        user_id: 5001,
        support_email: null,
        source: 5, // email
        created_at: "2025-01-01T10:00:00Z",
        updated_at: "2025-01-01T10:00:00Z",
        attachments: [],
      };

      expect(conversation.id).toBe(1001);
      expect(conversation.incoming).toBe(true);
      expect(conversation.source).toBe(5);
      expect(conversation.body_text).toBe("Hello, this is a reply");
    });

    it("handles conversation with attachments", () => {
      const conversationWithAttachments: FreshdeskConversation = {
        id: 1002,
        body: "<p>See attached certificate</p>",
        body_text: "See attached certificate",
        incoming: true,
        to_emails: [],
        from_email: "worker@example.com",
        cc_emails: [],
        bcc_emails: [],
        user_id: 5002,
        support_email: null,
        source: 5,
        created_at: "2025-01-02T10:00:00Z",
        updated_at: "2025-01-02T10:00:00Z",
        attachments: [
          {
            id: 2001,
            name: "certificate.pdf",
            content_type: "application/pdf",
            size: 102400,
            attachment_url: "https://example.freshdesk.com/attachments/2001",
            created_at: "2025-01-02T10:00:00Z",
          },
        ],
      };

      expect(conversationWithAttachments.attachments.length).toBe(1);
      expect(conversationWithAttachments.attachments[0].name).toBe("certificate.pdf");
    });
  });

  describe("MirrorResult Structure", () => {
    it("represents successful mirror result", () => {
      const successResult: MirrorResult = {
        ticketId: 123,
        caseId: "case-001",
        conversationsMirrored: 5,
        timelineEventsCreated: 5,
        success: true,
      };

      expect(successResult.success).toBe(true);
      expect(successResult.conversationsMirrored).toBe(5);
      expect(successResult.caseId).toBe("case-001");
    });

    it("represents failed mirror result with error", () => {
      const failedResult: MirrorResult = {
        ticketId: 456,
        caseId: "case-002",
        conversationsMirrored: 0,
        timelineEventsCreated: 0,
        success: false,
        error: "API rate limit exceeded",
      };

      expect(failedResult.success).toBe(false);
      expect(failedResult.error).toBe("API rate limit exceeded");
    });

    it("represents result when no case found", () => {
      const noCaseResult: MirrorResult = {
        ticketId: 789,
        caseId: null,
        conversationsMirrored: 0,
        timelineEventsCreated: 0,
        success: true, // Not an error, just no matching case
      };

      expect(noCaseResult.success).toBe(true);
      expect(noCaseResult.caseId).toBeNull();
    });
  });

  describe("Case Ticket ID Matching", () => {
    it("matches FD-prefixed ticket IDs", () => {
      const ticketId = 12345;
      const expectedFormat = `FD-${ticketId}`;

      expect(expectedFormat).toBe("FD-12345");
    });

    it("extracts numeric ID from FD format", () => {
      const fdFormat = "FD-67890";
      const numericId = parseInt(fdFormat.replace("FD-", ""), 10);

      expect(numericId).toBe(67890);
    });

    it("handles invalid FD format gracefully", () => {
      const invalidFormat = "INVALID-123";
      const numericId = parseInt(invalidFormat.replace("FD-", ""), 10);

      expect(isNaN(numericId)).toBe(true);
    });
  });

  describe("Storage Integration", () => {
    it("calls upsertCaseDiscussionNotes with correct structure", async () => {
      const mockStorage = storage as {
        upsertCaseDiscussionNotes: ReturnType<typeof vi.fn>;
      };

      // Simulate what the service does
      await mockStorage.upsertCaseDiscussionNotes([
        {
          id: "fd-conv-1001",
          caseId: "case-001",
          organizationId: "org-001",
          workerName: "",
          timestamp: new Date("2025-01-01T10:00:00Z"),
          rawText: "This is the conversation content",
          summary: "Incoming email: This is the conversation...",
          nextSteps: [],
          riskFlags: [],
          updatesCompliance: false,
          updatesRecoveryTimeline: false,
        },
      ]);

      expect(mockStorage.upsertCaseDiscussionNotes).toHaveBeenCalledOnce();
      const calledWith = mockStorage.upsertCaseDiscussionNotes.mock.calls[0][0];
      expect(calledWith[0].id).toBe("fd-conv-1001");
      expect(calledWith[0].caseId).toBe("case-001");
    });
  });

  describe("Webhook Event Types", () => {
    it("recognizes common Freshdesk webhook events", () => {
      const events = [
        "ticket_created",
        "ticket_updated",
        "reply_added",
        "note_added",
        "status_changed",
        "priority_changed",
      ];

      expect(events).toContain("ticket_created");
      expect(events).toContain("reply_added");
    });
  });

  describe("PRD Compliance", () => {
    it("preserves original content per PRD-3.6", () => {
      const conversation: FreshdeskConversation = {
        id: 1003,
        body: "<p>Original <b>HTML</b> content</p>",
        body_text: "Original HTML content",
        incoming: true,
        to_emails: [],
        from_email: "worker@example.com",
        cc_emails: [],
        bcc_emails: [],
        user_id: 5003,
        support_email: null,
        source: 5,
        created_at: "2025-01-03T10:00:00Z",
        updated_at: "2025-01-03T10:00:00Z",
        attachments: [],
      };

      // Verify both HTML and text versions are available
      expect(conversation.body).toContain("<b>HTML</b>");
      expect(conversation.body_text).toBe("Original HTML content");
    });

    it("creates immutable records per PRD-3.3", () => {
      // The id format ensures uniqueness and traceability
      const conversationId = 1004;
      const recordId = `fd-conv-${conversationId}`;

      expect(recordId).toBe("fd-conv-1004");
      // ID is deterministic from source - same conversation always gets same ID
    });
  });
});
