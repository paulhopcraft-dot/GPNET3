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

    const fromAddress = process.env.SMTP_FROM || process.env.SMTP_USER || "noreply@preventli.ai";

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
    subject: "Preventli — Email Notification Test",
    body: `This is a test email from Preventli.

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

  const subject = "You've been invited to Preventli";

  const body = `Hello,

You've been invited to join Preventli as a ${role} by ${invitedByName}.

To complete your registration, please click the link below:

${registrationUrl}

This invitation link will expire in 7 days.

If you did not expect this invitation, you can safely ignore this email.

Best regards,
The Preventli Team
`;

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: #0f766e; padding: 30px; border-radius: 10px 10px 0 0;">
    <h1 style="color: white; margin: 0; font-size: 24px;">Welcome to Preventli</h1>
  </div>
  <div style="background: #f9fafb; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 10px 10px;">
    <p>Hello,</p>
    <p>You've been invited to join <strong>Preventli</strong> as a <strong>${role}</strong> by ${invitedByName}.</p>
    <p>To complete your registration, please click the button below:</p>
    <div style="text-align: center; margin: 30px 0;">
      <a href="${registrationUrl}" style="background: #0f766e; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: 600; display: inline-block;">Complete Registration</a>
    </div>
    <p style="font-size: 14px; color: #6b7280;">This invitation link will expire in 7 days.</p>
    <p style="font-size: 14px; color: #6b7280;">If you did not expect this invitation, you can safely ignore this email.</p>
    <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;">
    <p style="font-size: 12px; color: #9ca3af; margin: 0;">Best regards,<br>The Preventli Team</p>
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

/**
 * Send a welcome email to a newly registered user
 */
export async function sendWelcomeEmail(
  email: string,
  role: string,
  organizationName?: string
): Promise<SendEmailResult> {
  const appUrl = process.env.APP_URL || "http://localhost:5173";
  const orgDisplay = organizationName || "your organisation";

  const subject = "Welcome to Preventli — you're all set";

  const roleLabel = role === "admin" ? "Administrator" : role === "manager" ? "Manager" : role;

  const body = `Welcome to Preventli,

Your account is ready. You've been added to ${orgDisplay} as a ${roleLabel}.

Sign in to get started:
${appUrl}

What you can do with Preventli:
  • Manage WorkCover cases and track return-to-work progress
  • Generate AI-powered RTW plans from medical certificates
  • Run pre-employment health assessments
  • Stay on top of WorkSafe compliance obligations

If you have any questions or run into trouble, reply to this email or contact us at support@preventli.com.au.

The Preventli Team
`;

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #0A1628 0%, #0f766e 100%); padding: 36px 30px; border-radius: 10px 10px 0 0;">
    <h1 style="color: white; margin: 0; font-size: 26px; font-weight: 700; letter-spacing: -0.5px;">Welcome to Preventli</h1>
    <p style="color: rgba(255,255,255,0.75); margin: 8px 0 0; font-size: 15px;">Your account is ready to use.</p>
  </div>
  <div style="background: #f9fafb; padding: 32px 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 10px 10px;">
    <p style="margin-top: 0;">Hi there,</p>
    <p>You've been added to <strong>${orgDisplay}</strong> as a <strong>${roleLabel}</strong>. Your Preventli account is active and ready to go.</p>
    <div style="text-align: center; margin: 32px 0;">
      <a href="${appUrl}" style="background: #0f766e; color: white; padding: 14px 32px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 15px; display: inline-block;">Sign in to Preventli →</a>
    </div>
    <div style="background: white; border: 1px solid #e5e7eb; border-radius: 8px; padding: 20px 24px; margin: 24px 0;">
      <p style="margin: 0 0 12px; font-weight: 600; color: #0A1628; font-size: 14px; text-transform: uppercase; letter-spacing: 0.5px;">What you can do</p>
      <ul style="margin: 0; padding-left: 20px; color: #4b5563; font-size: 14px; line-height: 1.8;">
        <li>Manage WorkCover cases and track return-to-work progress</li>
        <li>Generate AI-powered RTW plans from medical certificates</li>
        <li>Run pre-employment health assessments</li>
        <li>Stay on top of WorkSafe compliance obligations</li>
      </ul>
    </div>
    <p style="font-size: 14px; color: #6b7280; margin-bottom: 0;">Questions? Reply to this email or contact us at <a href="mailto:support@preventli.com.au" style="color: #0f766e;">support@preventli.com.au</a></p>
    <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0 16px;">
    <p style="font-size: 12px; color: #9ca3af; margin: 0;">The Preventli Team<br>
    <a href="https://preventli.com.au" style="color: #9ca3af;">preventli.com.au</a></p>
  </div>
</body>
</html>
`;

  logger.email.info("Sending welcome email", { email, role });

  return sendEmail({
    to: email,
    subject,
    body,
    html,
  });
}

/**
 * Send a password reset email
 */
export async function sendPasswordResetEmail(
  email: string,
  resetToken: string
): Promise<SendEmailResult> {
  const appUrl = process.env.APP_URL || "http://localhost:5173";
  const resetUrl = `${appUrl}/reset-password?token=${resetToken}`;

  const subject = "Reset your Preventli password";

  const body = `Hello,

You requested to reset your password for your Preventli account.

To reset your password, please click the link below:

${resetUrl}

This link will expire in 1 hour.

If you did not request a password reset, you can safely ignore this email. Your password will not be changed.

Best regards,
The Preventli Team
`;

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: #0f766e; padding: 30px; border-radius: 10px 10px 0 0;">
    <h1 style="color: white; margin: 0; font-size: 24px;">Reset Your Password</h1>
  </div>
  <div style="background: #f9fafb; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 10px 10px;">
    <p>Hello,</p>
    <p>You requested to reset your password for your Preventli account.</p>
    <p>To reset your password, please click the button below:</p>
    <div style="text-align: center; margin: 30px 0;">
      <a href="${resetUrl}" style="background: #0f766e; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: 600; display: inline-block;">Reset Password</a>
    </div>
    <p style="font-size: 14px; color: #6b7280;">This link will expire in 1 hour.</p>
    <p style="font-size: 14px; color: #6b7280;">If you did not request a password reset, you can safely ignore this email. Your password will not be changed.</p>
    <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;">
    <p style="font-size: 12px; color: #9ca3af; margin: 0;">Best regards,<br>The Preventli Team</p>
  </div>
</body>
</html>
`;

  logger.email.info("Sending password reset email", { email });

  return sendEmail({
    to: email,
    subject,
    body,
    html,
  });
}
