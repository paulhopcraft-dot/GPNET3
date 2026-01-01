/**
 * Email Service v1
 *
 * Simple email sending service with fallback to logging in development.
 * When SMTP is not configured, emails are logged to console instead of being sent.
 */

import { logger } from "../lib/logger";

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
    logger.email.info("SMTP not configured - logging email instead", {
      to,
      subject,
      bodyPreview: body.substring(0, 200) + (body.length > 200 ? "..." : ""),
    });

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

    logger.email.info("Email sent successfully", { messageId: info.messageId });

    return {
      success: true,
      messageId: info.messageId,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.email.error("Failed to send email", { errorMessage }, error);

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

/**
 * Send an invite email to a new user
 */
export async function sendInviteEmail(
  email: string,
  inviteToken: string,
  invitedByName: string,
  role: string
): Promise<SendEmailResult> {
  const appUrl = process.env.APP_URL || "http://localhost:5173";
  const registrationUrl = `${appUrl}/register?token=${inviteToken}`;

  const subject = "You've been invited to GPNet";

  const body = `Hello,

You've been invited to join GPNet as a ${role} by ${invitedByName}.

To complete your registration, please click the link below:

${registrationUrl}

This invitation link will expire in 7 days.

If you did not expect this invitation, you can safely ignore this email.

Best regards,
The GPNet Team
`;

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 10px 10px 0 0;">
    <h1 style="color: white; margin: 0; font-size: 24px;">Welcome to GPNet</h1>
  </div>
  <div style="background: #f9fafb; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 10px 10px;">
    <p>Hello,</p>
    <p>You've been invited to join <strong>GPNet</strong> as a <strong>${role}</strong> by ${invitedByName}.</p>
    <p>To complete your registration, please click the button below:</p>
    <div style="text-align: center; margin: 30px 0;">
      <a href="${registrationUrl}" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: 600; display: inline-block;">Complete Registration</a>
    </div>
    <p style="font-size: 14px; color: #6b7280;">This invitation link will expire in 7 days.</p>
    <p style="font-size: 14px; color: #6b7280;">If you did not expect this invitation, you can safely ignore this email.</p>
    <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;">
    <p style="font-size: 12px; color: #9ca3af; margin: 0;">Best regards,<br>The GPNet Team</p>
  </div>
</body>
</html>
`;

  logger.email.info("Sending invite email", { email, role, invitedByName });

  return sendEmail({
    to: email,
    subject,
    body,
    html,
  });
}
