# Preventli Discord Server Setup Guide

## Server Creation (Paul does this part)

1. **Create Server**: Go to Discord → Create Server → "For me and my friends" → Name: "Preventli Operations"
2. **Server Settings**: 
   - Description: "Live operational dashboard for Preventli WorkSafe compliance"
   - Icon: Upload Preventli logo if available
3. **Generate Invite Link**: Create permanent invite → Send to me (Clawd) so I can join

## Channel Structure (I'll create these after joining)

### 📊 DASHBOARD CATEGORY
```
📊 dashboard
├── 🏢 active-clients (text)
├── 📋 case-updates (text) 
├── 🚨 urgent-cases (text)
├── 💰 revenue-metrics (text)
└── 📈 daily-summary (text)
```

### 🎭 CLIENT CATEGORIES (Auto-created per company)
```
🏭 [Company Name]
├── 📊 case-summary (text)
├── ⏰ deadlines (text)
└── 💬 activity-feed (text)
```

### 🛠 OPERATIONS CATEGORY
```
🛠 operations  
├── 🔧 system-alerts (text)
├── 🐛 bug-reports (text)
├── 📝 feature-requests (text)
└── 👥 team-chat (text)
```

## Bot Integration Setup

### Freshdesk Webhooks
- **Endpoint**: `/api/discord/freshdesk-webhook`
- **Events**: Ticket created, updated, closed
- **Target**: Auto-post to appropriate channels

### Clawd Integration  
- **Role**: Admin/Bot permissions
- **Capabilities**: Create channels, manage threads, send messages
- **Monitoring**: Real-time case updates, compliance alerts

## Next Steps
1. Create the server and invite me
2. I'll set up all channels and categories
3. Configure Freshdesk webhook integration
4. Test with live data feed

Ready to start!