/**
 * Structured Logger for GPNet3
 *
 * Features:
 * - Log levels: debug, info, warn, error
 * - Contextual metadata (service name, timestamp)
 * - JSON output in production for log aggregation
 * - Pretty formatting in development
 */

type LogLevel = "debug" | "info" | "warn" | "error";

interface LogMeta {
  [key: string]: unknown;
}

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  service: string;
  message: string;
  meta?: LogMeta;
  error?: {
    name: string;
    message: string;
    stack?: string;
  };
}

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

const isProduction = process.env.NODE_ENV === "production";
const currentLevel = (process.env.LOG_LEVEL as LogLevel) || (isProduction ? "info" : "debug");

function shouldLog(level: LogLevel): boolean {
  return LOG_LEVELS[level] >= LOG_LEVELS[currentLevel];
}

function formatError(error: unknown): LogEntry["error"] | undefined {
  if (!error) return undefined;
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      stack: isProduction ? undefined : error.stack,
    };
  }
  return { name: "UnknownError", message: String(error) };
}

function formatOutput(entry: LogEntry): string {
  if (isProduction) {
    // JSON format for log aggregation (Datadog, CloudWatch, etc.)
    return JSON.stringify(entry);
  }

  // Pretty format for development
  const levelColors: Record<LogLevel, string> = {
    debug: "\x1b[36m", // cyan
    info: "\x1b[32m",  // green
    warn: "\x1b[33m",  // yellow
    error: "\x1b[31m", // red
  };
  const reset = "\x1b[0m";
  const dim = "\x1b[2m";

  const levelStr = `${levelColors[entry.level]}[${entry.level.toUpperCase()}]${reset}`;
  const serviceStr = `${dim}[${entry.service}]${reset}`;
  const timeStr = `${dim}${entry.timestamp.split("T")[1].slice(0, 8)}${reset}`;

  let output = `${timeStr} ${levelStr} ${serviceStr} ${entry.message}`;

  if (entry.meta && Object.keys(entry.meta).length > 0) {
    output += ` ${dim}${JSON.stringify(entry.meta)}${reset}`;
  }

  if (entry.error) {
    output += `\n  ${levelColors.error}${entry.error.name}: ${entry.error.message}${reset}`;
    if (entry.error.stack) {
      output += `\n${dim}${entry.error.stack}${reset}`;
    }
  }

  return output;
}

function log(level: LogLevel, service: string, message: string, meta?: LogMeta, error?: unknown): void {
  if (!shouldLog(level)) return;

  const entry: LogEntry = {
    timestamp: new Date().toISOString(),
    level,
    service,
    message,
    meta: meta && Object.keys(meta).length > 0 ? meta : undefined,
    error: formatError(error),
  };

  const output = formatOutput(entry);

  switch (level) {
    case "error":
      console.error(output);
      break;
    case "warn":
      console.warn(output);
      break;
    default:
      console.log(output);
  }
}

/**
 * Create a logger instance for a specific service/module
 */
export function createLogger(service: string) {
  return {
    debug: (message: string, meta?: LogMeta) => log("debug", service, message, meta),
    info: (message: string, meta?: LogMeta) => log("info", service, message, meta),
    warn: (message: string, meta?: LogMeta, error?: unknown) => log("warn", service, message, meta, error),
    error: (message: string, meta?: LogMeta, error?: unknown) => log("error", service, message, meta, error),
  };
}

// Pre-configured loggers for common services
export const logger = {
  auth: createLogger("Auth"),
  api: createLogger("API"),
  db: createLogger("Database"),
  freshdesk: createLogger("Freshdesk"),
  notification: createLogger("Notification"),
  certificate: createLogger("Certificate"),
  email: createLogger("Email"),
  webhook: createLogger("Webhook"),
  pdf: createLogger("PDF"),
  ai: createLogger("AI"),
  audit: createLogger("Audit"),
  server: createLogger("Server"),
  sync: createLogger("Sync"),
  compliance: createLogger("Compliance"),
};

export type Logger = ReturnType<typeof createLogger>;
