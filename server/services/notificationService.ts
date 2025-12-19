/**
 * Notification Service v1
 *
 * Core service for generating and sending automated email notifications.
 * Handles certificate expiry alerts, overdue action reminders, and case attention alerts.
 */

import type { IStorage } from "../storage";
import type {
  NotificationDB,
  InsertNotification,
  NotificationType,
  NotificationPriority,
  CaseAction,
  MedicalCertificateDB,
  WorkerCase,
} from "@shared/schema";
import { sendEmail } from "./emailService";
import { getCaseCompliance } from "./certificateCompliance";

// =====================================================
// Configuration
// =====================================================

const APP_URL = process.env.APP_URL || "http://localhost:5173";

// Certificate expiry thresholds (days)
const CERT_EXPIRY_THRESHOLDS = [
  { days: 7, priority: "medium" as NotificationPriority },
  { days: 3, priority: "high" as NotificationPriority },
  { days: 1, priority: "critical" as NotificationPriority },
  { days: 0, priority: "critical" as NotificationPriority },
];

// Action overdue thresholds (days)
const ACTION_OVERDUE_THRESHOLDS = [
  { days: 1, priority: "medium" as NotificationPriority },
  { days: 3, priority: "high" as NotificationPriority },
  { days: 7, priority: "critical" as NotificationPriority },
];

// =====================================================
// Email Templates
// =====================================================

interface NotificationTemplate {
  subject: string;
  body: string;
}

const NOTIFICATION_TEMPLATES: Record<NotificationType, NotificationTemplate> = {
  certificate_expiring: {
    subject: "Action Required: Medical certificate expiring for {{workerName}}",
    body: `The medical certificate for {{workerName}} ({{company}}) will expire soon.

Days until expiry: {{daysUntil}}
Current capacity: {{capacity}}
Certificate end date: {{expiryDate}}

Please ensure an updated certificate is obtained before expiry to maintain compliance.

View case: {{caseUrl}}
`,
  },

  certificate_expired: {
    subject: "URGENT: Medical certificate expired for {{workerName}}",
    body: `The medical certificate for {{workerName}} ({{company}}) has expired.

Days since expiry: {{daysSince}}
Certificate end date: {{expiryDate}}

Immediate action required to obtain an updated certificate.

View case: {{caseUrl}}
`,
  },

  action_overdue: {
    subject: "Overdue action: {{actionType}} for {{workerName}}",
    body: `An action is overdue for {{workerName}} ({{company}}).

Action: {{actionLabel}}
Due date: {{dueDate}}
Days overdue: {{daysOverdue}}
Notes: {{actionNotes}}

Please complete this action as soon as possible.

View case: {{caseUrl}}
`,
  },

  case_attention_needed: {
    subject: "Case needs attention: {{workerName}}",
    body: `Multiple issues require attention for {{workerName}} ({{company}}):

{{issuesList}}

View case: {{caseUrl}}
`,
  },

  weekly_digest: {
    subject: "Weekly Case Summary - {{weekOf}}",
    body: `Your weekly case management summary:

Cases requiring attention: {{attentionCount}}
Certificates expiring this week: {{expiringCerts}}
Overdue actions: {{overdueActions}}

View dashboard: {{dashboardUrl}}
`,
  },
};

// =====================================================
// Template Rendering
// =====================================================

function renderTemplate(template: string, variables: Record<string, string | number>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => {
    const value = variables[key];
    return value !== undefined ? String(value) : `{{${key}}}`;
  });
}

function buildNotificationContent(
  type: NotificationType,
  variables: Record<string, string | number>
): { subject: string; body: string } {
  const template = NOTIFICATION_TEMPLATES[type];
  return {
    subject: renderTemplate(template.subject, variables),
    body: renderTemplate(template.body, variables),
  };
}

// =====================================================
// Deduplication Keys
// =====================================================

function getCertificateDedupeKey(caseId: string, daysUntilExpiry: number): string {
  // Bucket days: 7, 3, 1, 0, -1 (expired)
  let bucket: number;
  if (daysUntilExpiry < 0) {
    bucket = -1; // expired
  } else if (daysUntilExpiry <= 1) {
    bucket = 1;
  } else if (daysUntilExpiry <= 3) {
    bucket = 3;
  } else {
    bucket = 7;
  }
  return `cert:${caseId}:${bucket}`;
}

function getActionDedupeKey(actionId: string, daysOverdue: number): string {
  // Bucket days: 1, 3, 7+
  let bucket: number;
  if (daysOverdue >= 7) {
    bucket = 7;
  } else if (daysOverdue >= 3) {
    bucket = 3;
  } else {
    bucket = 1;
  }
  return `action:${actionId}:${bucket}`;
}

// =====================================================
// Priority Calculation
// =====================================================

function getCertificatePriority(daysUntilExpiry: number): NotificationPriority {
  if (daysUntilExpiry <= 0) return "critical";
  if (daysUntilExpiry <= 1) return "critical";
  if (daysUntilExpiry <= 3) return "high";
  return "medium";
}

function getActionPriority(daysOverdue: number): NotificationPriority {
  if (daysOverdue >= 7) return "critical";
  if (daysOverdue >= 3) return "high";
  return "medium";
}

// =====================================================
// Action Type Labels
// =====================================================

const ACTION_TYPE_LABELS: Record<string, string> = {
  chase_certificate: "Chase Medical Certificate",
  review_case: "Review Case",
  follow_up: "Follow Up",
};

// =====================================================
// Notification Generation
// =====================================================

/**
 * Generate certificate expiry notifications for cases in an organization
 */
async function generateCertificateNotifications(
  storage: IStorage,
  recipientEmail: string,
  organizationId: string
): Promise<number> {
  let created = 0;

  // Get all cases for the organization
  const cases = await storage.getGPNet2Cases(organizationId);

  for (const workerCase of cases) {
    try {
      const compliance = await getCaseCompliance(storage, workerCase.id, workerCase.organizationId);

      // Skip compliant or no-certificate cases (no-certificate has its own action flow)
      if (compliance.status === "compliant" || compliance.status === "no_certificate") {
        continue;
      }

      const isExpired = compliance.status === "certificate_expired";
      const daysValue = isExpired
        ? -(compliance.daysSinceExpiry || 0)
        : (compliance.daysUntilExpiry || 0);

      const dedupeKey = getCertificateDedupeKey(workerCase.id, daysValue);

      // Check if notification already exists
      const exists = await storage.notificationExistsByDedupeKey(dedupeKey);
      if (exists) {
        continue;
      }

      // Get certificate info
      const cert = compliance.activeCertificate || compliance.newestCertificate;
      const expiryDate = cert ? new Date(cert.endDate).toLocaleDateString("en-AU") : "Unknown";
      const capacity = cert?.capacity || "Unknown";

      // Build notification content
      const type: NotificationType = isExpired ? "certificate_expired" : "certificate_expiring";
      const { subject, body } = buildNotificationContent(type, {
        workerName: workerCase.workerName,
        company: workerCase.company,
        daysUntil: compliance.daysUntilExpiry || 0,
        daysSince: compliance.daysSinceExpiry || 0,
        expiryDate,
        capacity,
        caseUrl: `${APP_URL}/cases/${workerCase.id}`,
      });

      // Create notification
      const notification: InsertNotification = {
        organizationId: workerCase.organizationId,
        type,
        priority: getCertificatePriority(daysValue),
        caseId: workerCase.id,
        recipientEmail,
        recipientName: null,
        subject,
        body,
        status: "pending",
        dedupeKey,
        metadata: {
          workerName: workerCase.workerName,
          company: workerCase.company,
          daysUntilExpiry: compliance.daysUntilExpiry,
          daysSinceExpiry: compliance.daysSinceExpiry,
        },
      };

      await storage.createNotification(notification);
      created++;
    } catch (error) {
      console.error(`[NotificationService] Error processing case ${workerCase.id}:`, error);
    }
  }

  return created;
}

/**
 * Generate overdue action notifications
 * Note: organizationId is required for tenant isolation. The notification
 * service should be called per-organization in production.
 */
async function generateActionNotifications(
  storage: IStorage,
  recipientEmail: string,
  organizationId: string
): Promise<number> {
  let created = 0;

  const overdueActions = await storage.getOverdueActions(organizationId, 100);
  const now = new Date();

  for (const action of overdueActions) {
    try {
      if (!action.dueDate) continue;

      const dueDate = new Date(action.dueDate);
      const daysOverdue = Math.floor((now.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));

      if (daysOverdue < 1) continue; // Not yet overdue

      const dedupeKey = getActionDedupeKey(action.id, daysOverdue);

      // Check if notification already exists
      const exists = await storage.notificationExistsByDedupeKey(dedupeKey);
      if (exists) {
        continue;
      }

      // Build notification content
      const { subject, body } = buildNotificationContent("action_overdue", {
        workerName: action.workerName || "Unknown",
        company: action.company || "Unknown",
        actionType: action.type,
        actionLabel: ACTION_TYPE_LABELS[action.type] || action.type,
        dueDate: dueDate.toLocaleDateString("en-AU"),
        daysOverdue,
        actionNotes: action.notes || "No additional notes",
        caseUrl: `${APP_URL}/cases/${action.caseId}`,
      });

      // Create notification
      const notification: InsertNotification = {
        organizationId: action.organizationId,
        type: "action_overdue",
        priority: getActionPriority(daysOverdue),
        caseId: action.caseId,
        recipientEmail,
        recipientName: null,
        subject,
        body,
        status: "pending",
        dedupeKey,
        metadata: {
          actionId: action.id,
          actionType: action.type,
          daysOverdue,
          workerName: action.workerName,
        },
      };

      await storage.createNotification(notification);
      created++;
    } catch (error) {
      console.error(`[NotificationService] Error processing action ${action.id}:`, error);
    }
  }

  return created;
}

/**
 * Generate all pending notifications for a specific organization
 * @param storage - Storage interface
 * @param organizationId - Organization to generate notifications for
 */
export async function generatePendingNotifications(storage: IStorage, organizationId: string): Promise<number> {
  console.log(`[NotificationService] Generating pending notifications for org ${organizationId}...`);

  // Default recipient for now (in production, would query users/admins)
  const recipientEmail = process.env.NOTIFICATION_DEFAULT_EMAIL || "admin@gpnet.local";

  let total = 0;

  try {
    // Generate certificate notifications
    const certCount = await generateCertificateNotifications(storage, recipientEmail, organizationId);
    console.log(`[NotificationService] Generated ${certCount} certificate notifications`);
    total += certCount;

    // Generate action notifications
    const actionCount = await generateActionNotifications(storage, recipientEmail, organizationId);
    console.log(`[NotificationService] Generated ${actionCount} action notifications`);
    total += actionCount;

    console.log(`[NotificationService] Total notifications generated: ${total}`);
  } catch (error) {
    console.error("[NotificationService] Error generating notifications:", error);
    throw error;
  }

  return total;
}

// =====================================================
// Notification Sending
// =====================================================

/**
 * Send a single notification
 */
async function sendNotification(
  storage: IStorage,
  notification: NotificationDB
): Promise<boolean> {
  try {
    const result = await sendEmail({
      to: notification.recipientEmail,
      subject: notification.subject,
      body: notification.body,
    });

    if (result.success) {
      await storage.markNotificationSent(notification.id);
      return true;
    } else {
      await storage.updateNotificationStatus(notification.id, "failed", result.error);
      return false;
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    await storage.updateNotificationStatus(notification.id, "failed", errorMessage);
    return false;
  }
}

/**
 * Process all pending notifications for a specific organization
 */
export async function processPendingNotifications(
  storage: IStorage,
  organizationId: string
): Promise<{ sent: number; failed: number }> {
  console.log(`[NotificationService] Processing pending notifications for org ${organizationId}...`);

  const pending = await storage.getPendingNotifications(organizationId, 50);
  console.log(`[NotificationService] Found ${pending.length} pending notifications`);

  let sent = 0;
  let failed = 0;

  for (const notification of pending) {
    const success = await sendNotification(storage, notification);
    if (success) {
      sent++;
    } else {
      failed++;
    }
  }

  console.log(`[NotificationService] Sent: ${sent}, Failed: ${failed}`);
  return { sent, failed };
}

// =====================================================
// Utility Functions
// =====================================================

/**
 * Get notification statistics
 */
export async function getNotificationStats(
  storage: IStorage,
  organizationId: string
): Promise<{ pending: number; sent: number; failed: number }> {
  return storage.getNotificationStats(organizationId);
}

/**
 * Get recent notifications
 */
export async function getRecentNotifications(
  storage: IStorage,
  organizationId: string,
  hours: number = 24
): Promise<NotificationDB[]> {
  return storage.getRecentNotifications(organizationId, hours);
}

/**
 * Get notifications for a specific case
 */
export async function getNotificationsByCase(
  storage: IStorage,
  caseId: string,
  organizationId: string
): Promise<NotificationDB[]> {
  return storage.getNotificationsByCase(caseId, organizationId);
}
