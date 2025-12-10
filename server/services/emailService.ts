/**
 * Email Service v1
 *
 * Simple email sending service with fallback to logging in development.
 * When SMTP is not configured, emails are logged to console instead of being sent.
 */

export interface SendEmailOptions {
  to: string;
  subject: string;
  body: string;
  html?: string;
}

export interface SendEmailResult {
  success: boolean;
  error?: string;
  messageId?: string;
}

/**
 * Check if SMTP is configured
 */
function isSmtpConfigured(): boolean {
  return Boolean(
    process.env.SMTP_HOST &&
    process.env.SMTP_USER &&
    process.env.SMTP_PASS
  );
}

/**
 * Send an email.
 *
 * In development (when SMTP is not configured), the email content is logged
 * to the console instead of being sent.
 */
export async function sendEmail(options: SendEmailOptions): Promise<SendEmailResult> {
  const { to, subject, body, html } = options;

  // Validate inputs
  if (!to || !subject || !body) {
    return {
      success: false,
      error: "Missing required email fields (to, subject, body)",
    };
  }

  // If SMTP is not configured, log the email (dev mode)
  if (!isSmtpConfigured()) {
    console.log("[EmailService] SMTP not configured - logging email instead:");
    console.log("  To:", to);
    console.log("  Subject:", subject);
    console.log("  Body preview:", body.substring(0, 200) + (body.length > 200 ? "..." : ""));
    console.log("  [End of email preview]");

    return {
      success: true,
      messageId: `dev-${Date.now()}`,
    };
  }

  // Real SMTP sending with nodemailer
  try {
    // Dynamically import nodemailer only when needed
    const nodemailer = await import("nodemailer");

    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || "587", 10),
      secure: process.env.SMTP_SECURE === "true",
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    const fromAddress = process.env.SMTP_FROM || process.env.SMTP_USER || "noreply@gpnet.au";

    const info = await transporter.sendMail({
      from: fromAddress,
      to,
      subject,
      text: body,
      html: html || undefined,
    });

    console.log("[EmailService] Email sent successfully:", info.messageId);

    return {
      success: true,
      messageId: info.messageId,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("[EmailService] Failed to send email:", errorMessage);

    return {
      success: false,
      error: errorMessage,
    };
  }
}

/**
 * Send a test email to verify configuration
 */
export async function sendTestEmail(recipientEmail: string): Promise<SendEmailResult> {
  return sendEmail({
    to: recipientEmail,
    subject: "GPNet Notification Test",
    body: `This is a test email from GPNet Notifications Engine.

If you received this email, your notification system is working correctly.

Sent at: ${new Date().toISOString()}
Environment: ${process.env.NODE_ENV || "development"}
`,
  });
}
