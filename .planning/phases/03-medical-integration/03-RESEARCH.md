# Phase 3: Medical Integration - Research

**Researched:** 2026-01-28
**Domain:** Medical certificate restriction extraction and mapping to RTW job demands
**Confidence:** HIGH

## Summary

Phase 3 bridges medical certificate data with the RTW Planner Engine by extracting structured functional restrictions from existing certificate records and mapping them to job demand categories defined in Phase 1. The challenge is transforming semi-structured restriction data (free-text descriptions and basic RestrictionItem types) into the detailed FunctionalRestrictions interface that matches the DutyPhysicalDemands and DutyCognitiveDemands structures.

**Current State:** Medical certificates already have a `restrictions` JSONB field containing RestrictionItem arrays with basic categorization (modified_duties, no_lifting, reduced_hours, work_from_home, other). The schema also has MedicalConstraints and FunctionalCapacity interfaces in the clinical_status_json field, but these are underutilized.

**Target State:** Extract and structure restrictions into the FunctionalRestrictions interface (defined in Phase 1) which uses RestrictionCapability ("can" | "with_modifications" | "cannot" | "not_assessed") for each physical/cognitive demand category, matching the DutyPhysicalDemands structure for seamless comparison.

**Primary recommendation:** Use Claude Haiku (already in use for certificate OCR) with a structured extraction prompt to parse existing certificate restrictions and notes into FunctionalRestrictions format. Store in medical_certificates.rawExtractedData or a new functionalRestrictionsJson field. Display current restrictions on RTW planning screen by querying the most recent certificate where isCurrentCertificate = true.

## Standard Stack

The established libraries/tools for this domain:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Anthropic Claude API | 3.x (Haiku) | Structured data extraction from clinical text | Already integrated for certificate OCR, fast and cost-effective for extraction tasks |
| Drizzle ORM | Current | Database schema and queries | Project standard, type-safe access to medical_certificates table |
| Zod | Current | Validation of extracted restriction data | Project standard for runtime validation |
| PostgreSQL JSONB | 14+ | Flexible storage for restriction data | Already used for restrictions field, allows structured queries |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| TanStack Query | Current (frontend) | Caching restriction data for RTW screen | When displaying current restrictions on planning UI |
| Date-fns | Current | Date comparisons for "current" certificate | Determining which certificate is active based on dates |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Claude Haiku | GPT-4 mini | Claude Haiku is already integrated, similar performance for structured extraction, lower cost |
| Custom NLP | Regex patterns | Regex too brittle for clinical variation, LLM handles terminology flexibility better |
| Manual mapping | UI form for clinicians | Manual entry time-consuming, prone to data entry errors, doesn't scale to existing certificates |

**Installation:**
No new packages required - leverages existing Anthropic integration in server/services/certificateService.ts

## Architecture Patterns

### Recommended Project Structure
```
server/
├── services/
│   ├── certificateService.ts        # Existing: OCR extraction
│   ├── restrictionExtractor.ts      # NEW: Parse restrictions to FunctionalRestrictions
│   └── restrictionMapper.ts         # NEW: Map to demand categories
├── routes/
│   └── medicalRestrictions.ts       # NEW: API endpoints for restriction data
client/src/
├── components/
│   └── rtw/
│       └── CurrentRestrictionsPanel.tsx  # NEW: Display active restrictions
└── lib/
    └── restrictionUtils.ts          # NEW: Client-side formatting helpers
```

### Pattern 1: Two-Phase Extraction
**What:** First extract raw restriction data from certificate, then structure it into FunctionalRestrictions format
**When to use:** When processing existing certificates or new certificate uploads
**Example:**
```typescript
// Phase 1: Extract from certificate (existing or enhanced)
const ocrData = await extractFromDocument(document);

// Phase 2: Structure into FunctionalRestrictions
const functionalRestrictions = await extractFunctionalRestrictions(
  ocrData.extractedFields.restrictions,
  certificate.notes,
  certificate.capacity
);

// Store in medical_certificates table
await storage.updateCertificate(certificateId, {
  rawExtractedData: ocrData,
  functionalRestrictionsJson: functionalRestrictions, // NEW field
});
```

### Pattern 2: Current Restrictions Query
**What:** Retrieve active restrictions for a case by finding the current certificate
**When to use:** When displaying restrictions on RTW planning screen
**Example:**
```typescript
// Source: Project pattern (storage.ts pattern)
async function getCurrentRestrictions(caseId: string): Promise<FunctionalRestrictions | null> {
  // Find current certificate (isCurrentCertificate = true OR most recent endDate > today)
  const cert = await db.select()
    .from(medicalCertificates)
    .where(
      and(
        eq(medicalCertificates.caseId, caseId),
        or(
          eq(medicalCertificates.isCurrentCertificate, true),
          gte(medicalCertificates.endDate, new Date())
        )
      )
    )
    .orderBy(desc(medicalCertificates.endDate))
    .limit(1);

  return cert?.functionalRestrictionsJson || null;
}
```

### Pattern 3: Multi-Certificate Aggregation (Most Restrictive Wins)
**What:** When multiple active certificates exist, combine restrictions using most restrictive logic
**When to use:** Edge case where worker has overlapping certificates from different practitioners
**Example:**
```typescript
function combineRestrictions(restrictions: FunctionalRestrictions[]): FunctionalRestrictions {
  // Most restrictive logic: cannot > with_modifications > can > not_assessed
  const priorityMap = { cannot: 3, with_modifications: 2, can: 1, not_assessed: 0 };

  return {
    lifting: getMostRestrictive(restrictions.map(r => r.lifting)),
    liftingMaxKg: getMinimum(restrictions.map(r => r.liftingMaxKg).filter(Boolean)),
    // ... repeat for all fields
  };
}
```

### Pattern 4: Structured LLM Extraction Prompt
**What:** Use Claude with explicit schema to extract FunctionalRestrictions from certificate text
**When to use:** When processing certificate notes or restriction descriptions
**Example:**
```typescript
// Prompt template for Claude Haiku
const prompt = `Extract functional restrictions from this medical certificate into structured format.

Certificate capacity: ${certificate.capacity}
Notes: ${certificate.notes}
Existing restrictions: ${JSON.stringify(certificate.restrictions)}

For each physical/cognitive demand, determine the worker's capability:
- "can": Worker can perform this activity
- "with_modifications": Worker can perform with accommodations
- "cannot": Worker cannot perform this activity
- "not_assessed": Not mentioned in certificate

Physical demands:
- sitting, standingWalking, bending, squatting, kneelingClimbing, twisting
- reachingOverhead, reachingForward, neckMovement
- lifting (include liftingMaxKg if specified), carrying (include carryingMaxKg)
- pushing, pulling, repetitiveMovements, useOfInjuredLimb

Cognitive demands:
- concentration, stressTolerance, workPace

Time limits:
- maxWorkHoursPerDay, maxWorkDaysPerWeek (from "reduced hours" restrictions)
- exerciseMinutesPerHour, restMinutesPerHour (if specified)

Respond ONLY with valid JSON matching this schema:
${JSON.stringify(FunctionalRestrictionsSchema)}`;
```

### Anti-Patterns to Avoid
- **Overwriting existing data**: Never replace certificate.restrictions - augment with functionalRestrictionsJson instead
- **Ignoring capacity field**: Capacity ("fit"/"partial"/"unfit") provides high-level context for interpreting restrictions
- **Assuming single certificate**: Always query for current/active certificates, not just the latest one
- **Hardcoded restriction parsing**: Use LLM for flexibility rather than regex/keyword matching

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Medical text parsing | Regex patterns for "no lifting", "seated work" | Claude Haiku with structured prompt | Clinical language has infinite variation - "avoid lifting", "limit overhead work", "no heavy manual handling" all mean similar things. LLMs handle synonym/terminology flexibility. |
| Date range queries for "current" certificate | Custom date logic | Existing isCurrentCertificate flag + endDate comparison | Flag already exists in schema, don't duplicate date logic |
| Restriction combination logic | Manual field-by-field comparison | Standard "most restrictive wins" algorithm | Weight-based priority system (cannot=3, with_mods=2, can=1) handles all edge cases |
| JSONB field validation | Manual JSON parsing | Zod schema validation | Type-safe validation already project standard |

**Key insight:** Medical restriction extraction is a natural language understanding problem, not a data parsing problem. Free-text clinical notes require semantic interpretation (LLM) rather than pattern matching (regex).

## Common Pitfalls

### Pitfall 1: Assuming Structured Certificate Data
**What goes wrong:** Expecting all certificates to have clean, structured restriction fields
**Why it happens:** Medical certificates vary widely - some are handwritten scans, some are typed PDFs, some are from different clinics with different formats (WorkSafe Victoria standard form vs. GP letter vs. specialist report)
**How to avoid:**
- Always fall back to extracting from notes field if restrictions array is empty
- Handle OCR errors gracefully with confidence scoring
- Mark low-confidence extractions for review (requiresReview flag)
**Warning signs:** Empty functionalRestrictionsJson despite certificate having notes; extraction confidence < 0.8

### Pitfall 2: Ignoring Certificate Versioning and Overlap
**What goes wrong:** Displaying restrictions from an expired certificate, or not handling overlapping certificates from different practitioners
**Why it happens:** Workers may see multiple practitioners (GP + physiotherapist + specialist), each issuing certificates with different restriction interpretations
**How to avoid:**
- Query by isCurrentCertificate flag AND endDate >= today
- When multiple current certificates exist, combine using "most restrictive wins" logic
- Document the aggregation in UI ("Combined from 2 active certificates")
**Warning signs:** Worker says they can do something but system shows "cannot"; restrictions change unexpectedly when new certificate added

### Pitfall 3: Mapping Restriction Types to Wrong Demand Categories
**What goes wrong:** "modified_duties" restriction type doesn't map to specific FunctionalRestrictions fields
**Why it happens:** RestrictionItem.type is too generic - "modified_duties" could mean anything (no lifting, seated only, reduced hours, etc.)
**How to avoid:**
- Always read restriction.description text, not just restriction.type
- Use LLM to extract specific capabilities from description
- Map "reduced_hours" to maxWorkHoursPerDay/maxWorkDaysPerWeek
- Map "no_lifting" to lifting: "cannot" + liftingMaxKg: 0
**Warning signs:** FunctionalRestrictions has all fields as "not_assessed" despite certificate having restrictions

### Pitfall 4: Not Handling Partial/Percentage-Based Capacity
**What goes wrong:** Certificate says "50% capacity" but unclear which demands are restricted
**Why it happens:** WorkSafe Victoria certificates have workCapacityPercentage field, but this doesn't specify which duties are affected
**How to avoid:**
- Use percentage as a signal to look deeper into notes/restrictions
- If notes are vague, mark as "with_modifications" rather than guessing
- Prompt LLM to infer likely restrictions based on injury type + capacity %
**Warning signs:** workCapacityPercentage is set but functionalRestrictions is empty

### Pitfall 5: Hardcoding Hours/Days Extraction
**What goes wrong:** Parsing "4 hours per day" with regex fails for "half days" or "20 hours per week"
**Why it happens:** Clinical language is highly variable
**How to avoid:**
- Use LLM to normalize time expressions to maxWorkHoursPerDay and maxWorkDaysPerWeek
- Handle both daily and weekly limits
- Convert "half days" to 4 hours, "20 hours/week" to maxWorkDaysPerWeek calculation
**Warning signs:** Restrictions say "reduced hours" but maxWorkHoursPerDay is undefined

### Pitfall 6: Not Validating Weight Limits
**What goes wrong:** Extracting "no lifting over 5kg" but not validating kg vs. lbs, or missing decimal points
**Why it happens:** Some practitioners use imperial units, typos happen ("5kg" vs "5.0kg" vs "50kg")
**How to avoid:**
- Validate extracted weights are reasonable (0-100kg range)
- Flag outliers for review (lifting > 50kg is unusual for restrictions)
- Normalize lbs to kg if detected
**Warning signs:** liftingMaxKg shows extreme values like 500 or 0.5

## Code Examples

Verified patterns from Phase 1 schema and existing certificate service:

### Extraction Service Interface
```typescript
// server/services/restrictionExtractor.ts
import Anthropic from "@anthropic-ai/sdk";
import type { FunctionalRestrictions, MedicalCertificateDB, RestrictionItem } from "@shared/schema";
import { logger } from "../lib/logger";

const MODEL = "claude-3-haiku-20240307"; // Same as existing certificateService.ts

interface RestrictionExtractionRequest {
  capacity: "fit" | "partial" | "unfit" | "unknown";
  notes?: string;
  restrictions?: RestrictionItem[];
  workCapacityPercentage?: number;
}

/**
 * Extract structured FunctionalRestrictions from certificate data
 * Uses Claude Haiku for semantic interpretation of clinical text
 */
export async function extractFunctionalRestrictions(
  input: RestrictionExtractionRequest
): Promise<{ restrictions: FunctionalRestrictions; confidence: number }> {

  const prompt = buildRestrictionExtractionPrompt(input);

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });

  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 2048,
    messages: [{
      role: "user",
      content: prompt,
    }],
  });

  const textContent = response.content.find(c => c.type === "text");
  if (!textContent || textContent.type !== "text") {
    throw new Error("No text response from Claude");
  }

  // Parse JSON response
  const parsed = parseClaudeResponse(textContent.text);

  logger.certificate.info("Restriction extraction complete", {
    confidence: parsed.confidence
  });

  return parsed;
}

function buildRestrictionExtractionPrompt(input: RestrictionExtractionRequest): string {
  return `Extract functional restrictions from this medical certificate.

Capacity: ${input.capacity}
Work Capacity %: ${input.workCapacityPercentage || "not specified"}
Notes: ${input.notes || "none"}
Existing Restrictions: ${JSON.stringify(input.restrictions || [])}

For each demand, classify worker capability:
- "can": Worker can perform without limitation
- "with_modifications": Can perform with accommodations/modifications
- "cannot": Worker cannot perform this activity
- "not_assessed": Not mentioned in certificate

Respond ONLY with valid JSON:
{
  "restrictions": {
    // Physical demands
    "sitting": "can|with_modifications|cannot|not_assessed",
    "standingWalking": "...",
    "bending": "...",
    "squatting": "...",
    "kneelingClimbing": "...",
    "twisting": "...",
    "reachingOverhead": "...",
    "reachingForward": "...",
    "neckMovement": "...",
    "lifting": "...",
    "liftingMaxKg": number or null,
    "carrying": "...",
    "carryingMaxKg": number or null,
    "pushing": "...",
    "pulling": "...",
    "repetitiveMovements": "...",
    "useOfInjuredLimb": "...",

    // Time/rest requirements
    "exerciseMinutesPerHour": number or null,
    "restMinutesPerHour": number or null,
    "constraintDurationWeeks": number or null,
    "nextExaminationDate": "YYYY-MM-DD or null"
  },
  "maxWorkHoursPerDay": number or null,
  "maxWorkDaysPerWeek": number or null,
  "confidence": 0.0-1.0
}`;
}
```

### Current Restrictions Query
```typescript
// server/storage.ts addition
async getCurrentRestrictions(
  caseId: string,
  organizationId: string
): Promise<FunctionalRestrictions | null> {
  // Find active certificates (isCurrentCertificate OR endDate >= today)
  const certs = await this.db.select()
    .from(medicalCertificates)
    .where(
      and(
        eq(medicalCertificates.caseId, caseId),
        gte(medicalCertificates.endDate, new Date())
      )
    )
    .orderBy(desc(medicalCertificates.endDate));

  if (certs.length === 0) return null;

  // If multiple active certificates, combine using most restrictive logic
  if (certs.length > 1) {
    const restrictions = certs
      .map(c => c.rawExtractedData?.functionalRestrictions)
      .filter(Boolean) as FunctionalRestrictions[];

    return combineRestrictions(restrictions);
  }

  // Single certificate
  return certs[0].rawExtractedData?.functionalRestrictions || null;
}
```

### Most Restrictive Combination
```typescript
// server/services/restrictionMapper.ts
import type { FunctionalRestrictions, RestrictionCapability } from "@shared/schema";

const CAPABILITY_PRIORITY: Record<RestrictionCapability, number> = {
  cannot: 3,
  with_modifications: 2,
  can: 1,
  not_assessed: 0,
};

function getMostRestrictive(capabilities: RestrictionCapability[]): RestrictionCapability {
  return capabilities.reduce((most, current) =>
    CAPABILITY_PRIORITY[current] > CAPABILITY_PRIORITY[most] ? current : most
  );
}

export function combineRestrictions(
  restrictionsList: FunctionalRestrictions[]
): FunctionalRestrictions {
  if (restrictionsList.length === 0) {
    throw new Error("Cannot combine empty restrictions list");
  }

  if (restrictionsList.length === 1) {
    return restrictionsList[0];
  }

  return {
    sitting: getMostRestrictive(restrictionsList.map(r => r.sitting)),
    standingWalking: getMostRestrictive(restrictionsList.map(r => r.standingWalking)),
    bending: getMostRestrictive(restrictionsList.map(r => r.bending)),
    squatting: getMostRestrictive(restrictionsList.map(r => r.squatting)),
    kneelingClimbing: getMostRestrictive(restrictionsList.map(r => r.kneelingClimbing)),
    twisting: getMostRestrictive(restrictionsList.map(r => r.twisting)),
    reachingOverhead: getMostRestrictive(restrictionsList.map(r => r.reachingOverhead)),
    reachingForward: getMostRestrictive(restrictionsList.map(r => r.reachingForward)),
    neckMovement: getMostRestrictive(restrictionsList.map(r => r.neckMovement)),
    lifting: getMostRestrictive(restrictionsList.map(r => r.lifting)),
    liftingMaxKg: Math.min(...restrictionsList.map(r => r.liftingMaxKg || Infinity).filter(v => v !== Infinity)) || undefined,
    carrying: getMostRestrictive(restrictionsList.map(r => r.carrying)),
    carryingMaxKg: Math.min(...restrictionsList.map(r => r.carryingMaxKg || Infinity).filter(v => v !== Infinity)) || undefined,
    pushing: getMostRestrictive(restrictionsList.map(r => r.pushing)),
    pulling: getMostRestrictive(restrictionsList.map(r => r.pulling)),
    repetitiveMovements: getMostRestrictive(restrictionsList.map(r => r.repetitiveMovements)),
    useOfInjuredLimb: getMostRestrictive(restrictionsList.map(r => r.useOfInjuredLimb)),

    exerciseMinutesPerHour: Math.max(...restrictionsList.map(r => r.exerciseMinutesPerHour || 0)),
    restMinutesPerHour: Math.max(...restrictionsList.map(r => r.restMinutesPerHour || 0)),
    constraintDurationWeeks: Math.max(...restrictionsList.map(r => r.constraintDurationWeeks || 0)) || undefined,
    nextExaminationDate: restrictionsList
      .map(r => r.nextExaminationDate)
      .filter(Boolean)
      .sort()[0], // Earliest review date
  };
}
```

### API Endpoint
```typescript
// server/routes/medicalRestrictions.ts
import { Router } from "express";
import { authorize, requireCaseOwnership } from "../middleware/auth";
import { storage } from "../storage";
import { logger } from "../lib/logger";

const router = Router();

/**
 * GET /api/cases/:id/current-restrictions
 * Returns current medical restrictions for RTW planning screen
 */
router.get("/cases/:id/current-restrictions",
  authorize(),
  requireCaseOwnership(),
  async (req, res) => {
    try {
      const restrictions = await storage.getCurrentRestrictions(
        req.params.id,
        req.user!.organizationId
      );

      if (!restrictions) {
        return res.status(404).json({
          error: "No current medical certificate with restrictions found"
        });
      }

      res.json({
        restrictions,
        source: "medical_certificate",
        lastUpdated: new Date().toISOString(),
      });
    } catch (err) {
      logger.api.error("Failed to fetch current restrictions", {}, err);
      res.status(500).json({
        error: "Failed to fetch restrictions",
        details: err instanceof Error ? err.message : "Unknown error"
      });
    }
  }
);

export default router;
```

### UI Component
```typescript
// client/src/components/rtw/CurrentRestrictionsPanel.tsx
import { useQuery } from "@tanstack/react-query";
import type { FunctionalRestrictions } from "@shared/schema";

interface Props {
  caseId: string;
}

export function CurrentRestrictionsPanel({ caseId }: Props) {
  const { data, isLoading, error } = useQuery({
    queryKey: ["current-restrictions", caseId],
    queryFn: () =>
      fetch(`/api/cases/${caseId}/current-restrictions`)
        .then(r => r.json()),
  });

  if (isLoading) return <div>Loading restrictions...</div>;
  if (error) return <div>No current restrictions on file</div>;

  const restrictions: FunctionalRestrictions = data.restrictions;

  return (
    <div className="space-y-4">
      <h3 className="font-semibold">Current Medical Restrictions</h3>

      <RestrictionCategory
        title="Mobility"
        items={[
          { label: "Sitting", value: restrictions.sitting },
          { label: "Standing/Walking", value: restrictions.standingWalking },
          { label: "Bending", value: restrictions.bending },
          { label: "Squatting", value: restrictions.squatting },
        ]}
      />

      <RestrictionCategory
        title="Manual Handling"
        items={[
          { label: "Lifting", value: restrictions.lifting, max: restrictions.liftingMaxKg },
          { label: "Carrying", value: restrictions.carrying, max: restrictions.carryingMaxKg },
          { label: "Pushing", value: restrictions.pushing },
          { label: "Pulling", value: restrictions.pulling },
        ]}
      />

      {(restrictions.maxWorkHoursPerDay || restrictions.maxWorkDaysPerWeek) && (
        <div className="border-t pt-2">
          <div className="text-sm font-medium">Time Limits</div>
          {restrictions.maxWorkHoursPerDay && (
            <div>Max hours/day: {restrictions.maxWorkHoursPerDay}</div>
          )}
          {restrictions.maxWorkDaysPerWeek && (
            <div>Max days/week: {restrictions.maxWorkDaysPerWeek}</div>
          )}
        </div>
      )}
    </div>
  );
}

function RestrictionCategory({ title, items }: {
  title: string;
  items: { label: string; value: string; max?: number }[]
}) {
  const getIcon = (value: string) => {
    switch (value) {
      case "can": return "✓";
      case "with_modifications": return "⚠";
      case "cannot": return "✗";
      default: return "?";
    }
  };

  const getColor = (value: string) => {
    switch (value) {
      case "can": return "text-green-600";
      case "with_modifications": return "text-yellow-600";
      case "cannot": return "text-red-600";
      default: return "text-gray-400";
    }
  };

  return (
    <div>
      <div className="text-sm font-medium mb-1">{title}</div>
      <div className="space-y-1">
        {items.map(item => (
          <div key={item.label} className="flex items-center gap-2 text-sm">
            <span className={getColor(item.value)}>{getIcon(item.value)}</span>
            <span>{item.label}</span>
            {item.max !== undefined && (
              <span className="text-gray-500">(max {item.max}kg)</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Manual restriction entry | LLM-based extraction from certificate text | 2024-2025 (LLM adoption) | Faster processing, handles clinical language variation, scales to existing certificates |
| Generic restriction types | Structured FunctionalRestrictions interface | Phase 1 (RTW Planner) | Direct mapping to job demands, enables automated suitability evaluation |
| Single certificate query | Multi-certificate aggregation with "most restrictive" logic | WorkSafe compliance requirement | Handles multiple practitioners issuing overlapping certificates |
| String-based capacity | WorkSafe Victoria standard capacity enum + percentage | WorkSafe Victoria form updates (2023+) | Standardized reporting, percentage provides granularity |

**Deprecated/outdated:**
- Free-text restriction parsing with regex - Too brittle for clinical language variation
- Storing restrictions only in notes field - Need structured data for programmatic comparison
- Assuming single active certificate - Workers often have overlapping certificates from multiple practitioners

## Open Questions

1. **Should we backfill existing certificates with FunctionalRestrictions?**
   - What we know: ~200+ existing certificates in production with only RestrictionItem data
   - What's unclear: Performance impact of batch extraction, prioritization logic
   - Recommendation: Start with new certificates only, add batch extraction job for high-priority cases (off work, planning RTW) as Phase 3.5

2. **How to handle missing or low-confidence extractions?**
   - What we know: Some certificates are poor quality scans, handwritten, or incomplete
   - What's unclear: Should we show partial restrictions or hide entirely? Flag for manual review?
   - Recommendation: Show with confidence indicator, flag requiresReview for confidence < 0.8, allow manual override

3. **Should FunctionalRestrictions be stored in medical_certificates or separate table?**
   - What we know: Phase 1 defined FunctionalRestrictions interface but didn't specify storage location
   - What's unclear: JSONB in rawExtractedData vs. new functionalRestrictionsJson field vs. separate rtw_medical_restrictions table
   - Recommendation: Add functionalRestrictionsJson field to medical_certificates for single-table query simplicity

4. **How to handle cognitive restrictions extraction?**
   - What we know: Cognitive demands (concentration, stress tolerance, work pace) are harder to extract from certificates
   - What's unclear: Certificates rarely specify cognitive restrictions explicitly, mostly inferred from psychological injury diagnosis
   - Recommendation: Extract when mentioned, otherwise mark as "not_assessed". Phase 4 (Functional Ability Matrix) can add manual cognitive assessment UI

## Sources

### Primary (HIGH confidence)
- Existing codebase analysis:
  - `shared/schema.ts` (lines 1-1866) - Confirmed FunctionalRestrictions interface, RestrictionItem structure, medical_certificates table schema
  - `server/services/certificateService.ts` (lines 1-301) - Verified Claude Haiku integration for OCR extraction
  - `.planning/phases/phase-1-database-schema/PLAN.md` - Confirmed DutyPhysicalDemands and FunctionalRestrictions design decisions

- [WorkSafe Victoria Certificate of Capacity](https://www.worksafe.vic.gov.au/certificate-capacity-health-providers) - Official documentation on certificate structure and validity periods
- [WorkSafe Victoria Return to Work with Limited Capacity](https://www.worksafe.vic.gov.au/returning-limited-capacity-or-ability) - Official guidance on capacity assessment and restrictions

### Secondary (MEDIUM confidence)
- [Large language models for data extraction from unstructured EHR - PMC](https://pmc.ncbi.nlm.nih.gov/articles/PMC11751965/) - Research showing LLMs (Claude 3.0, GPT-4) achieve >0.98 accuracy for medical data extraction, supporting LLM approach over regex
- [Functional Capacity Evaluation FAQ - Enlyte](https://www.enlyte.com/insights/article/specialty-physical-medicine/functional-capacity-evaluation-fce-frequently-asked) - Industry standard for matching FCE results to job demands
- [Return to Work Functional Abilities Evaluation - CCOHS](https://www.ccohs.ca/oshanswers/psychosocial/rtw/rtw_abilities.html) - Best practices for job demands analysis and worker capability matching

### Tertiary (LOW confidence)
- Web search results on medical NLP challenges - General information on privacy and regulatory compliance concerns for medical LLM applications (not directly applicable to internal system)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Existing Claude Haiku integration verified in codebase, Drizzle/PostgreSQL already in use
- Architecture: HIGH - FunctionalRestrictions interface defined in Phase 1, medical_certificates table structure confirmed
- Pitfalls: HIGH - Based on analysis of existing certificate data patterns and WorkSafe Victoria documentation
- Code examples: HIGH - Adapted from existing certificateService.ts patterns and Phase 1 schema definitions

**Research date:** 2026-01-28
**Valid until:** 60 days (stable domain - WorkSafe Victoria requirements unlikely to change rapidly, LLM APIs stable)
