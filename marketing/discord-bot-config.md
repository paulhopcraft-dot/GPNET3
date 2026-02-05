# Discord Bot Configuration for Preventli

## Bot Permissions Required
- Manage Channels (create client categories)
- Manage Messages (pin important alerts)
- Send Messages (all channels)
- Create Public Threads (case discussions)
- Embed Links (rich case summaries)
- Read Message History (context awareness)

## Channel Automation Rules

### 🏢 active-clients
- **Trigger**: New Freshdesk ticket
- **Action**: Post company summary with case count
- **Format**: Embed with company info, case status, next deadline

### 📋 case-updates  
- **Trigger**: Freshdesk ticket status change
- **Action**: Post update with old/new status
- **Auto-thread**: Group updates by company

### 🚨 urgent-cases
- **Trigger**: Deadline within 7 days OR high priority
- **Action**: @everyone notification with countdown
- **Format**: Red embed with urgency indicators

### 💰 revenue-metrics
- **Schedule**: Daily at 9 AM
- **Content**: MRR progress, new clients, churn
- **Target**: Track toward $100K MRR goal

### 🏭 [Company] Categories
- **Auto-create**: When new client onboards
- **Template**: Case summary + deadlines + activity feed
- **Permissions**: Client-specific access if needed

## Webhook Endpoints

### Freshdesk Integration
```
POST /api/discord/freshdesk
Headers: 
  Authorization: Bearer [WEBHOOK_SECRET]
  Content-Type: application/json

Payload:
{
  "event": "ticket.created|updated|closed",
  "ticket": { ... },
  "company": { ... },
  "agent": { ... }
}
```

### Manual Commands
- `/case [ticket-id]` - Get case summary
- `/client [company]` - Get client overview  
- `/urgent` - List all urgent cases
- `/revenue` - Current month metrics

## Error Handling
- Failed webhook → Log to #system-alerts
- Rate limits → Queue messages, retry with backoff
- Missing data → Graceful degradation with placeholder info

Ready for implementation once server is created!