/**
 * Alert Service
 *
 * Sends operational alerts when critical systems fail or thresholds are breached.
 *
 * Alert channels (in order of priority):
 *   1. console — always active
 *   2. Slack   — when ALERT_SLACK_WEBHOOK is set
 *   3. Telegram — when ALERT_TELEGRAM_WEBHOOK is set
 *
 * Usage:
 *   await sendAlert({ type: "ai_provider_failure", message: "OpenRouter timeout", details: { ... } });
 */

import { createLogger } from "../lib/logger";

const log = createLogger("AlertService");

// ─── Types ──────────────────────────────────────────────────────────────────

export type AlertType =
  | "ai_provider_failure"
  | "agent_failure_rate"
  | "database_failure"
  | "storage_failure"
  | "email_failure"
  | "health_check_degraded";

export type AlertSeverity = "info" | "warning" | "critical";

export interface Alert {
  type: AlertType;
  severity: AlertSeverity;
  message: string;
  details?: Record<string, unknown>;
}

// ─── In-memory alert log ────────────────────────────────────────────────────
// Holds the last 100 alerts for the Control Tower /api/control/alerts endpoint.

interface StoredAlert extends Alert {
  id: string;
  timestamp: string;
  resolved: boolean;
}

const MAX_STORED = 100;
const alertLog: StoredAlert[] = [];

function storeAlert(alert: Alert): StoredAlert {
  const stored: StoredAlert = {
    ...alert,
    id: crypto.randomUUID(),
    timestamp: new Date().toISOString(),
    resolved: false,
  };
  alertLog.unshift(stored);
  if (alertLog.length > MAX_STORED) alertLog.length = MAX_STORED;
  return stored;
}

// ─── Channel dispatchers ────────────────────────────────────────────────────

async function sendSlack(alert: Alert): Promise<void> {
  const url = process.env.ALERT_SLACK_WEBHOOK;
  if (!url) return;

  const emoji = alert.severity === "critical" ? "🔴" : alert.severity === "warning" ? "🟡" : "🔵";
  const text = `${emoji} *[${alert.type}]* ${alert.message}`;
  const blocks = [
    { type: "section", text: { type: "mrkdwn", text } },
    ...(alert.details
      ? [{
          type: "section",
          text: {
            type: "mrkdwn",
            text: "```" + JSON.stringify(alert.details, null, 2) + "```",
          },
        }]
      : []),
  ];

  try {
    await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, blocks }),
    });
  } catch (err) {
    log.warn("Slack alert delivery failed", {}, err as Error);
  }
}

async function sendTelegram(alert: Alert): Promise<void> {
  const url = process.env.ALERT_TELEGRAM_WEBHOOK;
  if (!url) return;

  const emoji = alert.severity === "critical" ? "🔴" : alert.severity === "warning" ? "🟡" : "🔵";
  const text = [
    `${emoji} <b>[Preventli] ${alert.type}</b>`,
    alert.message,
    alert.details ? `\n<pre>${JSON.stringify(alert.details, null, 2)}</pre>` : "",
  ].join("\n");

  try {
    await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, parse_mode: "HTML" }),
    });
  } catch (err) {
    log.warn("Telegram alert delivery failed", {}, err as Error);
  }
}

// ─── Public API ─────────────────────────────────────────────────────────────

/**
 * Send an operational alert to all configured channels.
 * Always logs to console. Also delivers to Slack/Telegram if webhooks are set.
 * Stores the alert in-memory for the Control Tower dashboard.
 */
export async function sendAlert(alert: Alert): Promise<void> {
  const stored = storeAlert(alert);

  // Console — always
  const logFn = alert.severity === "critical" ? log.error : alert.severity === "warning" ? log.warn : log.info;
  logFn(
    `[ALERT] ${alert.type}: ${alert.message}`,
    { alertId: stored.id, severity: alert.severity, ...alert.details }
  );

  // Async channel delivery — don't throw if channels fail
  await Promise.allSettled([sendSlack(alert), sendTelegram(alert)]);
}

/**
 * Check agent failure rate and alert if it exceeds the threshold.
 * Call this after updating agent job stats (e.g. from a cron or health check).
 */
export async function checkAgentFailureRate(
  completed: number,
  failed: number,
  threshold = 0.3
): Promise<void> {
  const total = completed + failed;
  if (total < 5) return; // Not enough data
  const rate = failed / total;
  if (rate > threshold) {
    await sendAlert({
      type: "agent_failure_rate",
      severity: rate > 0.5 ? "critical" : "warning",
      message: `Agent failure rate is ${(rate * 100).toFixed(0)}% (${failed}/${total} jobs failed)`,
      details: { completed, failed, rate: rate.toFixed(2), threshold },
    });
  }
}

// ─── Alert log accessors (for Control Tower) ────────────────────────────────

export interface AlertSummary {
  activeAlerts: StoredAlert[];
  recentAlerts: StoredAlert[];
  systemFailures: StoredAlert[];
}

export function getAlertSummary(): AlertSummary {
  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const recentAlerts = alertLog.filter((a) => a.timestamp >= cutoff);
  const activeAlerts = recentAlerts.filter(
    (a) => !a.resolved && a.severity !== "info"
  );
  const systemFailures = recentAlerts.filter((a) =>
    ["database_failure", "storage_failure", "ai_provider_failure", "email_failure"].includes(a.type)
  );

  return { activeAlerts, recentAlerts, systemFailures };
}

export function resolveAlert(alertId: string): boolean {
  const alert = alertLog.find((a) => a.id === alertId);
  if (alert) {
    alert.resolved = true;
    return true;
  }
  return false;
}
