/**
 * Email Notification Service
 *
 * Handles email notifications for the GPNet platform.
 * In production, this would integrate with an SMTP provider
 * like SendGrid, AWS SES, or similar.
 */

export interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  bodyTemplate: string;
  category: "checkin" | "reminder" | "alert" | "compliance" | "termination" | "rtw";
}

export interface EmailNotification {
  id: string;
  to: string;
  cc?: string[];
  bcc?: string[];
  subject: string;
  body: string;
  html?: string;
  templateId?: string;
  caseId?: string;
  status: "pending" | "sent" | "failed";
  scheduledFor?: string;
  sentAt?: string;
  error?: string;
  metadata?: Record<string, any>;
}

export interface NotificationPreferences {
  userId: string;
  emailEnabled: boolean;
  checkinReminders: boolean;
  complianceAlerts: boolean;
  caseUpdates: boolean;
  weeklyDigest: boolean;
  urgentNotificationsOnly: boolean;
}

// Email templates
const EMAIL_TEMPLATES: EmailTemplate[] = [
  {
    id: "checkin_reminder",
    name: "Weekly Check-in Reminder",
    subject: "Weekly Check-in Reminder - GPNet",
    bodyTemplate: `Hi {{workerName}},

It's time for your weekly check-in. Regular check-ins help us track your progress and ensure you're getting the support you need.

Please complete your check-in by visiting the GPNet portal.

{{#if daysSinceLastCheckin}}
Note: Your last check-in was {{daysSinceLastCheckin}} days ago.
{{/if}}

Thank you for your cooperation.

Best regards,
GPNet Case Management Team`,
    category: "checkin",
  },
  {
    id: "compliance_alert",
    name: "Compliance Alert",
    subject: "Important: Compliance Action Required - {{workerName}}",
    bodyTemplate: `Case Manager,

A compliance issue has been identified for the following case:

Worker: {{workerName}}
Company: {{company}}
Issue: {{complianceIssue}}

Recommended Action: {{recommendedAction}}

Please review this case as soon as possible.

GPNet Compliance Monitoring`,
    category: "compliance",
  },
  {
    id: "certificate_expiry",
    name: "Certificate Expiry Warning",
    subject: "Medical Certificate Expiring - {{workerName}}",
    bodyTemplate: `Case Manager,

The medical certificate for the following worker is expiring soon:

Worker: {{workerName}}
Certificate Expires: {{expiryDate}}
Days Until Expiry: {{daysUntilExpiry}}

Please ensure a new certificate is obtained before the expiry date.

GPNet Certificate Tracking`,
    category: "reminder",
  },
  {
    id: "high_risk_alert",
    name: "High Risk Case Alert",
    subject: "URGENT: High Risk Case Alert - {{workerName}}",
    bodyTemplate: `URGENT ATTENTION REQUIRED

A case has been escalated to high risk status:

Worker: {{workerName}}
Company: {{company}}
Risk Factors:
{{#each riskFactors}}
- {{this}}
{{/each}}

Immediate action is recommended.

GPNet Risk Monitoring`,
    category: "alert",
  },
  {
    id: "rtw_plan_update",
    name: "RTW Plan Update",
    subject: "Return to Work Plan Update - {{workerName}}",
    bodyTemplate: `Hi {{workerName}},

Your Return to Work plan has been updated.

Current Phase: {{currentPhase}}
Next Review Date: {{nextReviewDate}}

Changes:
{{#each changes}}
- {{this}}
{{/each}}

If you have any questions, please contact your case manager.

Best regards,
GPNet Case Management Team`,
    category: "rtw",
  },
  {
    id: "termination_notice",
    name: "Termination Process Notification",
    subject: "Employment Matter - {{workerName}}",
    bodyTemplate: `Dear {{workerName}},

This email is regarding an important matter concerning your employment.

Please contact your case manager at your earliest convenience to discuss.

Regards,
GPNet Case Management`,
    category: "termination",
  },
  {
    id: "weekly_digest",
    name: "Weekly Case Digest",
    subject: "GPNet Weekly Case Summary",
    bodyTemplate: `Weekly Case Management Summary

Total Active Cases: {{totalCases}}
High Risk Cases: {{highRiskCases}}
Cases Requiring Action: {{actionRequired}}

Key Highlights:
{{#each highlights}}
- {{this}}
{{/each}}

Cases Updated This Week: {{updatedCases}}
New Cases: {{newCases}}

View full details in the GPNet portal.

GPNet Weekly Report`,
    category: "reminder",
  },
];

class EmailNotificationService {
  private notificationQueue: EmailNotification[] = [];
  private templates: Map<string, EmailTemplate> = new Map();

  constructor() {
    // Load templates into map
    EMAIL_TEMPLATES.forEach(t => this.templates.set(t.id, t));
  }

  /**
   * Get all available templates
   */
  getTemplates(): EmailTemplate[] {
    return EMAIL_TEMPLATES;
  }

  /**
   * Get a specific template
   */
  getTemplate(templateId: string): EmailTemplate | undefined {
    return this.templates.get(templateId);
  }

  /**
   * Create a notification from a template
   */
  createFromTemplate(
    templateId: string,
    to: string,
    variables: Record<string, any>,
    options?: {
      cc?: string[];
      bcc?: string[];
      caseId?: string;
      scheduledFor?: string;
    }
  ): EmailNotification | null {
    const template = this.templates.get(templateId);
    if (!template) {
      console.error(`Template not found: ${templateId}`);
      return null;
    }

    // Simple template variable replacement
    let subject = template.subject;
    let body = template.bodyTemplate;

    Object.entries(variables).forEach(([key, value]) => {
      const regex = new RegExp(`{{${key}}}`, "g");
      subject = subject.replace(regex, String(value));
      body = body.replace(regex, String(value));
    });

    // Handle array variables (simple implementation)
    const arrayPattern = /{{#each (\w+)}}(.*?){{\/each}}/gs;
    body = body.replace(arrayPattern, (match, arrayName, itemTemplate) => {
      const items = variables[arrayName];
      if (Array.isArray(items)) {
        return items.map(item => itemTemplate.replace(/{{this}}/g, String(item))).join("\n");
      }
      return "";
    });

    // Handle conditionals (simple implementation)
    const ifPattern = /{{#if (\w+)}}(.*?){{\/if}}/gs;
    body = body.replace(ifPattern, (match, varName, content) => {
      return variables[varName] ? content : "";
    });

    const notification: EmailNotification = {
      id: `email-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      to,
      cc: options?.cc,
      bcc: options?.bcc,
      subject,
      body,
      templateId,
      caseId: options?.caseId,
      status: "pending",
      scheduledFor: options?.scheduledFor,
      metadata: variables,
    };

    return notification;
  }

  /**
   * Queue a notification for sending
   */
  queueNotification(notification: EmailNotification): void {
    this.notificationQueue.push(notification);
    console.log(`[Email] Queued notification ${notification.id} to ${notification.to}`);
  }

  /**
   * Send a notification immediately
   * In production, this would integrate with an email provider
   */
  async sendNotification(notification: EmailNotification): Promise<{ success: boolean; error?: string }> {
    try {
      // Check if SMTP is configured
      const smtpConfigured = !!process.env.SMTP_HOST;

      if (!smtpConfigured) {
        // Log the email that would be sent
        console.log(`[Email] Would send email to ${notification.to}:`);
        console.log(`  Subject: ${notification.subject}`);
        console.log(`  Body preview: ${notification.body.substring(0, 100)}...`);

        // Mark as sent for dev purposes
        notification.status = "sent";
        notification.sentAt = new Date().toISOString();

        return { success: true };
      }

      // In production, implement actual SMTP sending here
      // Example with nodemailer:
      // const transporter = nodemailer.createTransport({...});
      // await transporter.sendMail({...});

      notification.status = "sent";
      notification.sentAt = new Date().toISOString();

      return { success: true };
    } catch (error) {
      notification.status = "failed";
      notification.error = error instanceof Error ? error.message : "Unknown error";

      return { success: false, error: notification.error };
    }
  }

  /**
   * Process the notification queue
   */
  async processQueue(): Promise<{ sent: number; failed: number }> {
    let sent = 0;
    let failed = 0;

    const pending = this.notificationQueue.filter(n => n.status === "pending");

    for (const notification of pending) {
      // Check if scheduled for future
      if (notification.scheduledFor && new Date(notification.scheduledFor) > new Date()) {
        continue;
      }

      const result = await this.sendNotification(notification);
      if (result.success) {
        sent++;
      } else {
        failed++;
      }
    }

    // Remove processed notifications
    this.notificationQueue = this.notificationQueue.filter(
      n => n.status === "pending"
    );

    return { sent, failed };
  }

  /**
   * Get pending notifications
   */
  getPendingNotifications(): EmailNotification[] {
    return this.notificationQueue.filter(n => n.status === "pending");
  }

  /**
   * Create common notifications
   */
  createCheckinReminder(workerEmail: string, workerName: string, caseId: string, daysSinceLastCheckin?: number): EmailNotification | null {
    return this.createFromTemplate("checkin_reminder", workerEmail, {
      workerName,
      daysSinceLastCheckin,
    }, { caseId });
  }

  createComplianceAlert(caseManagerEmail: string, workerName: string, company: string, issue: string, action: string, caseId: string): EmailNotification | null {
    return this.createFromTemplate("compliance_alert", caseManagerEmail, {
      workerName,
      company,
      complianceIssue: issue,
      recommendedAction: action,
    }, { caseId });
  }

  createHighRiskAlert(caseManagerEmail: string, workerName: string, company: string, riskFactors: string[], caseId: string): EmailNotification | null {
    return this.createFromTemplate("high_risk_alert", caseManagerEmail, {
      workerName,
      company,
      riskFactors,
    }, { caseId });
  }

  createCertificateExpiryWarning(caseManagerEmail: string, workerName: string, expiryDate: string, daysUntilExpiry: number, caseId: string): EmailNotification | null {
    return this.createFromTemplate("certificate_expiry", caseManagerEmail, {
      workerName,
      expiryDate,
      daysUntilExpiry,
    }, { caseId });
  }

  createRTWPlanUpdate(workerEmail: string, workerName: string, currentPhase: string, nextReviewDate: string, changes: string[], caseId: string): EmailNotification | null {
    return this.createFromTemplate("rtw_plan_update", workerEmail, {
      workerName,
      currentPhase,
      nextReviewDate,
      changes,
    }, { caseId });
  }

  createWeeklyDigest(email: string, stats: {
    totalCases: number;
    highRiskCases: number;
    actionRequired: number;
    highlights: string[];
    updatedCases: number;
    newCases: number;
  }): EmailNotification | null {
    return this.createFromTemplate("weekly_digest", email, stats);
  }
}

export const emailNotificationService = new EmailNotificationService();
