# Changelog

All notable changes to Preventli are documented here.
Format follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).
Versioning follows [Semantic Versioning](https://semver.org/).

---

## [Unreleased]

## [0.9.0-beta] — 2026-04-23

### Added
- **Pre-employment health assessments** — role-specific assessment links, digital completion, three-tier clearance status (cleared / conditional / not cleared)
- **AI-generated return-to-work plans** — upload a medical certificate, receive a complete WorkSafe-compliant RTW plan in seconds via OpenAI
- **RTW case tracking & timeline** — full case lifecycle from lodgement to closure with visual phase timeline
- **Manager dashboard & analytics** — active cases, overdue tasks, upcoming milestones, resolution time tracking
- **Real-time notification bell** — in-app alerts for overdue tasks, expiring certificates, WorkSafe obligations
- **Full compliance audit trail** — every action logged with timestamp, user, and IP
- **Document & certificate storage** — upload, version, and retrieve medical certificates and capacity certificates
- **WorkSafe compliance checklists** — step-by-step guidance for every WHS obligation
- **Multi-manager access** — role-based access, invite team members, enterprise SSO support
- **Pre-employment access token** — secure shareable links for candidate assessment completion
- **Sentry client-side error monitoring** — @sentry/react initialised on VITE_SENTRY_DSN; 10% trace sampling, 100% error session replay
- **Sentry server-side error monitoring** — @sentry/node initialised on SENTRY_DSN with Express error handler
- **Rate limiting** — general (200 req/15 min), auth (5 req/15 min), AI (3 req/hr), webhook (60 req/min)
- **CSRF protection** — double-submit cookie pattern; bearer token requests bypass
- **Security headers** — full Helmet CSP, HSTS, noSniff, frameguard configuration
- **Branch protection** — force-push and branch deletion locked on main for both repos

### Fixed
- BUG-001: Pre-employment state machine enforced — assessments advance forward through valid states only
- BUG-002: Access token generation for candidate assessment links
- BUG-003: Copy shareable link button in pre-employment UI
- BUG-006: Input maxLength constraints on pre-employment form fields
- BUG-010: Injury date input max capped to today on new case creation

### Changed
- Marketing site pricing updated to AU SaaS tiers: Starter (Free), Professional ($299/mo AUD), Enterprise ($799/mo AUD)
- Marketing site features section updated to reflect 10 actually shipped platform features
- Hero copy updated to accurate product description
- Contact form notification email routes to paul.hopcraft@gmail.com
- Prospect confirmation email added on contact form submission via Resend

---

## [0.1.0] — 2025-01-01

### Added
- Initial project scaffold — Express + Vite + React SPA
- Drizzle ORM + PostgreSQL schema
- Authentication (JWT + sessions)
- Basic case management CRUD

---

[Unreleased]: https://github.com/paulhopcraft-dot/GPNET3/compare/v0.9.0-beta...HEAD
[0.9.0-beta]: https://github.com/paulhopcraft-dot/GPNET3/releases/tag/v0.9.0-beta
[0.1.0]: https://github.com/paulhopcraft-dot/GPNET3/releases/tag/v0.1.0
