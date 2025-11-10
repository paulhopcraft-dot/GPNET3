# GPNet System - Pre-Employment Check Management Platform

## Overview
GPNet is a B2B SaaS platform designed to manage pre-employment background checks and worker compliance cases. It offers a multi-tenant dashboard for tracking worker cases, integrates with Freshdesk for ticketing, and manages compliance indicators across various client organizations. The platform prioritizes data clarity, efficient workflows, and professional trust, leveraging a clean, Linear-inspired design system.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend
- **Framework:** React 18 with TypeScript, Vite for build and development.
- **UI:** shadcn/ui (Radix UI-based) with Tailwind CSS for styling, "new-york" design variant, HSL-based custom CSS variables for theming (light/dark mode), Inter font, JetBrains Mono for monospaced content, Material Symbols for iconography.
- **State Management:** React Query for server state (manual refetching), React hooks for local state.
- **Key Features:**
    - DashboardStats: Real-time statistics (total, off work, at work, high risk cases).
    - CasesTable: Displays ticket count badges, workers sorted by surname.
    - CompanyNav: Dynamically populated from live case data.
    - Smart Next Steps: Context-aware action recommendations based on ticket status and priority.
    - Structured Compliance System: Enhanced RiskBadge with tooltips, 5-tier day-based compliance levels, centralized color system.

### Backend
- **Framework:** Express.js on Node.js with TypeScript (ESM modules).
- **API Design:** RESTful endpoints (`/api/gpnet2/cases`, `/api/freshdesk/sync`).
- **Data Access:** Storage abstraction (`IStorage` interface with `DbStorage` implementation).
- **Middleware:** JSON body parsing, request timing, response logging.

### Database
- **ORM & DB:** Drizzle ORM, PostgreSQL (Neon serverless) with WebSocket pooling.
- **Schema:** `worker_cases` (core entity with `ticket_ids`, `ticket_count`, `compliance_json`, `compliance_indicator`), `case_attachments`.
    - `compliance_json`: Stores structured compliance objects (`indicator`, `reason`, `source`, `lastChecked`).
- **Identifiers:** UUID-based primary keys.
- **Migrations:** Drizzle Kit for schema migrations.

### Authentication
- **JWT-Based Authentication System** (November 10, 2025): Fully functional secure authentication with role-based access control
  - **User Roles**: admin, employer, clinician, insurer with optional subrole field (e.g., "doctor", "physio")
  - **Database**: `users` table with id, email, bcrypt-hashed password, role, subrole, company_id, insurer_id, created_at
  - **Security**: bcrypt password hashing with 10 salt rounds, JWT tokens signed with JWT_SECRET
  - **Token Expiry**: Access tokens expire in 15 minutes (configurable via JWT_EXPIRES_IN)
  - **Endpoints**:
    - `POST /api/auth/register` - Create new user account (supports admin, employer, clinician, insurer roles)
    - `POST /api/auth/login` - Authenticate with email/password, returns JWT access token
    - `GET /api/auth/me` - Get current user details (requires valid JWT)
    - `POST /api/auth/logout` - Logout endpoint (client-side token invalidation)
  - **Middleware**: `authorize(roles?: UserRole[])` - Reusable JWT verification with optional role-based access control
  - **Modular Architecture**: Separated into `/controllers/auth.ts`, `/routes/auth.ts`, `/middleware/auth.ts`
  - **Error Handling**: Clear JSON responses for validation errors, authentication failures, and authorization issues
  - **Environment**: JWT_SECRET stored securely in Replit Secrets

### Design System Principles
- **Color System:** HSL-based tokens, separate border colors, elevation system, light/dark theme support.
- **Layout:** Tailwind spacing, fixed/expandable sidebar, max-width container, Grid/Flex layouts.
- **Typography:** Semantic heading levels, base body text, supporting text, micro text.
- **Interaction:** Hover elevation, active state depth changes, outline/ghost button styles.

## External Dependencies

### Freshdesk Integration
- **API:** REST API for syncing support tickets as worker cases.
- **Intelligent Company Extraction:** Layered company extraction from ticket descriptions when company_id is null:
  - **Layer 1 (Structured):** Form patterns like "company name:", "company:", "employer:" with comprehensive character support and field boundaries
  - **Layer 2 (Narrative):** Case-insensitive keywords ([Ii]nsurer, [Pp]rovider, [Ww]orkcover) require capitalized company names to prevent false positives (e.g., "insurer for Symmetry" matches, "insurer for next steps" doesn't)
  - **Layer 3 (Fallback):** Direct substring matching against known company list
  - **Normalization:** Fuzzy matching, title-casing, punctuation/suffix stripping for canonical company names
- **Legitimate Case Filtering:** Helper function `isLegitimateCase()` to filter out generic emails/non-case tickets based on worker name and case details.
- **Smart Next Step Determination:** `determineNextStep()` function provides actionable guidance based on ticket status, priority, medical certificates, and work status.
- **Pagination & Full Ticket Fetch:** Fetches all tickets (including closed/resolved) using a 6-month lookback window with pagination.
- **Worker Name Extraction:** Correctly combines first and last name custom fields.
- **Worker Deduplication:** Merges multiple Freshdesk tickets for the same worker into a single case view, tracking all merged ticket IDs.
- **Configuration:** `FRESHDESK_DOMAIN` and `FRESHDESK_API_KEY` (Replit Secrets).

### AI/ML Services
- **Claude Sonnet 4 Compliance Assistant:** Integrated with Anthropic's `claude-sonnet-4-20250514` for real-time Worksafe Victoria compliance guidance. Endpoint: `POST /api/compliance`.
- **AI Case Summaries with Caching:** Automated case analysis with intelligent caching and work status classification. Summaries are stored in the database and regenerated only when ticket data is updated. Includes structured summary format (Where We Are Now, Next Steps, Outlook) and classifies work status. Endpoints: `GET /api/cases/:id/summary`, `POST /api/cases/:id/summary`.
- **AI Assistant Chat Widget:** Floating chat interface for quick compliance questions and specific case queries.
- **OpenAI Integration:** Configured (`OPENAI_API_KEY`) but not actively used.
- **Placeholder Services:** ElevenLabs, Pinecone (scaffolded for future use).

### Other
- **Neon Database:** Serverless PostgreSQL provider.
- **Google Fonts CDN:** Inter and JetBrains Mono fonts, Material Symbols.
- **Replit Development Tools:** Runtime error modal, Cartographer, Dev banner (development only).