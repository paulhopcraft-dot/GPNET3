# Phase 6: Plan Output - Research

**Researched:** 2026-01-29
**Domain:** RTW plan display, print styling, PDF export, email generation
**Confidence:** HIGH

## Summary

Phase 6 implements the complete display and export functionality for RTW plans, building on the plan generation from Phase 5. The core requirements span: (1) displaying a comprehensive plan view with worker, role, and injury context (OUT-01), (2) showing medical constraints and physical demands matrix (OUT-02, OUT-03), (3) rendering duties and schedules clearly (OUT-04, OUT-05, OUT-06), (4) generating manager notification emails (OUT-07, OUT-08), and (5) providing print-friendly and PDF export capabilities (OUT-09, OUT-10).

The technical approach is multi-faceted. For plan display, we extend the existing PlanPreview component (Phase 5) into a full PlanDetailView with additional sections for worker context, medical constraints, and the functional ability matrix. For print styling, CSS `@media print` queries are the standard approach - hiding navigation elements, optimizing typography, and controlling page breaks. For PDF generation, the research indicates two viable approaches: (1) react-to-print for DOM-to-PDF conversion (simpler, uses existing components), or (2) @react-pdf/renderer for programmatic PDF generation (more control, cleaner output).

Research confirms that the project already has all required infrastructure: the email drafting service pattern (used for case emails), the FunctionalAbilityMatrix component (Phase 4), and shadcn/ui table components for schedule display. The main new work is creating composite view components, implementing print CSS, and choosing a PDF generation strategy.

**Primary recommendation:** Create a PlanDetailView component that aggregates existing sub-components (PlanPreview, FunctionalAbilityMatrix), add a dedicated ManagerEmailSection that reuses the existing email drafting service pattern, implement CSS print media queries for native print support, and use react-to-print for PDF export (leveraging the existing print-styled DOM).

## Standard Stack

### Core (Already in Project)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| React 18 | Current | Plan detail view components | Project standard |
| TanStack Query | 5.x | Fetch plan details via API | Already used for server state |
| shadcn/ui | Current | Card, Table, Badge components | Project UI library |
| Tailwind CSS | 3.x | Layout and print-specific styling | Project styling approach |
| date-fns | 4.x | Format dates in plan display | Already in project |

### Supporting (New for Phase 6)

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| react-to-print | 3.x | Trigger browser print dialog from component | OUT-09 print functionality |
| react-pdf/renderer | 4.x | Programmatic PDF generation (optional) | OUT-10 if DOM-to-PDF insufficient |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| react-to-print | @react-pdf/renderer | react-to-print reuses existing components; @react-pdf/renderer requires duplicate component tree but produces cleaner PDFs |
| CSS @media print | react-pdf-tailwind | CSS @media print is native, no library needed; react-pdf-tailwind only useful if using @react-pdf/renderer |
| New email service | Existing emailDraftService | Reusing existing pattern maintains consistency, reduces code duplication |
| jsPDF | react-to-print | jsPDF requires manual layout; react-to-print leverages existing styled components |
| html2pdf.js | react-to-print | html2pdf.js produces image-based PDFs (blurry text, not searchable); react-to-print uses native print |

**Installation:**
```bash
npm install react-to-print
# Optional: npm install @react-pdf/renderer  # Only if DOM-to-PDF insufficient
```

## Architecture Patterns

### Recommended Project Structure

```
client/src/
├── components/
│   └── rtw/
│       ├── PlanDetailView.tsx        # NEW: Complete plan display (OUT-01 to OUT-06)
│       ├── PlanSummaryHeader.tsx     # NEW: Worker, role, injury context (OUT-01)
│       ├── MedicalConstraintsCard.tsx # NEW: Formatted constraints display (OUT-02)
│       ├── DemandMatrixSection.tsx   # NEW: Physical demands matrix in plan (OUT-03)
│       ├── DutiesSection.tsx         # NEW: Proposed and excluded duties (OUT-04, OUT-06)
│       ├── ScheduleSection.tsx       # NEW: Week-by-week schedule display (OUT-05)
│       ├── ManagerEmailSection.tsx   # NEW: Email generation for manager (OUT-07, OUT-08)
│       ├── PlanPrintView.tsx         # NEW: Print-optimized wrapper (OUT-09)
│       ├── FunctionalAbilityMatrix.tsx  # EXISTS: Phase 4 matrix component
│       └── PlanPreview.tsx           # EXISTS: Phase 5 preview component
├── pages/
│   └── rtw/
│       └── PlanPage.tsx              # NEW: Page displaying full plan with print/export
└── styles/
    └── print.css                     # NEW: Print-specific media query styles
```

### Pattern 1: Plan Detail View Composition

**What:** Compose full plan view from discrete section components
**When to use:** OUT-01 through OUT-06
**Example:**

```tsx
// client/src/components/rtw/PlanDetailView.tsx

import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { PlanSummaryHeader } from "./PlanSummaryHeader";
import { MedicalConstraintsCard } from "./MedicalConstraintsCard";
import { DemandMatrixSection } from "./DemandMatrixSection";
import { DutiesSection } from "./DutiesSection";
import { ScheduleSection } from "./ScheduleSection";
import { ManagerEmailSection } from "./ManagerEmailSection";

interface PlanDetailViewProps {
  planId: string;
  showPrintControls?: boolean;
  showEmailSection?: boolean;
}

export function PlanDetailView({
  planId,
  showPrintControls = true,
  showEmailSection = true
}: PlanDetailViewProps) {
  // Fetch complete plan data including case, role, restrictions
  const { data: plan, isLoading } = useQuery({
    queryKey: ["rtw-plan-detail", planId],
    queryFn: () => fetchPlanDetails(planId),
  });

  if (isLoading) return <LoadingState />;
  if (!plan) return <NotFoundState />;

  return (
    <div className="space-y-6 print:space-y-4">
      {/* OUT-01: Plan summary with worker, role, injury */}
      <PlanSummaryHeader
        workerName={plan.workerCase.workerName}
        company={plan.workerCase.company}
        dateOfInjury={plan.workerCase.dateOfInjury}
        roleName={plan.role.name}
        planType={plan.planType}
        planStatus={plan.status}
        startDate={plan.startDate}
      />

      {/* OUT-02: Medical constraints */}
      <MedicalConstraintsCard
        constraints={plan.restrictions}
        restrictionReviewDate={plan.restrictionReviewDate}
      />

      {/* OUT-03: Physical demands matrix */}
      <DemandMatrixSection
        caseId={plan.caseId}
        roleId={plan.roleId}
      />

      {/* OUT-05: Proposed schedule */}
      <ScheduleSection
        schedule={plan.schedule}
        startDate={plan.startDate}
      />

      {/* OUT-04 & OUT-06: Duties (proposed and excluded) */}
      <DutiesSection
        includedDuties={plan.duties.filter(d => d.isIncluded)}
        excludedDuties={plan.duties.filter(d => !d.isIncluded)}
      />

      {/* OUT-07 & OUT-08: Manager email (hide in print) */}
      {showEmailSection && (
        <div className="print:hidden">
          <ManagerEmailSection
            planId={planId}
            caseId={plan.caseId}
            isApproved={plan.status === "approved"}
          />
        </div>
      )}
    </div>
  );
}
```

### Pattern 2: Print-Optimized CSS with @media print

**What:** CSS media queries that transform screen view for printing
**When to use:** OUT-09 print-friendly view
**Example:**

```css
/* client/src/styles/print.css */

@media print {
  /* Hide non-printable elements */
  .print\\:hidden,
  nav,
  aside,
  footer,
  button:not(.print-button),
  .no-print {
    display: none !important;
  }

  /* Optimize page layout */
  body {
    font-size: 11pt;
    line-height: 1.4;
    color: black;
    background: white;
  }

  /* Page break control */
  .page-break-before {
    page-break-before: always;
    break-before: page;
  }

  .page-break-after {
    page-break-after: always;
    break-after: page;
  }

  .avoid-break {
    page-break-inside: avoid;
    break-inside: avoid;
  }

  /* Plan-specific print styles */
  .plan-header {
    border-bottom: 2px solid #333;
    padding-bottom: 16px;
    margin-bottom: 16px;
  }

  .plan-section {
    page-break-inside: avoid;
    break-inside: avoid;
    margin-bottom: 24px;
  }

  /* Table optimizations */
  table {
    width: 100%;
    border-collapse: collapse;
    font-size: 10pt;
  }

  th, td {
    border: 1px solid #ccc;
    padding: 6px 8px;
    text-align: left;
  }

  th {
    background-color: #f5f5f5 !important;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }

  /* Matrix cell colors (preserve in print) */
  .bg-green-50 {
    background-color: #dcfce7 !important;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }

  .bg-yellow-50 {
    background-color: #fef9c3 !important;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }

  .bg-red-50 {
    background-color: #fee2e2 !important;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }

  /* Header/footer for printed pages */
  @page {
    margin: 2cm 1.5cm;
    @top-center {
      content: "Return to Work Plan";
    }
    @bottom-center {
      content: "Page " counter(page) " of " counter(pages);
    }
  }
}
```

### Pattern 3: react-to-print Integration

**What:** Trigger browser print dialog for a specific component
**When to use:** OUT-09 print button, OUT-10 PDF export (via browser print-to-PDF)
**Example:**

```tsx
// client/src/components/rtw/PlanPrintView.tsx

import { useRef } from "react";
import { useReactToPrint } from "react-to-print";
import { Button } from "@/components/ui/button";
import { Printer, FileDown } from "lucide-react";
import { PlanDetailView } from "./PlanDetailView";

interface PlanPrintViewProps {
  planId: string;
}

export function PlanPrintView({ planId }: PlanPrintViewProps) {
  const printRef = useRef<HTMLDivElement>(null);

  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: `RTW-Plan-${planId}`,
    pageStyle: `
      @page {
        size: A4 portrait;
        margin: 20mm 15mm;
      }
    `,
    onBeforePrint: () => {
      console.log("Preparing print preview...");
      return Promise.resolve();
    },
    onAfterPrint: () => {
      console.log("Print completed or cancelled");
    },
  });

  return (
    <div>
      {/* Print controls (hidden in print) */}
      <div className="flex gap-2 mb-4 print:hidden">
        <Button onClick={handlePrint} variant="outline">
          <Printer className="h-4 w-4 mr-2" />
          Print Plan
        </Button>
        <Button onClick={handlePrint} variant="outline">
          <FileDown className="h-4 w-4 mr-2" />
          Export PDF
        </Button>
        <p className="text-sm text-muted-foreground self-center">
          (Use browser "Save as PDF" option for PDF export)
        </p>
      </div>

      {/* Printable content */}
      <div ref={printRef}>
        <PlanDetailView
          planId={planId}
          showPrintControls={false}
          showEmailSection={false}
        />
      </div>
    </div>
  );
}
```

### Pattern 4: Manager Email Generation (Reusing emailDraftService)

**What:** Generate and edit manager notification email using existing email patterns
**When to use:** OUT-07, OUT-08
**Example:**

```tsx
// client/src/components/rtw/ManagerEmailSection.tsx

import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Mail, Copy, Send, RefreshCw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface ManagerEmailSectionProps {
  planId: string;
  caseId: string;
  isApproved: boolean;
}

export function ManagerEmailSection({
  planId,
  caseId,
  isApproved
}: ManagerEmailSectionProps) {
  const { toast } = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");

  // Fetch or generate email draft
  const { data: emailDraft, isLoading, refetch } = useQuery({
    queryKey: ["rtw-plan-email", planId],
    queryFn: () => fetchOrGeneratePlanEmail(planId, caseId),
    onSuccess: (data) => {
      setSubject(data.subject);
      setBody(data.body);
    },
  });

  // Regenerate email
  const regenerateMutation = useMutation({
    mutationFn: () => regeneratePlanEmail(planId, caseId),
    onSuccess: (data) => {
      setSubject(data.subject);
      setBody(data.body);
      toast({ title: "Email regenerated" });
    },
  });

  // Copy to clipboard
  const handleCopy = async () => {
    const fullEmail = `Subject: ${subject}\n\n${body}`;
    await navigator.clipboard.writeText(fullEmail);
    toast({ title: "Copied to clipboard" });
  };

  // OUT-08: Email editable only before approval
  const canEdit = !isApproved;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Mail className="h-5 w-5" />
          Manager Notification Email
        </CardTitle>
        {!canEdit && (
          <p className="text-sm text-muted-foreground">
            Email locked after plan approval
          </p>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading ? (
          <div>Generating email...</div>
        ) : (
          <>
            {/* Subject line */}
            <div>
              <label className="text-sm font-medium">Subject</label>
              <Input
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                disabled={!canEdit}
                className="mt-1"
              />
            </div>

            {/* Email body */}
            <div>
              <label className="text-sm font-medium">Body</label>
              <Textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                disabled={!canEdit}
                rows={12}
                className="mt-1 font-mono text-sm"
              />
            </div>

            {/* Actions */}
            <div className="flex gap-2">
              <Button onClick={handleCopy} variant="outline">
                <Copy className="h-4 w-4 mr-2" />
                Copy to Clipboard
              </Button>
              {canEdit && (
                <Button
                  onClick={() => regenerateMutation.mutate()}
                  variant="outline"
                  disabled={regenerateMutation.isPending}
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Regenerate
                </Button>
              )}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

// API functions (would be in separate file)
async function fetchOrGeneratePlanEmail(planId: string, caseId: string) {
  const response = await fetch(`/api/rtw-plans/${planId}/email`);
  if (!response.ok) throw new Error("Failed to fetch email");
  return response.json();
}

async function regeneratePlanEmail(planId: string, caseId: string) {
  const response = await fetch(`/api/rtw-plans/${planId}/email/regenerate`, {
    method: "POST",
  });
  if (!response.ok) throw new Error("Failed to regenerate email");
  return response.json();
}
```

### Pattern 5: Physical Demands Matrix Display in Plan

**What:** Show demand categories with frequency ratings (Never/Occasionally/Frequently/Constantly)
**When to use:** OUT-03
**Example:**

```tsx
// client/src/components/rtw/DemandMatrixSection.tsx

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";

// Frequency display labels matching FAM spec
const FREQUENCY_LABELS: Record<string, string> = {
  never: "Never",
  occasionally: "Occasionally (1-33%)",
  frequently: "Frequently (34-66%)",
  constantly: "Constantly (67-100%)",
};

interface DemandMatrixSectionProps {
  duties: Array<{
    dutyName: string;
    demandDetails: Array<{
      demand: string;
      frequency: string;
      capability: string;
      match: string;
    }>;
  }>;
}

export function DemandMatrixSection({ duties }: DemandMatrixSectionProps) {
  // Collect all unique demands across duties
  const allDemands = new Set<string>();
  duties.forEach(duty => {
    duty.demandDetails.forEach(d => allDemands.add(d.demand));
  });
  const demandColumns = Array.from(allDemands);

  return (
    <Card className="plan-section avoid-break">
      <CardHeader>
        <CardTitle>Physical Demands Matrix</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="sticky left-0 bg-white">Duty</TableHead>
                {demandColumns.map(demand => (
                  <TableHead key={demand} className="text-center text-xs">
                    {demand}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {duties.map(duty => (
                <TableRow key={duty.dutyName}>
                  <TableCell className="font-medium sticky left-0 bg-white">
                    {duty.dutyName}
                  </TableCell>
                  {demandColumns.map(demand => {
                    const detail = duty.demandDetails.find(d => d.demand === demand);
                    const bgColor = detail?.match === "suitable"
                      ? "bg-green-50"
                      : detail?.match === "suitable_with_modification"
                        ? "bg-yellow-50"
                        : detail?.match === "not_suitable"
                          ? "bg-red-50"
                          : "";
                    return (
                      <TableCell
                        key={demand}
                        className={cn("text-center text-xs", bgColor)}
                      >
                        {detail ? formatFrequency(detail.frequency) : "-"}
                      </TableCell>
                    );
                  })}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        <div className="mt-4 text-xs text-muted-foreground print:text-gray-600">
          <strong>Legend:</strong> N=Never, O=Occasionally (1-33%), F=Frequently (34-66%), C=Constantly (67-100%)
        </div>
      </CardContent>
    </Card>
  );
}

function formatFrequency(freq: string): string {
  switch (freq.toLowerCase()) {
    case "never": return "N";
    case "occasionally": return "O";
    case "frequently": return "F";
    case "constantly": return "C";
    default: return "-";
  }
}
```

### Anti-Patterns to Avoid

- **Duplicating component trees for PDF**: Use react-to-print to reuse existing styled components rather than building parallel @react-pdf/renderer components
- **Inline print styles**: Keep print CSS in dedicated @media print blocks, not scattered in components
- **Blocking email editing after any status change**: OUT-08 specifically says "before approval" - allow edits during draft and pending states
- **Image-based PDF export**: Avoid html2pdf.js which produces image-based PDFs - use print-to-PDF for searchable text
- **Forgetting page break control**: Tables that span pages without break-inside: avoid cause awkward splits
- **Hardcoding email content**: Use existing AI email generation pattern (emailDraftService) for dynamic, context-aware emails

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Print dialog trigger | Custom print window management | react-to-print | Handles ref management, cleanup, and browser quirks |
| Email generation | Static email templates | Existing emailDraftService pattern | AI-generated, context-aware, already proven in project |
| PDF generation | jsPDF manual layout | Browser print-to-PDF via react-to-print | Native, searchable text, preserves styles |
| Matrix display | New matrix component | Existing FunctionalAbilityMatrix | Already built in Phase 4, proven correct |
| Suitability colors | Custom color logic | Existing suitabilityUtils | Centralized, consistent, tested |
| Date formatting | Custom date strings | date-fns format | Already in project, handles localization |

**Key insight:** Phase 6 is primarily composition and styling, not new logic. Most building blocks exist - the work is assembling them into cohesive views and ensuring print/export quality.

## Common Pitfalls

### Pitfall 1: Print Styles Not Applied

**What goes wrong:** Printing shows screen styles, not print-optimized layout
**Why it happens:** @media print styles not loaded, or CSS specificity issues override them
**How to avoid:**
- Import print.css globally in app entry point
- Use `!important` sparingly but where needed for print overrides
- Test in browser print preview (Ctrl+P) during development
**Warning signs:** Navigation visible in print, colors missing, wrong font sizes

### Pitfall 2: Page Breaks in Middle of Tables

**What goes wrong:** Schedule table or matrix breaks mid-row
**Why it happens:** Missing `break-inside: avoid` on table containers
**How to avoid:**
- Add `.avoid-break` class to all Card components containing tables
- For very long tables, consider header repetition with `thead { display: table-header-group; }`
**Warning signs:** Rows split across pages, missing context on new pages

### Pitfall 3: Email Editable After Approval

**What goes wrong:** User modifies email after plan approved, causing inconsistency
**Why it happens:** Forgot to check plan status before enabling edit
**How to avoid:**
- Check `plan.status !== "approved"` before allowing edits
- Disable input fields when approved
- Show clear message explaining lock
**Warning signs:** Approved plan email differs from what manager received

### Pitfall 4: PDF Export Produces Image

**What goes wrong:** Exported PDF has blurry text, can't search or copy text
**Why it happens:** Using html2canvas-based library (html2pdf.js) instead of print-based approach
**How to avoid:**
- Use react-to-print + browser "Save as PDF" option
- Or use @react-pdf/renderer for pure PDF generation
**Warning signs:** Large file size, pixelated text when zoomed, can't select text

### Pitfall 5: Matrix Colors Lost in Print

**What goes wrong:** Suitability colors (green/yellow/red) not visible when printed
**Why it happens:** Browser defaults strip background colors in print
**How to avoid:**
- Add `-webkit-print-color-adjust: exact` and `print-color-adjust: exact`
- Use color on borders as fallback (borders print reliably)
**Warning signs:** Matrix appears all white in print preview

### Pitfall 6: Missing Worker Context

**What goes wrong:** Plan prints without identifying information
**Why it happens:** Header component only shows plan type/dates, not worker name
**How to avoid:**
- OUT-01 specifically requires worker name, role, injury details
- Include dedicated header section with all context
**Warning signs:** Printed plan not identifiable, could be any worker

## Code Examples

### API Endpoint - Get Plan Details for Display

```typescript
// server/routes/rtwPlans.ts - extend existing router

/**
 * GET /api/rtw-plans/:planId/details
 * Get complete plan with case, role, and restrictions context
 * Used by PlanDetailView for full display
 */
router.get("/:planId/details", async (req: AuthRequest, res) => {
  try {
    const { planId } = req.params;
    const organizationId = req.user!.organizationId;

    // Get plan with current version
    const plan = await storage.getRTWPlanById(planId, organizationId);
    if (!plan) {
      return res.status(404).json({ error: "Plan not found" });
    }

    // Get worker case for context (OUT-01)
    const workerCase = await storage.getGPNet2CaseById(plan.plan.caseId, organizationId);

    // Get role for context
    const role = await storage.getRoleById(plan.plan.roleId, organizationId);

    // Get current restrictions (OUT-02)
    const restrictions = await storage.getCurrentRestrictions(plan.plan.caseId, organizationId);

    // Enrich duties with names and suitability details (OUT-03, OUT-04, OUT-06)
    const dutyIds = plan.duties.map(d => d.dutyId);
    const dutyDetails = await storage.getDutiesByIds(dutyIds, organizationId);

    const enrichedDuties = plan.duties.map(pd => {
      const detail = dutyDetails.find(d => d.id === pd.dutyId);
      return {
        ...pd,
        dutyName: detail?.name || "Unknown Duty",
        dutyDescription: detail?.description || null,
        demands: detail?.demands || null,
        isIncluded: pd.suitability !== "not_suitable",
      };
    });

    res.json({
      success: true,
      data: {
        plan: plan.plan,
        version: plan.version,
        schedule: plan.schedule,
        duties: enrichedDuties,
        workerCase: workerCase ? {
          id: workerCase.id,
          workerName: workerCase.workerName,
          company: workerCase.company,
          dateOfInjury: workerCase.dateOfInjury,
          workStatus: workerCase.workStatus,
        } : null,
        role: role ? {
          id: role.id,
          name: role.name,
          description: role.description,
        } : null,
        restrictions: restrictions?.restrictions || null,
        restrictionReviewDate: plan.plan.restrictionReviewDate,
      },
    });
  } catch (err) {
    logger.api.error("Plan details fetch failed", { planId: req.params.planId }, err);
    res.status(500).json({ error: "Failed to fetch plan details" });
  }
});

/**
 * GET /api/rtw-plans/:planId/email
 * Get or generate manager notification email
 */
router.get("/:planId/email", async (req: AuthRequest, res) => {
  try {
    const { planId } = req.params;
    const organizationId = req.user!.organizationId;

    // Check for existing draft
    const existingDraft = await storage.getPlanEmail(planId);
    if (existingDraft) {
      return res.json(existingDraft);
    }

    // Generate new email using AI (reuse emailDraftService pattern)
    const plan = await storage.getRTWPlanById(planId, organizationId);
    if (!plan) {
      return res.status(404).json({ error: "Plan not found" });
    }

    const email = await generateManagerEmail(plan, organizationId);

    // Save draft
    await storage.savePlanEmail(planId, email);

    res.json(email);
  } catch (err) {
    logger.api.error("Plan email fetch failed", { planId: req.params.planId }, err);
    res.status(500).json({ error: "Failed to generate email" });
  }
});
```

### Plan Summary Header Component

```tsx
// client/src/components/rtw/PlanSummaryHeader.tsx

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, User, Building2, Briefcase } from "lucide-react";
import { format, parseISO } from "date-fns";

interface PlanSummaryHeaderProps {
  workerName: string;
  company: string;
  dateOfInjury: string;
  roleName: string;
  planType: string;
  planStatus: string;
  startDate: string;
}

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-gray-100 text-gray-800",
  pending: "bg-yellow-100 text-yellow-800",
  approved: "bg-green-100 text-green-800",
  rejected: "bg-red-100 text-red-800",
};

const PLAN_TYPE_LABELS: Record<string, string> = {
  normal_hours: "Normal Hours",
  partial_hours: "Partial Hours",
  graduated_return: "Graduated Return",
};

export function PlanSummaryHeader({
  workerName,
  company,
  dateOfInjury,
  roleName,
  planType,
  planStatus,
  startDate,
}: PlanSummaryHeaderProps) {
  return (
    <Card className="plan-header">
      <CardContent className="pt-6">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-2xl font-bold print:text-xl">
              Return to Work Plan
            </h1>
            <div className="mt-2 space-y-1 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4" />
                <span className="font-medium text-foreground">{workerName}</span>
              </div>
              <div className="flex items-center gap-2">
                <Building2 className="h-4 w-4" />
                <span>{company}</span>
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                <span>Injury Date: {format(parseISO(dateOfInjury), "d MMM yyyy")}</span>
              </div>
              <div className="flex items-center gap-2">
                <Briefcase className="h-4 w-4" />
                <span>Role: {roleName}</span>
              </div>
            </div>
          </div>

          <div className="text-right">
            <Badge className={STATUS_COLORS[planStatus] || STATUS_COLORS.draft}>
              {planStatus.charAt(0).toUpperCase() + planStatus.slice(1)}
            </Badge>
            <div className="mt-2 text-sm">
              <div className="font-medium">
                {PLAN_TYPE_LABELS[planType] || planType}
              </div>
              <div className="text-muted-foreground">
                Starting: {format(parseISO(startDate), "d MMM yyyy")}
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
```

### Medical Constraints Display

```tsx
// client/src/components/rtw/MedicalConstraintsCard.tsx

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle, Clock, X, Check } from "lucide-react";
import { format, parseISO } from "date-fns";
import type { MedicalConstraints } from "@shared/schema";

interface MedicalConstraintsCardProps {
  constraints: MedicalConstraints | null;
  restrictionReviewDate: string | null;
}

export function MedicalConstraintsCard({
  constraints,
  restrictionReviewDate
}: MedicalConstraintsCardProps) {
  if (!constraints) {
    return (
      <Card className="plan-section">
        <CardContent className="pt-6">
          <p className="text-muted-foreground">No medical constraints on file</p>
        </CardContent>
      </Card>
    );
  }

  // Group constraints for display
  const negativeConstraints = [
    constraints.noLiftingOverKg && `No lifting over ${constraints.noLiftingOverKg}kg`,
    constraints.noBending && "No bending",
    constraints.noTwisting && "No twisting",
    constraints.noProlongedStanding && "No prolonged standing",
    constraints.noProlongedSitting && "No prolonged sitting",
    constraints.noDriving && "No driving",
    constraints.noClimbing && "No climbing",
    constraints.otherConstraints,
  ].filter(Boolean);

  const positiveIndicators = [
    constraints.suitableForLightDuties && "Suitable for light duties",
    constraints.suitableForSeatedWork && "Suitable for seated work",
    constraints.suitableForModifiedHours && "Suitable for modified hours",
  ].filter(Boolean);

  return (
    <Card className="plan-section avoid-break">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-amber-500" />
          Medical Constraints
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Restriction review date */}
        {restrictionReviewDate && (
          <div className="flex items-center gap-2 text-sm bg-amber-50 p-3 rounded-lg border border-amber-200">
            <Clock className="h-4 w-4 text-amber-600" />
            <span>
              Restrictions valid until:{" "}
              <strong>{format(parseISO(restrictionReviewDate), "d MMMM yyyy")}</strong>
            </span>
          </div>
        )}

        {/* Negative constraints */}
        {negativeConstraints.length > 0 && (
          <div>
            <h4 className="font-medium text-sm mb-2">Cannot Perform:</h4>
            <ul className="space-y-1">
              {negativeConstraints.map((constraint, i) => (
                <li key={i} className="flex items-center gap-2 text-sm">
                  <X className="h-4 w-4 text-red-500" />
                  {constraint}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Positive indicators */}
        {positiveIndicators.length > 0 && (
          <div>
            <h4 className="font-medium text-sm mb-2">Capacity Indicators:</h4>
            <ul className="space-y-1">
              {positiveIndicators.map((indicator, i) => (
                <li key={i} className="flex items-center gap-2 text-sm">
                  <Check className="h-4 w-4 text-green-500" />
                  {indicator}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Source info */}
        {constraints.lastUpdatedBy && (
          <div className="text-xs text-muted-foreground pt-2 border-t">
            Last updated by: {constraints.lastUpdatedBy}
            {constraints.lastUpdatedAt && (
              <> on {format(parseISO(constraints.lastUpdatedAt), "d MMM yyyy")}</>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Server-side PDF generation (wkhtmltopdf) | Client-side print-to-PDF | 2020s (browser improvements) | Simpler deployment, better styling control, no server dependency |
| Static email templates | AI-generated context-aware emails | 2023-2024 (LLM adoption) | More relevant content, reduced manual editing |
| Print stylesheets as separate files | Tailwind print: prefix + @media print | 2022+ (Tailwind v3) | Collocated styles, easier maintenance |
| Full page reload for print | react-to-print component approach | 2020+ (React maturity) | Better UX, preserves React state, cleaner API |
| Manual page break hints | CSS break-* properties | 2020+ (browser support) | More reliable, replace deprecated page-break-* |

**Deprecated/outdated:**
- `page-break-before/after/inside` - Use modern `break-before/after/inside` properties
- PhantomJS for PDF generation - Project discontinued, use Puppeteer or browser print if server-side needed
- Inline print styles in components - Use dedicated print.css with @media print

## Open Questions

1. **Should PDF export be client-side or server-side?**
   - What we know: Client-side (react-to-print) is simpler, server-side (Puppeteer) more reliable for automated generation
   - What's unclear: Do we need batch PDF generation or scheduled exports?
   - Recommendation: Start client-side for user-triggered exports; add server-side later if automation needed

2. **How detailed should the manager email be?**
   - What we know: Should summarize plan key points for manager action
   - What's unclear: Include full schedule detail or just summary? Link to full plan or attach PDF?
   - Recommendation: Summary with link to view full plan; don't attach PDF (security, file size)

3. **Should matrix in plan output show all demands or only relevant ones?**
   - What we know: FunctionalAbilityMatrix shows 15+ demand columns
   - What's unclear: For print, should we filter to only demands with non-never frequencies?
   - Recommendation: Show all for completeness; use compact abbreviations for space

4. **Multi-page plan handling for very long duty lists?**
   - What we know: Some roles have 20+ duties
   - What's unclear: Paginate in UI? Or single scrolling view with page breaks for print?
   - Recommendation: Single scrolling view for screen, let browser handle pagination for print with proper break hints

5. **Plan versioning display - show history?**
   - What we know: Plans have version history (rtw_plan_versions table)
   - What's unclear: Should PlanDetailView show version history or just current version?
   - Recommendation: Show current version by default, add optional "View History" expansion (defer to Phase 8 approval workflow)

## Sources

### Primary (HIGH confidence)

- Existing codebase:
  - `client/src/components/rtw/PlanPreview.tsx` - Phase 5 preview component (lines 1-213)
  - `client/src/components/rtw/FunctionalAbilityMatrix.tsx` - Phase 4 matrix component (lines 1-325)
  - `server/services/emailDraftService.ts` - Email generation pattern (lines 1-413)
  - `server/routes/rtwPlans.ts` - Existing RTW plans API (lines 1-388)
  - `client/src/lib/suitabilityUtils.ts` - Suitability formatting utilities (lines 1-92)

- React-to-print library:
  - [react-to-print npm](https://www.npmjs.com/package/react-to-print) - Official package documentation
  - [GitHub - MatthewHerbst/react-to-print](https://github.com/MatthewHerbst/react-to-print) - Source and examples

- Print CSS best practices:
  - [CSS Print Media Queries 2026](https://copyprogramming.com/howto/css-print-media-queries-in-css-in-js) - Current CSS-in-JS patterns
  - [W3Schools CSS Media Queries](https://www.w3schools.com/css/css3_mediaqueries.asp) - Reference documentation

### Secondary (MEDIUM confidence)

- PDF generation libraries:
  - [npm-compare PDF libraries](https://npm-compare.com/html2pdf.js,jspdf,react-pdf,react-to-pdf) - Library comparison
  - [Nutrient - JavaScript PDF libraries 2025](https://www.nutrient.io/blog/javascript-pdf-libraries/) - Comprehensive guide
  - [Top 6 Open-Source PDF Libraries for React](https://blog.react-pdf.dev/6-open-source-pdf-generation-and-modification-libraries-every-react-dev-should-know-in-2025) - React-specific options

- Print handling:
  - [Medium - Multi-Page Printing Headers/Footers](https://medium.com/@balindambajpai/printing-in-react-adding-headers-and-footers-to-multi-page-documents-b952ecc8542d) - Table-based approach
  - [ByteScrum - Mastering React Print](https://blog.bytescrum.com/mastering-react-print-a-comprehensive-guide) - Comprehensive guide

### Tertiary (LOW confidence)

- @react-pdf/renderer (alternative approach):
  - [react-pdf.org](https://react-pdf.org/advanced) - Advanced usage
  - [LogRocket - Generating PDFs in React](https://blog.logrocket.com/generating-pdfs-react/) - Tutorial
  - Would require duplicating component tree, significant additional work

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - react-to-print is well-documented, CSS @media print is native browser feature
- Architecture: HIGH - Composition of existing components follows established React patterns
- Print styling: HIGH - CSS @media print is mature, browser support universal
- PDF export: MEDIUM-HIGH - Browser print-to-PDF reliable, but user must know to select option
- Email generation: HIGH - Reuses existing proven emailDraftService pattern
- Pitfalls: HIGH - Based on documented react-to-print issues and print CSS gotchas

**Research date:** 2026-01-29
**Valid until:** 60 days (print/PDF patterns stable, react-to-print actively maintained)
