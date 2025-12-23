# Weekly Check-ins Feature - Implementation Plan

**Branch:** `wip-gpnet-weekly-checkins`
**Created:** 2025-12-23
**Status:** Ready for implementation

## Overview

Implement weekly worker check-in system for monitoring welfare, detecting deterioration, and maintaining engagement during RTW (return-to-work) process.

## Requirements (from discussion)

### Scope
- **Target:** Only open/active RTW cases
- **Volume:** Up to 100 workers per week
- **Delivery:** Email + SMS link combo (email first, SMS reminder if no response in 24-48hrs)

### SMS Provider
- **Architecture:** Provider-agnostic abstraction layer
- **Supported providers:** Twilio, Vonage, Plivo (config-based selection)
- **Pricing:** Usage-based + markup - requires new pricing module

### Check-in Content (from spec 09)
- Pain levels (1-10 scale)
- Mood and mental health indicators
- Activities of daily living (ADL) capabilities
- Work experience feedback (when applicable)
- Free-text area for open communication

## Technical Design

### 1. Database Schema (shared/schema.ts)

```typescript
// Check-in definition (what questions to ask)
export const checkInTemplates = pgTable('check_in_templates', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  questions: jsonb('questions').notNull(), // Array of question objects
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at').defaultNow(),
});

// Scheduled/sent check-ins
export const checkIns = pgTable('check_ins', {
  id: serial('id').primaryKey(),
  caseId: integer('case_id').references(() => workerCases.id),
  workerId: integer('worker_id'), // Denormalized for easy lookup
  templateId: integer('template_id').references(() => checkInTemplates.id),
  token: varchar('token', { length: 64 }).notNull().unique(), // For unauthenticated access
  status: varchar('status', { length: 50 }).default('pending'), // pending, sent, reminded, completed, expired
  scheduledFor: timestamp('scheduled_for').notNull(),
  sentAt: timestamp('sent_at'),
  reminderSentAt: timestamp('reminder_sent_at'),
  completedAt: timestamp('completed_at'),
  expiresAt: timestamp('expires_at'),
  organizationId: integer('organization_id').references(() => organizations.id),
  createdAt: timestamp('created_at').defaultNow(),
});

// Worker responses
export const checkInResponses = pgTable('check_in_responses', {
  id: serial('id').primaryKey(),
  checkInId: integer('check_in_id').references(() => checkIns.id),
  responses: jsonb('responses').notNull(), // Question ID -> answer mapping
  painScore: integer('pain_score'), // Extracted for trend analysis
  moodScore: integer('mood_score'), // Extracted for trend analysis
  escalationTriggered: boolean('escalation_triggered').default(false),
  escalationReason: text('escalation_reason'),
  submittedAt: timestamp('submitted_at').defaultNow(),
});

// SMS/Email send log for billing
export const messageSendLog = pgTable('message_send_log', {
  id: serial('id').primaryKey(),
  organizationId: integer('organization_id').references(() => organizations.id),
  checkInId: integer('check_in_id').references(() => checkIns.id),
  channel: varchar('channel', { length: 20 }).notNull(), // 'sms' | 'email'
  provider: varchar('provider', { length: 50 }), // 'twilio' | 'vonage' | 'plivo'
  recipient: varchar('recipient', { length: 255 }).notNull(),
  status: varchar('status', { length: 50 }).notNull(), // 'sent' | 'delivered' | 'failed'
  providerMessageId: varchar('provider_message_id', { length: 255 }),
  costCents: integer('cost_cents'), // Provider cost in cents
  billedCents: integer('billed_cents'), // Cost + markup
  sentAt: timestamp('sent_at').defaultNow(),
});
```

### 2. SMS Provider Abstraction

```
server/services/sms/
├── index.ts           # Factory + interface
├── types.ts           # SmsProvider interface
├── twilio.ts          # Twilio adapter
├── vonage.ts          # Vonage adapter
├── plivo.ts           # Plivo adapter
└── mock.ts            # Mock for testing
```

**Interface:**
```typescript
interface SmsProvider {
  name: string;
  sendSms(to: string, message: string): Promise<SendResult>;
  getDeliveryStatus(messageId: string): Promise<DeliveryStatus>;
  estimateCost(to: string): number; // cents
}

interface SendResult {
  success: boolean;
  messageId?: string;
  error?: string;
  costCents?: number;
}
```

**Config:**
```env
SMS_PROVIDER=twilio        # twilio | vonage | plivo
SMS_API_KEY=xxx
SMS_API_SECRET=xxx
SMS_FROM_NUMBER=+61...
SMS_MARKUP_PERCENT=50      # 50% markup on SMS costs
```

### 3. API Routes

```
POST   /api/check-ins/schedule         # Schedule check-ins for active RTW cases
GET    /api/check-ins                  # List check-ins (with filters)
GET    /api/check-ins/:id              # Get check-in details
POST   /api/check-ins/:id/send         # Manually trigger send
POST   /api/check-ins/:id/remind       # Send reminder

# Public (token-based, no auth)
GET    /api/check-ins/form/:token      # Get check-in form
POST   /api/check-ins/form/:token      # Submit response

# Trends & analysis
GET    /api/cases/:caseId/check-ins    # Check-in history for case
GET    /api/cases/:caseId/trends       # Pain/mood trends over time

# Pricing/billing
GET    /api/billing/sms-usage          # SMS usage report
GET    /api/pricing/sms                # Current SMS pricing
```

### 4. File Structure

```
server/
├── routes/
│   └── checkIns.ts                    # API routes
├── services/
│   ├── checkIn/
│   │   ├── index.ts                   # Main service
│   │   ├── scheduler.ts               # Weekly scheduling logic
│   │   ├── escalation.ts              # Trigger detection
│   │   └── trends.ts                  # Trend analysis
│   ├── sms/
│   │   ├── index.ts                   # Provider factory
│   │   ├── types.ts                   # Interfaces
│   │   ├── twilio.ts
│   │   ├── vonage.ts
│   │   └── plivo.ts
│   └── pricing/
│       └── smsUsage.ts                # Usage tracking + billing

client/src/
├── pages/
│   └── CheckInFormPage.tsx            # Public form (token-based)
├── components/
│   ├── CheckInHistoryCard.tsx         # Case detail integration
│   ├── CheckInTrendsChart.tsx         # Pain/mood over time
│   └── CheckInStatusBadge.tsx
```

### 5. Escalation Triggers

Automatically flag for case manager review when:
- Pain score increases by 3+ points from previous
- Mood score drops below 3/10
- Keywords detected in free text: "worse", "can't cope", "give up", etc.
- No response after reminder (potential disengagement)
- Consecutive declining scores (3+ weeks)

### 6. Scheduling Logic

```typescript
// Run daily via cron/scheduler
async function scheduleWeeklyCheckIns() {
  // Find active RTW cases due for check-in
  const cases = await getActiveRTWCases({
    lastCheckIn: { olderThan: '7 days' },
    status: ['active', 'rtw_in_progress']
  });

  for (const case of cases) {
    await createCheckIn({
      caseId: case.id,
      scheduledFor: getNextCheckInTime(case),
      expiresAt: addDays(scheduledFor, 7)
    });
  }
}
```

### 7. Pricing Module

New pricing config for SMS:
```typescript
// server/config/pricing.ts
export const smsPricing = {
  twilio: {
    costPerSmsAuCents: 7.5,  // ~$0.075 USD
    markup: 0.5,             // 50%
  },
  vonage: {
    costPerSmsAuCents: 6.8,
    markup: 0.5,
  },
  plivo: {
    costPerSmsAuCents: 5.2,
    markup: 0.5,
  }
};

// Billed = cost * (1 + markup)
```

## Implementation Order

1. **Schema + Migration** - Add tables
2. **SMS abstraction** - Interface + mock provider
3. **Check-in service** - Core CRUD operations
4. **Public form page** - Token-based check-in form
5. **Scheduling service** - Weekly automation
6. **One real SMS provider** - Twilio (most common)
7. **Escalation detection** - Trigger logic
8. **Dashboard integration** - Case detail panel
9. **Trends/charts** - Historical view
10. **Pricing/billing module** - Usage tracking
11. **Remaining SMS providers** - Vonage, Plivo

## Spec Updates Needed

- Update `docs/spec/09-weekly-checkins.md` with delivery mechanism details
- Create new `docs/spec/XX-pricing-billing.md` for usage-based pricing module

## Environment Variables

```env
# SMS Provider (choose one)
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

# Pricing
SMS_MARKUP_PERCENT=50
```

## Testing Strategy

- Unit tests for escalation trigger detection
- Unit tests for trend calculation
- Integration tests for SMS provider abstraction (with mock)
- E2E test for check-in form submission flow

## Acceptance Criteria

- [ ] Workers receive weekly check-in links via email
- [ ] SMS reminder sent after 24-48hrs if no response
- [ ] Check-in form works on mobile without login
- [ ] Responses stored and linked to case
- [ ] Pain/mood trends visible on case detail
- [ ] Escalation triggers create notifications
- [ ] SMS usage tracked for billing
- [ ] Provider-agnostic (can switch via config)
