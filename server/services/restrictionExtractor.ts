/**
 * Restriction Extractor Service
 *
 * Extracts structured FunctionalRestrictions from medical certificate data using Claude Haiku.
 * Used by the RTW Planner Engine to map medical restrictions to job demands.
 *
 * Follows existing pattern from certificateService.ts for Claude API integration.
 */

import Anthropic from "@anthropic-ai/sdk";
import type {
  FunctionalRestrictions,
  FunctionalRestrictionsExtracted,
  RestrictionCapability,
  RestrictionItem,
} from "@shared/schema";
import { logger } from "../lib/logger";

const MODEL = "claude-3-haiku-20240307"; // Same as certificateService.ts

/**
 * Input for extraction - data from medical certificate
 */
export interface RestrictionExtractionInput {
  capacity: string; // "fit" | "partial" | "unfit" | "unknown"
  notes?: string;
  restrictions?: RestrictionItem[];
  workCapacityPercentage?: number;
}

/**
 * Result of restriction extraction
 */
export interface RestrictionExtractionResult {
  restrictions: FunctionalRestrictionsExtracted;
  maxWorkHoursPerDay: number | null;
  maxWorkDaysPerWeek: number | null;
  confidence: number;
  requiresReview: boolean;
}

/**
 * Default restrictions for edge cases
 */
const DEFAULT_NOT_ASSESSED: FunctionalRestrictions = {
  sitting: "not_assessed",
  standingWalking: "not_assessed",
  bending: "not_assessed",
  squatting: "not_assessed",
  kneelingClimbing: "not_assessed",
  twisting: "not_assessed",
  reachingOverhead: "not_assessed",
  reachingForward: "not_assessed",
  neckMovement: "not_assessed",
  lifting: "not_assessed",
  carrying: "not_assessed",
  pushing: "not_assessed",
  pulling: "not_assessed",
  repetitiveMovements: "not_assessed",
  useOfInjuredLimb: "not_assessed",
};

const DEFAULT_CAN_DO_ALL: FunctionalRestrictions = {
  sitting: "can",
  standingWalking: "can",
  bending: "can",
  squatting: "can",
  kneelingClimbing: "can",
  twisting: "can",
  reachingOverhead: "can",
  reachingForward: "can",
  neckMovement: "can",
  lifting: "can",
  carrying: "can",
  pushing: "can",
  pulling: "can",
  repetitiveMovements: "can",
  useOfInjuredLimb: "can",
};

const DEFAULT_CANNOT_DO_ANY: FunctionalRestrictions = {
  sitting: "cannot",
  standingWalking: "cannot",
  bending: "cannot",
  squatting: "cannot",
  kneelingClimbing: "cannot",
  twisting: "cannot",
  reachingOverhead: "cannot",
  reachingForward: "cannot",
  neckMovement: "cannot",
  lifting: "cannot",
  carrying: "cannot",
  pushing: "cannot",
  pulling: "cannot",
  repetitiveMovements: "cannot",
  useOfInjuredLimb: "cannot",
};

/**
 * Build the extraction prompt for Claude
 */
function buildExtractionPrompt(input: RestrictionExtractionInput): string {
  return `Extract functional restrictions from this medical certificate into structured format.

Certificate Data:
- Capacity: ${input.capacity}
- Work Capacity Percentage: ${input.workCapacityPercentage ?? "not specified"}
- Notes: ${input.notes || "none"}
- Existing Restrictions: ${JSON.stringify(input.restrictions || [])}

For each physical demand, determine the worker's capability:
- "can": Worker can perform this activity without limitation
- "with_modifications": Worker can perform with accommodations/modifications
- "cannot": Worker cannot perform this activity
- "not_assessed": Not mentioned or unclear in the certificate

Physical Demands to Classify:
1. sitting - Ability to sit
2. standingWalking - Ability to stand or walk
3. bending - Ability to bend at waist
4. squatting - Ability to squat
5. kneelingClimbing - Ability to kneel or climb
6. twisting - Ability to twist torso
7. reachingOverhead - Ability to reach overhead
8. reachingForward - Ability to reach forward
9. neckMovement - Ability to move neck (flexion/extension/rotation)
10. lifting - Ability to lift (include liftingMaxKg if weight limit specified)
11. carrying - Ability to carry (include carryingMaxKg if weight limit specified)
12. pushing - Ability to push
13. pulling - Ability to pull
14. repetitiveMovements - Ability to perform repetitive movements (include repetitiveMovementsMaxPerHour if limit specified)
15. useOfInjuredLimb - Ability to use the injured body part

Also extract time/rest requirements if mentioned:
- maxWorkHoursPerDay: Maximum hours per day (e.g., "4 hours per day" = 4)
- maxWorkDaysPerWeek: Maximum days per week (e.g., "3 days per week" = 3)
- exerciseMinutesPerHour: Required exercise/stretching minutes per hour
- restMinutesPerHour: Required rest/break minutes per hour

Respond ONLY with valid JSON in this exact format:
{
  "restrictions": {
    "sitting": "can|with_modifications|cannot|not_assessed",
    "standingWalking": "can|with_modifications|cannot|not_assessed",
    "bending": "can|with_modifications|cannot|not_assessed",
    "squatting": "can|with_modifications|cannot|not_assessed",
    "kneelingClimbing": "can|with_modifications|cannot|not_assessed",
    "twisting": "can|with_modifications|cannot|not_assessed",
    "reachingOverhead": "can|with_modifications|cannot|not_assessed",
    "reachingForward": "can|with_modifications|cannot|not_assessed",
    "neckMovement": "can|with_modifications|cannot|not_assessed",
    "lifting": "can|with_modifications|cannot|not_assessed",
    "liftingMaxKg": null,
    "carrying": "can|with_modifications|cannot|not_assessed",
    "carryingMaxKg": null,
    "pushing": "can|with_modifications|cannot|not_assessed",
    "pulling": "can|with_modifications|cannot|not_assessed",
    "repetitiveMovements": "can|with_modifications|cannot|not_assessed",
    "repetitiveMovementsMaxPerHour": null,
    "useOfInjuredLimb": "can|with_modifications|cannot|not_assessed",
    "exerciseMinutesPerHour": null,
    "restMinutesPerHour": null
  },
  "maxWorkHoursPerDay": null,
  "maxWorkDaysPerWeek": null,
  "confidence": 0.8
}

Set confidence (0.0-1.0) based on how clearly restrictions are stated:
- 1.0: Explicit, unambiguous restrictions listed
- 0.7-0.9: Restrictions implied or partially stated
- 0.5-0.7: Vague or minimal information
- <0.5: Cannot determine from provided data`;
}

/**
 * Parse Claude's JSON response
 */
function parseClaudeResponse(text: string): {
  restrictions: FunctionalRestrictionsExtracted;
  maxWorkHoursPerDay: number | null;
  maxWorkDaysPerWeek: number | null;
  confidence: number;
} {
  // Handle potential markdown code blocks
  let jsonStr = text.trim();
  if (jsonStr.startsWith("```json")) {
    jsonStr = jsonStr.slice(7);
  } else if (jsonStr.startsWith("```")) {
    jsonStr = jsonStr.slice(3);
  }
  if (jsonStr.endsWith("```")) {
    jsonStr = jsonStr.slice(0, -3);
  }

  const parsed = JSON.parse(jsonStr.trim());

  // Validate and normalize the response
  const restrictions: FunctionalRestrictionsExtracted = {
    sitting: validateCapability(parsed.restrictions?.sitting),
    standingWalking: validateCapability(parsed.restrictions?.standingWalking),
    bending: validateCapability(parsed.restrictions?.bending),
    squatting: validateCapability(parsed.restrictions?.squatting),
    kneelingClimbing: validateCapability(parsed.restrictions?.kneelingClimbing),
    twisting: validateCapability(parsed.restrictions?.twisting),
    reachingOverhead: validateCapability(parsed.restrictions?.reachingOverhead),
    reachingForward: validateCapability(parsed.restrictions?.reachingForward),
    neckMovement: validateCapability(parsed.restrictions?.neckMovement),
    lifting: validateCapability(parsed.restrictions?.lifting),
    liftingMaxKg: validateWeight(parsed.restrictions?.liftingMaxKg),
    carrying: validateCapability(parsed.restrictions?.carrying),
    carryingMaxKg: validateWeight(parsed.restrictions?.carryingMaxKg),
    pushing: validateCapability(parsed.restrictions?.pushing),
    pulling: validateCapability(parsed.restrictions?.pulling),
    repetitiveMovements: validateCapability(parsed.restrictions?.repetitiveMovements),
    repetitiveMovementsMaxPerHour: validatePositiveNumber(parsed.restrictions?.repetitiveMovementsMaxPerHour),
    useOfInjuredLimb: validateCapability(parsed.restrictions?.useOfInjuredLimb),
    exerciseMinutesPerHour: validatePositiveNumber(parsed.restrictions?.exerciseMinutesPerHour),
    restMinutesPerHour: validatePositiveNumber(parsed.restrictions?.restMinutesPerHour),
    maxWorkHoursPerDay: parsed.maxWorkHoursPerDay > 0 ? parsed.maxWorkHoursPerDay : null,
    maxWorkDaysPerWeek: parsed.maxWorkDaysPerWeek > 0 ? parsed.maxWorkDaysPerWeek : null,
    extractedAt: new Date().toISOString(),
    extractionConfidence: Math.min(1, Math.max(0, parsed.confidence || 0.5)),
  };

  return {
    restrictions,
    maxWorkHoursPerDay: parsed.maxWorkHoursPerDay > 0 ? parsed.maxWorkHoursPerDay : null,
    maxWorkDaysPerWeek: parsed.maxWorkDaysPerWeek > 0 ? parsed.maxWorkDaysPerWeek : null,
    confidence: Math.min(1, Math.max(0, parsed.confidence || 0.5)),
  };
}

/**
 * Validate and normalize capability value
 */
function validateCapability(value: unknown): RestrictionCapability {
  const validValues: RestrictionCapability[] = ["can", "with_modifications", "cannot", "not_assessed"];
  if (typeof value === "string" && validValues.includes(value as RestrictionCapability)) {
    return value as RestrictionCapability;
  }
  return "not_assessed";
}

/**
 * Validate weight limit (0-100kg reasonable range)
 */
function validateWeight(value: unknown): number | undefined {
  if (typeof value === "number" && value > 0 && value <= 100) {
    return value;
  }
  return undefined;
}

/**
 * Validate positive number
 */
function validatePositiveNumber(value: unknown): number | undefined {
  if (typeof value === "number" && value > 0) {
    return value;
  }
  return undefined;
}

/**
 * Extract structured FunctionalRestrictions from certificate data
 *
 * Uses Claude Haiku for semantic interpretation of clinical text.
 * Handles edge cases (fit, unfit, empty notes) with appropriate defaults.
 */
export async function extractFunctionalRestrictions(
  input: RestrictionExtractionInput
): Promise<RestrictionExtractionResult> {
  logger.certificate.info("Starting restriction extraction", {
    capacity: input.capacity,
    hasNotes: !!input.notes,
    restrictionsCount: input.restrictions?.length || 0,
  });

  // Handle edge cases without calling LLM

  // Case 1: Empty/null notes with no restrictions - return not_assessed with low confidence
  const hasUsefulData =
    input.notes?.trim() ||
    (input.restrictions && input.restrictions.length > 0) ||
    input.workCapacityPercentage !== undefined;

  if (!hasUsefulData && input.capacity === "unknown") {
    logger.certificate.info("No usable data - returning not_assessed defaults");
    return {
      restrictions: {
        ...DEFAULT_NOT_ASSESSED,
        extractedAt: new Date().toISOString(),
        extractionConfidence: 0.2,
      },
      maxWorkHoursPerDay: null,
      maxWorkDaysPerWeek: null,
      confidence: 0.2,
      requiresReview: true,
    };
  }

  // Case 2: "fit" capacity with no restrictions - return all "can"
  if (
    input.capacity === "fit" &&
    (!input.restrictions || input.restrictions.length === 0) &&
    !input.notes?.trim()
  ) {
    logger.certificate.info("Fit with no restrictions - returning can defaults");
    return {
      restrictions: {
        ...DEFAULT_CAN_DO_ALL,
        extractedAt: new Date().toISOString(),
        extractionConfidence: 0.9,
      },
      maxWorkHoursPerDay: null,
      maxWorkDaysPerWeek: null,
      confidence: 0.9,
      requiresReview: false,
    };
  }

  // Case 3: "unfit" capacity - return all "cannot"
  if (input.capacity === "unfit") {
    logger.certificate.info("Unfit capacity - returning cannot defaults");
    return {
      restrictions: {
        ...DEFAULT_CANNOT_DO_ANY,
        extractedAt: new Date().toISOString(),
        extractionConfidence: 0.95,
        maxWorkHoursPerDay: 0,
        maxWorkDaysPerWeek: 0,
      },
      maxWorkHoursPerDay: 0,
      maxWorkDaysPerWeek: 0,
      confidence: 0.95,
      requiresReview: false,
    };
  }

  // For "partial" capacity or cases with actual data, use LLM extraction
  if (!process.env.ANTHROPIC_API_KEY) {
    logger.certificate.error("ANTHROPIC_API_KEY not set - cannot extract restrictions");
    return {
      restrictions: {
        ...DEFAULT_NOT_ASSESSED,
        extractedAt: new Date().toISOString(),
        extractionConfidence: 0.1,
      },
      maxWorkHoursPerDay: null,
      maxWorkDaysPerWeek: null,
      confidence: 0.1,
      requiresReview: true,
    };
  }

  try {
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 2048,
      messages: [
        {
          role: "user",
          content: buildExtractionPrompt(input),
        },
      ],
    });

    // Extract text response
    const textContent = response.content.find((c) => c.type === "text");
    if (!textContent || textContent.type !== "text") {
      throw new Error("No text response from Claude");
    }

    // Parse JSON response
    const parsed = parseClaudeResponse(textContent.text);

    logger.certificate.info("Restriction extraction complete", {
      confidence: parsed.confidence,
      maxWorkHoursPerDay: parsed.maxWorkHoursPerDay,
      maxWorkDaysPerWeek: parsed.maxWorkDaysPerWeek,
    });

    return {
      restrictions: parsed.restrictions,
      maxWorkHoursPerDay: parsed.maxWorkHoursPerDay,
      maxWorkDaysPerWeek: parsed.maxWorkDaysPerWeek,
      confidence: parsed.confidence,
      requiresReview: parsed.confidence < 0.8,
    };
  } catch (error) {
    logger.certificate.error("Failed to extract restrictions", {}, error);

    // Return low-confidence defaults on error
    return {
      restrictions: {
        ...DEFAULT_NOT_ASSESSED,
        extractedAt: new Date().toISOString(),
        extractionConfidence: 0.1,
      },
      maxWorkHoursPerDay: null,
      maxWorkDaysPerWeek: null,
      confidence: 0.1,
      requiresReview: true,
    };
  }
}
