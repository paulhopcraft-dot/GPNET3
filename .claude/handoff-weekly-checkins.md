# Weekly Check-ins Feature - Implementation Plan

**Branch:** `claude/weekly-checkins-xg7ww`
**Created:** 2025-12-24
**Status:** Ready for implementation

## Overview

Implement weekly worker check-in system for monitoring welfare, detecting deterioration, and maintaining engagement during RTW (return-to-work) process. Designed as a **conversational engine** that supports multiple interaction modes.

## Version Roadmap

| Version | Interaction | Delivery |
|---------|-------------|----------|
| **V1** | Typing (web form) | Email link, SMS link |
| **V2** | Voice + Avatar | Voice calls, video avatar, Zoom |

V1 builds the conversation engine and data layer; V2 adds voice/avatar renderers.

## Requirements

### Scope
- **Target:** Only open/active RTW cases
- **Volume:** Up to 100 workers per week
- **Delivery (V1):** Email + SMS link combo (email first, SMS reminder if no response in 24-48hrs)
- **Delivery (V2):** Add scheduled Zoom calls, outbound voice calls, on-demand avatar sessions

### SMS Provider
- **Architecture:** Provider-agnostic abstraction layer
- **Supported providers:** Twilio, Vonage, Plivo (config-based selection)
- **Pricing:** Usage-based + markup - requires new pricing module

## Core Architecture

### Context-Aware Conversation Engine

The system reviews case context before generating questions:

```
┌─────────────────────────────────────────────────────────────┐
│                    CASE CONTEXT REVIEW                       │
├─────────────────────────────────────────────────────────────┤
│ Case Type: Physio / Mental Health / MSK / General           │
│ RTW Stage: Early / Mid-recovery / Near completion           │
│ Current Duties: Not working / Modified / Full               │
│ Certificate Status: Valid / Expiring soon / Expired         │
│ Last Check-in: What they reported, pain/mood scores         │
│ Trend: Improving / Stable / Declining                       │
│ Open Actions: Pending tasks for this case                   │
└─────────────────────────────────────────────────────────────┘
                            ↓
              Generate tailored conversation script
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                  CONVERSATION SCRIPT                         │
│  (nodes, branching, conditional follow-ups)                 │
└─────────────────────────────────────────────────────────────┘
                            ↓
              Render via appropriate mode
                            ↓
         ┌──────────────────┼──────────────────┐
         ▼                  ▼                  ▼
   ┌───────────┐     ┌───────────┐     ┌───────────┐
   │ Web Form  │     │   Voice   │     │  Avatar   │
   │   (V1)    │     │   (V2)    │     │   (V2)    │
   └───────────┘     └───────────┘     └───────────┘
```

### Delivery & Interaction Matrix

| Trigger | Channel | Interaction | Worker Action |
|---------|---------|-------------|---------------|
| Scheduled | Email link | Web form (V1) | Click when ready |
| Scheduled | SMS link | Web form (V1) | Click when ready |
| Reminder | SMS | Web form (V1) | Click link |
| Scheduled | Email link | Avatar (V2) | Click to start |
| Scheduled | Zoom invite | Video avatar (V2) | Join at time |
| Scheduled | Outbound call | Voice (V2) | Answer phone |
| On-demand | Worker requests | Any | Worker initiates |

## Case-Type Templates

### Physiotherapy Template
| Question | Type | Context Trigger |
|----------|------|-----------------|
| "How many days did you do your exercises?" | 0-7 scale | Always |
| "How's your pain today?" | 1-10 (1=none, 10=severe) | Always |
| "Compared to last week?" | Worse/Same/Better | Always |
| "Any difficulty with specific exercises?" | Free text | If compliance < 5 |
| "Have you booked your GP for your certificate?" | Yes/No/Need help | If cert expires in 7 days |

### Mental Health Template
| Question | Type | Context Trigger |
|----------|------|-----------------|
| "How's your mood this week?" | 1-10 | Always |
| "How's your sleep?" | Poor/Fair/Good | Always |
| "Activities you enjoy?" | Not at all/Some/Yes | Always |
| "Confidence about returning to work?" | 1-10 | If RTW planned |
| "That's lower than last week - anything happening?" | Free text | If mood dropped 3+ |

### General Injury Template
| Question | Type | Context Trigger |
|----------|------|-----------------|
| "How's your pain level?" | 1-10 | Always |
| "Managing daily activities?" | Struggling/Managing/Fine | Always |
| "How are modified duties going?" | Too hard/About right/Too easy | If on modified duties |
| "Your certificate expires [date] - GP booked?" | Yes/No/Need help | If cert expires in 7 days |

## Technical Design

### 1. Database Schema

```typescript
// Conversation script templates
export const conversationScripts = pgTable('conversation_scripts', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  caseType: varchar('case_type', { length: 50 }),  // physio, mental_health, general, null=all
  nodes: jsonb('nodes').notNull(),                  // ConversationNode[]
  startNodeId: varchar('start_node_id', { length: 50 }).notNull(),
  isActive: boolean('is_active').default(true),
  organizationId: integer('organization_id'),       // null = system default
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Scheduled/sent check-ins
export const checkIns = pgTable('check_ins', {
  id: serial('id').primaryKey(),
  caseId: integer('case_id').references(() => workerCases.id),
  workerId: integer('worker_id'),
  scriptId: integer('script_id').references(() => conversationScripts.id),

  // Access token (for unauthenticated link access)
  token: varchar('token', { length: 64 }).notNull().unique(),

  // Delivery
  deliveryChannel: varchar('delivery_channel', { length: 20 }),  // email, sms, zoom, voice
  interactionMode: varchar('interaction_mode', { length: 20 }),  // form, voice, avatar

  // Scheduling
  scheduledFor: timestamp('scheduled_for').notNull(),
  expiresAt: timestamp('expires_at'),

  // Zoom integration (V2)
  zoomMeetingId: varchar('zoom_meeting_id', { length: 255 }),
  zoomJoinUrl: varchar('zoom_join_url', { length: 500 }),

  // Status tracking
  status: varchar('status', { length: 50 }).default('pending'),
  // pending → scheduled → sent → reminded → in_progress → completed/expired/missed

  sentAt: timestamp('sent_at'),
  reminderSentAt: timestamp('reminder_sent_at'),
  startedAt: timestamp('started_at'),
  completedAt: timestamp('completed_at'),

  // Context snapshot (case state when check-in was generated)
  contextSnapshot: jsonb('context_snapshot'),

  organizationId: integer('organization_id').references(() => organizations.id),
  createdAt: timestamp('created_at').defaultNow(),
});

// Conversation transcripts (responses)
export const checkInTranscripts = pgTable('check_in_transcripts', {
  id: serial('id').primaryKey(),
  checkInId: integer('check_in_id').references(() => checkIns.id),

  // The conversation
  scriptUsed: jsonb('script_used'),         // Copy of nodes at time of check-in
  responses: jsonb('responses'),             // nodeId → response mapping
  fullTranscript: text('full_transcript'),   // Human-readable (especially for voice/avatar)

  // Extracted metrics (for trend analysis)
  painScore: integer('pain_score'),
  moodScore: integer('mood_score'),
  exerciseCompliance: integer('exercise_compliance'),  // days 0-7
  dutyFeedback: varchar('duty_feedback', { length: 50 }),
  certificateBooked: boolean('certificate_booked'),

  // Analysis
  escalationTriggered: boolean('escalation_triggered').default(false),
  escalationReasons: jsonb('escalation_reasons'),
  sentiment: varchar('sentiment', { length: 20 }),  // positive, neutral, negative, concerning

  submittedAt: timestamp('submitted_at').defaultNow(),
});

// Worker check-in preferences
export const workerCheckInPreferences = pgTable('worker_check_in_preferences', {
  id: serial('id').primaryKey(),
  workerId: integer('worker_id').notNull(),
  caseId: integer('case_id').references(() => workerCases.id),

  preferredChannel: varchar('preferred_channel', { length: 20 }).default('email'),
  preferredMode: varchar('preferred_mode', { length: 20 }).default('form'),
  preferredDay: varchar('preferred_day', { length: 10 }),      // monday, tuesday, etc
  preferredTime: varchar('preferred_time', { length: 5 }),      // HH:MM
  timezone: varchar('timezone', { length: 50 }).default('Australia/Melbourne'),
  language: varchar('language', { length: 10 }).default('en'),
  accessibilityNeeds: jsonb('accessibility_needs'),             // ["large_text", "voice_only"]

  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Message send log (for billing)
export const messageSendLog = pgTable('message_send_log', {
  id: serial('id').primaryKey(),
  organizationId: integer('organization_id').references(() => organizations.id),
  checkInId: integer('check_in_id').references(() => checkIns.id),

  channel: varchar('channel', { length: 20 }).notNull(),  // sms, email, voice, zoom
  provider: varchar('provider', { length: 50 }),           // twilio, vonage, plivo
  recipient: varchar('recipient', { length: 255 }).notNull(),
  messageType: varchar('message_type', { length: 50 }),    // check_in_link, reminder, etc

  status: varchar('status', { length: 50 }).notNull(),
  providerMessageId: varchar('provider_message_id', { length: 255 }),

  // Billing
  costCents: integer('cost_cents'),
  billedCents: integer('billed_cents'),

  sentAt: timestamp('sent_at').defaultNow(),
  deliveredAt: timestamp('delivered_at'),
});
```

### 2. Conversation Node Structure

```typescript
interface ConversationNode {
  id: string;
  type: 'statement' | 'question' | 'conditional';

  // Content (works for form, voice, avatar)
  prompt: string;

  // Response handling
  responseType: 'scale' | 'choice' | 'yes_no' | 'free_text' | 'number' | 'none';
  options?: string[];
  scaleMin?: number;
  scaleMax?: number;
  scaleLabels?: { min: string; max: string };

  // Data extraction
  extractAs?: string;  // e.g., "painScore", "moodScore", "exerciseCompliance"

  // Context conditions (when to show this node)
  showWhen?: {
    field: string;      // e.g., "context.certificateExpiresInDays"
    operator: 'lt' | 'gt' | 'eq' | 'lte' | 'gte' | 'contains';
    value: any;
  }[];

  // Branching
  branches?: {
    condition: string;  // e.g., "response > 7" or "response == 'no'"
    nextNodeId: string;
  }[];
  defaultNextNodeId?: string;
}

interface CaseContext {
  caseId: number;
  caseType: 'physio' | 'mental_health' | 'msk' | 'general';
  rtwStage: 'not_started' | 'early' | 'mid' | 'near_completion' | 'completed';
  currentDuties: 'not_working' | 'modified' | 'full';
  certificateStatus: 'valid' | 'expiring_soon' | 'expired' | 'none';
  certificateExpiresInDays?: number;
  lastCheckIn?: {
    painScore?: number;
    moodScore?: number;
    exerciseCompliance?: number;
    date: Date;
  };
  trend: 'improving' | 'stable' | 'declining' | 'unknown';
  openActions: string[];
}
```

### 3. Service Architecture

```
server/services/
├── checkIn/
│   ├── index.ts                    # Main service exports
│   ├── contextBuilder.ts           # Build CaseContext from case data
│   ├── scriptEngine.ts             # Generate conversation script from context
│   ├── scheduler.ts                # Weekly scheduling logic
│   ├── sender.ts                   # Dispatch via email/SMS
│   ├── responseProcessor.ts        # Process and store responses
│   ├── escalation.ts               # Trigger detection
│   └── trends.ts                   # Historical analysis
├── sms/
│   ├── index.ts                    # Provider factory
│   ├── types.ts                    # Interfaces
│   ├── twilio.ts
│   ├── vonage.ts
│   ├── plivo.ts
│   └── mock.ts
├── conversation/                   # V2 - voice/avatar rendering
│   ├── voiceRenderer.ts            # Convert script to voice (Twilio Voice)
│   └── avatarRenderer.ts           # Convert script to avatar session
└── pricing/
    └── usageTracker.ts             # Track usage for billing
```

### 4. API Routes

```
# Admin/Case Manager
POST   /api/check-ins/schedule              # Schedule check-ins for active RTW cases
GET    /api/check-ins                       # List check-ins (with filters)
GET    /api/check-ins/:id                   # Get check-in details
POST   /api/check-ins/:id/send              # Manually trigger send
POST   /api/check-ins/:id/remind            # Send reminder

# Scripts (admin)
GET    /api/check-in-scripts                # List conversation scripts
POST   /api/check-in-scripts                # Create custom script
PUT    /api/check-in-scripts/:id            # Update script
GET    /api/check-in-scripts/:id/preview    # Preview with sample context

# Public (token-based, no auth required)
GET    /api/c/:token                        # Get check-in form/conversation
POST   /api/c/:token                        # Submit responses

# Case integration
GET    /api/cases/:caseId/check-ins         # Check-in history for case
GET    /api/cases/:caseId/check-in-trends   # Pain/mood/compliance trends

# Worker preferences
GET    /api/cases/:caseId/check-in-prefs    # Get preferences
PUT    /api/cases/:caseId/check-in-prefs    # Update preferences

# Billing
GET    /api/billing/messaging-usage         # Usage report
```

### 5. Escalation Triggers

| Trigger | Condition | Severity |
|---------|-----------|----------|
| Pain spike | Score increases 3+ from previous | High |
| Severe pain | Score ≥ 8 | High |
| Mood crash | Score ≤ 3 | High |
| Declining trend | 3 consecutive weeks worse | Medium |
| Low exercise compliance | < 3 days for 2+ weeks | Medium |
| Concerning language | Keywords: "can't cope", "give up", "worse" | High |
| Disengagement | No response after reminder | Medium |
| Certificate not booked | Expires in < 5 days, not booked | Medium |

### 6. File Structure

```
server/
├── routes/
│   ├── checkIns.ts                        # API routes
│   └── checkInScripts.ts                  # Script management routes
├── services/
│   ├── checkIn/                           # (see above)
│   ├── sms/                               # (see above)
│   └── pricing/

client/src/
├── pages/
│   └── CheckInPage.tsx                    # Public form (token-based)
├── components/
│   ├── checkIn/
│   │   ├── CheckInForm.tsx                # Form renderer
│   │   ├── ConversationNode.tsx           # Single node component
│   │   ├── ScaleInput.tsx                 # 1-10 slider
│   │   ├── ChoiceInput.tsx                # Multiple choice
│   │   └── ProgressIndicator.tsx          # Step progress
│   ├── CheckInHistoryCard.tsx             # Case detail panel
│   ├── CheckInTrendsChart.tsx             # Trends visualization
│   └── CheckInStatusBadge.tsx
```

## Implementation Order (V1)

1. **Schema + Migration** - Add all tables
2. **Conversation node types** - Define TypeScript interfaces
3. **Default scripts** - Create physio, mental health, general templates
4. **Context builder** - Extract case context
5. **Script engine** - Select/customize script based on context
6. **SMS abstraction** - Interface + mock provider
7. **Check-in service** - CRUD, scheduling
8. **Public form page** - Token-based, mobile-friendly
9. **Response processor** - Store and extract metrics
10. **Escalation detection** - Trigger logic + notifications
11. **One SMS provider** - Twilio
12. **Email delivery** - Send check-in links
13. **Dashboard integration** - Case detail panel, trends
14. **Remaining SMS providers** - Vonage, Plivo
15. **Pricing/billing module** - Usage tracking

## V2 Additions (Future)

- Voice renderer (Twilio Voice / Vonage Voice)
- Avatar renderer (integration with avatar engine)
- Zoom scheduling integration
- Outbound call scheduling
- Worker preference management UI

## Environment Variables

```env
# SMS Provider (V1)
SMS_PROVIDER=twilio
TWILIO_ACCOUNT_SID=xxx
TWILIO_AUTH_TOKEN=xxx
TWILIO_FROM_NUMBER=+61...

# Or Vonage
VONAGE_API_KEY=xxx
VONAGE_API_SECRET=xxx
VONAGE_FROM_NUMBER=+61...

# Or Plivo
PLIVO_AUTH_ID=xxx
PLIVO_AUTH_TOKEN=xxx
PLIVO_FROM_NUMBER=+61...

# Email (existing?)
EMAIL_PROVIDER=...

# Pricing
SMS_MARKUP_PERCENT=50

# V2 additions
ZOOM_CLIENT_ID=xxx
ZOOM_CLIENT_SECRET=xxx
```

## Spec Updates Needed

- Update `docs/spec/09-weekly-checkins.md` with delivery mechanism and conversation engine
- Create new `docs/spec/XX-pricing-billing.md` for usage-based pricing

## Acceptance Criteria (V1)

- [ ] Context-aware conversation scripts generated per case
- [ ] Physio, mental health, general templates available
- [ ] Certificate expiry prompts included when relevant
- [ ] Workers receive check-in links via email
- [ ] SMS reminder sent after 24-48hrs if no response
- [ ] Check-in form works on mobile without login
- [ ] Responses stored with extracted metrics
- [ ] Pain/mood/compliance trends visible on case detail
- [ ] Escalation triggers create notifications
- [ ] SMS usage tracked for billing
- [ ] Provider-agnostic (Twilio/Vonage/Plivo via config)

## Example Conversation Flow

**Physio case, certificate expires in 4 days, reported pain 6 last week:**

```
Opening:
"Hi Sarah, time for your weekly check-in. I noticed your medical
certificate expires on Friday - have you booked your GP appointment?"
→ Yes / No / I need help with this

[If No] → "Would you like me to remind you tomorrow, or do you
          need help booking?"

"How many days did you do your exercises this week?"
→ 0-7 slider

"How would you rate your pain today, where 1 is no pain and 10 is severe?"
→ 1-10 slider

[If pain > last week + 2] → "That's higher than last week. Have you
                             been able to see your physio about it?"
                           → Yes / No / Appointment booked

"Compared to last week, is your condition..."
→ Worse / About the same / Better

"Anything else you'd like to share?"
→ Free text

Closing:
"Thanks Sarah. I've noted everything. Your case manager will follow
up about the certificate. Take care."
```
