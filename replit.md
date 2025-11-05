# GPNet System - Pre-Employment Check Management Platform

## Overview

GPNet is a B2B SaaS platform for managing pre-employment background checks and worker compliance cases. The system provides a multi-tenant dashboard for tracking worker cases, integrating with Freshdesk for ticketing, and managing compliance indicators across different client organizations. The platform emphasizes data clarity, efficient workflows, and professional trust through a clean, Linear-inspired design system.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

**Framework & Build System**
- React 18 with TypeScript for type-safe component development
- Vite as the build tool and development server, providing fast HMR and optimized production builds
- React Query (TanStack Query) for server state management and data fetching with automatic caching and refetching capabilities

**UI Component System**
- shadcn/ui component library built on Radix UI primitives for accessible, customizable components
- Tailwind CSS for utility-first styling with custom design tokens
- Design system follows "new-york" style variant with professional B2B aesthetics
- Custom CSS variables for theming (light/dark mode support) with HSL color space for flexible color manipulation
- Inter font for general UI, JetBrains Mono for monospaced content (case IDs, reference numbers)
- Material Symbols for iconography

**Component Organization**
- Reusable UI components in `client/src/components/ui/` following shadcn conventions
- Feature-specific components in `client/src/components/` (CasesTable, CaseDetailPanel, DashboardStats, etc.)
- Page-level components in `client/src/pages/`
- Path aliases configured for clean imports (@/, @shared/, @assets/)
- DashboardStats component displays real-time statistics: total cases, off work count, at work count, and high risk count

**State Management**
- React Query for server state with infinite stale time and disabled automatic refetching (manual control)
- Local component state with React hooks
- Theme context provider for light/dark mode persistence

### Backend Architecture

**Server Framework**
- Express.js on Node.js with TypeScript
- ESM module system throughout the application
- Custom request/response logging middleware for API monitoring

**API Design**
- RESTful endpoints under `/api/` namespace
- GPNet2 case management endpoints (`/api/gpnet2/cases`)
- Freshdesk integration endpoint (`/api/freshdesk/sync`) for pulling and transforming ticket data
- Placeholder AI/voice endpoints (disabled by default) for future enhancement

**Data Access Layer**
- Storage abstraction pattern through `IStorage` interface
- `DbStorage` implementation for database operations
- Separation of concerns between route handlers and data access logic

**Middleware & Request Handling**
- JSON body parsing with raw body preservation for webhook verification
- Request timing and response logging
- CORS handling through Vite's development server in dev mode

### Database Architecture

**ORM & Schema**
- Drizzle ORM for type-safe database queries and schema management
- PostgreSQL as the primary database (via Neon serverless)
- WebSocket-based connection pooling for serverless environments

**Schema Design**
- `worker_cases` table as the core entity storing case information
- `case_attachments` table for file/document references (one-to-many relationship)
- UUID-based primary keys with `gen_random_uuid()` for secure, collision-resistant identifiers
- Timestamp fields for date tracking (date of injury, follow-up dates)
- Text fields for flexible company names (not enum-constrained) to support dynamic Freshdesk data

**Migration Strategy**
- Drizzle Kit for schema migrations in `migrations/` directory
- Push-based deployment with `db:push` command for rapid development

### Authentication & Session Management

**Session Store**
- connect-pg-simple for PostgreSQL-backed session storage
- Express session management (infrastructure ready, authentication not yet implemented)

### External Dependencies

**Freshdesk Integration**
- REST API integration for syncing support tickets as worker cases (November 2025)
- Custom transformation layer (`FreshdeskService`) to map Freshdesk tickets to internal case structure
- Handles ticket status, priority, custom fields, and company associations
- Parallel company fetching for performance (~9-10s sync time for 100 tickets)
- Preserves actual Freshdesk company names (not collapsed to predefined list)
- Manual sync trigger via POST endpoint (`/api/freshdesk/sync`) with automatic sync on dashboard load
- Environment variables: `FRESHDESK_DOMAIN` and `FRESHDESK_API_KEY` stored as Replit Secrets

**Neon Database**
- Serverless PostgreSQL provider with WebSocket connections
- Environment-based configuration via `DATABASE_URL`
- Connection pooling through `@neondatabase/serverless` package

**Google Fonts CDN**
- Inter and JetBrains Mono fonts loaded from Google Fonts
- Material Symbols icon font for UI iconography

**Replit Development Tools**
- Runtime error modal plugin for development
- Cartographer plugin for code navigation
- Dev banner plugin for development environment indicators
- Only active in development mode when `REPL_ID` is present

**AI/ML Services - Active Integration (November 2025)**
- **Claude Sonnet 4 Compliance Assistant**: ✅ **FULLY OPERATIONAL** - Integrated using Anthropic's `claude-sonnet-4-20250514` model for real-time compliance guidance
  - Endpoint: `POST /api/compliance` accepts `{ message: string }` and returns `{ response: string, model: string, usage: object }`
  - Direct API integration in `server/routes.ts` with proper error handling and validation
  - System prompt: Specialized in Worksafe Victoria worker's compensation compliance analysis
  - Typical response time: 5-15 seconds for comprehensive policy guidance
  - Environment variable: `ANTHROPIC_API_KEY` stored as Replit Secret
- **AI Assistant Chat Widget**: ✅ **FULLY OPERATIONAL** - Floating chat interface in bottom-right corner of dashboard (`client/src/components/ai-assistant.tsx`)
  - Quick action buttons for instant compliance questions ("Compliance tips", "High risk indicators")
  - Custom message input for specific case queries
  - Conversation history with user messages (blue) and AI responses (muted background)
  - Loading states during API calls (disabled input, "Thinking..." placeholder)
  - Beta badge to indicate experimental feature status
  - Successfully tested end-to-end with Claude API returning detailed compliance guidance
- **OpenAI Integration**: Configured but not actively used (reserved for future natural language query features)
  - Environment variable: `OPENAI_API_KEY` stored as Replit Secret
- **Placeholder Services** (scaffolded for future use):
  - ElevenLabs voice synthesis, Pinecone vector database, natural language database queries

### Design System Principles

**Color System**
- HSL-based color tokens for programmatic manipulation
- Separate border colors for cards, popovers, and buttons
- Elevation system using semi-transparent overlays for hover/active states
- Support for both light and dark themes through CSS custom properties

**Spacing & Layout**
- Tailwind spacing primitives (2, 4, 6, 8, 12, 16, 24) for consistency
- Fixed/expandable sidebar navigation (64px collapsed, 256px expanded)
- Max-width container (max-w-7xl) for content areas with responsive padding
- Grid and flex layouts for responsive component composition

**Typography Hierarchy**
- Semantic heading levels (2xl, xl, lg for headers)
- Body text at base size with relaxed line height
- Supporting text and labels at sm size
- Micro text at xs for badges and tooltips
- Tight line height for headings, relaxed for body content

**Interaction Patterns**
- Hover elevation effects for interactive elements
- Active state depth changes for tactile feedback
- Outline button style inherits parent background for consistent context
- Ghost buttons with transparent borders to prevent layout shift