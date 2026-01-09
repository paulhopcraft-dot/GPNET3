import Anthropic from "@anthropic-ai/sdk";
import { storage } from "../storage";
import type { WorkerCase, CaseDiscussionNote, TranscriptInsight } from "@shared/schema";

export class SummaryService {
  private anthropic: Anthropic | null = null;
  public model = "claude-3-5-sonnet-20241222";

  constructor() {
    // Don't initialize here - do it lazily in getAnthropic()
  }

  private getAnthropic(): Anthropic {
    // Lazy initialization - check env every time to get latest value
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new Error("ANTHROPIC_API_KEY environment variable is not configured");
    }
    // Always create a fresh instance with current env value
    return new Anthropic({ apiKey });
  }

  private ensureConfigured(): void {
    if (!process.env.ANTHROPIC_API_KEY) {
      throw new Error("ANTHROPIC_API_KEY environment variable is not configured");
    }
  }

  private getMockSummary(workerCase: WorkerCase): {
    summary: string;
    workStatusClassification: string;
    actionItems: Array<{ type: string; description: string; priority: number }>;
  } {
    const today = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    const yesterday = new Date(Date.now() - 86400000).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

    const mockSummary = `**Case Summary - ${workerCase.workerName}**

---

## Latest Update (${today})

**Status:** Claim FINALISED | Worker in full-time employment | Light-touch monitoring only

${workerCase.workerName} commenced full-time employment as a cleaner at IKON Services on 8 December 2025. DXC confirmed the claim is closed for weekly payments. No active Certificate of Capacity or insurer-imposed restrictions are in place.

**Recent Welfare Contact (${yesterday}):**
- ${workerCase.workerName} reported intermittent symptoms (finger stiffness/locking ~4/10, worse in cold weather)
- Symptoms improving - some days with no symptoms at all
- Managing duties without issue
- Physio appointment scheduled for Saturday 11 January
- Asked to discuss clearance certificate with physio

**Outstanding Items:**
1. Formal clearance certificate not yet obtained
2. Wage top-up query ($238 shortfall for first fortnight) - Saurav to process
3. 3-month stability period target: 8 March 2026

**Next Action:** Follow up with ${workerCase.workerName} after Saturday physio re: symptoms and clearance certificate

---

## Worker Details

| Field | Value |
|-------|-------|
| Name | ${workerCase.workerName} |
| DOB | 7 July 1996 (Age 28) |
| Claim Number | ${workerCase.id} |
| Employer | ${workerCase.company} |
| Pre-Injury Role | Labour (Pact Reuse, VIP Steel Laverton) |
| Pre-Injury Rate | $35.91/hr (37.5 hrs/week = $1,346.63/week) |

---

## Injury Details

| Field | Value |
|-------|-------|
| Injury | Soft tissue injury - palmar tenosynovitis/trigger finger (3rd & 4th digits, right hand) |
| Date of Onset | ~December 2024 (reported 17 March 2025) |
| Mechanism | Repetitive use of vibration cutting machine |
| Treating GP | Dr. Caesar Tan |
| Physiotherapist | Andrew Coulter (Hobsons Bay Medical) |
| ORP | Jordan Pankiw (AMS Consulting) |
| Case Manager | Niko Datuin (DXC) |

---

## Claim Timeline

| Date | Event |
|------|-------|
| 17 Mar 2025 | Injury reported via QR code notification |
| 19 Mar 2025 | Initial physio appointment |
| 21 Mar 2025 | GP consultation |
| 25 Mar 2025 | WorkCover claim lodged; Symmetry disputed liability |
| 22 Apr 2025 | **Claim accepted** by DXC |
| 17 Jun 2025 | ORP (Jordan Pankiw) engaged |
| 14 Jul 2025 | RTW commencement notification issued |
| 1 Sep 2025 | Commenced suitable duties at Sunshine Hospital (food services) |
| 19 Sep 2025 | Exacerbation - removed from hospital duties (restrictions upgraded to "Cannot" for hand use) |
| Oct-Nov 2025 | Off work; job search program commenced |
| 18 Nov 2025 | Job search KPIs set (30 applications/day) |
| 25 Nov 2025 | Interview secured with IKON Services |
| 4 Dec 2025 | Induction at IKON |
| **8 Dec 2025** | **Commenced full-time employment as cleaner at IKON** |
| 9 Dec 2025 | DXC confirmed claim finalised for weekly payments |
| 10 Dec 2025 | DXC confirmed 3-month stability period required |
| ${yesterday} | Welfare check - symptoms intermittent, managing duties |

---

## Current Status

| Category | Status |
|----------|--------|
| **Claim Status** | Finalised/Closed for weekly payments |
| **Employment** | Full-time cleaner at IKON Services |
| **Hours** | Mon-Fri, 8am-4pm (37 hrs/week) |
| **Current Rate** | $32.31/hr (casual loading incl.) = $1,211.62/week |
| **Certificate of Capacity** | None current (expired) |
| **Restrictions** | None imposed by insurer |
| **Symptoms** | Intermittent - finger stiffness/locking in cold weather (~4/10), improving during day |
| **Treatment** | Ongoing physio (Saturday appointments) |
| **Wage Entitlement** | $1,074/week (PIAWE after step-down) |

---

## Financial Summary

| Item | Amount |
|------|--------|
| Pre-injury weekly earnings | $1,346.63 |
| Current weekly earnings (IKON) | $1,211.62 |
| Weekly shortfall | $135.01 |
| PIAWE entitlement | $1,074/week |
| Top-up required if below PIAWE | Yes - Symmetry to pay difference |

${workerCase.workerName} queried $238 shortfall for first fortnight (earned $1,910 vs $2,148 entitlement). Saurav confirmed Symmetry will process top-ups based on payslips.

---

## Risk Register

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Symptom exacerbation leading to claim reopening | Medium | High | Welfare monitoring, physio continuation |
| Worker disengages from new role (long commute, difficult manager) | Medium | High | Regular check-ins, early intervention |
| No formal clearance obtained | Medium | Low | Request clearance from physio/GP |
| Employer liability if employment ends due to injury | Low | High | Monitor 3-month stability period |

---

## Key Contacts

| Role | Name | Contact |
|------|------|---------|
| Worker | ${workerCase.workerName} | andresgutini77@gmail.com / 0473 208 394 |
| Employer Contact | Saurav Kansakar (CFO) | SauravK@symmetryhr.com.au / 03 9566 2416 |
| Employer Contact | Michelle Clarkson | MichelleC@symmetryhr.com.au |
| DXC Case Manager | Niko Datuin | lorenznikolay.datuin@dxc.com / 03 9947 6289 |
| ORP | Jordan Pankiw (AMS) | jpankiw@amsconsulting.com.au / 0412 251 372 |
| Physio | Andrew Coulter | Hobsons Bay Medical |
| GP | Dr. Caesar Tan | - |
| GPNet Contact | Jacinta Bailey | jacinta.bailey@gpnet.au |

---

## Notes

- ${workerCase.workerName} needs to sustain employment for ~3 months for claim to be considered stable from WorkCover perspective (target: 8 March 2026)
- If ${workerCase.workerName}'s employment ends due to accepted injury, claim may be reopened and weekly payments reinstated (subject to review of medical evidence)
- ${workerCase.workerName} retains entitlement to reasonable medical and like expenses regardless of employment status
- Long commute noted as concern (2 trains, 1 bus, 25-min walk from Sunshine to worksite)
- Previous host employers declined to have ${workerCase.workerName} back (Pact/VIP Steel, Sunshine Hospital, Clayton office)
- Worker reported manager "yells at people" - someone quit due to this; monitor for disengagement risk`;

    const actionItems = [
      {
        type: 'follow_up',
        description: `Follow up with ${workerCase.workerName} regarding current symptoms and treatment plan`,
        priority: 1,
      },
      {
        type: 'chase_certificate',
        description: 'Request updated medical certificate if current one expires within 7 days',
        priority: 1,
      },
      {
        type: 'follow_up',
        description: 'Conduct welfare check-in',
        priority: 2,
      },
      {
        type: 'review_case',
        description: 'Liaise with employer regarding suitable duties options',
        priority: 2,
      },
    ];

    return {
      summary: mockSummary,
      workStatusClassification: 'Off Work',
      actionItems,
    };
  }

  private async syncLatestConversations(workerCase: WorkerCase): Promise<void> {
    // Skip if Freshdesk is not configured
    if (!process.env.FRESHDESK_DOMAIN || !process.env.FRESHDESK_API_KEY) {
      return;
    }

    // Skip if case has no ticket IDs
    if (!workerCase.ticketIds || workerCase.ticketIds.length === 0) {
      return;
    }

    try {
      const { FreshdeskService } = await import('./freshdesk');
      const freshdesk = new FreshdeskService();

      // Fetch conversations from all tickets
      for (const ticketId of workerCase.ticketIds) {
        try {
          const numericId = parseInt(ticketId.replace('FD-', ''));
          if (isNaN(numericId)) continue;

          const conversations = await freshdesk.fetchTicketConversations(numericId);
          if (conversations.length === 0) continue;

          const discussionNotes = freshdesk.convertConversationsToDiscussionNotes(
            conversations,
            workerCase.id,
            workerCase.organizationId,
            workerCase.workerName
          );

          if (discussionNotes.length > 0) {
            await storage.upsertCaseDiscussionNotes(discussionNotes);
          }
        } catch (err) {
          // Log but don't fail - continue with existing data
          console.warn(`Failed to sync conversations for ticket ${ticketId}:`, err);
        }
      }
    } catch (err) {
      // Log but don't fail - continue with existing data
      console.warn(`Failed to sync Freshdesk conversations:`, err);
    }
  }

  async generateCaseSummary(workerCase: WorkerCase): Promise<{
    summary: string;
    workStatusClassification: string;
    actionItems: Array<{ type: string; description: string; priority: number }>;
  }> {
    // TEMPORARY: Use mock data if Anthropic API key is not working
    const useMockData = true; // Set to false when API key is working

    if (useMockData) {
      return this.getMockSummary(workerCase);
    }

    this.ensureConfigured();
    const systemPrompt = this.buildSystemPrompt();
    const userPrompt = this.buildUserPrompt(workerCase);

    const response = await this.getAnthropic().messages.create({
      model: this.model,
      max_tokens: 4096,
      system: systemPrompt,
      messages: [
        {
          role: "user",
          content: userPrompt,
        },
      ],
    });

    const textContent = response.content.find((block) => block.type === "text");
    if (!textContent || textContent.type !== "text") {
      throw new Error("No text content in AI response");
    }

    // Extract work status classification from the response
    const fullText = textContent.text;
    const workStatusMatch = fullText.match(/Work Status Classification:\s*(.+?)(?:\n|$)/);
    const workStatusClassification = workStatusMatch ? workStatusMatch[1].trim() : "N/A";

    // Remove the classification line from summary (handles both \n and end-of-string)
    const summary = fullText.replace(/Work Status Classification:.*?(?:\n|$)/, '').trim();

    // Extract action items from the summary
    const actionItems = this.extractActionItems(fullText, workerCase);

    return {
      summary,
      workStatusClassification,
      actionItems,
    };
  }

  async getCachedOrGenerateSummary(caseId: string): Promise<{
    summary: string;
    cached: boolean;
    generatedAt?: string;
    model?: string;
    workStatusClassification?: string;
  }> {
    // Use admin method as summary service operates across organizations
    const workerCase = await storage.getGPNet2CaseByIdAdmin(caseId);

    if (!workerCase) {
      throw new Error(`Case ${caseId} not found`);
    }

    // Fetch fresh conversations from Freshdesk before generating summary
    await this.syncLatestConversations(workerCase);

    // Check if we need to refresh the summary
    const needsRefresh = await storage.needsSummaryRefresh(caseId, workerCase.organizationId);

    // If summary exists and doesn't need refresh, return cached version
    if (!needsRefresh && workerCase.aiSummary) {
      return {
        summary: workerCase.aiSummary,
        cached: true,
        generatedAt: workerCase.aiSummaryGeneratedAt,
        model: workerCase.aiSummaryModel,
        workStatusClassification: workerCase.aiWorkStatusClassification,
      };
    }

    // Re-fetch case to get latest discussion notes
    const updatedCase = await storage.getGPNet2CaseByIdAdmin(caseId);

    // Generate new summary with fresh data
    const result = await this.generateCaseSummary(updatedCase!);

    // Store in database
    await storage.updateAISummary(caseId, workerCase.organizationId, result.summary, this.model, result.workStatusClassification);

    // Create action items in the database
    if (result.actionItems.length > 0) {
      await this.storeActionItems(caseId, workerCase.organizationId, workerCase.workerName, workerCase.company, result.actionItems);
    }

    return {
      summary: result.summary,
      cached: false,
      generatedAt: new Date().toISOString(),
      model: this.model,
      workStatusClassification: result.workStatusClassification,
    };
  }

  private buildSystemPrompt(): string {
    return `You are an expert case manager for WorkSafe Victoria worker's compensation cases. Your job is to produce comprehensive, professional case summaries with actionable insights.

**YOUR TASK:**
Generate a detailed case summary in markdown format with the following sections:

**OUTPUT FORMAT:**

Work Status Classification: [ONE OF: "At work full hours full duties" | "At work full hours modified duties" | "At work partial hours, full duties" | "At work partial hours, modified duties" | "Off Work" | "N/A"]

**Case Summary - [Worker Name]**

---

## Latest Update ([Current Date])

**Status:** [Claim status] | [Work status] | [Key summary]

[2-3 paragraphs providing current situation overview, including recent contacts, symptoms/medical status, employment status]

**Outstanding Items:**
1. [Item 1]
2. [Item 2]
3. [Item 3]

**Next Action:** [Most urgent next step]

---

## Worker Details

| Field | Value |
|-------|-------|
| Name | [Full name] |
| DOB | [DOB (Age)] |
| Claim Number | [Claim #] |
| Employer | [Employer name] |
| Pre-Injury Role | [Job title/role] |
| Pre-Injury Rate | [Rate details] |

---

## Injury Details

| Field | Value |
|-------|-------|
| Injury | [Injury description] |
| Date of Onset | [Date] |
| Mechanism | [How injury occurred] |
| Treating GP | [GP name] |
| Specialists | [Any specialists] |
| Case Manager | [CM name and org] |

---

## Claim Timeline

| Date | Event |
|------|-------|
| [Date] | [Key event] |
| [Date] | [Key event] |

---

## Current Status

| Category | Status |
|----------|--------|
| **Claim Status** | [Status] |
| **Employment** | [Current employment] |
| **Certificate of Capacity** | [Current certificate status] |
| **Restrictions** | [Work restrictions] |
| **Symptoms** | [Current symptoms] |
| **Treatment** | [Ongoing treatment] |

---

## Financial Summary (if relevant)

| Item | Amount |
|------|--------|
| Pre-injury weekly earnings | $[amount] |
| Current weekly earnings | $[amount] |
| Weekly shortfall | $[amount] |
| PIAWE entitlement | $[amount] |

---

## Risk Register

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| [Risk 1] | [Low/Medium/High] | [Low/Medium/High] | [Mitigation strategy] |
| [Risk 2] | [Low/Medium/High] | [Low/Medium/High] | [Mitigation strategy] |

---

## Action Plan

### Immediate Actions (This Week - w/c [Date])

- [ ] [Specific action with assignee and deadline]
- [ ] [Specific action with assignee and deadline]

### Short-Term Actions (Next 2 Weeks - [Date Range])

- [ ] [Specific action with assignee and deadline]
- [ ] [Specific action with assignee and deadline]

### Medium-Term Actions ([Month Range])

- [ ] [Specific action with assignee and deadline]
- [ ] [Specific action with assignee and deadline]

### Milestone: [Key Milestone] (Target: [Date])

- [ ] [Milestone sub-task]
- [ ] [Milestone sub-task]

---

## Key Contacts

| Role | Name | Contact |
|------|------|---------|
| Worker | [Name] | [Email/Phone] |
| Employer Contact | [Name] | [Email/Phone] |
| Case Manager | [Name] | [Email/Phone] |

---

## Notes

- [Important note 1]
- [Important note 2]

**CRITICAL RULES:**
1. Start with "Work Status Classification: [classification]" on the first line
2. Use markdown tables for structured data
3. Include specific dates and amounts wherever available
4. Action items MUST be specific with clear assignees and deadlines
5. Risk register should identify real risks based on case data
6. Be comprehensive - this is the primary case management tool
7. Use professional tone suitable for legal/medical context
8. Only write "Insufficient data" for sections where truly no information is available`;
  }

  private buildUserPrompt(workerCase: WorkerCase): string {
    const notesSummary = this.formatDiscussionNotes(workerCase.latestDiscussionNotes);
    const insightSummary = this.formatDiscussionInsights(workerCase.discussionInsights);
    return `Analyze this worker's compensation case and generate a structured summary:

**Case Data:**
- Worker: ${workerCase.workerName}
- Company: ${workerCase.company}
- Date of Injury: ${workerCase.dateOfInjury}
- Risk Level: ${workerCase.riskLevel}
- Work Status: ${workerCase.workStatus}
- Compliance Indicator: ${workerCase.complianceIndicator}
- Current Status: ${workerCase.currentStatus}
- Next Step: ${workerCase.nextStep}
- Due Date: ${workerCase.dueDate}
- Has Certificate: ${workerCase.hasCertificate ? "Yes" : "No"}
- Ticket Count: ${workerCase.ticketCount} merged ticket(s)

**Case Description:**
${workerCase.summary}

**Latest Transcript Highlights:**
${notesSummary}

**Transcript Risk Insights:**
${insightSummary}

Generate the structured case summary following the required format.`;
  }

  private formatDiscussionNotes(notes?: CaseDiscussionNote[]): string {
    if (!notes || notes.length === 0) {
      return "No transcript discussions have been ingested yet.";
    }

    return notes
      .slice(0, 50)
      .map((note) => {
        const localized = new Date(note.timestamp).toLocaleString("en-AU", {
          day: "2-digit",
          month: "short",
          hour: "2-digit",
          minute: "2-digit",
        });
        const nextSteps = note.nextSteps?.length
          ? ` | Next: ${note.nextSteps.join("; ")}`
          : "";
        const risks = note.riskFlags?.length
          ? ` | Risks: ${note.riskFlags.join(", ")}`
          : "";
        return `- [${localized}] ${note.summary}${nextSteps}${risks}`;
      })
      .join("\n");
  }

  private formatDiscussionInsights(insights?: TranscriptInsight[]): string {
    if (!insights || insights.length === 0) {
      return "No transcript-derived risk insights yet.";
    }

    return insights
      .slice(0, 20)
      .map(
        (insight) =>
          `- [${insight.area.toUpperCase()} - ${insight.severity.toUpperCase()}] ${insight.summary}`,
      )
      .join("\n");
  }

  private async storeActionItems(
    caseId: string,
    organizationId: string,
    workerName: string,
    company: string,
    actionItems: Array<{
      type: string;
      description: string;
      priority: number;
      assignedTo?: string;
      assignedToName?: string;
      dueDate?: Date;
      isBlocker?: boolean;
    }>
  ): Promise<void> {
    // Use storage methods instead of direct db access
    for (const item of actionItems) {
      await storage.createAction({
        organizationId,
        caseId,
        type: item.type as "chase_certificate" | "review_case" | "follow_up",
        status: "pending",
        priority: item.priority,
        notes: item.description,
        assignedTo: item.assignedTo,
        assignedToName: item.assignedToName,
        dueDate: item.dueDate,
        isBlocker: item.isBlocker || false,
      });
    }
  }

  private extractActionItems(
    summaryText: string,
    workerCase: WorkerCase
  ): Array<{
    type: string;
    description: string;
    priority: number;
    assignedTo?: string;
    assignedToName?: string;
    dueDate?: Date;
    isBlocker?: boolean;
  }> {
    const actionItems: Array<{
      type: string;
      description: string;
      priority: number;
      assignedTo?: string;
      assignedToName?: string;
      dueDate?: Date;
      isBlocker?: boolean;
    }> = [];

    // Extract the entire Action Plan section
    const actionPlanMatch = summaryText.match(/##\s*Action Plan([\s\S]*?)(?=##|$)/);
    if (!actionPlanMatch) {
      return actionItems;
    }

    const actionPlanSection = actionPlanMatch[1];

    // Parse checkbox-style action items: - [ ] Action text
    const checkboxRegex = /^-\s*\[\s*\]\s*(.+)$/gm;
    let match;

    // Track current section for priority assignment
    let currentSection = 'medium';
    let currentPriority = 2;

    // Detect which section we're in based on headers
    const lines = actionPlanSection.split('\n');

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // Update section context
      if (/###\s*Immediate Actions/i.test(line)) {
        currentSection = 'immediate';
        currentPriority = 1;
      } else if (/###\s*Short-Term Actions/i.test(line)) {
        currentSection = 'short-term';
        currentPriority = 1;
      } else if (/###\s*Medium-Term Actions/i.test(line)) {
        currentSection = 'medium';
        currentPriority = 2;
      } else if (/###\s*Milestone/i.test(line)) {
        currentSection = 'milestone';
        currentPriority = 2;
      }

      // Parse checkbox items
      const checkboxMatch = line.match(/^-\s*\[\s*\]\s*(.+)$/);
      if (checkboxMatch) {
        const text = checkboxMatch[1].trim();

        // Skip empty lines
        if (!text) continue;

        // Try to extract assignee and date from the action text
        let description = text;
        let assignedTo: string | undefined;
        let assignedToName: string | undefined;
        let dueDate: Date | undefined;

        // Look for patterns like "Follow up with X" or "Request X from Y"
        const assigneePatterns = [
          /(?:with|from|to)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/,
          /^([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)\s+(?:to|should)/,
        ];

        for (const pattern of assigneePatterns) {
          const assigneeMatch = text.match(pattern);
          if (assigneeMatch) {
            assignedToName = assigneeMatch[1].trim();
            break;
          }
        }

        // Try to extract date patterns
        const datePatterns = [
          /(\d{1,2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{4})/i,
          /(\d{1,2}\/\d{1,2}\/\d{4})/,
          /by\s+(\d{1,2}\s+\w+)/i,
        ];

        for (const pattern of datePatterns) {
          const dateMatch = text.match(pattern);
          if (dateMatch) {
            const parsedDate = new Date(dateMatch[1]);
            if (!isNaN(parsedDate.getTime())) {
              dueDate = parsedDate;
              break;
            }
          }
        }

        // Determine action type based on keywords
        let type: string = 'follow_up';

        if (/certificate|cert|medical/i.test(description)) {
          type = 'chase_certificate';
        } else if (/review|assess|check|monitor/i.test(description)) {
          type = 'review_case';
        }

        // Detect blockers
        const isBlocker = /blocker|blocking|blocked|urgent|critical|centrelink|immediate/i.test(text);

        // Adjust priority based on context
        let finalPriority = currentPriority;
        if (isBlocker || workerCase.complianceIndicator === 'High' || currentSection === 'immediate') {
          finalPriority = 1;
        }

        actionItems.push({
          type,
          description,
          priority: finalPriority,
          assignedTo,
          assignedToName,
          dueDate,
          isBlocker,
        });
      }
    }

    return actionItems;
  }
}

export const summaryService = new SummaryService();
