import path from "node:path";

export interface ParsedTranscriptNote {
  workerName: string;
  timestamp: Date;
  rawText: string;
  summary: string;
  nextSteps: string[];
  riskFlags: string[];
  updatesCompliance: boolean;
  updatesRecoveryTimeline: boolean;
}

interface TranscriptSection {
  workerName: string | null;
  body: string;
  timestamp?: Date;
}

const NEXT_STEP_REGEX = /(?:next steps?|action items?|follow[-\s]?ups?)[:\-]\s*(.+)/gi;
const BULLET_REGEX = /^\s*[-*•]\s*(.+)$/gim;
const RISK_KEYWORDS: Array<{ regex: RegExp; label: string }> = [
  { regex: /non-?compliance|breach|policy issue/i, label: "Compliance risk" },
  { regex: /missed appointment|no show|dna|did not attend/i, label: "Attendance risk" },
  { regex: /escalat|high risk|red flag/i, label: "High risk escalation" },
  { regex: /delay|stalled|no progress/i, label: "Timeline delay" },
  { regex: /certificate pending|capacity change|fit note/i, label: "Medical certificate update" },
];

export function parseTranscriptFile(
  filePath: string,
  contents: string,
  fallbackTimestamp: Date = new Date(),
): ParsedTranscriptNote[] {
  const normalized = normalizeContents(contents, filePath);
  const sections = splitIntoSections(normalized);
  const fallbackWorker = deriveWorkerNameFromFilename(path.basename(filePath));

  return sections
    .map((section): ParsedTranscriptNote | null => {
      const workerName =
        section.workerName ??
        extractWorkerNameFromBody(section.body) ??
        fallbackWorker;
      if (!workerName) {
        return null;
      }

      const timestamp =
        section.timestamp ??
        extractTimestampFromBody(section.body) ??
        fallbackTimestamp;

      const cleanBody = section.body.trim();
      if (!cleanBody) {
        return null;
      }

      const summary = buildSummary(cleanBody);
      const nextSteps = extractNextSteps(cleanBody);
      const riskFlags = extractRiskFlags(cleanBody);
      const updatesCompliance =
        /compliance|policy|worksafe|breach|audit/i.test(cleanBody) ||
        riskFlags.some((flag) => /compliance|breach/i.test(flag));
      const updatesRecoveryTimeline = /certificate|capacity|rehab|surgery|treatment|therapy|assessment/i.test(
        cleanBody,
      );

      return {
        workerName,
        timestamp,
        rawText: cleanBody,
        summary,
        nextSteps,
        riskFlags,
        updatesCompliance,
        updatesRecoveryTimeline,
      };
    })
    .filter((note): note is ParsedTranscriptNote => Boolean(note));
}

function normalizeContents(contents: string, filePath: string): string {
  let text = contents.replace(/\r\n/g, "\n").replace(/\uFEFF/g, "").trim();
  if (filePath.toLowerCase().endsWith(".vtt")) {
    text = stripVttArtifacts(text);
  }
  return text;
}

function stripVttArtifacts(text: string): string {
  return text
    .replace(/^WEBVTT.*$/gim, "")
    .replace(/^\d+\s*$/gm, "")
    .replace(
      /^\d{2}:\d{2}:\d{2}\.\d{3}\s*-->\s*\d{2}:\d{2}:\d{2}\.\d{3}.*$/gm,
      "",
    )
    .trim();
}

function splitIntoSections(text: string): TranscriptSection[] {
  const dividerSections = text.split(/\n-{3,}\n/);
  if (dividerSections.length > 1) {
    return dividerSections.map((body) => ({
      workerName: null,
      body: body.trim(),
    }));
  }

  const lines = text.split("\n");
  const sections: TranscriptSection[] = [];
  let currentLines: string[] = [];
  let currentWorker: string | null = null;
  let currentTimestamp: Date | undefined;

  const flush = () => {
    if (currentLines.length === 0) {
      return;
    }
    sections.push({
      workerName: currentWorker,
      body: currentLines.join("\n").trim(),
      timestamp: currentTimestamp,
    });
    currentLines = [];
    currentWorker = null;
    currentTimestamp = undefined;
  };

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) {
      currentLines.push(rawLine);
      continue;
    }

    const headerMatch = line.match(
      /^(?:#{1,3}\s+|Worker\s*(?:notes)?[:\-]\s*|Case\s*(?:notes)?[:\-]\s*)(.+)$/i,
    );
    if (headerMatch) {
      flush();
      currentWorker = formatWorkerName(headerMatch[1]);
      continue;
    }

    const bracketMatch = line.match(/^\[(.+?)\]$/);
    if (bracketMatch && /worker\s*:\s*/i.test(bracketMatch[1])) {
      flush();
      currentWorker = formatWorkerName(bracketMatch[1].split(":")[1]);
      continue;
    }

    const timestamp = parseTimestampFromLine(line);
    if (timestamp) {
      currentTimestamp = timestamp;
    }

    currentLines.push(rawLine);
  }

  flush();
  if (sections.length === 0) {
    return [
      {
        workerName: null,
        body: text.trim(),
      },
    ];
  }
  return sections;
}

function extractWorkerNameFromBody(body: string): string | null {
  const workerLine = body.match(/^(?:Worker|Case)\s*[:\-]\s*(.+)$/im);
  if (workerLine) {
    return formatWorkerName(workerLine[1]);
  }

  const participantLine = body.match(/Participant\s*:\s*(.+)$/im);
  if (participantLine) {
    return formatWorkerName(participantLine[1]);
  }

  return null;
}

function deriveWorkerNameFromFilename(filename: string): string | null {
  const base = filename.replace(/\.[^.]+$/, "");
  if (!base) return null;
  const cleaned = base
    .replace(/[_-]+/g, " ")
    .replace(/\b(transcript|call|notes?|discussion|meeting|latest)\b/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!cleaned) return null;
  return formatWorkerName(cleaned);
}

function formatWorkerName(value?: string | null): string | null {
  if (!value) return null;
  const cleaned = value
    .replace(/^(?:worker|case)\b\s*[:\-]?\s*/i, "")
    .replace(/[^a-zA-Z\s']/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!cleaned) return null;
  return cleaned
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
}

function parseTimestampFromLine(line: string): Date | undefined {
  const isoMatch = line.match(
    /\b(\d{4}-\d{2}-\d{2})[ T](\d{2}:\d{2})(?::\d{2})?\b/,
  );
  if (isoMatch) {
    const date = new Date(`${isoMatch[1]}T${isoMatch[2]}:00Z`);
    if (!Number.isNaN(date.getTime())) {
      return date;
    }
  }

  const readableMatch = line.match(
    /\b(\d{1,2})\s+([A-Za-z]{3,9})\s+(\d{4})(?:\s+(\d{1,2}:\d{2}))?\b/,
  );
  if (readableMatch) {
    const [_, day, month, year, time] = readableMatch;
    const base = `${day} ${month} ${year} ${time ?? "09:00"}`;
    const date = new Date(base);
    if (!Number.isNaN(date.getTime())) {
      return date;
    }
  }

  return undefined;
}

function extractTimestampFromBody(body: string): Date | undefined {
  const lines = body.split("\n");
  for (const line of lines) {
    const parsed = parseTimestampFromLine(line.trim());
    if (parsed) {
      return parsed;
    }
  }
  return undefined;
}

function buildSummary(text: string): string {
  const sentences = text
    .replace(/\s+/g, " ")
    .split(/(?<=[.?!])\s+/)
    .filter(Boolean);

  const summary = sentences.slice(0, 2).join(" ");
  if (summary.length > 360) {
    return summary.slice(0, 357) + "...";
  }
  return summary || text.slice(0, 360);
}

function extractNextSteps(text: string): string[] {
  const steps = new Set<string>();
  NEXT_STEP_REGEX.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = NEXT_STEP_REGEX.exec(text)) !== null) {
    steps.add(cleanSentence(match[1]));
  }
  BULLET_REGEX.lastIndex = 0;
  while ((match = BULLET_REGEX.exec(text)) !== null) {
    if (/review|submit|notify|call|email|book|schedule|follow|attend/i.test(match[1])) {
      steps.add(cleanSentence(match[1]));
    }
  }
  return Array.from(steps).slice(0, 5);
}

function extractRiskFlags(text: string): string[] {
  const flags = new Set<string>();
  for (const entry of RISK_KEYWORDS) {
    if (entry.regex.test(text)) {
      flags.add(entry.label);
    }
  }
  return Array.from(flags);
}

function cleanSentence(input: string): string {
  return input.replace(/\s+/g, " ").trim();
}
