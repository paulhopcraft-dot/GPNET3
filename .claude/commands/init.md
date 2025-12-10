# Project Initialization

Initialize the GPNet3 development environment:

1. Read `.claude/domain_memory.json` to understand current feature status
2. Check environment setup:
   - Verify `.env` exists with required variables
   - Run `npm install` if node_modules missing
   - Run `npm run db:push` if database not initialized
3. Identify next actionable feature from domain_memory.json
4. Report current project state to user

## Quick Commands

```bash
npm install          # Install dependencies
npm run db:push      # Apply database migrations
npm run seed         # Seed demo data (optional)
npm run dev          # Start development server
```

## Environment Check

Required variables in `.env`:
- DATABASE_URL
- JWT_SECRET
- CSRF_SECRET
- ANTHROPIC_API_KEY (optional, for AI features)
- FRESHDESK_DOMAIN (optional, for sync)
- FRESHDESK_API_KEY (optional, for sync)
