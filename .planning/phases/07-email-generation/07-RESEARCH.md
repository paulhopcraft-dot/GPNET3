# Phase 7 Research: Email Generation

**Domain:** RTW Plan Manager Email Communications
**Researched:** 2026-01-29
**Overall confidence:** HIGH

---

## Executive Summary

Phase 7 implements manager email generation for RTW plans. **Critical finding: Core email generation is ALREADY IMPLEMENTED in Phase 6.** The existing implementation covers EMAIL-01 through EMAIL-08 (AI generation, content, formatting). Phase 7's actual scope is **three missing capabilities**:

1. **EMAIL-09**: Organization-specific email templates (customizable greeting, tone, branding)
2. **EMAIL-10**: Send email directly via SMTP (copy-to-clipboard already exists)
3. **UI Polish**: Integration with plan approval workflow, locking behavior

The research reveals this is a **refinement phase**, not a build-from-scratch phase. Approximately 70% of functionality exists; we're adding template customization and SMTP sending.

---

## What Already Exists (Phase 6 Implementation)

### ✅ Implemented Features

| Requirement | Status | Implementation |
|-------------|--------|----------------|
| **EMAIL-01** | ✅ Complete | `rtwEmailService.ts` generates greeting with AI |
| **EMAIL-02** | ✅ Complete | Context includes workerName, roleName, dateOfInjury |
| **EMAIL-03** | ✅ Complete | Medical constraints in context (maxHoursPerDay, maxDaysPerWeek) |
| **EMAIL-04** | ✅ Complete | Duties formatted with suitable/modified/excluded sections |
| **EMAIL-05** | ✅ Complete | Schedule formatted with week-by-week hours progression |
| **EMAIL-06** | ✅ Complete | Review date included (restrictionReviewDate) |
| **EMAIL-07** | ✅ Complete | Fallback template includes approval request |
| **EMAIL-08** | ✅ Complete | Professional formatting with sections |

### Existing Implementation Details

**Backend Service: `server/services/rtwEmailService.ts`**
- Uses Claude Haiku (claude-3-haiku-20240307) for AI generation
- Comprehensive prompt with Australian English, professional tone
- Fallback template when ANTHROPIC_API_KEY unavailable
- Context-rich input: worker, role, plan, schedule, duties, restrictions

**Frontend Component: `client/src/components/rtw/ManagerEmailSection.tsx`**
- Displays subject and body in editable text fields
- Copy to clipboard functionality (EMAIL-10 partial)
- Regenerate button (blocked when plan approved)
- Lock indicator when plan status = "approved"

**API Endpoints:**
- `GET /api/rtw-plans/:planId/email` - Get or generate email
- `POST /api/rtw-plans/:planId/email/regenerate` - Force regeneration

**Database Storage:**
- `email_drafts` table stores generated emails
- Linked to plan via `caseContextSnapshot.planId`
- Query methods: `storage.savePlanEmail()`, `storage.getPlanEmail()`

**Key Design Decision (Phase 6):**
- Email locked after plan approval (prevents post-approval edits)
- Uses email_drafts table (generic email storage) rather than plan-specific table
- AI generates both subject and body from plan context

---

## What's Missing (Actual Phase 7 Scope)

### ❌ Missing Capabilities

| Requirement | Gap | Impact |
|-------------|-----|--------|
| **EMAIL-09** | No organization-specific templates | All orgs get same AI-generated style |
| **EMAIL-10** | No SMTP sending (only copy-to-clipboard) | User must manually paste into email client |
| **Template System** | No template customization UI | Cannot customize greeting, signature, branding |
| **HTML Formatting** | Plain text only | No branded HTML emails with logos |

---

## Technology Stack Assessment

### Current Stack (Already in Place)

| Technology | Version | Purpose | Status |
|------------|---------|---------|--------|
| **Anthropic Claude Haiku** | v20240307 | AI email generation | ✅ Working |
| **Nodemailer** | 7.0.12 | SMTP email sending | ✅ Installed but not used for RTW emails |
| **email_drafts table** | PostgreSQL | Email storage | ✅ Working |

### Required Additions for EMAIL-09 (Templates)

**Option 1: Database-Stored Templates (RECOMMENDED)**

| Component | Technology | Rationale |
|-----------|-----------|-----------|
| Storage | PostgreSQL table `email_templates` | Leverage existing multi-tenant DB |
| Template Engine | Handlebars or Mustache (lite) | Simple variable substitution |
| Variables | `{{workerName}}`, `{{company}}`, `{{planType}}` | Minimal logic |
| Fallback | Existing AI generation | Backwards compatibility |

**Why this approach:**
- Multi-tenant architecture already uses organizationId for isolation
- Shared database, shared schema pattern (current architecture)
- No external dependencies (template engine is npm package only)
- Templates can be managed via Admin UI (future)

**Option 2: File-Based Templates (NOT RECOMMENDED)**

Could use `.handlebars` files in `server/templates/`, but this creates deployment coupling and doesn't support per-org customization without complex file management.

### Required Additions for EMAIL-10 (SMTP Sending)

**Good news:** Nodemailer already installed and configured!

Existing `server/services/emailService.ts` provides:
- SMTP configuration via environment variables
- HTML email support (`html` field)
- Fallback logging when SMTP not configured
- Used successfully for invite emails and password resets

**Integration required:**
1. Add "Send Email" button to ManagerEmailSection.tsx
2. New API endpoint: `POST /api/rtw-plans/:planId/email/send`
3. Call `emailService.sendEmail()` with:
   - `to`: Manager email (needs to be captured in UI)
   - `subject`: Generated subject
   - `body`: Plain text body
   - `html`: HTML-formatted version (optional, see EMAIL-09)

**UX Decision: Copy vs. Send**

Research findings from [Nano-brewed interactions](https://medium.com/inside-design/nano-brewed-interactions-c84db538050a):
- 84% of users don't use native desktop email clients
- Mailto links create friction (force mail client popup)
- **Best practice:** Offer BOTH options (copy to clipboard AND send email)
- Copy gives user control; Send provides convenience

**Recommended UI:**
```
[Copy to Clipboard] [Send Email...]
```

When "Send Email" clicked:
1. Prompt for manager email address (modal dialog)
2. Show sending spinner
3. Success: "Email sent to manager@company.com.au"
4. Error: Show error message with fallback to copy

---

## Feature Landscape Analysis

### Table Stakes Features

| Feature | Why Expected | Implementation Status |
|---------|--------------|----------------------|
| Email contains plan details | Core requirement for manager review | ✅ Complete (EMAIL-01 to EMAIL-08) |
| Professional formatting | WorkSafe compliance context requires formality | ✅ Complete (AI generates professional tone) |
| Editable before approval | Manager may need to customize message | ✅ Complete (locked after approval) |
| Copy to clipboard | Standard workflow for email apps | ✅ Complete |

### Differentiator Features

| Feature | Value Proposition | Complexity | Priority |
|---------|-------------------|------------|----------|
| **Organization-specific templates** | Branded communications maintain trust | Medium | HIGH (EMAIL-09) |
| **SMTP sending** | One-click workflow vs. manual copy-paste | Low | HIGH (EMAIL-10) |
| **HTML email with branding** | Professional appearance with logo | Medium | MEDIUM (extends EMAIL-09) |
| **Multi-recipient** | CC HR, send to multiple managers | Low | LOW (future enhancement) |
| **Email tracking** | Know when manager opened email | Medium | LOW (requires third-party service) |

### Anti-Features (Do NOT Build)

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| **Auto-send without confirmation** | Accidental sends; privacy risk | Always require explicit user action |
| **Email stored in plaintext logs** | Privacy violation (worker medical info) | Log only metadata (sent to, timestamp) |
| **Inline images in email** | Increases email size; blocked by clients | Link to hosted logo or use text branding |
| **Custom font rendering** | Email clients strip custom fonts | Use web-safe fonts only |

---

## Architecture Patterns

### Recommended Architecture: Template Layering

```
┌─────────────────────────────────────────┐
│  User: "Generate Email"                 │
└──────────────┬──────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│  GET /api/rtw-plans/:planId/email       │
│  - Check for existing draft             │
│  - If exists: return cached             │
│  - If not: generate new                 │
└──────────────┬──────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│  Email Generation Service               │
│  1. Load org template (if exists)       │
│  2. Load plan context                   │
│  3. Choose generation method:           │
│     a) Template + variables (EMAIL-09)  │
│     b) AI generation (existing)         │
│  4. Format result                       │
└──────────────┬──────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│  Return { subject, body }               │
│  Save to email_drafts table             │
└─────────────────────────────────────────┘
```

### Template Resolution Logic

```typescript
async function generateRTWPlanEmail(
  context: RTWPlanEmailContext,
  organizationId: string
): Promise<GeneratedEmail> {
  // 1. Try organization-specific template
  const orgTemplate = await getOrgEmailTemplate(organizationId, 'rtw_plan_notification');

  if (orgTemplate) {
    // Use template with variable substitution
    return renderTemplate(orgTemplate, context);
  }

  // 2. Fallback to AI generation (existing behavior)
  if (process.env.ANTHROPIC_API_KEY) {
    return generateWithAI(context);
  }

  // 3. Final fallback: hardcoded template
  return generateFallbackEmail(context);
}
```

### Database Schema for EMAIL-09

**New table: `email_templates`**

```sql
CREATE TABLE email_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id VARCHAR NOT NULL,
  template_type VARCHAR NOT NULL, -- 'rtw_plan_notification', 'certificate_chase', etc.
  template_name VARCHAR, -- User-friendly name
  subject_template TEXT NOT NULL, -- "RTW Plan for {{workerName}}"
  body_template TEXT NOT NULL, -- Handlebars template with {{variables}}
  format VARCHAR DEFAULT 'plain', -- 'plain' or 'html'
  is_active BOOLEAN DEFAULT true,
  created_by VARCHAR,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),

  UNIQUE (organization_id, template_type) -- One template per type per org
);
```

**Template Variables Available:**

```typescript
interface TemplateVariables {
  // Worker/Case info
  workerName: string;
  company: string;
  dateOfInjury: string;
  workStatus: string;

  // Role info
  roleName: string;
  roleDescription?: string;

  // Plan info
  planType: string;
  planTypeLabel: string; // "Graduated Return to Work"
  planStatus: string;
  startDate: string;
  restrictionReviewDate?: string;

  // Schedule summary
  scheduleSummary: string; // "Week 1: 4hrs/day, 3 days; Week 2: 5hrs/day, 4 days"

  // Duties summary
  includedDutiesList: string; // Formatted list
  excludedDutiesList: string;

  // Organization branding (future)
  organizationName?: string;
  senderName?: string;
  senderTitle?: string;
}
```

**Example Template:**

```handlebars
Dear Manager,

I am writing to share the proposed Return to Work Plan for {{workerName}}, who is employed in the {{roleName}} role at {{company}}.

**Plan Overview:**
- Type: {{planTypeLabel}}
- Start Date: {{startDate}}
- Schedule: {{scheduleSummary}}

**Duties:**
{{includedDutiesList}}

{{#if excludedDutiesList}}
**Excluded Duties:**
{{excludedDutiesList}}
{{/if}}

Please review this plan and let me know if you have any questions or require any adjustments.

Kind regards,
{{senderName}}
{{senderTitle}}
```

---

## Domain Pitfalls

### Critical Pitfalls

#### Pitfall 1: Sending Emails Without Manager Email Address

**What goes wrong:**
- Email generation happens automatically
- Manager email address NOT currently captured in system
- Cannot send email without recipient address

**Why it happens:**
- Plan focuses on worker, role, and duties
- Manager contact info not part of current data model
- Employer contact is at company level, not manager-specific

**Prevention:**
1. Add "Manager Email" field to PlanGeneratorWizard (optional)
2. Store in `rtwPlans.managerEmail` column (migration required)
3. Validate email format on input
4. If not provided: disable "Send Email" button, only allow copy

**Detection:**
- Check `rtwPlans.managerEmail` when user clicks "Send Email"
- If null: show error "Please enter manager email address"

#### Pitfall 2: Email Contains Sensitive Medical Information

**What goes wrong:**
- RTW email includes medical restrictions ("cannot lift >5kg")
- Emailing to wrong recipient exposes worker medical data
- Privacy violation under Australian Privacy Act

**Why it happens:**
- User typos in email address
- Auto-complete selects wrong contact
- Email forwarded to unauthorized person

**Prevention:**
1. **Confirm before send:** Modal shows "Send to [email]? This email contains medical information."
2. **Audit logging:** Log all email sends (who sent, to whom, timestamp)
3. **Warning text:** "This email contains medical information. Verify recipient before sending."
4. **Domain validation:** If company is "Acme Corp", warn if email not @acmecorp.com.au

**Detection:**
- Check if recipient domain matches company name (loose validation)
- Log warning if mismatch

#### Pitfall 3: Template Breaks with Missing Variables

**What goes wrong:**
- Organization template uses `{{senderName}}`
- User hasn't configured sender name in org settings
- Email renders as "Kind regards, " (blank sender)

**Why it happens:**
- Template variables not validated before rendering
- No fallback values for optional variables

**Prevention:**
1. **Validate template on save:** Check all `{{variables}}` exist in schema
2. **Provide fallbacks:** `{{senderName || 'Case Manager'}}`
3. **Preview before send:** Show rendered email before sending
4. **Test template:** Admin UI includes "Preview" button

**Detection:**
- Render template with test data on save
- Catch rendering errors and show validation message

### Moderate Pitfalls

#### Pitfall 4: SMTP Credentials Exposed in Logs

**What goes wrong:**
- SMTP error logs include connection details
- Developer logging includes SMTP_PASS
- Logs pushed to monitoring service with credentials

**Prevention:**
- Use structured logging with redaction: `logger.email.error("SMTP failed", { host: SMTP_HOST }, error)` (never log SMTP_PASS)
- Existing `emailService.ts` already does this correctly
- Review: Ensure no debug logs leak credentials

#### Pitfall 5: Email Client Doesn't Support HTML

**What goes wrong:**
- Organization creates beautiful HTML template with logo
- Manager uses plain-text email client (rare but exists)
- Email displays raw HTML: `<h1>RTW Plan</h1>` instead of rendering

**Prevention:**
- Always include plain text fallback in `text` field
- Nodemailer supports both: `{ text: plainBody, html: htmlBody }`
- Template system should generate both versions

---

## Implementation Recommendations

### Phase 7 Scope (Revised)

Given existing implementation, Phase 7 should focus on:

**Wave 1: EMAIL-09 Template System (1-2 days)**
1. Create `email_templates` table migration
2. Add template resolution logic to `rtwEmailService.ts`
3. Implement Handlebars rendering with fallback to AI
4. Seed default template for testing

**Wave 2: EMAIL-10 SMTP Sending (1 day)**
1. Add "Send Email" button to ManagerEmailSection.tsx
2. Create modal for entering manager email
3. Add `POST /api/rtw-plans/:planId/email/send` endpoint
4. Call existing `emailService.sendEmail()`
5. Add audit logging for email sends

**Wave 3: UI Polish (0.5 days)**
1. Improve email preview styling
2. Add "Email sent successfully" toast notification
3. Store manager email in plan (optional field)
4. Add validation for email format

**Out of Scope for Phase 7:**
- Admin UI for template management (future: Phase 11 or 12)
- HTML email templates (start with plain text, extend later)
- Email tracking/read receipts (future enhancement)
- Multi-recipient support (future enhancement)

### Technology Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| **Template Engine** | Handlebars | Lightweight, logic-less, widely adopted |
| **Template Storage** | PostgreSQL `email_templates` table | Multi-tenant architecture consistency |
| **Email Format** | Plain text initially, HTML later | Simplicity; avoid email client compatibility issues |
| **SMTP Service** | Existing emailService.ts | Already configured and tested |
| **Fallback Strategy** | AI → Template → Hardcoded | Graceful degradation |

---

## Roadmap Implications

### Phase Structure Recommendation

**Phase 7: Email Generation** can be completed in **2-3 days** given existing foundation.

**Dependencies Satisfied:**
- Phase 6 completed (email generation already exists)
- Database infrastructure (email_drafts table)
- SMTP service (emailService.ts)

**Phase 7 Unblocks:**
- Phase 8: Approval Workflow (manager receives email with plan)
- Phase 9: Audit Trail (email sends logged)

**Research Flags:**
- **Phase 7 UNLIKELY to need deep research** (standard patterns, existing implementations)
- **Phase 8 MAY need research** for approval state machine and notification system

---

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| **Stack** | HIGH | Nodemailer installed, emailService.ts working, SMTP configured |
| **Features** | HIGH | 80% complete, gap analysis clear |
| **Architecture** | HIGH | Template pattern standard, multi-tenant approach proven |
| **Pitfalls** | MEDIUM | Privacy concerns validated with existing logging patterns |

---

## Gaps to Address

### Known Gaps (Will Address in Phase 7)

1. **Manager email capture:** Add optional field to plan generator wizard
2. **Template management:** Admin UI deferred to future phase
3. **HTML rendering:** Start with plain text, extend later

### Unknowns (Low Priority)

1. **Email deliverability:** Will SMTP work reliably for production volumes? (Likely yes, standard pattern)
2. **Template validation:** How to prevent users from breaking templates? (Preview + validation)
3. **Email storage limits:** How long to keep email_drafts? (Future: retention policy)

---

## Sources

### Template Customization
- [Mastering Email Design: Best Practices for 2026 | Mailmunch](https://www.mailmunch.com/blog/email-design-best-practices)
- [15 Email Design Best Practices for 2026 | Brevo](https://www.brevo.com/blog/email-design-best-practices/)
- [Email Design Best Practices for 2026 – GetResponse](https://www.getresponse.com/blog/email-design-best-practices)

### Nodemailer & Templates
- [Nodemailer: Tutorial with Code Snippets [2026] | Mailtrap](https://mailtrap.io/blog/sending-emails-with-nodemailer/)
- [Templating – Nodemailer Community](https://community.nodemailer.com/2-0-0-beta/templating/)
- [Configure Nodemailer with Custom Email Templates in Node.js | CMARIX](https://www.cmarix.com/qanda/configure-nodemailer-with-custom-email-templates-in-node-js/)
- [email-templates npm package](https://www.npmjs.com/package/email-templates)

### UX Best Practices
- [Nano-brewed interactions: The 'mailto:' link | Medium](https://medium.com/inside-design/nano-brewed-interactions-c84db538050a)
- [Effective UX with the Clipboard | AlBlue's Blog](https://alblue.bandlem.com/2010/06/effective-ux-with-clipboard.html)

### Multi-Tenant Architecture
- [Multi-Tenant Database Architecture Patterns Explained | Bytebase](https://www.bytebase.com/blog/multi-tenant-database-architecture-patterns-explained/)
- [Architectural Approaches for Storage and Data in Multitenant Solutions | Microsoft Azure](https://learn.microsoft.com/en-us/azure/architecture/guide/multitenant/approaches/storage-data)
- [Multi-Tenant Database Design Patterns 2024 | Daily.dev](https://daily.dev/blog/multi-tenant-database-design-patterns-2024)

---

**Research Complete**
**Next Step:** Roadmap creation (orchestrator will use this research to structure Phase 7 plan)
